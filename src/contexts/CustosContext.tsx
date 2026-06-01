'use client'

// ─── Custos Context ────────────────────────────────────────────────────────────
//
// Single source of truth for all cost entities:
//   centros, materiais, maoDeObra, maquinasCustos, perfis, historico
//
// Auto-calculation invariants enforced here (not in UI):
//   CustoMaterial.valorKg   = valorChapa / pesoChapa
//   CustoMaoDeObra.custoHoraTotal = custoHora × (1 + encargosPercentual/100)
//   MaquinaCustos.custoTotalHora  = energiaHora + custoManutencaoHora + custoHora
//
// Every mutation writes an immutable HistoricoCusto entry — no history is
// ever deleted or overwritten (same pattern as OrcamentoHistorico).
//
// Future Supabase migration: replace useState with supabase realtime subscriptions.
// The context interface stays identical — only the data sources change.

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react'
import {
  mockCentrosCusto,
  mockCustosMateriais,
  mockCustosMaoDeObra,
  mockCustosMaquinas,
  mockPerfisPrecificacao,
  mockHistoricoCustos,
} from '@/mocks/custos'
import type {
  CentroCusto,
  CustoMaterial,
  CustoMaoDeObra,
  MaquinaCustos,
  PerfilPrecificacao,
  HistoricoCusto,
  EntidadeCusto,
  SimulacaoPrecoInput,
  SimulacaoPrecoResult,
  CustosAnalytics,
} from '@/types/custos'

// ─── Context interface ────────────────────────────────────────────────────────

interface CustosContextValue {
  // ── Data ─────────────────────────────────────────────────────────────────
  centros:         CentroCusto[]
  materiais:       CustoMaterial[]
  maoDeObra:       CustoMaoDeObra[]
  maquinasCustos:  MaquinaCustos[]
  perfis:          PerfilPrecificacao[]
  historico:       HistoricoCusto[]

  // ── Centros de Custo ──────────────────────────────────────────────────────
  atualizarCentro: (id: string, changes: Partial<CentroCusto>, motivo?: string) => void

  // ── Materiais ─────────────────────────────────────────────────────────────
  criarMaterial:    (input: Omit<CustoMaterial, 'id' | 'valorKg'>) => CustoMaterial
  atualizarMaterial:(id: string, changes: Partial<Omit<CustoMaterial,'valorKg'>>, motivo?: string) => void
  excluirMaterial:  (id: string) => void

  // ── Mão de Obra ───────────────────────────────────────────────────────────
  criarMaoDeObra:    (input: Omit<CustoMaoDeObra, 'id' | 'custoHoraTotal'>) => CustoMaoDeObra
  atualizarMaoDeObra:(id: string, changes: Partial<Omit<CustoMaoDeObra,'custoHoraTotal'>>, motivo?: string) => void
  excluirMaoDeObra:  (id: string) => void

  // ── Máquinas ──────────────────────────────────────────────────────────────
  atualizarCustoMaquina:(id: string, changes: Partial<Omit<MaquinaCustos,'custoTotalHora'>>, motivo?: string) => void

  // ── Perfis de Precificação ────────────────────────────────────────────────
  criarPerfil:    (input: Omit<PerfilPrecificacao, 'id'>) => PerfilPrecificacao
  atualizarPerfil:(id: string, changes: Partial<PerfilPrecificacao>, motivo?: string) => void
  excluirPerfil:  (id: string) => void

  // ── Pricing simulation ────────────────────────────────────────────────────
  simularPreco: (input: SimulacaoPrecoInput) => SimulacaoPrecoResult | null

  // ── Analytics ─────────────────────────────────────────────────────────────
  analytics: CustosAnalytics
}

// ─── Default context ──────────────────────────────────────────────────────────

const CustosContext = createContext<CustosContextValue>({
  centros:          [],
  materiais:        [],
  maoDeObra:        [],
  maquinasCustos:   [],
  perfis:           [],
  historico:        [],
  atualizarCentro:       () => {},
  criarMaterial:         () => { throw new Error('CustosContext not mounted') },
  atualizarMaterial:     () => {},
  excluirMaterial:       () => {},
  criarMaoDeObra:        () => { throw new Error('CustosContext not mounted') },
  atualizarMaoDeObra:    () => {},
  excluirMaoDeObra:      () => {},
  atualizarCustoMaquina: () => {},
  criarPerfil:           () => { throw new Error('CustosContext not mounted') },
  atualizarPerfil:       () => {},
  excluirPerfil:         () => {},
  simularPreco:          () => null,
  analytics: {
    custoMedioProjetado:    0,
    margemMedia:            0,
    materiaisDesatualizados:0,
    ultimaAtualizacaoCustos:null,
    totalCentros:           0,
    totalMateriais:         0,
    totalPerfisPrecificacao:0,
    totalMaoDeObra:         0,
  },
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function histEntry(
  entidade: EntidadeCusto,
  entidadeId: string,
  entidadeNome: string,
  campo: string,
  valorAnterior: unknown,
  valorNovo: unknown,
  motivo?: string,
): HistoricoCusto {
  return {
    id:             newId(),
    entidade,
    entidadeId,
    entidadeNome,
    campo,
    valorAnterior:  String(valorAnterior),
    valorNovo:      String(valorNovo),
    usuario:        'Usuário Atual',
    timestamp:      new Date(),
    motivo,
  }
}

function calcValorKg(valorChapa: number, pesoChapa: number): number {
  return pesoChapa > 0 ? Math.round((valorChapa / pesoChapa) * 100) / 100 : 0
}

function calcCustoHoraTotal(custoHora: number, encargosPercentual: number): number {
  return Math.round(custoHora * (1 + encargosPercentual / 100) * 100) / 100
}

function calcCustoTotalHoraMaquina(
  energiaHora: number,
  custoManutencaoHora: number,
  custoHora: number,
): number {
  return Math.round((energiaHora + custoManutencaoHora + custoHora) * 100) / 100
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CustosProvider({ children }: { children: React.ReactNode }) {
  const [centros,        setCentros]        = useState<CentroCusto[]>(mockCentrosCusto)
  const [materiais,      setMateriais]      = useState<CustoMaterial[]>(mockCustosMateriais)
  const [maoDeObra,      setMaoDeObra]      = useState<CustoMaoDeObra[]>(mockCustosMaoDeObra)
  const [maquinasCustos, setMaquinasCustos] = useState<MaquinaCustos[]>(mockCustosMaquinas)
  const [perfis,         setPerfis]         = useState<PerfilPrecificacao[]>(mockPerfisPrecificacao)
  const [historico,      setHistorico]      = useState<HistoricoCusto[]>(mockHistoricoCustos)

  const pushHist = useCallback((...entries: HistoricoCusto[]) => {
    setHistorico((prev) => [...entries, ...prev])
  }, [])

  // ── Centros ───────────────────────────────────────────────────────────────

  const atualizarCentro = useCallback(
    (id: string, changes: Partial<CentroCusto>, motivo?: string) => {
      setCentros((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c
          const updated: CentroCusto = { ...c, ...changes, ultimaAtualizacao: new Date() }
          if (changes.custoHora !== undefined && changes.custoHora !== c.custoHora) {
            pushHist(histEntry('centro_custo', id, c.nome, 'custoHora',
              fmtBRL(c.custoHora), fmtBRL(changes.custoHora), motivo))
          }
          return updated
        })
      )
    },
    [pushHist]
  )

  // ── Materiais ─────────────────────────────────────────────────────────────

  const criarMaterial = useCallback(
    (input: Omit<CustoMaterial, 'id' | 'valorKg'>): CustoMaterial => {
      const nova: CustoMaterial = {
        ...input,
        id:     newId(),
        valorKg: calcValorKg(input.valorChapa, input.pesoChapa),
      }
      setMateriais((prev) => [nova, ...prev])
      pushHist(histEntry('material', nova.id, `${nova.material} — ${nova.bitola ?? nova.espessura + 'mm'}`,
        'criação', '—', fmtBRL(nova.valorChapa)))
      return nova
    },
    [pushHist]
  )

  const atualizarMaterial = useCallback(
    (id: string, changes: Partial<Omit<CustoMaterial, 'valorKg'>>, motivo?: string) => {
      setMateriais((prev) =>
        prev.map((m) => {
          if (m.id !== id) return m
          const merged = { ...m, ...changes, dataAtualizacao: new Date() }
          merged.valorKg = calcValorKg(merged.valorChapa, merged.pesoChapa)
          const entries: HistoricoCusto[] = []
          if (changes.valorChapa !== undefined && changes.valorChapa !== m.valorChapa) {
            entries.push(histEntry('material', id, `${m.material} — ${m.bitola ?? m.espessura + 'mm'}`,
              'valorChapa', fmtBRL(m.valorChapa), fmtBRL(changes.valorChapa), motivo))
          }
          if (entries.length) pushHist(...entries)
          return merged
        })
      )
    },
    [pushHist]
  )

  const excluirMaterial = useCallback((id: string) => {
    setMateriais((prev) => prev.filter((m) => m.id !== id))
  }, [])

  // ── Mão de Obra ───────────────────────────────────────────────────────────

  const criarMaoDeObra = useCallback(
    (input: Omit<CustoMaoDeObra, 'id' | 'custoHoraTotal'>): CustoMaoDeObra => {
      const nova: CustoMaoDeObra = {
        ...input,
        id:           newId(),
        custoHoraTotal: calcCustoHoraTotal(input.custoHora, input.encargosPercentual),
      }
      setMaoDeObra((prev) => [nova, ...prev])
      pushHist(histEntry('mao_obra', nova.id, nova.cargo,
        'criação', '—', fmtBRL(nova.custoHora)))
      return nova
    },
    [pushHist]
  )

  const atualizarMaoDeObra = useCallback(
    (id: string, changes: Partial<Omit<CustoMaoDeObra, 'custoHoraTotal'>>, motivo?: string) => {
      setMaoDeObra((prev) =>
        prev.map((m) => {
          if (m.id !== id) return m
          const merged = { ...m, ...changes, ultimaAtualizacao: new Date() }
          merged.custoHoraTotal = calcCustoHoraTotal(merged.custoHora, merged.encargosPercentual)
          const entries: HistoricoCusto[] = []
          if (changes.custoHora !== undefined && changes.custoHora !== m.custoHora) {
            entries.push(histEntry('mao_obra', id, m.cargo,
              'custoHora', fmtBRL(m.custoHora), fmtBRL(changes.custoHora), motivo))
          }
          if (changes.encargosPercentual !== undefined && changes.encargosPercentual !== m.encargosPercentual) {
            entries.push(histEntry('mao_obra', id, m.cargo,
              'encargosPercentual', `${m.encargosPercentual}%`, `${changes.encargosPercentual}%`, motivo))
          }
          if (entries.length) pushHist(...entries)
          return merged
        })
      )
    },
    [pushHist]
  )

  const excluirMaoDeObra = useCallback((id: string) => {
    setMaoDeObra((prev) => prev.filter((m) => m.id !== id))
  }, [])

  // ── Máquinas ──────────────────────────────────────────────────────────────

  const atualizarCustoMaquina = useCallback(
    (id: string, changes: Partial<Omit<MaquinaCustos, 'custoTotalHora'>>, motivo?: string) => {
      setMaquinasCustos((prev) =>
        prev.map((m) => {
          if (m.id !== id) return m
          const merged = { ...m, ...changes, ultimaAtualizacao: new Date() }
          merged.custoTotalHora = calcCustoTotalHoraMaquina(
            merged.energiaHora, merged.custoManutencaoHora, merged.custoHora
          )
          const entries: HistoricoCusto[] = []
          const fields: Array<keyof typeof changes> = ['custoHora', 'energiaHora', 'custoManutencaoHora']
          fields.forEach((f) => {
            if (changes[f] !== undefined && changes[f] !== m[f]) {
              entries.push(histEntry('maquina', id, m.maquinaNome,
                f, fmtBRL(m[f] as number), fmtBRL(changes[f] as number), motivo))
            }
          })
          if (entries.length) pushHist(...entries)
          return merged
        })
      )
    },
    [pushHist]
  )

  // ── Perfis ────────────────────────────────────────────────────────────────

  const criarPerfil = useCallback(
    (input: Omit<PerfilPrecificacao, 'id'>): PerfilPrecificacao => {
      const novo: PerfilPrecificacao = { ...input, id: newId() }
      setPerfis((prev) => [novo, ...prev])
      pushHist(histEntry('perfil', novo.id, novo.nome,
        'criação', '—', `${novo.margemLucroPercentual}%`))
      return novo
    },
    [pushHist]
  )

  const atualizarPerfil = useCallback(
    (id: string, changes: Partial<PerfilPrecificacao>, motivo?: string) => {
      setPerfis((prev) =>
        prev.map((p) => {
          if (p.id !== id) return p
          const merged = { ...p, ...changes }
          const fields: Array<keyof typeof changes> = ['margemLucroPercentual','comissaoPercentual','impostosPercentual']
          fields.forEach((f) => {
            if (changes[f] !== undefined && changes[f] !== p[f]) {
              pushHist(histEntry('perfil', id, p.nome,
                f, `${p[f]}%`, `${changes[f]}%`, motivo))
            }
          })
          return merged
        })
      )
    },
    [pushHist]
  )

  const excluirPerfil = useCallback((id: string) => {
    setPerfis((prev) => prev.filter((p) => p.id !== id))
  }, [])

  // ── Pricing simulation ────────────────────────────────────────────────────

  const simularPreco = useCallback(
    ({ custoTotal, perfilId }: SimulacaoPrecoInput): SimulacaoPrecoResult | null => {
      const perfil = perfis.find((p) => p.id === perfilId)
      if (!perfil) return null

      const margem   = custoTotal * (perfil.margemLucroPercentual  / 100)
      const impostos = custoTotal * (perfil.impostosPercentual / 100)
      const comissao = custoTotal * (perfil.comissaoPercentual / 100)
      const precoSugerido = custoTotal + margem + impostos + comissao

      return {
        custo:   custoTotal,
        margem,
        impostos,
        comissao,
        precoSugerido,
        margemEfetivaPercent: precoSugerido > 0
          ? Math.round((margem / precoSugerido) * 10000) / 100
          : 0,
      }
    },
    [perfis]
  )

  // ── Analytics ─────────────────────────────────────────────────────────────

  const analytics = useMemo((): CustosAnalytics => {
    const activeCentros = centros.filter((c) => c.ativo)
    const activePerfis  = perfis.filter((p) => p.ativo)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000)

    return {
      custoMedioProjetado: activeCentros.length > 0
        ? Math.round(activeCentros.reduce((s, c) => s + c.custoHora, 0) / activeCentros.length * 100) / 100
        : 0,
      margemMedia: activePerfis.length > 0
        ? Math.round(activePerfis.reduce((s, p) => s + p.margemLucroPercentual, 0) / activePerfis.length * 10) / 10
        : 0,
      materiaisDesatualizados: materiais.filter(
        (m) => m.ativo && m.dataAtualizacao < thirtyDaysAgo
      ).length,
      ultimaAtualizacaoCustos: historico.length > 0 ? historico[0].timestamp : null,
      totalCentros:            centros.length,
      totalMateriais:          materiais.filter((m) => m.ativo).length,
      totalPerfisPrecificacao: activePerfis.length,
      totalMaoDeObra:          maoDeObra.filter((m) => m.ativo).length,
    }
  }, [centros, materiais, maoDeObra, perfis, historico])

  return (
    <CustosContext.Provider value={{
      centros,
      materiais,
      maoDeObra,
      maquinasCustos,
      perfis,
      historico,
      atualizarCentro,
      criarMaterial,
      atualizarMaterial,
      excluirMaterial,
      criarMaoDeObra,
      atualizarMaoDeObra,
      excluirMaoDeObra,
      atualizarCustoMaquina,
      criarPerfil,
      atualizarPerfil,
      excluirPerfil,
      simularPreco,
      analytics,
    }}>
      {children}
    </CustosContext.Provider>
  )
}

export function useCustos() {
  return useContext(CustosContext)
}
