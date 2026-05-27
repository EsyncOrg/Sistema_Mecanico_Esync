// ─── Desenvolvimento Module Types ────────────────────────────────────────────
// Represents the beginning of the industrial flow:
// Desenvolvimento → Programação → Corte → Dobra → Solda → ...

export type StatusDesenvolvimento =
  | 'pendente'
  | 'em_desenvolvimento'
  | 'pausado'
  | 'aguardando_aprovacao'
  | 'finalizado'

export type PrioridadeDesenvolvimento = 'alta' | 'media' | 'baixa'

/** Sectors a piece may pass through — ordered by typical process flow */
export type SetorProcesso = 'corte' | 'dobra' | 'solda' | 'pintura' | 'montagem'

// ─── Timing ──────────────────────────────────────────────────────────────────

export interface PausaDesenvolvimento {
  id: string
  motivo: string
  inicio: Date
  fim: Date | null
  duracao: number | null // seconds; null while still open
}

// ─── OS Distribution ─────────────────────────────────────────────────────────
// A single OS allocation row inside a piece.
// The sum of all OsDistribuicao.quantidade for a given piece MUST equal
// PecaSolicitacao.quantidade. This constraint will later be used for:
//   - time distribution by OS (analytics)
//   - stock allocation per OS
//   - production tracking per order
//   - manufacturing cost calculations
//   - AI efficiency analysis

export interface OsDistribuicao {
  id: string
  /** e.g. "OS:1540" */
  numeroOS: string
  /** Quantity of this piece allocated to this OS */
  quantidade: number
}

// ─── Piece in a production request ───────────────────────────────────────────

export interface PecaSolicitacao {
  id: string
  codigo: string
  descricao: string
  /** Total quantity across all OS allocations */
  quantidade: number
  material: string
  espessura: number
  observacoes: string
  /** Which sectors this piece must pass through */
  processos: SetorProcesso[]
  /**
   * OS distribution for this piece.
   * Invariant: sum(osDistribuicao[].quantidade) === quantidade
   * Future use: time distribution, stock allocation, production routing per OS
   */
  osDistribuicao: OsDistribuicao[]
}

// ─── Future: Conjunto reference ───────────────────────────────────────────────
// Architecture prepared for the upcoming Conjuntos module.
// When implemented, a ConjuntoRef will load all component pieces automatically,
// multiply quantities by quantidadeMultiplier, verify stock, and send only
// missing quantities to production.
export interface ConjuntoRef {
  id: string
  codigo: string
  descricao: string
  quantidadeBase: number
  // Future fields:
  // quantidadeMultiplier?: number
  // pecasCarregadas?: PecaSolicitacao[]   // populated from ConjuntoContext
  // estoqueVerificado?: boolean
}

// ─── Production request (Nova Solicitação) ───────────────────────────────────

export interface SolicitacaoProducao {
  id: string
  /** Human-readable title, e.g. "Painel Elétrico Cliente X", "Estrutura Linha 04" */
  titulo: string
  cliente: string
  /** Primary OS for this request (overall reference) */
  numeroOS: string
  descricao: string
  prioridade: PrioridadeDesenvolvimento
  observacoes: string
  responsavel: string
  status: StatusDesenvolvimento
  pecas: PecaSolicitacao[]
  /** Future: populated when Conjuntos module is ready */
  conjuntos: ConjuntoRef[]
  criadoEm: Date
  iniciadoEm: Date | null
  finalizadoEm: Date | null
  pausas: PausaDesenvolvimento[]
  // Future integration points (set after routing to production):
  // programacaoId?: string
  // corteIds?: string[]
  // dobraIds?: string[]
  // soldaIds?: string[]
}

// ─── Development task (Desenvolvimento de Peças) ─────────────────────────────

export interface TarefaDesenvolvimento {
  id: string
  codigoPeca: string
  descricao: string
  cliente: string
  numeroOS: string
  prioridade: PrioridadeDesenvolvimento
  responsavel: string
  observacoesTecnicas: string
  status: StatusDesenvolvimento
  criadoEm: Date
  iniciadoEm: Date | null
  finalizadoEm: Date | null
  pausas: PausaDesenvolvimento[]
  processos: SetorProcesso[]
  /** Link back to the originating production request, if any */
  solicitacaoId?: string
}

// ─── Input for creating a new development task ───────────────────────────────

export interface NovaTarefaDevInput {
  codigoPeca: string
  descricao: string
  cliente: string
  numeroOS: string
  prioridade: PrioridadeDesenvolvimento
  responsavel: string
  observacoesTecnicas: string
  processos: SetorProcesso[]
}
