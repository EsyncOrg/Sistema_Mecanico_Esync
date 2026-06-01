'use client'

// ─── Custos das Peças Context — Phase 6 ───────────────────────────────────────
//
// Computes and manages automatic per-piece industrial costs.
//
// Design:
//   - Nested inside CustosProvider (calls useCustos() to read rate data)
//   - Holds a pecasRef (latest known piece list) for config-change recalculation
//   - breakdowns computed on demand (recalcularPeca / recalcularTodas)
//   - snapshots created automatically when a piece cost changes
//   - historico is append-only (same pattern as HistoricoCusto / HistoricoTempo)
//
// Future Supabase:
//   peca_custos         — current computed breakdowns (indexed by peca_id)
//   peca_custo_snapshots — immutable versions (INSERT-only RLS)
//   peca_custo_historico — recalculation event log
//   custos_config        — empresa-level configuration

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useMemo,
  useEffect,
} from 'react'
import { useCustos }   from '@/contexts/CustosContext'
import { mockPecas }   from '@/mocks/pecas'
import {
  calcularCustoPecaCompleto,
  breakdownParaSnapshot,
  calcularCustoPecasAnalytics,
} from '@/lib/custos/pecasEngine'
import {
  CONFIGURACAO_PADRAO,
} from '@/types/custos-pecas'
import type { Peca }                from '@/types'
import type {
  CustoPecaBreakdown,
  CustoSnapshot,
  HistoricoRecalculo,
  CustoPecasAnalytics,
  ConfiguracaoCustos,
  EventoRecalculo,
} from '@/types/custos-pecas'

// ─── Context interface ────────────────────────────────────────────────────────

export interface CustosPecasContextValue {
  // ── Computed state ──────────────────────────────────────────────────────────
  breakdowns:  CustoPecaBreakdown[]
  snapshots:   CustoSnapshot[]
  historico:   HistoricoRecalculo[]
  config:      ConfiguracaoCustos
  analytics:   CustoPecasAnalytics

  // ── Lookups ─────────────────────────────────────────────────────────────────
  getBreakdown: (pecaId: string) => CustoPecaBreakdown | undefined

  // ── Actions ─────────────────────────────────────────────────────────────────
  /** Recompute cost for one piece (call after EditarPecaModal.onSave). */
  recalcularPeca: (peca: Peca) => void
  /** Recompute all pieces. If pecas is omitted, uses the last known list. */
  recalcularTodas: (pecas?: Peca[]) => void
  /** Create a manual snapshot for a piece. */
  forcarSnapshot: (pecaId: string) => void
  /** Update calculation config (taxaIndiretos, fatorWasteDefault). */
  atualizarConfig: (changes: Partial<ConfiguracaoCustos>) => void
}

// ─── Default context (stub) ───────────────────────────────────────────────────

const CustosPecasContext = createContext<CustosPecasContextValue>({
  breakdowns:      [],
  snapshots:       [],
  historico:       [],
  config:          CONFIGURACAO_PADRAO,
  analytics: {
    custoMedioPecas:          0,
    pecaMaisCara:             null,
    pecaMaisBarata:           null,
    percentualMedioMaterial:  0,
    percentualMedioProducao:  0,
    percentualMedioMaquinas:  0,
    percentualMedioIndiretos: 0,
    maiorComponente:          'Material',
    pecasComCusto:            0,
    pecasSemCusto:            0,
    custoTotalCatalogo:       0,
  },
  getBreakdown:    () => undefined,
  recalcularPeca:  () => {},
  recalcularTodas: () => {},
  forcarSnapshot:  () => {},
  atualizarConfig: () => {},
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function makeHistEntry(
  evento: EventoRecalculo,
  pecaId: string | undefined,
  pecaCodigo: string | undefined,
  custoAnterior: number,
  custoNovo: number,
  descricao: string,
): HistoricoRecalculo {
  return {
    id:            newId(),
    criadoEm:      new Date(),
    criadoPor:     'Sistema',
    evento,
    pecaId,
    pecaCodigo,
    custoAnterior,
    custoNovo,
    descricao,
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CustosPecasProvider({ children }: { children: React.ReactNode }) {
  // Consume rate data from CustosContext (must be a child of CustosProvider)
  const { centros, materiais, maquinasCustos } = useCustos()

  const [breakdowns, setBreakdowns] = useState<CustoPecaBreakdown[]>([])
  const [snapshots,  setSnapshots]  = useState<CustoSnapshot[]>([])
  const [historico,  setHistorico]  = useState<HistoricoRecalculo[]>([])
  const [config,     setConfig]     = useState<ConfiguracaoCustos>(CONFIGURACAO_PADRAO)

  // Persists the last known piece list so atualizarConfig can retrigger calculation
  const pecasRef = useRef<Peca[]>(mockPecas)

  // Version tracker: monotonically increasing per-piece snapshot counter
  const versaoRef = useRef<Map<string, number>>(new Map())

  function getNextVersao(pecaId: string): number {
    const current = versaoRef.current.get(pecaId) ?? 0
    const next    = current + 1
    versaoRef.current.set(pecaId, next)
    return next
  }

  // ── Initialize on mount ────────────────────────────────────────────────────
  useEffect(() => {
    const initial = pecasRef.current.map((p) =>
      calcularCustoPecaCompleto(p, centros, materiais, maquinasCustos, config)
    )
    setBreakdowns(initial)

    // Create first snapshot for every piece that has a calculable cost
    const snaps = initial
      .filter((b) => b.calculadoComSucesso)
      .map((b) => breakdownParaSnapshot(b, 'calculo_inicial', getNextVersao(b.pecaId)))
    setSnapshots(snaps)

    const h = makeHistEntry(
      'recalculo_automatico',
      undefined, undefined,
      0,
      initial.reduce((s, b) => s + b.custoTotal, 0),
      `Cálculo inicial — ${initial.length} peças processadas`,
    )
    setHistorico([h])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only on first mount — manual recalculation via actions

  // ── Lookups ────────────────────────────────────────────────────────────────

  const getBreakdown = useCallback(
    (pecaId: string): CustoPecaBreakdown | undefined =>
      breakdowns.find((b) => b.pecaId === pecaId),
    [breakdowns]
  )

  // ── recalcularPeca ─────────────────────────────────────────────────────────

  const recalcularPeca = useCallback(
    (peca: Peca) => {
      // Update the in-memory piece list
      const idx = pecasRef.current.findIndex((p) => p.id === peca.id)
      if (idx >= 0) {
        pecasRef.current = pecasRef.current.map((p) => (p.id === peca.id ? peca : p))
      } else {
        pecasRef.current = [...pecasRef.current, peca]
      }

      const novo = calcularCustoPecaCompleto(peca, centros, materiais, maquinasCustos, config)

      setBreakdowns((prev) => {
        const existing = prev.find((b) => b.pecaId === peca.id)
        const anterior = existing?.custoTotal ?? 0

        if (existing && Math.abs(anterior - novo.custoTotal) > 0.005) {
          // Cost changed — create snapshot + history entry
          const versao = getNextVersao(peca.id)
          setSnapshots((s) => [...s, breakdownParaSnapshot(novo, 'mudanca_tempo', versao)])
          setHistorico((h) => [
            makeHistEntry(
              'recalculo_automatico',
              peca.id, peca.codigo,
              anterior, novo.custoTotal,
              `Custo recalculado após alteração — ${peca.codigo}`,
            ),
            ...h,
          ])
        }

        if (existing) {
          return prev.map((b) => (b.pecaId === peca.id ? novo : b))
        }
        return [...prev, novo]
      })
    },
    [centros, materiais, maquinasCustos, config]
  )

  // ── recalcularTodas ────────────────────────────────────────────────────────

  const recalcularTodas = useCallback(
    (pecas?: Peca[]) => {
      const list = pecas ?? pecasRef.current
      if (pecas) pecasRef.current = pecas

      const novas = list.map((p) =>
        calcularCustoPecaCompleto(p, centros, materiais, maquinasCustos, config)
      )
      setBreakdowns(novas)

      const totalNovo = novas.reduce((s, b) => s + b.custoTotal, 0)
      setHistorico((h) => [
        makeHistEntry(
          'recalculo_forcado',
          undefined, undefined,
          0, totalNovo,
          `Recálculo forçado — ${novas.length} peças processadas`,
        ),
        ...h,
      ])
    },
    [centros, materiais, maquinasCustos, config]
  )

  // ── forcarSnapshot ─────────────────────────────────────────────────────────

  const forcarSnapshot = useCallback(
    (pecaId: string) => {
      const bd = breakdowns.find((b) => b.pecaId === pecaId)
      if (!bd) return
      const versao = getNextVersao(pecaId)
      setSnapshots((s) => [...s, breakdownParaSnapshot(bd, 'manual', versao)])
      setHistorico((h) => [
        makeHistEntry(
          'snapshot_criado',
          bd.pecaId, bd.pecaCodigo,
          bd.custoTotal, bd.custoTotal,
          `Snapshot manual criado — ${bd.pecaCodigo}`,
        ),
        ...h,
      ])
    },
    [breakdowns]
  )

  // ── atualizarConfig ────────────────────────────────────────────────────────

  const atualizarConfig = useCallback(
    (changes: Partial<ConfiguracaoCustos>) => {
      const newConfig = { ...config, ...changes }
      setConfig(newConfig)

      // Immediately recalculate all with the new config
      const list  = pecasRef.current
      const novas = list.map((p) =>
        calcularCustoPecaCompleto(p, centros, materiais, maquinasCustos, newConfig)
      )
      setBreakdowns(novas)

      setHistorico((h) => [
        makeHistEntry(
          'config_alterada',
          undefined, undefined,
          0, novas.reduce((s, b) => s + b.custoTotal, 0),
          `Configuração de custos alterada — ${list.length} peças recalculadas`,
        ),
        ...h,
      ])
    },
    [config, centros, materiais, maquinasCustos]
  )

  // ── Analytics ──────────────────────────────────────────────────────────────

  const analytics = useMemo(
    (): CustoPecasAnalytics => calcularCustoPecasAnalytics(breakdowns),
    [breakdowns]
  )

  return (
    <CustosPecasContext.Provider
      value={{
        breakdowns,
        snapshots,
        historico,
        config,
        analytics,
        getBreakdown,
        recalcularPeca,
        recalcularTodas,
        forcarSnapshot,
        atualizarConfig,
      }}
    >
      {children}
    </CustosPecasContext.Provider>
  )
}

export function useCustosPecas(): CustosPecasContextValue {
  return useContext(CustosPecasContext)
}
