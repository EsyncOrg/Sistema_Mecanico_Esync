// ─── PecaConfiguracaoDisponivel — Phase 7.1 ───────────────────────────────────
//
// Defines which manufacturing configurations are valid options for each piece.
//
// Business rule:
//   NOT all configurations apply to all pieces.
//   This entity explicitly links each Peca to its valid ConfiguracaoFabricacao options.
//
// Architecture:
//   Peca (catalog) ──< PecaConfiguracaoDisponivel >── ConfiguracaoFabricacao
//
// Design notes:
//   - `ConfiguracaoFabricacao.pecaId` already establishes a one-to-many relationship
//   - This entity FORMALIZES availability: a config can exist but not be "available
//     for quotation" (e.g., during price validation, seasonal availability)
//   - `ativo` field allows deactivating an option without deleting the config
//   - Future: per-client availability, per-period pricing windows, BOM-specific options
//
// Future Supabase:
//   Table: peca_configuracoes_disponiveis
//   PK: id (UUID)
//   FK: peca_id → pecas.id
//       configuracao_fabricacao_id → configuracoes_fabricacao.id
//   UNIQUE(peca_id, configuracao_fabricacao_id, empresa_id)

export interface PecaConfiguracaoDisponivel {
  id: string
  /** FK → Peca.id (catalog piece, not PecaConjunto) */
  pecaId: string
  /** FK → ConfiguracaoFabricacao.id */
  configuracaoFabricacaoId: string
  /** Independently controls availability for quotation (separate from config.ativo) */
  ativo: boolean
  criadoEm:    Date
  atualizadoEm:Date
}

// ─── Input for adding availability ───────────────────────────────────────────

export interface NovaPecaConfiguracaoDisponivelInput {
  pecaId:                   string
  configuracaoFabricacaoId: string
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface PecaConfiguracoesDisponivelAnalytics {
  /** Total active entries (peca × config pairs) */
  totalAtivos: number
  /** Pieces that have at least one active configuration available */
  pecasComConfiguracao: number
  /** Configurations used in at least one availability entry */
  configuracoesEmUso: number
}
