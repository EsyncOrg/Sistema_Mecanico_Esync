// ─── Tempos Industriais — Analytics Engine ────────────────────────────────────
//
// Pure functions — no React, no side effects, no context dependencies.
// Accepts Peca[] and returns computed TemposAnalytics.
//
// Used by:
//   - computeDashboardData() — reads mockPecas directly
//   - Future: TemposContext.analytics — computed from live Peca[] state
//
// [HOOK:CUSTO_PECA] — Phase 6: chain these analytics to the cost engine
//   calcularProcessos(tempos, centros) → process cost
//   calcularCustoPeca(tempos, material, ...) → total piece cost

import type { Peca } from '@/types'
import type {
  TemposAnalytics,
  TemposPecaValues,
  ProcessoNome,
} from '@/types/tempos'
import { PROCESSO_FIELD } from '@/types/tempos'

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Extracts TemposPecaValues from a Peca. All optional fields default to 0. */
export function pecaToTempos(peca: Peca): TemposPecaValues {
  return {
    tempoDesenvolvimentoMin: peca.tempoDesenvolvimentoMin ?? 0,
    tempoProgramacaoMin:     peca.tempoProgramacaoMin     ?? 0,
    tempoCorteMin:           peca.tempoCorteMin           ?? 0,
    tempoDobraMin:           peca.tempoDobraMin           ?? 0,
    tempoSoldaMin:           peca.tempoSoldaMin           ?? 0,
    tempoPinturaMin:         peca.tempoPinturaMin         ?? 0,
    tempoMontagemMin:        peca.tempoMontagemMin        ?? 0,
  }
}

/** Returns the total process time for a single piece (minutes). */
export function tempoTotalPeca(peca: Peca): number {
  const t = pecaToTempos(peca)
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

/** True when a piece has at least one non-zero time field. */
export function pecaTemCadastrado(peca: Peca): boolean {
  return tempoTotalPeca(peca) > 0
}

// ─── Main analytics ───────────────────────────────────────────────────────────

const PROCESSOS: ProcessoNome[] = [
  'Desenvolvimento', 'Programação', 'Corte',
  'Dobra', 'Solda', 'Pintura', 'Montagem',
]

/**
 * Computes time analytics from a Peca list.
 * Pure function — safe to call in server components or dashboard helpers.
 */
export function calcularTemposAnalytics(pecas: Peca[]): TemposAnalytics {
  const comTempos = pecas.filter(pecaTemCadastrado)
  const semTempos = pecas.filter((p) => !pecaTemCadastrado(p))

  const tempoTotalCatalogado = comTempos.reduce((s, p) => s + tempoTotalPeca(p), 0)

  const tempoMedioPorPeca =
    comTempos.length > 0
      ? Math.round((tempoTotalCatalogado / comTempos.length) * 10) / 10
      : 0

  // Per-process averages across pieces that have that process > 0
  const tempoMedioPorProcesso = {} as Record<ProcessoNome, number>
  let processoMaisDemorado: ProcessoNome | null = null
  let maxMedia = 0

  PROCESSOS.forEach((nome) => {
    const fieldKey = PROCESSO_FIELD[nome]
    const pecasComProcesso = pecas.filter((p) => (p[fieldKey as keyof Peca] as number ?? 0) > 0)
    const soma = pecasComProcesso.reduce(
      (s, p) => s + (p[fieldKey as keyof Peca] as number ?? 0),
      0
    )
    const media = pecasComProcesso.length > 0
      ? Math.round((soma / pecasComProcesso.length) * 10) / 10
      : 0

    tempoMedioPorProcesso[nome] = media

    if (media > maxMedia) {
      maxMedia = media
      processoMaisDemorado = nome
    }
  })

  return {
    tempoMedioPorPeca,
    tempoMedioPorProcesso,
    processoMaisDemorado,
    pecasSemTempos:         semTempos.length,
    pecasComTempos:         comTempos.length,
    tempoTotalCatalogado,
  }
}

// ─── Breakdown (for visualization) ───────────────────────────────────────────

export interface ProcessoBreakdownItem {
  nome: ProcessoNome
  minutos: number
  percentual: number
}

/**
 * Returns each process's share of the total time for a single piece.
 * Used by the breakdown bar chart in EditarPecaModal.
 */
export function calcularBreakdown(tempos: TemposPecaValues): ProcessoBreakdownItem[] {
  const total = PROCESSOS.reduce(
    (s, nome) => s + (tempos[PROCESSO_FIELD[nome]] as number),
    0
  )

  return PROCESSOS.map((nome) => {
    const minutos = tempos[PROCESSO_FIELD[nome]] as number
    return {
      nome,
      minutos,
      percentual: total > 0 ? Math.round((minutos / total) * 1000) / 10 : 0,
    }
  }).filter((item) => item.minutos > 0)
}
