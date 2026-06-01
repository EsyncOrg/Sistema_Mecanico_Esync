// ─── Custos Module — Industrial Cost Architecture ─────────────────────────────
//
// This module is the pricing and cost foundation for the entire ERP.
// It does NOT yet calculate real project costs — it establishes the
// data model and calculation engine that future modules will consume.
//
// Flow:
//   CentroCusto (hourly rates)
//   CustoMaterial (raw material prices)
//   CustoMaoDeObra (labor profiles + encargos)
//   MaquinaCustos (per-machine running cost)
//   PerfilPrecificacao (margin / tax / commission)
//       ↓
//   engine.ts (calcularCustoTotal, calcularPrecoVenda)
//       ↓
//   Future: CustoPeca, CustoConjunto, CustoOrcamento
//
// Supabase future tables:
//   custos_centros, custos_materiais, custos_mao_obra,
//   custos_maquinas, pricing_profiles, custos_historico

// ─── Cost Center ──────────────────────────────────────────────────────────────

export type CentroCustoNome =
  | 'Engenharia'
  | 'Programação'
  | 'Corte'
  | 'Dobra'
  | 'Solda'
  | 'Pintura'
  | 'Montagem'
  | 'Administrativo'
  | 'Indiretos'

export interface CentroCusto {
  id: string
  nome: CentroCustoNome
  descricao: string
  ativo: boolean
  /** Hourly rate in BRL */
  custoHora: number
  ultimaAtualizacao: Date
}

// ─── Raw material cost ────────────────────────────────────────────────────────

export interface CustoMaterial {
  id: string
  /** e.g. "Aço Carbono 1020", "Aço Inox 304" */
  material: string
  /** e.g. "3mm", "6mm" — describes the sheet thickness */
  bitola?: string
  /** Sheet thickness in mm */
  espessura: number
  /** Full sheet weight in kg */
  pesoChapa: number
  /** Full sheet purchase price in BRL */
  valorChapa: number
  /** Auto-calculated: valorChapa / pesoChapa */
  valorKg: number
  fornecedor?: string
  dataAtualizacao: Date
  ativo: boolean
}

// ─── Labor cost profile ───────────────────────────────────────────────────────

export type CargoCustoMaoDeObra =
  | 'Engenharia'
  | 'Programação'
  | 'Operador Laser'
  | 'Operador Dobra'
  | 'Soldador'
  | 'Pintor'
  | 'Montador'

export interface CustoMaoDeObra {
  id: string
  cargo: CargoCustoMaoDeObra
  /** Base hourly wage in BRL */
  custoHora: number
  /** Social charges percentage (typical: 68–100 %) */
  encargosPercentual: number
  /** Auto-calculated: custoHora × (1 + encargosPercentual / 100) */
  custoHoraTotal: number
  ativo: boolean
  ultimaAtualizacao: Date
}

// ─── Machine cost profile ─────────────────────────────────────────────────────
// Separate from the Maquina entity (non-invasive extension).
// Indexed by maquinaId which is an FK to the Máquinas module.
// Future Supabase: custos_maquinas.maquina_id → maquinas.id

export interface MaquinaCustos {
  id: string
  /** FK → maquinas.id */
  maquinaId: string
  /** Human reference — copied from Maquina.nome for display */
  maquinaNome: string
  maquinaCodigo: string
  /** Energy cost per operational hour in BRL */
  energiaHora: number
  /** Machine depreciation/maintenance cost per hour in BRL */
  custoManutencaoHora: number
  /** Operator cost contribution per hour (links to CustoMaoDeObra) */
  custoHora: number
  /** Auto-calculated: energiaHora + custoManutencaoHora + custoHora */
  custoTotalHora: number
  ultimaAtualizacao: Date
  /**
   * Phase 6: which production process this machine is the PRIMARY cost driver for.
   * Used by calcularCustoPecaCompleto() to look up machine cost per process.
   * Future Supabase: processos_maquinas junction table for N:M relationships.
   */
  processoPrincipal?: 'Corte' | 'Dobra' | 'Solda' | 'Pintura' | 'Montagem'
}

// ─── Pricing profile ──────────────────────────────────────────────────────────

export interface PerfilPrecificacao {
  id: string
  /** e.g. "Conservador", "Padrão", "Agressivo" */
  nome: string
  descricao?: string
  margemLucroPercentual: number
  comissaoPercentual: number
  impostosPercentual: number
  ativo: boolean
}

// ─── Cost audit trail ─────────────────────────────────────────────────────────
// Single append-only table for all cost module changes.
// Future Supabase: custos_historico with RLS per empresa_id.

export type EntidadeCusto = 'material' | 'mao_obra' | 'centro_custo' | 'maquina' | 'perfil'

export interface HistoricoCusto {
  id: string
  entidade: EntidadeCusto
  entidadeId: string
  /** Human-readable name of the changed entity */
  entidadeNome: string
  /** Which field was modified */
  campo: string
  /** Previous value — serialized as string for generality */
  valorAnterior: string
  valorNovo: string
  usuario: string
  timestamp: Date
  motivo?: string
}

// ─── Price simulation ─────────────────────────────────────────────────────────

export interface SimulacaoPrecoInput {
  custoTotal: number
  perfilId: string
}

export interface SimulacaoPrecoResult {
  /** Input cost */
  custo: number
  /** Profit margin amount */
  margem: number
  /** Tax amount */
  impostos: number
  /** Commission amount */
  comissao: number
  /** Final suggested selling price */
  precoSugerido: number
  /** Effective margin % on final price */
  margemEfetivaPercent: number
}

// ─── Architecture hooks — piece cost (Phase 6+) ───────────────────────────────
// Not yet surfaced in the UI. Created here so the type system is ready.
// When Phase 6 implements real production cost tracking, these become
// computable fields using engine.calcularCustoTotal().

export interface CustoTemposPeca {
  pecaId: string
  tempoDesenvolvimentoMin?: number
  tempoProgramacaoMin?: number
  tempoCorteMin?: number
  tempoDobraMin?: number
  tempoSoldaMin?: number
  tempoPinturaMin?: number
  tempoMontagemMin?: number
  // [HOOK:CUSTO_CALCULADO] — Phase 6: engine.calcularCustoTotal(tempos, centros, material)
  // custoCalculado?: number
}

// ─── Architecture hooks — assembly cost (Phase 6+) ───────────────────────────
// Future: sum all piece costs + overheads for a full Conjunto cost estimate.

export interface CustoConjuntoParams {
  conjuntoId: string
  quantidadeConjuntos: number
  // [HOOK:CUSTO_CONJUNTO] — Phase 6: expand from CustoTemposPeca[] + indirect %
  // custoMateriais?: number
  // custoProcessos?: number
  // custoMaoDeObra?: number
  // custoIndiretos?: number
  // custoTotal?: number
}

// ─── Dashboard analytics ──────────────────────────────────────────────────────

export interface CustosAnalytics {
  custoMedioProjetado: number       // avg custoTotalHora across active centros
  margemMedia: number               // avg margemLucroPercentual across active profiles
  materiaisDesatualizados: number   // materials not updated in > 30 days
  ultimaAtualizacaoCustos: Date | null
  totalCentros: number
  totalMateriais: number
  totalPerfisPrecificacao: number
  totalMaoDeObra: number
}
