'use client'

// ─── Quotation Material Selections Context — Phase 7 / 7.1 ───────────────────
//
// Manages two selection types:
//
//   1. Assembly items (tipo='conjunto'):
//      selecoesPorItem: Record<orcamentoItemId, OrcamentoItemConfiguracao[]>
//      One entry per PecaConjunto in the assembly. Each entry stores
//      configuracaoFabricacaoId (required, primary) + materialId (derived).
//
//   2. Individual piece items (tipo='peca') — Phase 7.1:
//      pecaItemSelecoesPorItem: Record<orcamentoItemId, PecaItemSelecao>
//      One entry per OrcamentoItem with tipo='peca'.
//      Stores configuracaoFabricacaoId selected by the user.
//
// Blocking rule (Phase 7.1):
//   itensSemConfiguracao(itens) — returns items that are missing their
//   required configuration selection. Used by ActionBar to block send/approve.
//
// Provider nesting requirements (must be inside):
//   CustosProvider, CustosPecasProvider,
//   ConfiguracoesFabricacaoProvider, ConjuntosProvider
//
// Future Supabase:
//   Tables: orcamento_item_configuracoes, peca_item_selecoes,
//           conjunto_cost_snapshots

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react'
import { useCustos }                   from '@/contexts/CustosContext'
import { useCustosPecas }              from '@/contexts/CustosPecasContext'
import { useConfiguracoesFabricacao }  from '@/contexts/ConfiguracoesFabricacaoContext'
import { useConjuntos }                from '@/contexts/ConjuntosContext'
import {
  calcularCustoConjunto,
  criarConjuntoSnapshot,
  inicializarSelecoes,
  calcularCustoTotalConjuntos,
  calcularCustoUnPeca,
  buildSelecoesDraft,
} from '@/lib/custos/conjuntoEngine'
import type { OrcamentoItem }  from '@/types/orcamentos'
import type { Conjunto }       from '@/types/conjuntos'
import type {
  OrcamentoItemConfiguracao,
  PecaItemSelecao,
  ConjuntoCostBreakdown,
  ConjuntoCostSnapshot,
  SnapshotMotivoConjunto,
  OrcamentoConfiguracoesAnalytics,
} from '@/types/orcamento-configuracoes'

// ─── Context interface ────────────────────────────────────────────────────────

export interface OrcamentoConfiguracoesContextValue {
  // ── State ───────────────────────────────────────────────────────────────────
  /** Assembly selections keyed by orcamentoItemId */
  selecoesPorItem:    Record<string, OrcamentoItemConfiguracao[]>
  /** Live cost breakdowns keyed by orcamentoItemId (auto-recomputed) */
  breakdownsPorItem:  Record<string, ConjuntoCostBreakdown>
  /** Immutable snapshots keyed by orcamentoId */
  snapshotsPorOrcamento: Record<string, ConjuntoCostSnapshot[]>
  /** Single-peca item selections keyed by orcamentoItemId (Phase 7.1) */
  pecaItemSelecoesPorItem: Record<string, PecaItemSelecao>
  /** Analytics across all selections */
  analytics: OrcamentoConfiguracoesAnalytics

  // ── Lookups ─────────────────────────────────────────────────────────────────
  getSelecoes: (orcamentoItemId: string) => OrcamentoItemConfiguracao[]
  getBreakdown:(orcamentoItemId: string) => ConjuntoCostBreakdown | undefined
  /** Sum of all assembly costs for one quotation */
  getCustoTotalOrcamento: (orcamentoId: string, orcamentoItens: OrcamentoItem[]) => number
  /** Phase 7.1: get peca item selection */
  getPecaItemSelecao: (orcamentoItemId: string) => PecaItemSelecao | undefined

  // ── Mutations — assembly items ───────────────────────────────────────────────
  /** Create blank selections for all pieces in a new conjunto item */
  inicializarConjunto: (orcamentoId: string, item: OrcamentoItem) => void
  /** Update one selection (config change) */
  atualizarSelecao: (orcamentoItemId: string, pecaConjuntoId: string,
    changes: Partial<Pick<OrcamentoItemConfiguracao, 'materialId' | 'configuracaoFabricacaoId'>>) => void
  /** Replace all selections for one assembly (from modal "Aplicar") */
  salvarSelecoes: (orcamentoItemId: string, selecoes: OrcamentoItemConfiguracao[]) => void
  /** Clear all selections for one quotation item (e.g., when item is removed) */
  limparSelecoes: (orcamentoItemId: string) => void

  // ── Mutations — peca items (Phase 7.1) ───────────────────────────────────────
  /** Save configuracaoFabricacaoId for a tipo='peca' quotation item */
  salvarPecaItemSelecao: (orcamentoId: string, item: OrcamentoItem, configuracaoId: string) => void
  /** Clear peca item selection (e.g., when item is removed) */
  limparPecaItemSelecao: (orcamentoItemId: string) => void

  // ── Snapshots ────────────────────────────────────────────────────────────────
  criarSnapshot: (
    orcamentoId: string,
    orcamentoNumero: string,
    orcamentoItemId: string,
    motivo: SnapshotMotivoConjunto,
    usuario: string,
  ) => ConjuntoCostSnapshot | null

  // ── Blocking (Phase 7.1) ──────────────────────────────────────────────────────
  /**
   * Returns the OrcamentoItem entries that are missing a required configuration.
   * - tipo='conjunto': all PecaConjunto must have configuracaoFabricacaoId set
   *   (but only for pieces that have a pecaId — pieces without catalog link are skipped)
   * - tipo='peca': must have a PecaItemSelecao with configuracaoFabricacaoId set
   */
  itensSemConfiguracao: (itens: OrcamentoItem[]) => OrcamentoItem[]

  // ── Phase 7.2 — Creation-time draft helpers ───────────────────────────────────
  /**
   * Computes the unit cost for a single piece item using a configuracaoFabricacaoId.
   * Used during quotation creation (pre-save) to show live cost in NovoOrcamentoModal.
   */
  calcularCustoRascunhoPeca: (cfgId: string) => number

  /**
   * Computes the full cost breakdown for a conjunto given draft selections.
   * @param conjunto     - The assembly
   * @param selecoesPorPcp - Draft map: pecaConjunto.id → configuracaoFabricacaoId
   * @param quantidade   - Number of assemblies in this quotation line
   */
  calcularCustoRascunhoConjunto: (
    conjunto: Conjunto,
    selecoesPorPcp: Record<string, string>,
    quantidade: number,
  ) => ConjuntoCostBreakdown | null

  /**
   * Registers all draft config selections into the context after a quotation has
   * been created (called immediately after criarOrcamento() in NovoOrcamentoModal).
   * Maps draft tempIds → actual orcamentoItemIds via the returned Orcamento.
   */
  registrarSelecoesCriacao: (
    orcamentoId:   string,
    orcamentoNumero: string,
    itensComSelecao: Array<{
      orcamentoItem:            OrcamentoItem
      tipo:                     'peca' | 'conjunto'
      configuracaoFabricacaoId?: string           // for peca items
      conjuntoSelecoes?:         Record<string, string>  // for conjunto items
    }>,
  ) => void
}

// ─── Default context ──────────────────────────────────────────────────────────

const OrcamentoConfiguracoesContext = createContext<OrcamentoConfiguracoesContextValue>({
  selecoesPorItem:         {},
  breakdownsPorItem:       {},
  snapshotsPorOrcamento:   {},
  pecaItemSelecoesPorItem: {},
  analytics: {
    orcamentosComSelecao: 0, custoTotalConjuntos: 0,
    materialMaisUsado: null, conjuntoMaisCaro: null,
    custoMedioConjunto: 0,  selecoesPendentes: 0,
  },
  getSelecoes:                  () => [],
  getBreakdown:                 () => undefined,
  getCustoTotalOrcamento:       () => 0,
  getPecaItemSelecao:           () => undefined,
  inicializarConjunto:          () => {},
  atualizarSelecao:             () => {},
  salvarSelecoes:               () => {},
  limparSelecoes:               () => {},
  salvarPecaItemSelecao:        () => {},
  limparPecaItemSelecao:        () => {},
  criarSnapshot:                () => null,
  itensSemConfiguracao:         () => [],
  calcularCustoRascunhoPeca:    () => 0,
  calcularCustoRascunhoConjunto:() => null,
  registrarSelecoesCriacao:     () => {},
})

// ─── Provider ─────────────────────────────────────────────────────────────────

export function OrcamentoConfiguracoesProvider({ children }: { children: React.ReactNode }) {
  const { materiais }                    = useCustos()
  const { config: custoConfig }          = useCustosPecas()
  const { breakdownsComConfig }          = useConfiguracoesFabricacao()
  const { conjuntos }                    = useConjuntos()

  const [selecoesPorItem, setSelecoesPorItem] =
    useState<Record<string, OrcamentoItemConfiguracao[]>>({})
  const [snapshotsPorOrcamento, setSnapshotsPorOrcamento] =
    useState<Record<string, ConjuntoCostSnapshot[]>>({})
  const [pecaItemSelecoesPorItem, setPecaItemSelecoesPorItem] =
    useState<Record<string, PecaItemSelecao>>({})

  // ── Live cost breakdowns (auto-recomputed on any dependency change) ─────────
  const breakdownsPorItem = useMemo<Record<string, ConjuntoCostBreakdown>>(() => {
    const result: Record<string, ConjuntoCostBreakdown> = {}
    for (const [itemId, selecoes] of Object.entries(selecoesPorItem)) {
      if (selecoes.length === 0) continue
      const conjuntoId = selecoes[0].conjuntoId
      const conjunto   = conjuntos.find((c) => c.id === conjuntoId)
      if (!conjunto) continue

      const storedQty = (selecoes[0] as OrcamentoItemConfiguracao & { _qtdItem?: number })._qtdItem ?? 1

      const mockItem: OrcamentoItem = {
        id:           itemId,
        orcamentoId:  selecoes[0].orcamentoId,
        tipo:         'conjunto',
        conjuntoId:   conjuntoId,
        descricao:    conjunto.nome,
        unidade:      'conj.',
        quantidade:   storedQty,
        valorUnitario:0,
        valorTotal:   0,
        posicao:      0,
      }

      result[itemId] = calcularCustoConjunto(
        mockItem, conjunto, selecoes, materiais, breakdownsComConfig, custoConfig
      )
    }
    return result
  }, [selecoesPorItem, conjuntos, materiais, breakdownsComConfig, custoConfig])

  // ── Lookups ─────────────────────────────────────────────────────────────────

  const getSelecoes = useCallback(
    (orcamentoItemId: string) => selecoesPorItem[orcamentoItemId] ?? [],
    [selecoesPorItem]
  )

  const getBreakdown = useCallback(
    (orcamentoItemId: string) => breakdownsPorItem[orcamentoItemId],
    [breakdownsPorItem]
  )

  const getCustoTotalOrcamento = useCallback(
    (_orcamentoId: string, itens: OrcamentoItem[]): number => {
      const conjItemIds = itens
        .filter((i) => i.tipo === 'conjunto')
        .map((i) => i.id)
      const bds = conjItemIds
        .map((id) => breakdownsPorItem[id])
        .filter((b): b is ConjuntoCostBreakdown => !!b)
      return calcularCustoTotalConjuntos(bds)
    },
    [breakdownsPorItem]
  )

  const getPecaItemSelecao = useCallback(
    (orcamentoItemId: string) => pecaItemSelecoesPorItem[orcamentoItemId],
    [pecaItemSelecoesPorItem]
  )

  // ── Mutations — assembly items ───────────────────────────────────────────────

  const inicializarConjunto = useCallback(
    (orcamentoId: string, item: OrcamentoItem) => {
      if (item.tipo !== 'conjunto' || !item.conjuntoId) return
      const conjunto = conjuntos.find((c) => c.id === item.conjuntoId)
      if (!conjunto) return

      const blank = inicializarSelecoes(orcamentoId, item.id, conjunto)
      const withQty = blank.map((s, idx) =>
        idx === 0 ? Object.assign(s, { _qtdItem: item.quantidade }) : s
      )

      setSelecoesPorItem((prev) => ({
        ...prev,
        [item.id]: withQty,
      }))
    },
    [conjuntos]
  )

  const atualizarSelecao = useCallback(
    (orcamentoItemId: string, pecaConjuntoId: string,
     changes: Partial<Pick<OrcamentoItemConfiguracao, 'materialId' | 'configuracaoFabricacaoId'>>) => {
      setSelecoesPorItem((prev) => {
        const existing = prev[orcamentoItemId] ?? []
        return {
          ...prev,
          [orcamentoItemId]: existing.map((s) => {
            if (s.pecaConjuntoId !== pecaConjuntoId) return s
            const updated = { ...s, ...changes, atualizadoEm: new Date() }
            updated.custoUnitario = calcularCustoUnPeca(updated, materiais, breakdownsComConfig, custoConfig)
            return updated
          }),
        }
      })
    },
    [materiais, breakdownsComConfig, custoConfig]
  )

  const salvarSelecoes = useCallback(
    (orcamentoItemId: string, selecoes: OrcamentoItemConfiguracao[]) => {
      const costed = selecoes.map((s) => ({
        ...s,
        custoUnitario: calcularCustoUnPeca(s, materiais, breakdownsComConfig, custoConfig),
        atualizadoEm: new Date(),
      }))
      setSelecoesPorItem((prev) => ({ ...prev, [orcamentoItemId]: costed }))
    },
    [materiais, breakdownsComConfig, custoConfig]
  )

  const limparSelecoes = useCallback((orcamentoItemId: string) => {
    setSelecoesPorItem((prev) => {
      const next = { ...prev }
      delete next[orcamentoItemId]
      return next
    })
  }, [])

  // ── Mutations — peca items (Phase 7.1) ───────────────────────────────────────

  const salvarPecaItemSelecao = useCallback(
    (orcamentoId: string, item: OrcamentoItem, configuracaoId: string) => {
      if (item.tipo !== 'peca' || !item.pecaId) return

      // Derive unit cost from config breakdown
      const bd = breakdownsComConfig.find((b) => b.configuracaoId === configuracaoId)
      const custoUnitario = bd?.custoTotal ?? 0

      const now = new Date()
      const selecao: PecaItemSelecao = {
        id:                      `pis-${item.id}-${now.getTime()}`,
        orcamentoId,
        orcamentoItemId:         item.id,
        pecaId:                  item.pecaId,
        configuracaoFabricacaoId:configuracaoId,
        custoUnitario,
        criadoEm:                now,
        atualizadoEm:            now,
      }

      setPecaItemSelecoesPorItem((prev) => ({ ...prev, [item.id]: selecao }))
    },
    [breakdownsComConfig]
  )

  const limparPecaItemSelecao = useCallback((orcamentoItemId: string) => {
    setPecaItemSelecoesPorItem((prev) => {
      const next = { ...prev }
      delete next[orcamentoItemId]
      return next
    })
  }, [])

  // ── Snapshots ────────────────────────────────────────────────────────────────

  const criarSnapshot = useCallback(
    (
      orcamentoId:    string,
      orcamentoNumero:string,
      orcamentoItemId:string,
      motivo:         SnapshotMotivoConjunto,
      usuario:        string,
    ): ConjuntoCostSnapshot | null => {
      const breakdown = breakdownsPorItem[orcamentoItemId]
      const selecoes  = selecoesPorItem[orcamentoItemId] ?? []
      if (!breakdown) return null

      const snap = criarConjuntoSnapshot(
        breakdown, selecoes, orcamentoId, orcamentoNumero, motivo, usuario
      )
      setSnapshotsPorOrcamento((prev) => ({
        ...prev,
        [orcamentoId]: [...(prev[orcamentoId] ?? []), snap],
      }))
      return snap
    },
    [breakdownsPorItem, selecoesPorItem]
  )

  // ── Blocking (Phase 7.1) ──────────────────────────────────────────────────────

  const itensSemConfiguracao = useCallback(
    (itens: OrcamentoItem[]): OrcamentoItem[] => {
      return itens.filter((item) => {
        if (item.tipo === 'peca') {
          // Must have a PecaItemSelecao with configuracaoFabricacaoId set
          const selecao = pecaItemSelecoesPorItem[item.id]
          return !selecao || !selecao.configuracaoFabricacaoId
        }

        if (item.tipo === 'conjunto') {
          // All catalog-linked pieces must have configuracaoFabricacaoId set
          const selecoes = selecoesPorItem[item.id] ?? []
          // Find the conjunto to check which pieces have pecaId
          const conjunto = conjuntos.find((c) => c.id === item.conjuntoId)
          if (!conjunto) return true

          const pecasComCatalogo = conjunto.pecas.filter((p) => !!p.pecaId)
          if (pecasComCatalogo.length === 0) return false // no catalog pieces → not blockable

          return pecasComCatalogo.some((p) => {
            const sel = selecoes.find((s) => s.pecaConjuntoId === p.id)
            return !sel || !sel.configuracaoFabricacaoId
          })
        }

        return false
      })
    },
    [pecaItemSelecoesPorItem, selecoesPorItem, conjuntos]
  )

  // ── Phase 7.2 — Creation-time draft helpers ───────────────────────────────────

  const calcularCustoRascunhoPeca = useCallback(
    (cfgId: string): number => {
      if (!cfgId) return 0
      return breakdownsComConfig.find((b) => b.configuracaoId === cfgId)?.custoTotal ?? 0
    },
    [breakdownsComConfig]
  )

  const calcularCustoRascunhoConjunto = useCallback(
    (
      conjunto: Conjunto,
      selecoesPorPcp: Record<string, string>,
      quantidade: number,
    ): ConjuntoCostBreakdown | null => {
      if (!conjunto) return null
      const now = new Date()
      // Build a minimal mock OrcamentoItem for the engine
      const mockItem: OrcamentoItem = {
        id:           `draft-${conjunto.id}`,
        orcamentoId:  'draft',
        tipo:         'conjunto',
        conjuntoId:   conjunto.id,
        descricao:    conjunto.nome,
        unidade:      'conj.',
        quantidade,
        valorUnitario:0,
        valorTotal:   0,
        posicao:      0,
      }
      // Build selecoes from the draft map
      const selecoes = conjunto.pecas.map((peca) => {
        const cfgId = selecoesPorPcp[peca.id] ?? ''
        // Look up materialId from configuracoes is not needed here —
        // the engine derives cost from breakdownsComConfig by cfgId
        return {
          id:                      `draft-oic-${peca.id}-${now.getTime()}`,
          orcamentoId:             'draft',
          orcamentoItemId:         `draft-${conjunto.id}`,
          conjuntoId:              conjunto.id,
          pecaConjuntoId:          peca.id,
          pecaConjuntoCodigo:      peca.codigo,
          pecaConjuntoDescricao:   peca.descricao,
          pecaConjuntoQuantidade:  peca.quantidade,
          pecaConjuntoPeso:        peca.pesoEstimado,
          pecaConjuntoEspessura:   peca.espessura,
          configuracaoFabricacaoId:cfgId,
          materialId:              '',
          custoUnitario:           0,
          criadoEm:                now,
          atualizadoEm:            now,
        } satisfies import('@/types/orcamento-configuracoes').OrcamentoItemConfiguracao
      })
      return calcularCustoConjunto(mockItem, conjunto, selecoes, materiais, breakdownsComConfig, custoConfig)
    },
    [materiais, breakdownsComConfig, custoConfig]
  )

  const registrarSelecoesCriacao = useCallback(
    (
      orcamentoId:     string,
      orcamentoNumero: string,
      itensComSelecao: Array<{
        orcamentoItem:            OrcamentoItem
        tipo:                     'peca' | 'conjunto'
        configuracaoFabricacaoId?: string
        conjuntoSelecoes?:         Record<string, string>
      }>,
    ) => {
      const now = new Date()

      for (const entry of itensComSelecao) {
        const { orcamentoItem: item, tipo } = entry

        if (tipo === 'peca' && entry.configuracaoFabricacaoId && item.pecaId) {
          // Register peca item selection
          const bd = breakdownsComConfig.find(
            (b) => b.configuracaoId === entry.configuracaoFabricacaoId
          )
          const selecao: PecaItemSelecao = {
            id:                      `pis-${item.id}-${now.getTime()}`,
            orcamentoId,
            orcamentoItemId:         item.id,
            pecaId:                  item.pecaId,
            configuracaoFabricacaoId:entry.configuracaoFabricacaoId,
            custoUnitario:           bd?.custoTotal ?? 0,
            criadoEm:                now,
            atualizadoEm:            now,
          }
          setPecaItemSelecoesPorItem((prev) => ({ ...prev, [item.id]: selecao }))
        }

        if (tipo === 'conjunto' && entry.conjuntoSelecoes && item.conjuntoId) {
          const conjunto = conjuntos.find((c) => c.id === item.conjuntoId)
          if (!conjunto) continue

          // Build full OrcamentoItemConfiguracao[] from draft selections
          const selecoes = buildSelecoesDraft(
            orcamentoId,
            item.id,
            conjunto,
            entry.conjuntoSelecoes,
            [], // configuracoes not needed — materialId derived in engine
            breakdownsComConfig,
          )
          // Cost each selection
          const costed = selecoes.map((s) => ({
            ...s,
            custoUnitario: calcularCustoUnPeca(s, materiais, breakdownsComConfig, custoConfig),
          }))

          setSelecoesPorItem((prev) => ({ ...prev, [item.id]: costed }))

          // Create initial snapshot
          const mockOrcItem: OrcamentoItem = {
            id:           item.id,
            orcamentoId,
            tipo:         'conjunto',
            conjuntoId:   item.conjuntoId,
            descricao:    conjunto.nome,
            unidade:      'conj.',
            quantidade:   item.quantidade,
            valorUnitario:item.valorUnitario,
            valorTotal:   item.valorTotal,
            posicao:      item.posicao,
          }
          const mockItem: OrcamentoItem = mockOrcItem

          // Snapshot is created after setSelecoesPorItem — use timeout trick:
          // Store snapshot data directly (no closure on breakdownsPorItem)
          const breakdown = calcularCustoConjunto(
            mockItem, conjunto, costed, materiais, breakdownsComConfig, custoConfig
          )
          const snap = criarConjuntoSnapshot(
            breakdown, costed, orcamentoId, orcamentoNumero, 'configuracao_inicial', 'Sistema'
          )
          setSnapshotsPorOrcamento((prev) => ({
            ...prev,
            [orcamentoId]: [...(prev[orcamentoId] ?? []), snap],
          }))
        }
      }
    },
    [conjuntos, materiais, breakdownsComConfig, custoConfig]
  )

  // ── Analytics ──────────────────────────────────────────────────────────────

  const analytics = useMemo((): OrcamentoConfiguracoesAnalytics => {
    const allSelecoes = Object.values(selecoesPorItem).flat()
    const allBDs      = Object.values(breakdownsPorItem)

    const matCount: Record<string, number> = {}
    let   pendentes = 0
    for (const s of allSelecoes) {
      if (!s.configuracaoFabricacaoId) { pendentes++; continue }
      if (s.materialId) {
        matCount[s.materialId] = (matCount[s.materialId] ?? 0) + 1
      }
    }
    const matEntries = Object.entries(matCount)
    const topMat = matEntries.length > 0
      ? matEntries.reduce((a, b) => b[1] > a[1] ? b : a)
      : null

    const sorted = [...allBDs].sort((a, b) => b.custoTotal - a.custoTotal)
    const maisCaroBD = sorted[0]

    const custoTotal  = allBDs.reduce((s, b) => s + b.custoTotal, 0)
    const costedBDs   = allBDs.filter((b) => b.custoTotal > 0)
    const custoMedio  = costedBDs.length > 0
      ? Math.round((custoTotal / costedBDs.length) * 100) / 100
      : 0

    return {
      orcamentosComSelecao: new Set(
        Object.values(selecoesPorItem).flat().map((s) => s.orcamentoId)
      ).size,
      custoTotalConjuntos: Math.round(custoTotal * 100) / 100,
      materialMaisUsado: topMat ? { materialId: topMat[0], count: topMat[1] } : null,
      conjuntoMaisCaro: maisCaroBD ? {
        conjuntoId: maisCaroBD.conjuntoId,
        codigo:     maisCaroBD.conjuntoCodigo,
        custo:      maisCaroBD.custoTotal,
      } : null,
      custoMedioConjunto: custoMedio,
      selecoesPendentes: pendentes,
    }
  }, [selecoesPorItem, breakdownsPorItem])

  return (
    <OrcamentoConfiguracoesContext.Provider
      value={{
        selecoesPorItem,
        breakdownsPorItem,
        snapshotsPorOrcamento,
        pecaItemSelecoesPorItem,
        analytics,
        getSelecoes,
        getBreakdown,
        getCustoTotalOrcamento,
        getPecaItemSelecao,
        inicializarConjunto,
        atualizarSelecao,
        salvarSelecoes,
        limparSelecoes,
        salvarPecaItemSelecao,
        limparPecaItemSelecao,
        criarSnapshot,
        itensSemConfiguracao,
        calcularCustoRascunhoPeca,
        calcularCustoRascunhoConjunto,
        registrarSelecoesCriacao,
      }}
    >
      {children}
    </OrcamentoConfiguracoesContext.Provider>
  )
}

export function useOrcamentoConfiguracoes(): OrcamentoConfiguracoesContextValue {
  return useContext(OrcamentoConfiguracoesContext)
}
