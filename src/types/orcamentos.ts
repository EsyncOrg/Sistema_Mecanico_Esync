// ─── Orçamentos Module — Type Definitions ─────────────────────────────────────
// Represents the commercial quoting flow:
//   Orçamento (created) → Enviado (to client) → Aprovado → Desenvolvimento → Produção
//
// Architecture prepared for Supabase migration.
// All foreign key references use ID strings that map to future DB tables.
// Future: add empresaId to every entity for multi-company (SaaS) RLS.

// ─── Enums ────────────────────────────────────────────────────────────────────

/** Lifecycle stages of a quotation */
export type StatusOrcamento =
  | 'em_elaboracao'
  | 'enviado'
  | 'aprovado'
  | 'reprovado'
  | 'cancelado'

export type PrioridadeOrcamento = 'alta' | 'media' | 'baixa'

export type MoedaOrcamento = 'BRL' | 'USD' | 'EUR'

/** Item type — drives which ERP entity is linked */
export type TipoItemOrcamento =
  | 'peca'
  | 'conjunto'
  | 'servico'
  | 'material'
  | 'hora_maquina'
  | 'outro'

export type TipoHistoricoOrcamento =
  | 'criacao'
  | 'edicao'
  | 'envio'
  | 'aprovacao'
  | 'reprovacao'
  | 'cancelamento'
  | 'revisao'
  | 'comentario'

// ─── Cliente Resumo ───────────────────────────────────────────────────────────
// Lightweight client reference embedded in the quotation.
// Future Supabase: replace inline embed with a FK to a `clientes` table.
// The `id` field is the future Supabase UUID primary key.

export interface ClienteResumo {
  /** Future: UUID referencing the `clientes` table */
  id: string
  nome: string
  email?: string
  telefone?: string
  cnpj?: string
  contatoPrincipal?: string
  // Future: empresaId (multi-company), segmento, cidade
}

// ─── Orçamento Item ───────────────────────────────────────────────────────────
// Each line item in a quotation. Links to ERP entities via optional ID references.
// Phase 2: enable cost calculation from linked entities.

export interface OrcamentoItem {
  id: string
  orcamentoId: string
  tipo: TipoItemOrcamento

  // ── ERP Entity References ──────────────────────────────────────────────────
  // Set when this item is linked to an existing ERP record.
  // Future Supabase: foreign keys with ON DELETE SET NULL.
  pecaId?: string       // → src/types/index.ts Peca.id
  conjuntoId?: string   // → src/types/conjuntos.ts Conjunto.id
  maquinaId?: string    // → src/types/index.ts Maquina.id

  // ── Description ───────────────────────────────────────────────────────────
  // Used when item is not linked to an ERP entity (manual entry).
  codigo?: string
  descricao: string
  unidade: string       // 'un' | 'kg' | 'm²' | 'h' | 'ml' | 'conjunto'

  // ── Quantities & Pricing ──────────────────────────────────────────────────
  quantidade: number
  valorUnitario: number    // unit price in BRL (or selected moeda)
  valorTotal: number       // computed: quantidade × valorUnitario

  // ── Future: Cost Breakdown (Phase 3) ──────────────────────────────────────
  // custoMaterial?: number
  // custoMaoObra?: number
  // markupPercent?: number
  // impostos?: number

  observacoes?: string
  posicao: number          // sort order within the quotation
}

// ─── Orçamento Revisão ────────────────────────────────────────────────────────
// Tracks every revision of a quotation.
// A revision is created whenever a sent/approved quote needs to be modified.
// Future: full event sourcing via a Supabase `orcamento_revisoes` table.

export interface OrcamentoRevisao {
  id: string
  orcamentoId: string
  numero: number           // 1, 2, 3… — displayed as "Rev. 01"
  criadoEm: Date
  criadoPor: string        // user name / future: userId FK
  motivo: string           // reason for revision
  /** Immutable snapshot of the quotation state at revision time */
  snapshot: {
    itens: OrcamentoItem[]
    valorTotal: number
    observacoes: string
    validadeAte: Date
  }
}

// ─── Orçamento Histórico ──────────────────────────────────────────────────────
// Append-only activity log for each quotation.
// Future Supabase: `orcamento_historico` table with RLS per empresaId.

export interface OrcamentoHistorico {
  id: string
  orcamentoId: string
  tipo: TipoHistoricoOrcamento
  descricao: string
  usuario: string          // user name / future: userId FK
  timestamp: Date
  dados?: Record<string, unknown>  // serializable payload for future analytics
}

// ─── Orçamento ────────────────────────────────────────────────────────────────
// The main quotation entity.
// Future Supabase table: `orcamentos`
// RLS: empresa_id = auth.jwt()->>'empresa_id'

export interface Orcamento {
  id: string
  /** Human-readable code, e.g. "ORC-2026-001" */
  numero: string
  titulo: string
  status: StatusOrcamento
  prioridade: PrioridadeOrcamento
  moeda: MoedaOrcamento

  // ── Relations ─────────────────────────────────────────────────────────────
  cliente: ClienteResumo
  itens: OrcamentoItem[]
  revisoes: OrcamentoRevisao[]
  historico: OrcamentoHistorico[]

  // ── Future ERP Integration Points ─────────────────────────────────────────
  // These IDs link to other modules. Null until the relationship is activated.
  conjuntoIds: string[]            // Conjuntos referenced in this quote
  solicitacaoProducaoId?: string   // → Desenvolvimento: created when approved
  programacaoId?: string           // → Programação: created when in production
  dashboardAlertId?: string        // → Alert system reference

  // ── Financial ─────────────────────────────────────────────────────────────
  valorTotal: number               // sum of all itens.valorTotal
  validadeAte: Date                // quote expiry date
  condicoesPagamento?: string      // e.g. "30/60/90 dias"
  prazoEntrega?: string            // e.g. "15 dias úteis após aprovação"
  garantia?: string                // e.g. "12 meses contra defeitos de fabricação"
  condicoesComerciais?: string     // general commercial conditions (multi-line)
  observacoesComerciais?: string   // external commercial notes shown in PDF

  // ── Revision Control ──────────────────────────────────────────────────────
  revisaoAtual: number             // current revision number (0 = original)

  // ── Content ───────────────────────────────────────────────────────────────
  descricao: string
  observacoes: string
  observacoesInternas?: string     // internal notes — not shown to client

  // ── Responsibility ────────────────────────────────────────────────────────
  responsavel: string              // user name / future: userId FK
  criadoPor: string

  // ── Timestamps ────────────────────────────────────────────────────────────
  criadoEm: Date
  atualizadoEm: Date
  enviadoEm?: Date
  aprovadoEm?: Date
  reprovadoEm?: Date
  canceladoEm?: Date

  // Future: empresaId for multi-company SaaS
  // empresaId: string
}

// ─── Input Types ──────────────────────────────────────────────────────────────

export interface NovoOrcamentoInput {
  titulo: string
  cliente: ClienteResumo
  prioridade: PrioridadeOrcamento
  descricao: string
  observacoes: string
  observacoesInternas?: string
  validadeAte: Date
  moeda: MoedaOrcamento
  condicoesPagamento?: string
  prazoEntrega?: string
  garantia?: string
  condicoesComerciais?: string
  observacoesComerciais?: string
  conjuntoIds?: string[]
  itens: Omit<OrcamentoItem, 'id' | 'orcamentoId' | 'valorTotal'>[]
}

export interface NovoItemOrcamentoInput {
  tipo: TipoItemOrcamento
  pecaId?: string
  conjuntoId?: string
  maquinaId?: string
  codigo?: string
  descricao: string
  unidade: string
  quantidade: number
  valorUnitario: number
  observacoes?: string
  posicao: number
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface OrcamentosAnalytics {
  totalOrcamentos: number
  emElaboracao: number
  enviados: number
  aprovados: number
  reprovados: number
  cancelados: number
  /** Sum of ALL quote totals regardless of status */
  valorTotal: number
  valorTotalAprovado: number
  valorTotalEnviado: number
  taxaAprovacao: number        // 0–100 %
  ticketMedio: number          // average value of approved quotes
  // Future: por periodo, por cliente, por responsavel, curva ABC
}

// ─── Filter / Search ──────────────────────────────────────────────────────────

export interface OrcamentoFiltros {
  status?: StatusOrcamento | 'todos'
  prioridade?: PrioridadeOrcamento | 'todas'
  responsavel?: string
  clienteNome?: string
  /** Filter by criadoEm range */
  periodoInicio?: Date
  periodoFim?: Date
  /** Filter by validadeAte range */
  validadeInicio?: Date
  validadeFim?: Date
}

// ─── Catalog integration types ────────────────────────────────────────────────
// Used by CatalogSelectorModal — represents an ERP entity ready to be added as
// an OrcamentoItem.  Price (valorUnitario) is always left at 0 for the user to
// fill in; the rest is auto-populated from the catalog source.

export interface CatalogSelection {
  tipo:        TipoItemOrcamento
  pecaId?:     string           // if sourced from Peças
  conjuntoId?: string           // if sourced from Conjuntos
  codigo:      string
  descricao:   string
  unidade:     string
  peso?:       number           // kg — from Peca.peso or Conjunto estimated weight
  grupo?:      string           // Peca.grupo
  familia?:    string           // Peca.familia
  categoria?:  string           // Conjunto.categoria
  // Future: maquinaId (for machine-time items), programaId, etc.
}
