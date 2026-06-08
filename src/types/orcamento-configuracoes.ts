// ─── Quotation Material Selection — Phase 7 Types ─────────────────────────────
//
// Architecture: Piece → Configuration → Cost, applied at quotation time.
//
// The same assembly (Conjunto) can be quoted with different materials per piece.
// This module captures which material was selected for each piece in each
// assembly within a quotation, and computes the resulting cost.
//
// Data flow:
//   OrcamentoItem (tipo='conjunto', conjuntoId=X, quantidade=N)
//       ↓
//   OrcamentoItemConfiguracao[] — one per PecaConjunto in the assembly
//       ↓ (materialId selected per piece)
//   calcularCustoConjunto() → ConjuntoCostBreakdown (live, volatile)
//       ↓ (on approval / revision / conversion)
//   ConjuntoCostSnapshot (immutable)
//
// Future Supabase tables:
//   orcamento_item_configuracoes  — live selections per quotation
//   conjunto_cost_snapshots       — immutable snapshots on key events
//
// Backward compatibility:
//   Phase 1–6.1 quotations without material selections continue to work.
//   Missing selections produce custoTotal = 0 (not an error).

// ─── Material selection per piece per quotation ───────────────────────────────
// Phase 7.1 update: configuracaoFabricacaoId is now the PRIMARY selection field.
// materialId is derived from config.materialId (retained for engine fallback).
//
// Future Supabase: one row per (orcamento_id, orcamento_item_id, peca_conjunto_id)
// PK: id (UUID)
// FK: orcamento_id → orcamentos.id
//     orcamento_item_id → orcamento_itens.id
//     conjunto_id → conjuntos.id
//     configuracao_fabricacao_id → configuracoes_fabricacao.id (required)
//     material_id → materiais.id (derived)

export interface OrcamentoItemConfiguracao {
  id:           string
  orcamentoId:  string
  /** FK → OrcamentoItem.id (the conjunto line item in the quotation) */
  orcamentoItemId: string
  conjuntoId:   string

  // ── The piece within the assembly ──────────────────────────────────────────
  /** PecaConjunto.id — the piece slot in this assembly's BOM */
  pecaConjuntoId:         string
  pecaConjuntoCodigo:     string
  pecaConjuntoDescricao:  string
  /** PecaConjunto.quantidade — units per single assembly */
  pecaConjuntoQuantidade: number
  /** PecaConjunto.pesoEstimado — kg per unit */
  pecaConjuntoPeso:       number
  /** mm — used for material matching hints */
  pecaConjuntoEspessura:  number

  // ── Manufacturing configuration selection (Phase 7.1: required) ───────────
  // Primary selection field — determines material, processes, and all costs.
  // Empty string ('') means not yet selected.
  configuracaoFabricacaoId: string

  // ── Material (derived) ────────────────────────────────────────────────────
  // Derived from ConfiguracaoFabricacao.materialId when config is selected.
  // Retained for engine fallback (material-weight path) when no config breakdown.
  materialId: string

  // ── Calculated unit cost ───────────────────────────────────────────────────
  custoUnitario: number

  criadoEm:     Date
  atualizadoEm: Date
}

// ─── Per-piece selection for tipo='peca' quotation items (Phase 7.1) ─────────
// One entry per OrcamentoItem where tipo='peca'.
// The user selects ONE ConfiguracaoFabricacao for the piece.
//
// Future Supabase: peca_item_selecoes
// PK: id (UUID)
// FK: orcamento_id → orcamentos.id
//     orcamento_item_id → orcamento_itens.id
//     peca_id → pecas.id
//     configuracao_fabricacao_id → configuracoes_fabricacao.id

export interface PecaItemSelecao {
  id: string
  orcamentoId: string
  /** FK → OrcamentoItem.id (tipo='peca' item) */
  orcamentoItemId: string
  /** FK → Peca.id (catalog piece) */
  pecaId: string
  /** FK → ConfiguracaoFabricacao.id — the chosen configuration */
  configuracaoFabricacaoId: string
  /** Unit cost derived from the selected configuration */
  custoUnitario: number
  criadoEm:    Date
  atualizadoEm:Date
}

// ─── Live assembly cost (volatile) ───────────────────────────────────────────
// Computed on demand from current selections + current material prices.
// NOT stored — recomputed whenever selections or prices change.
// Future: cached in `peca_custos` table with conjunto_id FK.

export interface ConjuntoCostBreakdown {
  conjuntoId:      string
  conjuntoCodigo:  string
  conjuntoNome:    string
  /** FK → OrcamentoItem.id */
  orcamentoItemId: string
  /** How many assemblies in this quotation line */
  quantidade:      number

  // ── Cost totals (for all assemblies × all pieces) ─────────────────────────
  custoMaterial:   number   // material cost × qty
  custoProcesso:   number   // process cost from configs, if any (may be 0)
  custoIndiretos:  number
  custoTotal:      number   // material + processo + indiretos

  // ── Physical totals ───────────────────────────────────────────────────────
  pesoTotalKg:     number

  // ── Coverage ─────────────────────────────────────────────────────────────
  pecasTotal:        number
  pecasCalculadas:   number  // pieces with a valid material selection
  pecasSemSelecao:   number  // pieces missing selection
  /** true when all pieces have selections and at least one piece was costed */
  calculadoComSucesso: boolean

  calculadoEm: Date
}

// ─── Immutable cost snapshot ──────────────────────────────────────────────────
// Created on key events: quotation approval, revision creation, production conversion.
// NEVER mutated after creation. Same append-only pattern as OrcamentoHistorico.
//
// Future Supabase: `conjunto_cost_snapshots` with INSERT-only RLS.

export type SnapshotMotivoConjunto =
  | 'configuracao_inicial'
  | 'mudanca_material'
  | 'aprovacao'
  | 'revisao'
  | 'conversao_producao'
  | 'manual'

export interface ConjuntoCostSnapshot {
  id:              string
  orcamentoId:     string
  orcamentoNumero: string
  orcamentoItemId: string
  conjuntoId:      string
  conjuntoCodigo:  string
  conjuntoNome:    string
  quantidade:      number

  // Frozen cost breakdown
  custoMaterial:   number
  custoProcesso:   number
  custoIndiretos:  number
  custoTotal:      number
  pesoTotalKg:     number

  // Frozen selections (the exact material choices at snapshot time)
  selecoes: Pick<OrcamentoItemConfiguracao,
    'pecaConjuntoId' | 'pecaConjuntoCodigo' | 'pecaConjuntoDescricao' |
    'pecaConjuntoQuantidade' | 'pecaConjuntoPeso' |
    'materialId' | 'configuracaoFabricacaoId' | 'custoUnitario'
  >[]

  motivo:    SnapshotMotivoConjunto
  criadoEm:  Date
  criadoPor: string
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface OrcamentoConfiguracoesAnalytics {
  /** Total quotations that have at least one conjunto with material selections */
  orcamentosComSelecao: number
  /** Total assembly cost across all active selections */
  custoTotalConjuntos:  number
  /** Most-selected material (by frequency across all selections) */
  materialMaisUsado:    { materialId: string; count: number } | null
  /** Assembly with highest computed cost */
  conjuntoMaisCaro:     { conjuntoId: string; codigo: string; custo: number } | null
  /** Average assembly cost across all priced assemblies */
  custoMedioConjunto:   number
  /** Selections missing a material (user hasn't completed selection) */
  selecoesPendentes:    number
}
