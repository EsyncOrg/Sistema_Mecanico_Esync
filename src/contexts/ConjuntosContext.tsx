'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { mockConjuntos, mockHistoricoConjuntos, mockEstoquePecas } from '@/mocks/conjuntos'
import type {
  Conjunto,
  NovoConjuntoInput,
  ResultadoSimulacao,
  SimulacaoItemEstoque,
  HistoricoConjunto,
} from '@/types/conjuntos'
import type { SetorProcesso } from '@/types/desenvolvimento'

// ─── Context interface ────────────────────────────────────────────────────────

interface ConjuntosContextValue {
  conjuntos: Conjunto[]
  historico: HistoricoConjunto[]

  // Assembly CRUD
  criarConjunto: (input: NovoConjuntoInput) => Conjunto
  atualizarConjunto: (id: string, updates: Partial<Omit<Conjunto, 'id' | 'criadoEm'>>) => void
  excluirConjunto: (id: string) => void

  // Production simulation (pure; uses mock stock internally)
  executarSimulacao: (
    conjuntoId: string,
    quantidade: number,
    estoqueOverride?: Record<string, number>
  ) => ResultadoSimulacao | null
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ConjuntosContext = createContext<ConjuntosContextValue>({
  conjuntos: [],
  historico: [],
  criarConjunto: () => { throw new Error('ConjuntosContext not mounted') },
  atualizarConjunto: () => {},
  excluirConjunto: () => {},
  executarSimulacao: () => null,
})

// ─── Simulation engine (pure function) ───────────────────────────────────────
// Isolated here so it can be unit-tested and later moved server-side.

const PROCESS_ORDER: SetorProcesso[] = ['corte', 'dobra', 'solda', 'pintura', 'montagem']
const MIN_PER_UNIT = 15 // rough estimate: 15 min per unit that needs manufacturing

function runSimulacao(
  conjunto: Conjunto,
  quantidade: number,
  estoqueMap: Record<string, number>
): ResultadoSimulacao {
  const itens: SimulacaoItemEstoque[] = conjunto.pecas.map((peca) => {
    const necessaria = peca.quantidade * quantidade
    const estoque = estoqueMap[peca.codigo] ?? 0
    const disponivel = Math.min(necessaria, estoque)
    const produzir = Math.max(0, necessaria - estoque)
    const pct = necessaria > 0 ? Math.round((disponivel / necessaria) * 100) : 100

    return {
      pecaId:               peca.id,
      codigo:               peca.codigo,
      descricao:            peca.descricao,
      material:             peca.material,
      processos:            peca.processos,
      espessura:            peca.espessura,
      pesoEstimado:         peca.pesoEstimado,
      quantidadeNecessaria: necessaria,
      quantidadeEstoque:    estoque,
      quantidadeDisponivel: disponivel,
      quantidadeProduzir:   produzir,
      percentualEstoque:    pct,
    }
  })

  const totalNecessarias = itens.reduce((s, i) => s + i.quantidadeNecessaria, 0)
  const totalEstoque     = itens.reduce((s, i) => s + i.quantidadeDisponivel, 0)
  const totalProduzir    = itens.reduce((s, i) => s + i.quantidadeProduzir,   0)
  const pctAprov         = totalNecessarias > 0
    ? Math.round((totalEstoque / totalNecessarias) * 100)
    : 100

  // Sectors involved only for items that need production
  const setoresSet = new Set<SetorProcesso>()
  itens.forEach((item) => {
    if (item.quantidadeProduzir > 0) {
      item.processos.forEach((s) => setoresSet.add(s))
    }
  })
  const setores = PROCESS_ORDER.filter((s) => setoresSet.has(s))

  const tempo = totalProduzir * MIN_PER_UNIT
  const peso  = itens.reduce((s, i) => s + i.pesoEstimado * i.quantidadeProduzir, 0)

  return {
    conjuntoId:             conjunto.id,
    conjuntoCodigo:         conjunto.codigo,
    conjuntoNome:           conjunto.nome,
    quantidadeConjuntos:    quantidade,
    itens,
    totalPecasDistintas:    itens.length,
    totalUnidadesNecessarias: totalNecessarias,
    totalUnidadesEstoque:   totalEstoque,
    totalUnidadesProduzir:  totalProduzir,
    percentualAproveitamento: pctAprov,
    setoresEnvolvidos:      setores,
    tempoEstimadoMinutos:   tempo,
    pesoEstimadoTotal:      Math.round(peso * 100) / 100,
    criadoEm:               new Date(),
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConjuntosProvider({ children }: { children: React.ReactNode }) {
  const [conjuntos, setConjuntos] = useState<Conjunto[]>(mockConjuntos)
  const [historico] = useState<HistoricoConjunto[]>(mockHistoricoConjuntos)

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const criarConjunto = useCallback((input: NovoConjuntoInput): Conjunto => {
    const novo: Conjunto = {
      ...input,
      id:  `cnj-${Date.now()}`,
      pecas: input.pecas.map((p, i) => ({
        ...p,
        id: `pcp-new-${Date.now()}-${i}`,
      })),
      status:                  'ativo',
      criadoEm:                new Date(),
      atualizadoEm:            new Date(),
      vezesProduzido:          0,
      quantidadeTotalProduzida:0,
    }
    setConjuntos((prev) => [novo, ...prev])
    return novo
  }, [])

  const atualizarConjunto = useCallback(
    (id: string, updates: Partial<Omit<Conjunto, 'id' | 'criadoEm'>>) => {
      setConjuntos((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, ...updates, atualizadoEm: new Date() } : c
        )
      )
    },
    []
  )

  const excluirConjunto = useCallback((id: string) => {
    setConjuntos((prev) => prev.filter((c) => c.id !== id))
  }, [])

  // ── Simulation ────────────────────────────────────────────────────────────

  const executarSimulacao = useCallback(
    (
      conjuntoId: string,
      quantidade: number,
      estoqueOverride?: Record<string, number>
    ): ResultadoSimulacao | null => {
      const conjunto = conjuntos.find((c) => c.id === conjuntoId)
      if (!conjunto || quantidade <= 0) return null
      const stock = estoqueOverride ?? mockEstoquePecas
      return runSimulacao(conjunto, quantidade, stock)
    },
    [conjuntos]
  )

  return (
    <ConjuntosContext.Provider
      value={{
        conjuntos,
        historico,
        criarConjunto,
        atualizarConjunto,
        excluirConjunto,
        executarSimulacao,
      }}
    >
      {children}
    </ConjuntosContext.Provider>
  )
}

export function useConjuntos() {
  return useContext(ConjuntosContext)
}
