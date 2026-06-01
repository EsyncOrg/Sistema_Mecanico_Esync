// ─── Custos — Industrial Cost Calculation Engine ──────────────────────────────
//
// Pure functions — no React, no side effects, no context dependencies.
// Accepts domain value objects and returns computed cost breakdowns.
//
// Current scope (Phase 5):
//   Foundation arithmetic + price simulation
//
// Future scope (Phase 6):
//   calcularCustoPeca() — integrate CustoTemposPeca with centros + material
//   calcularCustoConjunto() — aggregate from all pieces + overheads
//   calcularCustoOrcamento() — sum all items with per-profile simulation
//
// All monetary values are in BRL.

import type {
  CentroCusto,
  CustoMaterial,
  CustoMaoDeObra,
  MaquinaCustos,
  PerfilPrecificacao,
  CustoTemposPeca,
  SimulacaoPrecoResult,
} from '@/types/custos'
import type { SetorProcesso } from '@/types/desenvolvimento'

// ─── Material cost ────────────────────────────────────────────────────────────

/**
 * Calculates raw material cost given the piece weight and the material price.
 *
 * @param material   - Material with current pricing
 * @param pesoKg     - Piece weight in kg
 * @param fatorWaste - Waste/nesting factor (≥ 1.0; default 1.15 = 15% waste)
 */
export function calcularMateriaPrima(
  material: CustoMaterial,
  pesoKg: number,
  fatorWaste = 1.15,
): number {
  return Math.round(material.valorKg * pesoKg * fatorWaste * 100) / 100
}

// ─── Process cost (sector × time) ─────────────────────────────────────────────

export interface TemposProcesso {
  setor: SetorProcesso
  /** Process time in minutes */
  minutos: number
}

/**
 * Calculates total process cost for one piece given its sector times
 * and the cost-center rates.
 *
 * @param tempos   - List of { setor, minutos } pairs
 * @param centros  - Active CentroCusto list
 */
export function calcularProcessos(
  tempos: TemposProcesso[],
  centros: CentroCusto[],
): number {
  return tempos.reduce((total, { setor, minutos }) => {
    // Map SetorProcesso → CentroCustoNome (same names for production sectors)
    const nomeMapeado = setor.charAt(0).toUpperCase() + setor.slice(1) as CentroCusto['nome']
    const centro = centros.find((c) => c.nome === nomeMapeado && c.ativo)
    if (!centro) return total
    return total + centro.custoHora * (minutos / 60)
  }, 0)
}

// ─── Labor cost ───────────────────────────────────────────────────────────────

/**
 * Calculates labor cost for a given profile and number of hours worked.
 *
 * @param maoDeObra  - Labor profile with encargos already computed
 * @param horas      - Hours worked
 */
export function calcularMaoDeObra(maoDeObra: CustoMaoDeObra, horas: number): number {
  return Math.round(maoDeObra.custoHoraTotal * horas * 100) / 100
}

// ─── Machine cost ─────────────────────────────────────────────────────────────

/**
 * Calculates machine running cost for a given number of hours.
 */
export function calcularCustoMaquina(maquina: MaquinaCustos, horas: number): number {
  return Math.round(maquina.custoTotalHora * horas * 100) / 100
}

// ─── Indirect costs ───────────────────────────────────────────────────────────

/**
 * Applies an indirect overhead percentage to direct costs.
 *
 * @param custosDiretos        - Sum of material + process + labor
 * @param percentualIndiretos  - Indirect overhead % (e.g. 20 for 20%)
 */
export function calcularCustosIndiretos(
  custosDiretos: number,
  percentualIndiretos: number,
): number {
  return Math.round(custosDiretos * (percentualIndiretos / 100) * 100) / 100
}

// ─── Total cost ───────────────────────────────────────────────────────────────

export interface CustoTotalInput {
  materiaPrima:  number
  processos:     number
  maoDeObra:     number
  maquinas:      number
  indiretos:     number
}

export interface CustoTotalResult extends CustoTotalInput {
  total: number
}

/**
 * Sums all cost components into a structured result.
 */
export function calcularCustoTotal(input: CustoTotalInput): CustoTotalResult {
  const total = Math.round(
    (input.materiaPrima + input.processos + input.maoDeObra + input.maquinas + input.indiretos)
    * 100
  ) / 100
  return { ...input, total }
}

// ─── Selling price simulation ─────────────────────────────────────────────────

/**
 * Applies a pricing profile on top of a total cost to produce a selling price.
 *
 * Formula:
 *   precoSugerido = custoTotal + margem + impostos + comissao
 *   where each = custoTotal × (percent / 100)
 *
 * Note: impostos and comissao are applied to COST (not selling price) to avoid
 * circular dependency. Phase 6 will add iterative price-inclusion logic if needed.
 */
export function calcularPrecoVenda(
  custoTotal: number,
  perfil: PerfilPrecificacao,
): SimulacaoPrecoResult {
  const margem    = Math.round(custoTotal * (perfil.margemLucroPercentual  / 100) * 100) / 100
  const impostos  = Math.round(custoTotal * (perfil.impostosPercentual / 100) * 100) / 100
  const comissao  = Math.round(custoTotal * (perfil.comissaoPercentual / 100) * 100) / 100
  const preco     = Math.round((custoTotal + margem + impostos + comissao) * 100) / 100

  return {
    custo:                custoTotal,
    margem,
    impostos,
    comissao,
    precoSugerido:        preco,
    margemEfetivaPercent: preco > 0 ? Math.round((margem / preco) * 10000) / 100 : 0,
  }
}

// ─── Piece cost (Phase 6 hook) ────────────────────────────────────────────────

/**
 * [HOOK:CUSTO_PECA] — Phase 6
 *
 * Full per-piece cost calculation.
 * Currently returns zeros because piece time data is not yet collected.
 * Wire up when Phase 6 enables production time tracking.
 *
 * @param params   - CustoTemposPeca (optional time fields from Peca or tracking)
 * @param material - Material used for this piece
 * @param pesoKg   - Piece weight in kg
 * @param centros  - Active cost centers
 * @param mobPerfil- Primary labor profile for this piece
 * @param indPct   - Indirect overhead % (default: 20%)
 */
export function calcularCustoPeca(
  params: CustoTemposPeca,
  material: CustoMaterial | null,
  pesoKg: number,
  centros: CentroCusto[],
  mobPerfil: CustoMaoDeObra | null,
  indPct = 20,
): CustoTotalResult {
  const materiaPrima = material ? calcularMateriaPrima(material, pesoKg) : 0

  const tempos: TemposProcesso[] = []
  if (params.tempoCorteMin)      tempos.push({ setor: 'corte',     minutos: params.tempoCorteMin })
  if (params.tempoDobraMin)      tempos.push({ setor: 'dobra',     minutos: params.tempoDobraMin })
  if (params.tempoSoldaMin)      tempos.push({ setor: 'solda',     minutos: params.tempoSoldaMin })
  if (params.tempoPinturaMin)    tempos.push({ setor: 'pintura',   minutos: params.tempoPinturaMin })
  if (params.tempoMontagemMin)   tempos.push({ setor: 'montagem',  minutos: params.tempoMontagemMin })

  const processos  = calcularProcessos(tempos, centros)
  const maoDeObraHrs = ((params.tempoCorteMin ?? 0) + (params.tempoDobraMin ?? 0) +
    (params.tempoSoldaMin ?? 0) + (params.tempoPinturaMin ?? 0) + (params.tempoMontagemMin ?? 0)) / 60

  const maoDeObraAmt = mobPerfil ? calcularMaoDeObra(mobPerfil, maoDeObraHrs) : 0
  const diretos      = materiaPrima + processos + maoDeObraAmt
  const indiretos    = calcularCustosIndiretos(diretos, indPct)

  return calcularCustoTotal({
    materiaPrima,
    processos,
    maoDeObra: maoDeObraAmt,
    maquinas:  0,   // [HOOK:MAQUINA_ALLOC] — Phase 6: machine time per piece
    indiretos,
  })
}

// ─── Convenience: derive auto-calculated fields ───────────────────────────────

/** Auto-calculates valorKg from a material; safe for forms. */
export function derivarValorKg(valorChapa: number, pesoChapa: number): number {
  return pesoChapa > 0 ? Math.round((valorChapa / pesoChapa) * 100) / 100 : 0
}

/** Auto-calculates custoHoraTotal for a labor profile. */
export function derivarCustoHoraTotal(custoHora: number, encargosPercentual: number): number {
  return Math.round(custoHora * (1 + encargosPercentual / 100) * 100) / 100
}

/** Auto-calculates custoTotalHora for a machine. */
export function derivarCustoTotalHoraMaquina(
  energiaHora: number,
  custoManutencaoHora: number,
  custoHora: number,
): number {
  return Math.round((energiaHora + custoManutencaoHora + custoHora) * 100) / 100
}
