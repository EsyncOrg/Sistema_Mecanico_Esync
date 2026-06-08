'use client'

// ─── Configurações de Fabricação Context — Phase 6.1 ─────────────────────────
//
// Manages the Piece → Configuration → Cost architecture.
// One piece can have N active manufacturing configurations (each with a
// different material and process combination).
//
// This context is nested inside CustosProvider and CustosPecasProvider so it
// can call useCustos() for rate data and useCustosPecas() for config parameters.
//
// State:
//   configuracoes: ConfiguracaoFabricacao[]  — CRUD-managed list
//   breakdownsComConfig: CustoPecaBreakdown[] — one per active configuration
//   analytics: ConfiguracoesAnalytics         — computed via useMemo
//
// Future Supabase:
//   Table: configuracoes_fabricacao
//   Breakdowns stored in: peca_custos (with configuracao_id FK)

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
} from 'react'
import { useCustos }      from '@/contexts/CustosContext'
import { useCustosPecas } from '@/contexts/CustosPecasContext'
import { mockPecas }      from '@/mocks/pecas'
import { mockConfiguracoesFabricacao } from '@/mocks/configuracoes-fabricacao'
import {
  calcularCustoPecaComConfig,
} from '@/lib/custos/pecasEngine'
import type { Peca }                    from '@/types'
import type {
  ConfiguracaoFabricacao,
  NovaConfiguracaoInput,
  ConfiguracoesAnalytics,
} from '@/types/configuracoes-fabricacao'
import type { CustoPecaBreakdown }      from '@/types/custos-pecas'

// ─── Context interface ────────────────────────────────────────────────────────

export interface ConfiguracoesFabricacaoContextValue {
  // ── Data ────────────────────────────────────────────────────────────────────
  configuracoes:       ConfiguracaoFabricacao[]
  breakdownsComConfig: CustoPecaBreakdown[]
  analytics:           ConfiguracoesAnalytics

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  criarConfiguracao: (input: NovaConfiguracaoInput) => ConfiguracaoFabricacao
  atualizarConfiguracao: (id: string, changes: Partial<ConfiguracaoFabricacao>) => void
  excluirConfiguracao: (id: string) => void
  toggleAtivo: (id: string) => void

  // ── Lookups ──────────────────────────────────────────────────────────────────
  getByPeca: (pecaId: string) => ConfiguracaoFabricacao[]
  getBreakdownsByPeca: (pecaId: string) => CustoPecaBreakdown[]
  getById: (id: string) => ConfiguracaoFabricacao | undefined

  // ── Manual recalculation ─────────────────────────────────────────────────────
  /** Called from EditarPecaModal when a piece is updated */
  recalcularConfigsPeca: (peca: Peca) => void
}

// ─── Default context stub ─────────────────────────────────────────────────────

const ConfiguracoesFabricacaoContext = createContext<ConfiguracoesFabricacaoContextValue>({
  configuracoes:        [],
  breakdownsComConfig:  [],
  analytics: {
    total: 0, ativas: 0,
    pecasComConfiguracao: 0, pecasSemConfiguracao: 0,
    materiaisMaisUsados: [],
  },
  criarConfiguracao:      () => { throw new Error('not mounted') },
  atualizarConfiguracao:  () => {},
  excluirConfiguracao:    () => {},
  toggleAtivo:            () => {},
  getByPeca:              () => [],
  getBreakdownsByPeca:    () => [],
  getById:                () => undefined,
  recalcularConfigsPeca:  () => {},
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function nextCfgCode(existing: ConfiguracaoFabricacao[]): string {
  const nums = existing.map((c) => parseInt(c.codigo.replace('CFG-', '')) || 0)
  return `CFG-${String(Math.max(0, ...nums) + 1).padStart(4, '0')}`
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConfiguracoesFabricacaoProvider({ children }: { children: React.ReactNode }) {
  const { centros, materiais, maquinasCustos } = useCustos()
  const { config: custoConfig }                = useCustosPecas()

  const [configuracoes, setConfiguracoes] = useState<ConfiguracaoFabricacao[]>(
    mockConfiguracoesFabricacao
  )

  // Keep a ref of the latest piece list for recalculation on demand
  const pecasRef = useRef<Peca[]>(mockPecas)

  // ── Compute config-aware breakdowns ─────────────────────────────────────────
  const breakdownsComConfig = useMemo(() => {
    return configuracoes
      .filter((cfg) => cfg.ativo)
      .flatMap((cfg) => {
        const peca     = pecasRef.current.find((p) => p.id === cfg.pecaId)
        const material = materiais.find((m) => m.id === cfg.materialId)
        if (!peca || !material) return []
        return [calcularCustoPecaComConfig(peca, cfg, material, centros, maquinasCustos, custoConfig)]
      })
  }, [configuracoes, centros, materiais, maquinasCustos, custoConfig])

  // Keep pecasRef in sync (via recalcularConfigsPeca calls from EditarPecaModal)
  const recalcularConfigsPeca = useCallback((peca: Peca) => {
    pecasRef.current = pecasRef.current.map((p) => (p.id === peca.id ? peca : p))
    // breakdownsComConfig will auto-recompute via useMemo dependency on configuracoes
    // Force a re-render by toggling a state bit
    setConfiguracoes((prev) => [...prev])
  }, [])

  // ── CRUD ────────────────────────────────────────────────────────────────────

  const criarConfiguracao = useCallback(
    (input: NovaConfiguracaoInput): ConfiguracaoFabricacao => {
      const now  = new Date()
      const nova: ConfiguracaoFabricacao = {
        id:          newId(),
        codigo:      nextCfgCode(configuracoes),
        pecaId:      input.pecaId,
        materialId:  input.materialId,
        dobra:       input.dobra,
        solda:       input.solda,
        pintura:     input.pintura,
        montagem:    input.montagem,
        observacoes: input.observacoes,
        ativo:       true,
        criadoEm:    now,
        atualizadoEm:now,
      }
      setConfiguracoes((prev) => [...prev, nova])
      return nova
    },
    [configuracoes]
  )

  const atualizarConfiguracao = useCallback(
    (id: string, changes: Partial<ConfiguracaoFabricacao>) => {
      setConfiguracoes((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...changes, atualizadoEm: new Date() } : c))
      )
    },
    []
  )

  const excluirConfiguracao = useCallback((id: string) => {
    setConfiguracoes((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const toggleAtivo = useCallback((id: string) => {
    setConfiguracoes((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ativo: !c.ativo, atualizadoEm: new Date() } : c))
    )
  }, [])

  // ── Lookups ─────────────────────────────────────────────────────────────────

  const getByPeca = useCallback(
    (pecaId: string) => configuracoes.filter((c) => c.pecaId === pecaId),
    [configuracoes]
  )

  const getBreakdownsByPeca = useCallback(
    (pecaId: string) => breakdownsComConfig.filter((b) => b.pecaId === pecaId),
    [breakdownsComConfig]
  )

  const getById = useCallback(
    (id: string) => configuracoes.find((c) => c.id === id),
    [configuracoes]
  )

  // ── Analytics ────────────────────────────────────────────────────────────────

  const analytics = useMemo((): ConfiguracoesAnalytics => {
    const ativas = configuracoes.filter((c) => c.ativo)
    const pecasComConfig = new Set(configuracoes.map((c) => c.pecaId)).size
    const totalPecas     = pecasRef.current.length

    // Top materials by usage count
    const matCount: Record<string, number> = {}
    for (const c of configuracoes) {
      matCount[c.materialId] = (matCount[c.materialId] ?? 0) + 1
    }
    const materiaisMaisUsados = Object.entries(matCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([materialId, count]) => ({ materialId, count }))

    return {
      total:               configuracoes.length,
      ativas:              ativas.length,
      pecasComConfiguracao:pecasComConfig,
      pecasSemConfiguracao:Math.max(0, totalPecas - pecasComConfig),
      materiaisMaisUsados,
    }
  }, [configuracoes])

  return (
    <ConfiguracoesFabricacaoContext.Provider
      value={{
        configuracoes,
        breakdownsComConfig,
        analytics,
        criarConfiguracao,
        atualizarConfiguracao,
        excluirConfiguracao,
        toggleAtivo,
        getByPeca,
        getBreakdownsByPeca,
        getById,
        recalcularConfigsPeca,
      }}
    >
      {children}
    </ConfiguracoesFabricacaoContext.Provider>
  )
}

export function useConfiguracoesFabricacao(): ConfiguracoesFabricacaoContextValue {
  return useContext(ConfiguracoesFabricacaoContext)
}
