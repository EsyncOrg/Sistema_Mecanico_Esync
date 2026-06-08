// ─── Phase 7 — Assembly Cost Engine ──────────────────────────────────────────
//
// Pure functions — no React, no side effects.
// Computes the cost of an assembly (Conjunto) given material selections
// per piece (OrcamentoItemConfiguracao).
//
// Architecture:
//   Conjunto.pecas (PecaConjunto[])
//     + OrcamentoItemConfiguracao[] (user material selections per piece)
//     + CustoMaterial[] (current pricing)
//     + CustoPecaBreakdown[] (config-based breakdowns from Phase 6.1, optional)
//     + ConfiguracaoCustos (taxaIndiretos, fatorWasteDefault)
//       ↓
//   calcularCustoConjunto() → ConjuntoCostBreakdown
//       ↓
//   snapshots + quotation total
//
// Cost formula per piece:
//   Phase 7 default (material-only):
//     custoMat = pesoEstimado × valorKg × fatorWaste
//     custoInd = custoMat × (taxaIndiretos / 100)
//     custoUn  = custoMat + custoInd
//
//   When configuracaoFabricacaoId is set AND a breakdown exists:
//     custoUn = breakdown.custoTotal (richer: includes process + machine costs)
//
// [HOOK:SHEET_UTILIZATION] — Phase 6.5: refine to area-based material cost
// [HOOK:QUOTATION_INTEGRATION] — this module IS Phase 8's quotation integration hook
// [HOOK:SUPABASE_SYNC] — store snapshots in `conjunto_cost_snapshots` table

import type { Conjunto }    from '@/types/conjuntos'
import type { OrcamentoItem } from '@/types/orcamentos'
import type { CustoMaterial } from '@/types/custos'
import type { ConfiguracaoCustos } from '@/types/custos-pecas'
import type { CustoPecaBreakdown } from '@/types/custos-pecas'
import type { ConfiguracaoFabricacao } from '@/types/configuracoes-fabricacao'
import type {
  OrcamentoItemConfiguracao,
  ConjuntoCostBreakdown,
  ConjuntoCostSnapshot,
  SnapshotMotivoConjunto,
} from '@/types/orcamento-configuracoes'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function r2(n: number): number { return Math.round(n * 100) / 100 }

// ─── Per-piece unit cost ──────────────────────────────────────────────────────

/**
 * Calculates unit cost for ONE piece (one unit) in ONE assembly.
 *
 * Priority:
 *   1. configuracaoFabricacaoId set + breakdown found → use breakdown.custoTotal
 *   2. materialId set → material-weight cost + indirect overhead
 *   3. Neither → 0 (not selected yet)
 */
export function calcularCustoUnPeca(
  selecao:           OrcamentoItemConfiguracao,
  materiais:         CustoMaterial[],
  breakdownsComConfig: CustoPecaBreakdown[],
  config:            ConfiguracaoCustos,
): number {
  // Priority 1: use richer config-based breakdown
  if (selecao.configuracaoFabricacaoId) {
    const bd = breakdownsComConfig.find(
      (b) => b.configuracaoId === selecao.configuracaoFabricacaoId
    )
    if (bd && bd.custoTotal > 0) return bd.custoTotal
  }

  // Priority 2: material-weight cost
  const material = materiais.find((m) => m.id === selecao.materialId)
  if (!material || selecao.pecaConjuntoPeso <= 0) return 0

  const custoMat = r2(selecao.pecaConjuntoPeso * material.valorKg * config.fatorWasteDefault)
  const custoInd = r2(custoMat * (config.taxaIndiretos / 100))
  return r2(custoMat + custoInd)
}

// ─── Full assembly cost breakdown ─────────────────────────────────────────────

/**
 * Computes the total cost for one assembly line item in a quotation.
 *
 * @param orcamentoItem  - The OrcamentoItem (tipo='conjunto') from the quotation
 * @param conjunto       - The full Conjunto with its piece list
 * @param selecoes       - Material selections for this assembly in this quotation
 * @param materiais      - Current material price list (from CustosContext)
 * @param breakdownsComConfig - Config-based breakdowns (from ConfiguracoesFabricacaoContext)
 * @param config         - Indirect overhead + waste factor settings
 */
export function calcularCustoConjunto(
  orcamentoItem:       OrcamentoItem,
  conjunto:            Conjunto,
  selecoes:            OrcamentoItemConfiguracao[],
  materiais:           CustoMaterial[],
  breakdownsComConfig: CustoPecaBreakdown[],
  config:              ConfiguracaoCustos,
): ConjuntoCostBreakdown {
  const qtdConjuntos = orcamentoItem.quantidade

  let custoMaterial = 0
  let custoProcesso = 0
  let custoIndiretos = 0
  let pesoTotal    = 0
  let calculadas   = 0
  let semSelecao   = 0

  for (const peca of conjunto.pecas) {
    const selecao = selecoes.find((s) => s.pecaConjuntoId === peca.id)

    if (!selecao || !selecao.materialId) {
      semSelecao++
      continue
    }

    const material = materiais.find((m) => m.id === selecao.materialId)
    if (!material) { semSelecao++; continue }

    // Determine unit cost source
    let custoUn = 0
    let isMaterialOnly = true

    if (selecao.configuracaoFabricacaoId) {
      const bd = breakdownsComConfig.find(
        (b) => b.configuracaoId === selecao.configuracaoFabricacaoId
      )
      if (bd && bd.custoTotal > 0) {
        custoUn = bd.custoTotal
        isMaterialOnly = false
        // Accumulate process vs material separately for breakdown visualization
        custoMaterial += r2(bd.custoMaterial * peca.quantidade * qtdConjuntos)
        custoProcesso += r2(
          (bd.custoCorte + bd.custoDobra + bd.custoSolda + bd.custoPintura + bd.custoMontagem +
           bd.custoEngenharia + bd.custoProgramacao + bd.custoMaquinas)
          * peca.quantidade * qtdConjuntos
        )
        custoIndiretos += r2(bd.custoIndiretos * peca.quantidade * qtdConjuntos)
      }
    }

    if (isMaterialOnly || custoUn === 0) {
      const mat = r2(peca.pesoEstimado * material.valorKg * config.fatorWasteDefault)
      const ind = r2(mat * (config.taxaIndiretos / 100))
      custoUn    = r2(mat + ind)
      custoMaterial += r2(mat * peca.quantidade * qtdConjuntos)
      custoIndiretos += r2(ind * peca.quantidade * qtdConjuntos)
    }

    pesoTotal += r2(peca.pesoEstimado * peca.quantidade * qtdConjuntos)
    calculadas++
  }

  const custoTotal = r2(custoMaterial + custoProcesso + custoIndiretos)

  return {
    conjuntoId:          conjunto.id,
    conjuntoCodigo:      conjunto.codigo,
    conjuntoNome:        conjunto.nome,
    orcamentoItemId:     orcamentoItem.id,
    quantidade:          qtdConjuntos,
    custoMaterial:       r2(custoMaterial),
    custoProcesso:       r2(custoProcesso),
    custoIndiretos:      r2(custoIndiretos),
    custoTotal,
    pesoTotalKg:         r2(pesoTotal),
    pecasTotal:          conjunto.pecas.length,
    pecasCalculadas:     calculadas,
    pecasSemSelecao:     semSelecao,
    calculadoComSucesso: semSelecao === 0 && calculadas > 0,
    calculadoEm:         new Date(),
  }
}

// ─── Initialize selections for a new conjunto addition ───────────────────────

/**
 * Creates blank OrcamentoItemConfiguracao entries for all pieces in an assembly.
 * Called when a conjunto is first added to a quotation.
 * materialId is left empty — user must select.
 */
export function inicializarSelecoes(
  orcamentoId:     string,
  orcamentoItemId: string,
  conjunto:        Conjunto,
): OrcamentoItemConfiguracao[] {
  const now = new Date()
  return conjunto.pecas.map((peca) => ({
    id:                      `oic-${orcamentoItemId}-${peca.id}-${Date.now()}`,
    orcamenaoId:             orcamentoId,
    orcamentoId,
    orcamentoItemId,
    conjuntoId:              conjunto.id,
    pecaConjuntoId:          peca.id,
    pecaConjuntoCodigo:      peca.codigo,
    pecaConjuntoDescricao:   peca.descricao,
    pecaConjuntoQuantidade:  peca.quantidade,
    pecaConjuntoPeso:        peca.pesoEstimado,
    pecaConjuntoEspessura:   peca.espessura,
    configuracaoFabricacaoId:'',   // blank — user must select (Phase 7.1: primary field)
    materialId:              '',   // derived from config when selected
    custoUnitario:           0,
    criadoEm:                now,
    atualizadoEm:            now,
  }))
}

// ─── Snapshot creation ────────────────────────────────────────────────────────

/**
 * Creates an immutable ConjuntoCostSnapshot from live breakdown data.
 * Called on quotation approval, revision creation, and production conversion.
 */
export function criarConjuntoSnapshot(
  breakdown: ConjuntoCostBreakdown,
  selecoes:  OrcamentoItemConfiguracao[],
  orcamentoId:    string,
  orcamentoNumero:string,
  motivo:         SnapshotMotivoConjunto,
  usuario:        string,
): ConjuntoCostSnapshot {
  const now = new Date()
  return {
    id:              `snap-cnj-${breakdown.conjuntoId}-${now.getTime()}`,
    orcamentoId,
    orcamentoNumero,
    orcamentoItemId: breakdown.orcamentoItemId,
    conjuntoId:      breakdown.conjuntoId,
    conjuntoCodigo:  breakdown.conjuntoCodigo,
    conjuntoNome:    breakdown.conjuntoNome,
    quantidade:      breakdown.quantidade,
    custoMaterial:   breakdown.custoMaterial,
    custoProcesso:   breakdown.custoProcesso,
    custoIndiretos:  breakdown.custoIndiretos,
    custoTotal:      breakdown.custoTotal,
    pesoTotalKg:     breakdown.pesoTotalKg,
    selecoes: selecoes.map((s) => ({
      pecaConjuntoId:          s.pecaConjuntoId,
      pecaConjuntoCodigo:      s.pecaConjuntoCodigo,
      pecaConjuntoDescricao:   s.pecaConjuntoDescricao,
      pecaConjuntoQuantidade:  s.pecaConjuntoQuantidade,
      pecaConjuntoPeso:        s.pecaConjuntoPeso,
      materialId:              s.materialId,
      configuracaoFabricacaoId:s.configuracaoFabricacaoId,
      custoUnitario:           s.custoUnitario,
    })),
    motivo,
    criadoEm:  now,
    criadoPor: usuario,
  }
}

// ─── Quotation total cost ─────────────────────────────────────────────────────

/**
 * Computes the total calculated cost for all conjunto items in a quotation.
 * Sums ConjuntoCostBreakdown.custoTotal for each assembly line item.
 */
export function calcularCustoTotalConjuntos(
  breakdowns: ConjuntoCostBreakdown[],
): number {
  return r2(breakdowns.reduce((sum, bd) => sum + bd.custoTotal, 0))
}

// ─── Phase 7.2 — Draft selection builder ─────────────────────────────────────

/**
 * Builds OrcamentoItemConfiguracao[] from draft selections made during quotation
 * creation (before the quotation is saved). Called after criarOrcamento() returns
 * the actual item IDs, to register selections in OrcamentoConfiguracoesContext.
 *
 * @param orcamentoId      - The newly created quotation's id
 * @param orcamentoItemId  - The actual OrcamentoItem.id (post-creation)
 * @param conjunto         - Full assembly with piece list
 * @param selecoesPorPcp   - Draft map: pecaConjunto.id → configuracaoFabricacaoId
 * @param configuracoes    - All available configurations (for materialId derivation)
 * @param breakdownsComConfig - For unit cost derivation
 */
export function buildSelecoesDraft(
  orcamentoId:       string,
  orcamentoItemId:   string,
  conjunto:          Conjunto,
  selecoesPorPcp:    Record<string, string>,
  configuracoes:     ConfiguracaoFabricacao[],
  breakdownsComConfig: CustoPecaBreakdown[],
): OrcamentoItemConfiguracao[] {
  const now = new Date()
  return conjunto.pecas.map((peca) => {
    const cfgId  = selecoesPorPcp[peca.id] ?? ''
    const cfg    = cfgId ? configuracoes.find((c) => c.id === cfgId) : undefined
    const bd     = cfgId ? breakdownsComConfig.find((b) => b.configuracaoId === cfgId) : undefined
    return {
      id:                      `oic-${orcamentoItemId}-${peca.id}-${now.getTime()}`,
      orcamentoId,
      orcamentoItemId,
      conjuntoId:              conjunto.id,
      pecaConjuntoId:          peca.id,
      pecaConjuntoCodigo:      peca.codigo,
      pecaConjuntoDescricao:   peca.descricao,
      pecaConjuntoQuantidade:  peca.quantidade,
      pecaConjuntoPeso:        peca.pesoEstimado,
      pecaConjuntoEspessura:   peca.espessura,
      configuracaoFabricacaoId:cfgId,
      materialId:              cfg?.materialId ?? '',
      custoUnitario:           bd?.custoTotal ?? 0,
      criadoEm:                now,
      atualizadoEm:            now,
    }
  })
}
