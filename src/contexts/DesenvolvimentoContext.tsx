'use client'

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react'
import {
  mockTarefasDesenvolvimento,
  mockSolicitacoes,
} from '@/mocks/desenvolvimento'
import type {
  TarefaDesenvolvimento,
  SolicitacaoProducao,
  NovaTarefaDevInput,
  StatusDesenvolvimento,
} from '@/types/desenvolvimento'

// ─── Context interface ────────────────────────────────────────────────────────

interface DesenvolvimentoContextValue {
  tarefas: TarefaDesenvolvimento[]
  solicitacoes: SolicitacaoProducao[]

  // Task lifecycle
  criarTarefa: (input: NovaTarefaDevInput) => TarefaDesenvolvimento
  iniciarDesenvolvimento: (id: string) => void
  pausarDesenvolvimento: (id: string, motivo: string) => void
  retomarDesenvolvimento: (id: string) => void
  enviarParaAprovacao: (id: string) => void
  finalizarDesenvolvimento: (id: string) => void

  // Production request lifecycle
  criarSolicitacao: (
    input: Omit<SolicitacaoProducao, 'id' | 'criadoEm' | 'iniciadoEm' | 'finalizadoEm' | 'pausas' | 'status'>
  ) => void
}

// ─── Context ─────────────────────────────────────────────────────────────────

const DesenvolvimentoContext = createContext<DesenvolvimentoContextValue>({
  tarefas: [],
  solicitacoes: [],
  criarTarefa: () => { throw new Error('DesenvolvimentoContext not mounted') },
  iniciarDesenvolvimento: () => {},
  pausarDesenvolvimento: () => {},
  retomarDesenvolvimento: () => {},
  enviarParaAprovacao: () => {},
  finalizarDesenvolvimento: () => {},
  criarSolicitacao: () => {},
})

// ─── Provider ────────────────────────────────────────────────────────────────

export function DesenvolvimentoProvider({ children }: { children: React.ReactNode }) {
  const [tarefas, setTarefas] = useState<TarefaDesenvolvimento[]>(mockTarefasDesenvolvimento)
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoProducao[]>(mockSolicitacoes)

  // ── Helpers ────────────────────────────────────────────────────────────────

  const updateTarefa = useCallback(
    (id: string, updater: (t: TarefaDesenvolvimento) => TarefaDesenvolvimento) => {
      setTarefas((prev) => prev.map((t) => (t.id === id ? updater(t) : t)))
    },
    []
  )

  // ── Task lifecycle ─────────────────────────────────────────────────────────

  const criarTarefa = useCallback((input: NovaTarefaDevInput): TarefaDesenvolvimento => {
    const nova: TarefaDesenvolvimento = {
      id: `dev-${Date.now()}`,
      codigoPeca: input.codigoPeca,
      descricao: input.descricao,
      cliente: input.cliente,
      numeroOS: input.numeroOS,
      prioridade: input.prioridade,
      responsavel: input.responsavel,
      observacoesTecnicas: input.observacoesTecnicas,
      status: 'pendente',
      criadoEm: new Date(),
      iniciadoEm: null,
      finalizadoEm: null,
      pausas: [],
      processos: input.processos,
    }
    setTarefas((prev) => [nova, ...prev])
    return nova
  }, [])

  const iniciarDesenvolvimento = useCallback((id: string) => {
    updateTarefa(id, (t) => ({
      ...t,
      status: 'em_desenvolvimento' as StatusDesenvolvimento,
      iniciadoEm: t.iniciadoEm ?? new Date(),
    }))
  }, [updateTarefa])

  const pausarDesenvolvimento = useCallback((id: string, motivo: string) => {
    updateTarefa(id, (t) => ({
      ...t,
      status: 'pausado' as StatusDesenvolvimento,
      pausas: [
        ...t.pausas,
        {
          id: `pd-${Date.now()}`,
          motivo,
          inicio: new Date(),
          fim: null,
          duracao: null,
        },
      ],
    }))
  }, [updateTarefa])

  const retomarDesenvolvimento = useCallback((id: string) => {
    updateTarefa(id, (t) => ({
      ...t,
      status: 'em_desenvolvimento' as StatusDesenvolvimento,
      pausas: t.pausas.map((p) => {
        if (p.fim !== null) return p
        const fim = new Date()
        const duracao = Math.floor((fim.getTime() - p.inicio.getTime()) / 1000)
        return { ...p, fim, duracao }
      }),
    }))
  }, [updateTarefa])

  const enviarParaAprovacao = useCallback((id: string) => {
    updateTarefa(id, (t) => ({
      ...t,
      status: 'aguardando_aprovacao' as StatusDesenvolvimento,
    }))
  }, [updateTarefa])

  const finalizarDesenvolvimento = useCallback((id: string) => {
    updateTarefa(id, (t) => ({
      ...t,
      status: 'finalizado' as StatusDesenvolvimento,
      finalizadoEm: new Date(),
    }))
  }, [updateTarefa])

  // ── Production request lifecycle ───────────────────────────────────────────

  const criarSolicitacao = useCallback(
    (
      input: Omit<SolicitacaoProducao, 'id' | 'criadoEm' | 'iniciadoEm' | 'finalizadoEm' | 'pausas' | 'status'>
    ) => {
      const nova: SolicitacaoProducao = {
        ...input,
        id: `sol-${Date.now()}`,
        status: 'pendente',
        criadoEm: new Date(),
        iniciadoEm: null,
        finalizadoEm: null,
        pausas: [],
      }
      setSolicitacoes((prev) => [nova, ...prev])
    },
    []
  )

  return (
    <DesenvolvimentoContext.Provider
      value={{
        tarefas,
        solicitacoes,
        criarTarefa,
        iniciarDesenvolvimento,
        pausarDesenvolvimento,
        retomarDesenvolvimento,
        enviarParaAprovacao,
        finalizarDesenvolvimento,
        criarSolicitacao,
      }}
    >
      {children}
    </DesenvolvimentoContext.Provider>
  )
}

export function useDesenvolvimento() {
  return useContext(DesenvolvimentoContext)
}
