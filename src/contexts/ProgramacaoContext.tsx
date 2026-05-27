'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'

// ─── Unique ID helper ─────────────────────────────────────────────────────────
// Uses crypto.randomUUID() when available (browser + Node ≥15).
// Fallback combines timestamp + random suffix, safe for SSR/SSG.
function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
import {
  mockSolicitacoesProg,
  mockProgramasEmAndamento,
  mockProgramasFinalizados,
  mockAtividadesProg,
  mockHistoricoProg,
} from '@/mocks/programacao'
import type {
  SolicitacaoProgramacao,
  ProgramaCNC,
  AtividadeProg,
  HistoricoEntradaProg,
  PrioridadeProg,
  SolicitacaoFromDesenv,
  RetalhoUtilizado,
  RetalhoGerado,
  PecaPrograma,
} from '@/types/programacao'

// ─── Context interface ────────────────────────────────────────────────────────

interface ProgramacaoContextValue {
  solicitacoes: SolicitacaoProgramacao[]
  programas: ProgramaCNC[]
  atividades: AtividadeProg[]
  historico: HistoricoEntradaProg[]

  /** Called from Desenvolvimento page on "Enviar Solicitação" */
  adicionarDeDesenvolvimento: (input: SolicitacaoFromDesenv) => void

  /** Moves a pending solicitação into em_programacao and creates a ProgramaCNC draft */
  iniciarProgramacao: (solicitacaoId: string, programador: string) => string | null

  /** Finalizes a program, records history, marks available for Corte */
  concluirProgramacao: (
    programaId: string,
    data: {
      nome: string
      codigo: string
      observacoes: string
      osGerais: string[]
      pecas: PecaPrograma[]
      retalhoUtilizado: RetalhoUtilizado
      retalhoGerado: RetalhoGerado
      tempoRealMin?: number
    }
  ) => void

  /** Reuses an existing finalized program (increments execuções) */
  reutilizarPrograma: (programaId: string, novasOs: string[], programador: string) => void

  cancelarSolicitacao: (solicitacaoId: string) => void
}

// ─── Default context ──────────────────────────────────────────────────────────

const ProgramacaoContext = createContext<ProgramacaoContextValue>({
  solicitacoes:   [],
  programas:      [],
  atividades:     [],
  historico:      [],
  adicionarDeDesenvolvimento: () => {},
  iniciarProgramacao:         () => null,
  concluirProgramacao:        () => {},
  reutilizarPrograma:         () => {},
  cancelarSolicitacao:        () => {},
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

const priorMap: Record<'alta' | 'media' | 'baixa', PrioridadeProg> = {
  alta: 'alta', media: 'normal', baixa: 'baixa',
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ProgramacaoProvider({ children }: { children: React.ReactNode }) {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoProgramacao[]>(mockSolicitacoesProg)
  const [programas, setProgramas]       = useState<ProgramaCNC[]>([...mockProgramasEmAndamento, ...mockProgramasFinalizados])
  const [atividades, setAtividades]     = useState<AtividadeProg[]>(mockAtividadesProg)
  const [historico, setHistorico]       = useState<HistoricoEntradaProg[]>(mockHistoricoProg)

  // ── Internal helpers ──────────────────────────────────────────────────────

  const addAtividade = useCallback((mensagem: string, tipo: AtividadeProg['tipo']) => {
    setAtividades((prev) => [
      { id: uid(), mensagem, tipo, timestamp: new Date() },
      ...prev,
    ])
  }, [])

  const addHistorico = useCallback((entry: Omit<HistoricoEntradaProg, 'id'>) => {
    setHistorico((prev) => [{ ...entry, id: uid() }, ...prev])
  }, [])

  // ── Public API ────────────────────────────────────────────────────────────

  const adicionarDeDesenvolvimento = useCallback((input: SolicitacaoFromDesenv) => {
    const id = `sol-prog-${uid()}`
    const osEnvolvidas = [
      input.numeroOS,
      ...new Set(input.pecas.flatMap((p) => (p.osDistribuicao ?? []).map((o) => o.numeroOS))),
    ].filter(Boolean)

    const nova: SolicitacaoProgramacao = {
      id,
      titulo:      input.titulo,
      cliente:     input.cliente,
      numeroOS:    input.numeroOS,
      solicitante: input.responsavel,
      dataCriacao: new Date(),
      prioridade:  priorMap[input.prioridade],
      setores:     [...new Set(input.pecas.flatMap((p) => p.processos ?? []))],
      osEnvolvidas,
      observacoes: input.observacoes,
      status:      'pendente',
      origemDesenvolvimentoId: id,
      pecas: input.pecas.map((p) => ({
        id:       p.id,
        codigo:   p.codigo,
        descricao: p.descricao,
        quantidade: p.quantidade,
        material: p.material,
        espessura: p.espessura,
        observacoes: p.observacoes,
        processos: p.processos,
        osDistribuicao: (p.osDistribuicao ?? []).map((o) => ({
          id:         o.id,
          os:         o.numeroOS,
          quantidade: o.quantidade,
        })),
      })),
    }
    setSolicitacoes((prev) => [nova, ...prev])
    addAtividade(`Nova solicitação pendente recebida: ${input.titulo}.`, 'novo_pendente')
  }, [addAtividade])

  const iniciarProgramacao = useCallback((solicitacaoId: string, programador: string): string | null => {
    const sol = solicitacoes.find((s) => s.id === solicitacaoId)
    if (!sol) { return null }

    const programaId = `prg-${uid()}`
    const seq        = String(programas.length + 200).padStart(3, '0')
    const codigo     = `PRG-${seq}`
    const now        = new Date()

    const novoProg: ProgramaCNC = {
      id:          programaId,
      nome:        sol.titulo,
      codigo,
      dataCriacao: now,
      dataInicio:  now,
      programador,
      pecas:       sol.pecas.map((p) => ({ ...p, osDistribuicao: p.osDistribuicao.map((o) => ({ ...o })) })),
      osGerais:    [...sol.osEnvolvidas],
      retalhoUtilizado: { tipo: 'chapa_inteira' },
      retalhoGerado:    { gerou: false },
      observacoes:      sol.observacoes,
      status:           'em_programacao',
      numeroExecucoes:  1,
      solicitacaoId,
      historico: [
        {
          id:         uid(),
          tipo:       'criacao',
          timestamp:  now,
          operador:   programador,
          descricao:  `Programa criado a partir da solicitação ${sol.numeroOS}`,
          programaId,
          programaNome:  sol.titulo,
          programaCodigo: codigo,
        },
        {
          id:         uid(),
          tipo:       'inicio',
          timestamp:  now,
          operador:   programador,
          descricao:  'Programação iniciada',
          programaId,
          programaCodigo: codigo,
        },
      ],
    }

    setProgramas((prev) => [novoProg, ...prev])
    setSolicitacoes((prev) =>
      prev.map((s) => s.id === solicitacaoId ? { ...s, status: 'em_programacao', programaId } : s)
    )

    addHistorico({ tipo: 'inicio', timestamp: now, operador: programador, descricao: `${codigo} iniciado`, programaId, programaNome: sol.titulo, programaCodigo: codigo })
    addAtividade(`${codigo} entrou em programação — ${programador}.`, 'inicio_programacao')

    return programaId
  }, [solicitacoes, programas.length, addHistorico, addAtividade])

  const concluirProgramacao = useCallback((
    programaId: string,
    data: {
      nome: string; codigo: string; observacoes: string; osGerais: string[]
      pecas: PecaPrograma[]; retalhoUtilizado: RetalhoUtilizado
      retalhoGerado: RetalhoGerado; tempoRealMin?: number
    }
  ) => {
    const now = new Date()
    setProgramas((prev) =>
      prev.map((p) => {
        if (p.id !== programaId) { return p }
        const tempoReal = data.tempoRealMin ?? (p.dataInicio ? Math.round((now.getTime() - p.dataInicio.getTime()) / 60_000) : undefined)
        const entry: HistoricoEntradaProg = {
          id:          uid(),
          tipo:        'conclusao',
          timestamp:   now,
          operador:    p.programador,
          descricao:   `Programação concluída${tempoReal ? ` em ${tempoReal} min` : ''}`,
          programaId,
          programaNome:  data.nome,
          programaCodigo: data.codigo,
        }
        return {
          ...p, ...data,
          status:            'finalizado',
          dataConclusao:     now,
          dataUltimaExecucao: now,
          tempoRealMin:      tempoReal,
          historico:         [...p.historico, entry],
        }
      })
    )
    setSolicitacoes((prev) =>
      prev.map((s) => s.programaId === programaId ? { ...s, status: 'finalizado' } : s)
    )
    const prog = programas.find((p) => p.id === programaId)
    addHistorico({ tipo: 'conclusao', timestamp: now, operador: prog?.programador ?? '', descricao: `${data.codigo} finalizado`, programaId, programaNome: data.nome, programaCodigo: data.codigo })
    addAtividade(`${data.codigo} finalizado. Disponível para Corte.`, 'finalizado')
    if (data.retalhoGerado.gerou && data.retalhoGerado.codigo) {
      addAtividade(`Retalho ${data.retalhoGerado.codigo} gerado no ${data.codigo}.`, 'retalho')
    }
  }, [programas, addHistorico, addAtividade])

  const reutilizarPrograma = useCallback((programaId: string, novasOs: string[], programador: string) => {
    const now = new Date()
    setProgramas((prev) =>
      prev.map((p) => {
        if (p.id !== programaId) { return p }
        const execucoes = p.numeroExecucoes + 1
        const entry: HistoricoEntradaProg = {
          id:        uid(),
          tipo:      'reutilizacao',
          timestamp: now,
          operador:  programador,
          descricao: `Programa reutilizado pela ${execucoes}ª vez — OS: ${novasOs.join(', ')}`,
          programaId,
          programaNome:  p.nome,
          programaCodigo: p.codigo,
        }
        return { ...p, numeroExecucoes: execucoes, dataUltimaExecucao: now, historico: [...p.historico, entry] }
      })
    )
    const prog = programas.find((p) => p.id === programaId)
    addAtividade(`Programa ${prog?.codigo ?? programaId} reutilizado — ${novasOs.join(', ')}.`, 'reutilizacao')
  }, [programas, addAtividade])

  const cancelarSolicitacao = useCallback((solicitacaoId: string) => {
    setSolicitacoes((prev) => prev.map((s) => s.id === solicitacaoId ? { ...s, status: 'cancelado' } : s))
    addAtividade('Solicitação cancelada pelo programador.', 'cancelamento')
  }, [addAtividade])

  return (
    <ProgramacaoContext.Provider value={{
      solicitacoes, programas, atividades, historico,
      adicionarDeDesenvolvimento, iniciarProgramacao,
      concluirProgramacao, reutilizarPrograma, cancelarSolicitacao,
    }}>
      {children}
    </ProgramacaoContext.Provider>
  )
}

export function useProgramacao() {
  return useContext(ProgramacaoContext)
}
