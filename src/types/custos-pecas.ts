// ─── Custos de Peças — Phase 6 Types ─────────────────────────────────────────
//
// Automatic industrial cost calculation for every Peca.
// Costs are NEVER editable — always derived from:
//   CentroCusto rates × process times  +
//   MaquinaCustos rates × process times +
//   CustoMaterial.valorKg × peca.peso   +
//   indirect overhead %
//
// Data flow:
//   Peca (times + weight + espessura)
//   + CustosContext data (centros, materiais, maquinasCustos)
//   + ConfiguracaoCustos (taxaIndiretos)
//       ↓
//   calcularCustoPecaCompleto()   ← Phase 6 engine
//       ↓
//   CustoPecaBreakdown  (computed, volatile)
//       ↓
//   CustoSnapshot       (immutable, versioned)
//       ↓
//   [HOOK:CUSTO_CONJUNTO]  → Phase 7: sum(piece costs) per Conjunto
//   [HOOK:CUSTO_ORCAMENTO] → Phase 8: quote cost via pricing profile
//
// Supabase future tables:
//   peca_custos (current computed values, indexed)
//   peca_custo_snapshots (immutable versions)
//   peca_custo_historico (recalculation event log)
//   custos_config (empresa-level configuration)

// ─── Configurable parameters ──────────────────────────────────────────────────
// Stored per empresa. Default: 20% indirect overhead.
// Future Supabase: custos_config.empresa_id → auth.jwt()->>'empresa_id'

export interface ConfiguracaoCustos {
  /** Indirect overhead applied to (material + labor + machine) sum, in % */
  taxaIndiretos: number
  /** Phase 7: waste factor multiplied onto peso × valorKg */
  fatorWasteDefault: number
  // [HOOK:EMPRESA_CONFIG] — Phase 9: per-empresa overrides via Supabase
}

export const CONFIGURACAO_PADRAO: ConfiguracaoCustos = {
  taxaIndiretos:     20,
  fatorWasteDefault: 1.15,
}

// ─── Full cost breakdown ──────────────────────────────────────────────────────
// Computed on demand — volatile (not stored between sessions in Phase 6).
// Phase 7: stored in `peca_custos` table with generated columns.

export interface CustoPecaBreakdown {
  // ── Supabase audit fields (Phase 6: in-memory; Phase 7: DB columns) ────────
  id:           string
  criadoEm:     Date
  atualizadoEm: Date
  criadoPor:    string
  atualizadoPor:string

  // ── Identification ─────────────────────────────────────────────────────────
  pecaId:     string
  pecaCodigo: string

  // ── Phase 6.1: manufacturing configuration reference ──────────────────────
  // undefined = legacy breakdown (no configuration, fuzzy material match)
  // set       = config-aware breakdown (explicit material, process overrides)
  // Future Supabase: peca_custos.configuracao_id → configuracoes_fabricacao.id
  configuracaoId?:     string
  configuracaoCodigo?: string
  materialId?:         string   // explicit FK for traceability

  // ── Cost components (R$) ──────────────────────────────────────────────────
  custoMaterial:    number  // peca.peso × material.valorKg × fatorWaste
  custoEngenharia:  number  // tempoDesenvolvimento / 60 × centro_Engenharia.custoHora
  custoProgramacao: number  // tempoProgramacao / 60 × centro_Programacao.custoHora
  custoCorte:       number  // tempoCorte / 60 × centro_Corte.custoHora
  custoDobra:       number  // tempoDobra / 60 × centro_Dobra.custoHora
  custoSolda:       number  // tempoSolda / 60 × centro_Solda.custoHora
  custoPintura:     number  // tempoPintura / 60 × centro_Pintura.custoHora
  custoMontagem:    number  // tempoMontagem / 60 × centro_Montagem.custoHora
  /** Sum of all machine running costs: Σ(tempo/60 × maquina.custoTotalHora) */
  custoMaquinas:    number
  /** Indirect overhead: (sum of all above) × taxaIndiretos% */
  custoIndiretos:   number
  /** Grand total: sum of all components */
  custoTotal:       number

  // ── Percentage distribution (for visualization) ────────────────────────────
  // All percentages sum to 100. Zero-cost components are omitted from chart.
  percentuais: {
    material:    number
    engenharia:  number
    programacao: number
    producao:    number  // corte + dobra + solda + pintura + montagem
    maquinas:    number
    indiretos:   number
  }

  // ── Input snapshot (for understanding the calculation) ────────────────────
  materialNome:        string  // e.g. "Aço Carbono 1020 3mm"
  valorKgUsado:        number  // R$/kg at calculation time
  taxaIndiretosUsada:  number  // % used
  fatorWasteUsado:     number

  // ── Computed status ────────────────────────────────────────────────────────
  /** True when at least one time field > 0 AND a material could be matched */
  calculadoComSucesso: boolean
  /** Human-readable reason when calculadoComSucesso is false */
  avisos: string[]
  calculadoEm: Date
  versao: number
}

// ─── Immutable cost snapshot ──────────────────────────────────────────────────
// Created automatically when:
//   - piece times change (via registrarAlteracaoTempo)
//   - material prices change (via atualizarMaterial)
//   - machine costs change
//   - taxaIndiretos changes
//   - user forces a manual snapshot
//
// NEVER updated after creation — append-only.
// Future Supabase: INSERT-only policy on peca_custo_snapshots.

export type SnapshotMotivo =
  | 'calculo_inicial'
  | 'mudanca_tempo'
  | 'mudanca_material'
  | 'mudanca_maquina'
  | 'mudanca_configuracao'
  | 'manual'

export interface CustoSnapshot {
  // ── Supabase audit fields ─────────────────────────────────────────────────
  id:           string
  criadoEm:     Date
  atualizadoEm: Date  // same as criadoEm (snapshots are immutable)
  criadoPor:    string
  atualizadoPor:string // same as criadoPor

  // ── Identification ─────────────────────────────────────────────────────────
  pecaId:     string
  pecaCodigo: string
  versao:     number  // monotonically increasing per piece
  motivo:     SnapshotMotivo

  // ── Frozen cost breakdown ──────────────────────────────────────────────────
  // Stored as flat fields (not nested object) for Supabase column efficiency
  custoMaterial:    number
  custoEngenharia:  number
  custoProgramacao: number
  custoCorte:       number
  custoDobra:       number
  custoSolda:       number
  custoPintura:     number
  custoMontagem:    number
  custoMaquinas:    number
  custoIndiretos:   number
  custoTotal:       number

  // ── Rates at snapshot time (for historical accuracy) ───────────────────────
  valorKgSnapshot:       number
  taxaIndiretosSnapshot: number
  materialNome:          string
}

// ─── Recalculation event log ──────────────────────────────────────────────────
// Append-only. Same pattern as OrcamentoHistorico and HistoricoCusto.
// Future Supabase: peca_custo_historico with INSERT-only RLS.

export type EventoRecalculo =
  | 'recalculo_automatico'
  | 'recalculo_forcado'
  | 'snapshot_criado'
  | 'config_alterada'

export interface HistoricoRecalculo {
  // ── Supabase audit fields ─────────────────────────────────────────────────
  id:        string
  criadoEm:  Date
  criadoPor: string

  // ── Event data ─────────────────────────────────────────────────────────────
  evento:        EventoRecalculo
  pecaId?:       string
  pecaCodigo?:   string
  custoAnterior: number
  custoNovo:     number
  /** Reason or triggering field change */
  descricao:     string
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface CustoPecasAnalytics {
  custoMedioPecas:         number
  pecaMaisCara:            { pecaId: string; codigo: string; custo: number } | null
  pecaMaisBarata:          { pecaId: string; codigo: string; custo: number } | null
  percentualMedioMaterial: number
  percentualMedioProducao: number  // labor (eng + prog + prod sectors)
  percentualMedioMaquinas: number
  percentualMedioIndiretos:number
  maiorComponente:         string  // "Material" | "Máquinas" | "Produção" | "Indiretos"
  pecasComCusto:           number  // pieces with custoTotal > 0
  pecasSemCusto:           number  // pieces missing times or material
  custoTotalCatalogo:      number  // sum of all piece costs
}

// ─── Conjunto aggregation hook (Phase 7) ─────────────────────────────────────
// Future: conjuntoId → sum of CustoPecaBreakdown.custoTotal × peca.quantidade

export interface CustoConjuntoAgregado {
  conjuntoId: string
  // [HOOK:CUSTO_CONJUNTO] — Phase 7
  // pecasComCusto: { pecaId: string; codigo: string; quantidade: number; custo: number }[]
  // custoTotalPecas: number
  // custoMontagem: number  // additional assembly cost on top of pieces
  // custoTotal: number
}

// ─── Orçamento pricing hook (Phase 8) ────────────────────────────────────────
// Future: orcamentoId → sum of conjunto costs → apply pricing profile

export interface CustoOrcamentoCalculado {
  orcamentoId: string
  // [HOOK:CUSTO_ORCAMENTO] — Phase 8
  // conjuntosCustos: CustoConjuntoAgregado[]
  // custoTotal: number
  // perfilId: string
  // precoSugerido: number  // via calcularPrecoVenda()
}
