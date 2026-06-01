// ─── Tempos Industriais — Phase 5.5 ──────────────────────────────────────────
//
// Time architecture for future automatic costing.
// These types do NOT store costs — they store minutes per process per piece,
// which the Phase 6 cost engine will consume via calcularCustoPeca().
//
// Data flow:
//   ProcessoIndustrial (catalog)
//     ↓
//   TemplateTempos (reusable defaults)
//     ↓
//   TemposPecaValues → stored on Peca.tempoXxxMin fields
//     ↓
//   [HOOK:CUSTO_PECA] calcularProcessos(tempos, centros) → cost
//
// Supabase future tables:
//   processos, processo_templates, peca_tempos, historico_tempos

// ─── Process catalog ──────────────────────────────────────────────────────────

export type ProcessoNome =
  | 'Desenvolvimento'
  | 'Programação'
  | 'Corte'
  | 'Dobra'
  | 'Solda'
  | 'Pintura'
  | 'Montagem'

/** Configurable process catalog entry. Future: add unlimited processes. */
export interface ProcessoIndustrial {
  id: string
  nome: ProcessoNome
  descricao: string
  ativo: boolean
  /** Lucide icon name — for UI display */
  icone: string
  /** Ordinal for display order */
  ordem: number
  // ── Machine relationship hooks (Phase 6) ───────────────────────────────────
  // Not yet computed — marks which machines run this process
  // maquinaIds?: string[]   // FK → maquinas.id
  // centroCustoId?: string  // FK → custos_centros.id
}

// ─── Time values on a piece ───────────────────────────────────────────────────
// Mirrors the optional time fields on Peca (src/types/index.ts) but as required
// numbers (0 for "not set") so forms don't deal with undefined.

export interface TemposPecaValues {
  tempoDesenvolvimentoMin: number
  tempoProgramacaoMin:     number
  tempoCorteMin:           number
  tempoDobraMin:           number
  tempoSoldaMin:           number
  tempoPinturaMin:         number
  tempoMontagemMin:        number
}

export const EMPTY_TEMPOS: TemposPecaValues = {
  tempoDesenvolvimentoMin: 0,
  tempoProgramacaoMin:     0,
  tempoCorteMin:           0,
  tempoDobraMin:           0,
  tempoSoldaMin:           0,
  tempoPinturaMin:         0,
  tempoMontagemMin:        0,
}

/** Maps ProcessoNome to the corresponding TemposPecaValues field key */
export const PROCESSO_FIELD: Record<ProcessoNome, keyof TemposPecaValues> = {
  'Desenvolvimento': 'tempoDesenvolvimentoMin',
  'Programação':     'tempoProgramacaoMin',
  'Corte':           'tempoCorteMin',
  'Dobra':           'tempoDobraMin',
  'Solda':           'tempoSoldaMin',
  'Pintura':         'tempoPinturaMin',
  'Montagem':        'tempoMontagemMin',
}

export function calcularTempoTotal(t: TemposPecaValues): number {
  return (
    t.tempoDesenvolvimentoMin +
    t.tempoProgramacaoMin     +
    t.tempoCorteMin           +
    t.tempoDobraMin           +
    t.tempoSoldaMin           +
    t.tempoPinturaMin         +
    t.tempoMontagemMin
  )
}

// ─── Time template ────────────────────────────────────────────────────────────

export interface TemplateTempos {
  id: string
  nome: string
  descricao?: string
  /** Default minutes per process */
  tempos: TemposPecaValues
  /** Auto-calculated from tempos */
  totalMinutos: number
}

// ─── Audit trail ──────────────────────────────────────────────────────────────
// Append-only. Same pattern as HistoricoCusto in custos.ts.
// Future Supabase: historico_tempos with INSERT-only RLS policy.

export interface HistoricoTempo {
  id: string
  /** FK → pecas.id */
  pecaId: string
  pecaCodigo: string
  processo: ProcessoNome
  valorAnteriorMin: number
  valorNovoMin: number
  /** Future: UUID referencing auth.users(id) */
  usuario: string
  timestamp: Date
  motivo?: string
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface TemposAnalytics {
  /** Average total time (all processes) across pieces that have at least one non-zero time */
  tempoMedioPorPeca: number
  /** Average minutes per process across all pieces that have that process > 0 */
  tempoMedioPorProcesso: Record<ProcessoNome, number>
  /** The process with the highest average time */
  processoMaisDemorado: ProcessoNome | null
  /** Pieces with all time fields = 0 (no times registered) */
  pecasSemTempos: number
  /** Pieces with at least one non-zero time field */
  pecasComTempos: number
  /** Sum of all piece totals across the entire catalog (minutes) */
  tempoTotalCatalogado: number
}

// ─── Conjunto time hook (Phase 6) ─────────────────────────────────────────────
// Future: tempoTotalConjunto = sum(peca.tempoTotalMin * peca.quantidade) for all pieces

export interface TempoConjuntoParams {
  conjuntoId: string
  // [HOOK:TEMPO_CONJUNTO] — Phase 6
  // tempoTotalMinutos?: number  // computed from all PecaConjunto × their times
}

// ─── Orçamento time hook (Phase 6) ───────────────────────────────────────────
// Future: tempoTotalOrcamento = sum(item.quantidade * peca.tempoTotalMin) for each item

export interface TempoOrcamentoParams {
  orcamentoId: string
  // [HOOK:TEMPO_ORCAMENTO] — Phase 6
  // tempoTotalMinutos?: number  // for capacity planning and production simulation
}
