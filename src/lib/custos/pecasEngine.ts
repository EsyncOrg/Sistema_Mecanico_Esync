// ─── Phase 6 — Automatic Piece Cost Engine ────────────────────────────────────
//
// Pure functions — no React, no side effects.
// Accepts domain value objects and returns full CustoPecaBreakdown.
//
// Data flow:
//   Peca (peso + espessura + tempoXxxMin fields)
//   + CentroCusto[] (hourly rates per sector)
//   + CustoMaterial[] (R$/kg per sheet type)
//   + MaquinaCustos[] (R$/h per machine, keyed by processoPrincipal)
//   + ConfiguracaoCustos (taxaIndiretos, fatorWasteDefault)
//       ↓
//   calcularCustoPecaCompleto() → CustoPecaBreakdown
//       ↓
//   breakdownParaSnapshot()    → CustoSnapshot (immutable)
//   calcularCustoPecasAnalytics() → CustoPecasAnalytics

import type { Peca } from '@/types'
import type { CentroCusto, CustoMaterial, MaquinaCustos } from '@/types/custos'
import type {
  ConfiguracaoCustos,
  CustoPecaBreakdown,
  CustoSnapshot,
  SnapshotMotivo,
  CustoPecasAnalytics,
} from '@/types/custos-pecas'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function r2(n: number): number { return Math.round(n * 100) / 100 }
function r1(n: number): number { return Math.round(n * 10) / 10 }

// ─── Material matching ────────────────────────────────────────────────────────

export interface MaterialMatch {
  material: CustoMaterial | null
  exataCorrespondencia: boolean
}

/**
 * Matches a piece to the best available CustoMaterial by espessura.
 * Strategy: exact match → closest espessura → null.
 */
export function encontrarMaterial(peca: Peca, materiais: CustoMaterial[]): MaterialMatch {
  const active = materiais.filter((m) => m.ativo)
  if (active.length === 0) return { material: null, exataCorrespondencia: false }

  const exata = active.find((m) => m.espessura === peca.espessura)
  if (exata) return { material: exata, exataCorrespondencia: true }

  const closest = active.reduce((prev, cur) =>
    Math.abs(cur.espessura - peca.espessura) < Math.abs(prev.espessura - peca.espessura) ? cur : prev
  )
  return { material: closest, exataCorrespondencia: false }
}

// ─── Full per-piece cost calculation ─────────────────────────────────────────

/**
 * Computes the full industrial cost breakdown for one Peca.
 * Returns a CustoPecaBreakdown — always succeeds, populating `avisos` on issues.
 *
 * Cost components:
 *   custoMaterial    = peso × valorKg × fatorWaste
 *   custoXxx (labor) = tempoXxxMin / 60 × centro.custoHora
 *   custoMaquinas    = Σ(tempoXxxMin / 60 × maquina.custoTotalHora) per process
 *   custoIndiretos   = (sum of all above) × taxaIndiretos%
 *   custoTotal       = sum of all
 */
export function calcularCustoPecaCompleto(
  peca: Peca,
  centros: CentroCusto[],
  materiais: CustoMaterial[],
  maquinasCustos: MaquinaCustos[],
  config: ConfiguracaoCustos,
  usuario = 'Sistema',
): CustoPecaBreakdown {
  const now    = new Date()
  const id     = `cpb-${peca.id}-${now.getTime()}`
  const avisos: string[] = []

  // ── Material ────────────────────────────────────────────────────────────────
  const { material, exataCorrespondencia } = encontrarMaterial(peca, materiais)
  let custoMaterial  = 0
  let materialNome   = '—'
  let valorKgUsado   = 0

  if (material) {
    materialNome = `${material.material}${material.bitola ? ` ${material.bitola}` : ` ${material.espessura}mm`}`
    valorKgUsado = material.valorKg
    custoMaterial = r2(peca.peso * material.valorKg * config.fatorWasteDefault)
    if (!exataCorrespondencia) {
      avisos.push(
        `Material aproximado: ${materialNome} (espessura ${material.espessura}mm usada para peça de ${peca.espessura}mm)`
      )
    }
  } else {
    avisos.push(`Nenhum material ativo encontrado para espessura ${peca.espessura}mm`)
  }

  // ── Sector time values ───────────────────────────────────────────────────────
  const tDev     = peca.tempoDesenvolvimentoMin ?? 0
  const tProg    = peca.tempoProgramacaoMin     ?? 0
  const tCorte   = peca.tempoCorteMin           ?? 0
  const tDobra   = peca.tempoDobraMin           ?? 0
  const tSolda   = peca.tempoSoldaMin           ?? 0
  const tPintura = peca.tempoPinturaMin         ?? 0
  const tMont    = peca.tempoMontagemMin        ?? 0

  const hasAnyTime = [tDev, tProg, tCorte, tDobra, tSolda, tPintura, tMont].some((t) => t > 0)
  if (!hasAnyTime) {
    avisos.push('Nenhum tempo de processo definido — custo de produção será zero')
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function getCentro(nome: CentroCusto['nome']): number {
    return centros.find((c) => c.nome === nome && c.ativo)?.custoHora ?? 0
  }
  function getMaquinaCusto(processo: MaquinaCustos['processoPrincipal']): number {
    return maquinasCustos.find((m) => m.processoPrincipal === processo)?.custoTotalHora ?? 0
  }

  // ── Per-sector labor costs ───────────────────────────────────────────────────
  const custoEngenharia  = r2((tDev     / 60) * getCentro('Engenharia'))
  const custoProgramacao = r2((tProg    / 60) * getCentro('Programação'))
  const custoCorte       = r2((tCorte   / 60) * getCentro('Corte'))
  const custoDobra       = r2((tDobra   / 60) * getCentro('Dobra'))
  const custoSolda       = r2((tSolda   / 60) * getCentro('Solda'))
  const custoPintura     = r2((tPintura / 60) * getCentro('Pintura'))
  const custoMontagem    = r2((tMont    / 60) * getCentro('Montagem'))

  // ── Machine costs (look up by processoPrincipal) ─────────────────────────────
  let custoMaquinas = 0
  if (tCorte   > 0) custoMaquinas += r2((tCorte   / 60) * getMaquinaCusto('Corte'))
  if (tDobra   > 0) custoMaquinas += r2((tDobra   / 60) * getMaquinaCusto('Dobra'))
  if (tSolda   > 0) custoMaquinas += r2((tSolda   / 60) * getMaquinaCusto('Solda'))
  if (tPintura > 0) custoMaquinas += r2((tPintura / 60) * getMaquinaCusto('Pintura'))
  custoMaquinas = r2(custoMaquinas)

  // ── Overhead & total ─────────────────────────────────────────────────────────
  const directTotal = r2(
    custoMaterial + custoEngenharia + custoProgramacao +
    custoCorte + custoDobra + custoSolda + custoPintura + custoMontagem + custoMaquinas
  )
  const custoIndiretos = r2(directTotal * (config.taxaIndiretos / 100))
  const custoTotal     = r2(directTotal + custoIndiretos)

  // ── Percentage distribution ───────────────────────────────────────────────────
  const pct = (n: number) => (custoTotal > 0 ? r1((n / custoTotal) * 100) : 0)
  const custoProducao = custoCorte + custoDobra + custoSolda + custoPintura + custoMontagem
  const percentuais = {
    material:    pct(custoMaterial),
    engenharia:  pct(custoEngenharia),
    programacao: pct(custoProgramacao),
    producao:    pct(custoProducao),
    maquinas:    pct(custoMaquinas),
    indiretos:   pct(custoIndiretos),
  }

  return {
    id,
    criadoEm:      now,
    atualizadoEm:  now,
    criadoPor:     usuario,
    atualizadoPor: usuario,
    pecaId:        peca.id,
    pecaCodigo:    peca.codigo,
    custoMaterial,
    custoEngenharia,
    custoProgramacao,
    custoCorte,
    custoDobra,
    custoSolda,
    custoPintura,
    custoMontagem,
    custoMaquinas,
    custoIndiretos,
    custoTotal,
    percentuais,
    materialNome,
    valorKgUsado,
    taxaIndiretosUsada:  config.taxaIndiretos,
    fatorWasteUsado:     config.fatorWasteDefault,
    calculadoComSucesso: hasAnyTime && material !== null,
    avisos,
    calculadoEm: now,
    versao:      1,
  }
}

// ─── Snapshot creation ────────────────────────────────────────────────────────

/**
 * Creates an immutable CustoSnapshot from a CustoPecaBreakdown.
 * versao must be monotonically increasing per piece — caller tracks this.
 */
export function breakdownParaSnapshot(
  bd: CustoPecaBreakdown,
  motivo: SnapshotMotivo,
  versao: number,
): CustoSnapshot {
  const now = new Date()
  return {
    id:            `snap-${bd.pecaId}-v${versao}`,
    criadoEm:      now,
    atualizadoEm:  now,
    criadoPor:     bd.criadoPor,
    atualizadoPor: bd.criadoPor,
    pecaId:        bd.pecaId,
    pecaCodigo:    bd.pecaCodigo,
    versao,
    motivo,
    custoMaterial:    bd.custoMaterial,
    custoEngenharia:  bd.custoEngenharia,
    custoProgramacao: bd.custoProgramacao,
    custoCorte:       bd.custoCorte,
    custoDobra:       bd.custoDobra,
    custoSolda:       bd.custoSolda,
    custoPintura:     bd.custoPintura,
    custoMontagem:    bd.custoMontagem,
    custoMaquinas:    bd.custoMaquinas,
    custoIndiretos:   bd.custoIndiretos,
    custoTotal:       bd.custoTotal,
    valorKgSnapshot:       bd.valorKgUsado,
    taxaIndiretosSnapshot: bd.taxaIndiretosUsada,
    materialNome:          bd.materialNome,
  }
}

// ─── Analytics ────────────────────────────────────────────────────────────────

/**
 * Derives CustoPecasAnalytics from the current set of breakdowns.
 * Used by CustosPecasContext.analytics (via useMemo).
 */
export function calcularCustoPecasAnalytics(
  breakdowns: CustoPecaBreakdown[],
): CustoPecasAnalytics {
  const comCusto = breakdowns.filter((b) => b.custoTotal > 0)
  const semCusto = breakdowns.filter((b) => b.custoTotal === 0)

  if (comCusto.length === 0) {
    return {
      custoMedioPecas:          0,
      pecaMaisCara:             null,
      pecaMaisBarata:           null,
      percentualMedioMaterial:  0,
      percentualMedioProducao:  0,
      percentualMedioMaquinas:  0,
      percentualMedioIndiretos: 0,
      maiorComponente:          'Material',
      pecasComCusto:            0,
      pecasSemCusto:            semCusto.length,
      custoTotalCatalogo:       0,
    }
  }

  const sorted = [...comCusto].sort((a, b) => b.custoTotal - a.custoTotal)
  const avg    = r2(comCusto.reduce((s, b) => s + b.custoTotal, 0) / comCusto.length)
  const total  = r2(comCusto.reduce((s, b) => s + b.custoTotal, 0))

  const avgPct = (field: keyof CustoPecaBreakdown['percentuais']): number =>
    r1(comCusto.reduce((s, b) => s + b.percentuais[field], 0) / comCusto.length)

  const pMat  = avgPct('material')
  const pProd = avgPct('producao')
  const pMaq  = avgPct('maquinas')
  const pInd  = avgPct('indiretos')

  const maiorComponente = (
    [
      { nome: 'Material',  v: pMat  },
      { nome: 'Produção',  v: pProd },
      { nome: 'Máquinas',  v: pMaq  },
      { nome: 'Indiretos', v: pInd  },
    ] as { nome: string; v: number }[]
  ).reduce((mx, c) => (c.v > mx.v ? c : mx), { nome: 'Material', v: pMat }).nome

  return {
    custoMedioPecas:          avg,
    pecaMaisCara:             { pecaId: sorted[0].pecaId, codigo: sorted[0].pecaCodigo, custo: sorted[0].custoTotal },
    pecaMaisBarata:           {
      pecaId: sorted[sorted.length - 1].pecaId,
      codigo: sorted[sorted.length - 1].pecaCodigo,
      custo:  sorted[sorted.length - 1].custoTotal,
    },
    percentualMedioMaterial:  pMat,
    percentualMedioProducao:  pProd,
    percentualMedioMaquinas:  pMaq,
    percentualMedioIndiretos: pInd,
    maiorComponente,
    pecasComCusto:            comCusto.length,
    pecasSemCusto:            semCusto.length,
    custoTotalCatalogo:       total,
  }
}
