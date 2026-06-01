'use client'

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react'
import { mockOrcamentos } from '@/mocks/orcamentos'
import type {
  Orcamento,
  OrcamentoItem,
  OrcamentoHistorico,
  OrcamentoRevisao,
  OrcamentosAnalytics,
  OrcamentoFiltros,
  NovoOrcamentoInput,
  StatusOrcamento,
} from '@/types/orcamentos'

// ─── Context interface ────────────────────────────────────────────────────────

interface OrcamentosContextValue {
  orcamentos: Orcamento[]
  /** Next auto-generated numero — for preview in the create modal */
  proximoNumero: string

  // ── CRUD ──────────────────────────────────────────────────────────────────
  criarOrcamento:   (input: NovoOrcamentoInput) => Orcamento
  atualizarOrcamento: (id: string, changes: Partial<Orcamento>) => void
  excluirOrcamento: (id: string) => void
  getById:          (id: string) => Orcamento | undefined

  // ── Status lifecycle ──────────────────────────────────────────────────────
  enviarOrcamento:     (id: string) => void
  aprovarOrcamento:    (id: string) => void
  reprovarOrcamento:   (id: string, motivo: string) => void
  cancelarOrcamento:   (id: string, motivo: string) => void
  reabrirOrcamento:    (id: string) => void

  // ── Revision control ──────────────────────────────────────────────────────
  criarRevisao: (id: string, motivo: string) => OrcamentoRevisao

  // ── Items ─────────────────────────────────────────────────────────────────
  adicionarItem:  (orcamentoId: string, item: Omit<OrcamentoItem, 'id' | 'orcamentoId' | 'valorTotal'>) => void
  removerItem:    (orcamentoId: string, itemId: string) => void
  atualizarItem:  (orcamentoId: string, itemId: string, changes: Partial<OrcamentoItem>) => void

  // ── Analytics (computed) ──────────────────────────────────────────────────
  analytics: OrcamentosAnalytics

  // ── Filtering ─────────────────────────────────────────────────────────────
  filtros:       OrcamentoFiltros
  setFiltros:    (f: OrcamentoFiltros) => void
  filtrados:     Orcamento[]
}

// ─── Context ─────────────────────────────────────────────────────────────────

const OrcamentosContext = createContext<OrcamentosContextValue>({
  orcamentos:          [],
  proximoNumero:       `ORC-${new Date().getFullYear()}-00001`,
  criarOrcamento:      () => { throw new Error('OrcamentosContext not mounted') },
  atualizarOrcamento:  () => {},
  excluirOrcamento:    () => {},
  getById:             () => undefined,
  enviarOrcamento:     () => {},
  aprovarOrcamento:    () => {},
  reprovarOrcamento:   () => {},
  cancelarOrcamento:   () => {},
  reabrirOrcamento:    () => {},
  criarRevisao:        () => { throw new Error('OrcamentosContext not mounted') },
  adicionarItem:       () => {},
  removerItem:         () => {},
  atualizarItem:       () => {},
  analytics:           {
    totalOrcamentos:    0,
    emElaboracao:       0,
    enviados:           0,
    aprovados:          0,
    reprovados:         0,
    cancelados:         0,
    valorTotal:         0,
    valorTotalAprovado: 0,
    valorTotalEnviado:  0,
    taxaAprovacao:      0,
    ticketMedio:        0,
  },
  filtros:   { status: 'todos' },
  setFiltros: () => {},
  filtrados:  [],
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nextOrcNum(existing: Orcamento[]): string {
  const year = new Date().getFullYear()
  const max  = existing
    .map((o) => parseInt(o.numero.split('-')[2] ?? '0', 10))
    .reduce((a, b) => Math.max(a, b), 0)
  return `ORC-${year}-${String(max + 1).padStart(5, '0')}`
}

function newId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function histEntry(
  orcamentoId: string,
  tipo: OrcamentoHistorico['tipo'],
  descricao: string,
  usuario = 'Sistema',
): OrcamentoHistorico {
  return { id: newId(), orcamentoId, tipo, descricao, usuario, timestamp: new Date() }
}

function recalcTotal(itens: OrcamentoItem[]): number {
  return itens.reduce((s, i) => s + i.valorTotal, 0)
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function OrcamentosProvider({ children }: { children: React.ReactNode }) {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>(mockOrcamentos)
  const [filtros,    setFiltros]    = useState<OrcamentoFiltros>({ status: 'todos' })

  // ── Mutate helper ─────────────────────────────────────────────────────────

  const mutate = useCallback((id: string, fn: (o: Orcamento) => Orcamento) => {
    setOrcamentos((prev) =>
      prev.map((o) => (o.id === id ? fn(o) : o))
    )
  }, [])

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const criarOrcamento = useCallback((input: NovoOrcamentoInput): Orcamento => {
    const id = newId()
    const orcamento: Orcamento = {
      id,
      numero:           nextOrcNum(orcamentos),
      titulo:           input.titulo,
      status:           'em_elaboracao',
      prioridade:       input.prioridade,
      moeda:            input.moeda,
      cliente:          input.cliente,
      itens:            input.itens.map((i, idx) => ({
        ...i,
        id:          newId(),
        orcamentoId: id,
        posicao:     idx + 1,
        valorTotal:  i.quantidade * i.valorUnitario,
      })),
      revisoes:         [],
      historico:        [histEntry(id, 'criacao', 'Orçamento criado')],
      conjuntoIds:      input.conjuntoIds ?? [],
      valorTotal:       0,
      validadeAte:      input.validadeAte,
      condicoesPagamento: input.condicoesPagamento,
      prazoEntrega:     input.prazoEntrega,
      revisaoAtual:     0,
      descricao:        input.descricao,
      observacoes:      input.observacoes,
      observacoesInternas: input.observacoesInternas,
      responsavel:      'Usuário Atual',
      criadoPor:        'Usuário Atual',
      criadoEm:         new Date(),
      atualizadoEm:     new Date(),
    }
    orcamento.valorTotal = recalcTotal(orcamento.itens)
    setOrcamentos((prev) => [orcamento, ...prev])
    return orcamento
  }, [orcamentos])

  const atualizarOrcamento = useCallback((id: string, changes: Partial<Orcamento>) => {
    mutate(id, (o) => {
      const updated = { ...o, ...changes, atualizadoEm: new Date() }
      updated.valorTotal = recalcTotal(updated.itens)
      return updated
    })
  }, [mutate])

  const excluirOrcamento = useCallback((id: string) => {
    setOrcamentos((prev) => prev.filter((o) => o.id !== id))
  }, [])

  const getById = useCallback(
    (id: string) => orcamentos.find((o) => o.id === id),
    [orcamentos]
  )

  // ── Status lifecycle ──────────────────────────────────────────────────────

  const transitionStatus = useCallback(
    (id: string, status: StatusOrcamento, histTipo: OrcamentoHistorico['tipo'], histDesc: string, extra?: Partial<Orcamento>) => {
      mutate(id, (o) => ({
        ...o,
        ...extra,
        status,
        atualizadoEm: new Date(),
        historico: [...o.historico, histEntry(id, histTipo, histDesc)],
      }))
    },
    [mutate]
  )

  const enviarOrcamento = useCallback((id: string) => {
    transitionStatus(id, 'enviado', 'envio', 'Orçamento enviado ao cliente', { enviadoEm: new Date() })
  }, [transitionStatus])

  const aprovarOrcamento = useCallback((id: string) => {
    transitionStatus(id, 'aprovado', 'aprovacao', 'Orçamento aprovado pelo cliente', { aprovadoEm: new Date() })
  }, [transitionStatus])

  const reprovarOrcamento = useCallback((id: string, motivo: string) => {
    transitionStatus(id, 'reprovado', 'reprovacao', `Reprovado: ${motivo}`, { reprovadoEm: new Date() })
  }, [transitionStatus])

  const cancelarOrcamento = useCallback((id: string, motivo: string) => {
    transitionStatus(id, 'cancelado', 'cancelamento', `Cancelado: ${motivo}`, { canceladoEm: new Date() })
  }, [transitionStatus])

  const reabrirOrcamento = useCallback((id: string) => {
    transitionStatus(id, 'em_elaboracao', 'edicao', 'Orçamento reaberto para edição')
  }, [transitionStatus])

  // ── Revision control ──────────────────────────────────────────────────────

  const criarRevisao = useCallback((id: string, motivo: string): OrcamentoRevisao => {
    let revisao!: OrcamentoRevisao
    mutate(id, (o) => {
      revisao = {
        id:          newId(),
        orcamentoId: id,
        numero:      o.revisaoAtual + 1,
        criadoEm:    new Date(),
        criadoPor:   'Usuário Atual',
        motivo,
        snapshot: {
          itens:       o.itens,
          valorTotal:  o.valorTotal,
          observacoes: o.observacoes,
          validadeAte: o.validadeAte,
        },
      }
      return {
        ...o,
        revisaoAtual: revisao.numero,
        revisoes:     [...o.revisoes, revisao],
        historico:    [...o.historico, histEntry(id, 'revisao', `Revisão ${revisao.numero} criada: ${motivo}`)],
        atualizadoEm: new Date(),
      }
    })
    return revisao
  }, [mutate])

  // ── Items ─────────────────────────────────────────────────────────────────

  const adicionarItem = useCallback(
    (orcamentoId: string, input: Omit<OrcamentoItem, 'id' | 'orcamentoId' | 'valorTotal'>) => {
      mutate(orcamentoId, (o) => {
        const newItem: OrcamentoItem = {
          ...input,
          id:          newId(),
          orcamentoId,
          valorTotal:  input.quantidade * input.valorUnitario,
        }
        const itens = [...o.itens, newItem]
        return { ...o, itens, valorTotal: recalcTotal(itens), atualizadoEm: new Date() }
      })
    },
    [mutate]
  )

  const removerItem = useCallback((orcamentoId: string, itemId: string) => {
    mutate(orcamentoId, (o) => {
      const itens = o.itens.filter((i) => i.id !== itemId)
      return { ...o, itens, valorTotal: recalcTotal(itens), atualizadoEm: new Date() }
    })
  }, [mutate])

  const atualizarItem = useCallback(
    (orcamentoId: string, itemId: string, changes: Partial<OrcamentoItem>) => {
      mutate(orcamentoId, (o) => {
        const itens = o.itens.map((i) => {
          if (i.id !== itemId) return i
          const updated = { ...i, ...changes }
          updated.valorTotal = updated.quantidade * updated.valorUnitario
          return updated
        })
        return { ...o, itens, valorTotal: recalcTotal(itens), atualizadoEm: new Date() }
      })
    },
    [mutate]
  )

  // ── Analytics ─────────────────────────────────────────────────────────────

  const analytics = useMemo((): OrcamentosAnalytics => {
    const aprovados  = orcamentos.filter((o) => o.status === 'aprovado')
    const enviados   = orcamentos.filter((o) => o.status === 'enviado')
    const decididos  = orcamentos.filter((o) => ['aprovado', 'reprovado'].includes(o.status))
    const valAprov   = aprovados.reduce((s, o) => s + o.valorTotal, 0)
    const valEnv     = enviados.reduce((s,  o) => s + o.valorTotal, 0)
    return {
      totalOrcamentos:    orcamentos.length,
      emElaboracao:       orcamentos.filter((o) => o.status === 'em_elaboracao').length,
      enviados:           enviados.length,
      aprovados:          aprovados.length,
      reprovados:         orcamentos.filter((o) => o.status === 'reprovado').length,
      cancelados:         orcamentos.filter((o) => o.status === 'cancelado').length,
      valorTotal:         orcamentos.reduce((s, o) => s + o.valorTotal, 0),
      valorTotalAprovado: valAprov,
      valorTotalEnviado:  valEnv,
      taxaAprovacao:      decididos.length > 0
        ? Math.round((aprovados.length / decididos.length) * 100)
        : 0,
      ticketMedio:        aprovados.length > 0 ? valAprov / aprovados.length : 0,
    }
  }, [orcamentos])

  // ── Next number (for create modal preview) ────────────────────────────────

  const proximoNumero = useMemo(() => nextOrcNum(orcamentos), [orcamentos])

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtrados = useMemo(() => {
    return orcamentos.filter((o) => {
      if (filtros.status && filtros.status !== 'todos' && o.status !== filtros.status) return false
      if (filtros.prioridade && filtros.prioridade !== 'todas' && o.prioridade !== filtros.prioridade) return false
      if (filtros.responsavel && !o.responsavel.toLowerCase().includes(filtros.responsavel.toLowerCase())) return false
      if (filtros.clienteNome && !o.cliente.nome.toLowerCase().includes(filtros.clienteNome.toLowerCase())) return false
      if (filtros.periodoInicio  && o.criadoEm     < filtros.periodoInicio)  return false
      if (filtros.periodoFim    && o.criadoEm     > filtros.periodoFim)    return false
      if (filtros.validadeInicio && o.validadeAte < filtros.validadeInicio) return false
      if (filtros.validadeFim   && o.validadeAte  > filtros.validadeFim)   return false
      return true
    })
  }, [orcamentos, filtros])

  return (
    <OrcamentosContext.Provider value={{
      orcamentos,
      proximoNumero,
      criarOrcamento,
      atualizarOrcamento,
      excluirOrcamento,
      getById,
      enviarOrcamento,
      aprovarOrcamento,
      reprovarOrcamento,
      cancelarOrcamento,
      reabrirOrcamento,
      criarRevisao,
      adicionarItem,
      removerItem,
      atualizarItem,
      analytics,
      filtros,
      setFiltros,
      filtrados,
    }}>
      {children}
    </OrcamentosContext.Provider>
  )
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useOrcamentos() {
  return useContext(OrcamentosContext)
}
