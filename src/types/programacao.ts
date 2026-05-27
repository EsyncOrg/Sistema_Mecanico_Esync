// ─── Programação Module — Type Definitions ───────────────────────────────────
// Central CNC programming management — integrates with Desenvolvimento, Corte,
// Estoque, and future IA analysis. Architecture prepared for Supabase migration.

export type ProgramacaoStatus = 'pendente' | 'em_programacao' | 'finalizado' | 'cancelado'
export type PrioridadeProg    = 'urgente' | 'alta' | 'normal' | 'baixa'
export type RetalhoTipo       = 'chapa_inteira' | 'retalho'
export type HistoricoTipoProg = 'criacao' | 'inicio' | 'conclusao' | 'reutilizacao' | 'alteracao' | 'cancelamento'
export type AtividadeTipoProg = 'novo_pendente' | 'finalizado' | 'retalho' | 'reutilizacao' | 'inicio_programacao' | 'cancelamento'

// ─── OS Distribution ──────────────────────────────────────────────────────────
// A single OS allocation row inside a piece. sum(osDistribuicao[].quantidade)
// MUST equal PecaPrograma.quantidade — enforced on "Concluir".
// Used for: time distribution per OS, cost allocation, routing, IA analysis.

export interface OSDistribuicaoProg {
  id: string
  /** e.g. "OS:1508" */
  os: string
  quantidade: number
}

// ─── Piece inside a CNC program ───────────────────────────────────────────────

export interface PecaPrograma {
  id: string
  codigo: string
  descricao: string
  quantidade: number
  material?: string
  espessura?: number
  observacoes?: string
  processos?: string[]
  osDistribuicao: OSDistribuicaoProg[]
}

// ─── Retalho (scrap/remnant) tracking ────────────────────────────────────────

export interface RetalhoUtilizado {
  tipo: RetalhoTipo
  codigo?: string
  largura?: number     // mm
  comprimento?: number // mm
  espessura?: number   // mm
}

export interface RetalhoGerado {
  gerou: boolean
  codigo?: string
  largura?: number
  comprimento?: number
  espessura?: number
}

// ─── History entry ────────────────────────────────────────────────────────────

export interface HistoricoEntradaProg {
  id: string
  tipo: HistoricoTipoProg
  timestamp: Date
  operador: string
  descricao: string
  programaId: string
  programaNome?: string
  programaCodigo?: string
}

// ─── Solicitação (request from Desenvolvimento) ───────────────────────────────

export interface SolicitacaoProgramacao {
  id: string
  titulo: string
  cliente: string
  numeroOS: string
  solicitante: string
  dataCriacao: Date
  prioridade: PrioridadeProg
  pecas: PecaPrograma[]
  setores: string[]
  osEnvolvidas: string[]
  observacoes: string
  status: ProgramacaoStatus
  programaId?: string
  origemDesenvolvimentoId?: string
}

// ─── CNC Program ──────────────────────────────────────────────────────────────

export interface ProgramaCNC {
  id: string
  nome: string
  codigo: string
  dataCriacao: Date
  dataUltimaExecucao?: Date
  dataInicio?: Date
  dataConclusao?: Date
  programador: string
  pecas: PecaPrograma[]
  /** Global OS numbers for this program — individual distribution still per piece */
  osGerais: string[]
  retalhoUtilizado: RetalhoUtilizado
  retalhoGerado: RetalhoGerado
  observacoes: string
  status: ProgramacaoStatus
  /** Incremented on each reuse — NEVER reset */
  numeroExecucoes: number
  solicitacaoId?: string
  tempoEstimadoMin?: number
  tempoRealMin?: number
  historico: HistoricoEntradaProg[]
}

// ─── Activity feed item ───────────────────────────────────────────────────────

export interface AtividadeProg {
  id: string
  mensagem: string
  tipo: AtividadeTipoProg
  timestamp: Date
}

// ─── Input accepted from Desenvolvimento page ─────────────────────────────────
// Kept loose to avoid circular type dependency.

export interface SolicitacaoFromDesenv {
  titulo: string
  cliente: string
  numeroOS: string
  prioridade: 'alta' | 'media' | 'baixa'
  observacoes: string
  responsavel: string
  pecas: {
    id: string
    codigo: string
    descricao: string
    quantidade: number
    material?: string
    espessura?: number
    observacoes?: string
    processos?: string[]
    osDistribuicao?: { id: string; numeroOS: string; quantidade: number }[]
  }[]
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface ProgramadorStats {
  nome: string
  programas: number
  tempoMedio: number
  eficiencia: number
}

export interface OSTempoStat {
  os: string
  tempoMin: number
  programas: number
}
