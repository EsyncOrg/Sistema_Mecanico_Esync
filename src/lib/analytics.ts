/**
 * Centralized analytics utilities for OS time distribution across production sectors.
 *
 * Architecture note: these functions are sector-agnostic — they accept plain data
 * and return aggregated results. The Dashboard can call aggregateByOs() on the
 * combined output of all sectors (Corte + Dobra + Solda + ...) to compute
 * factory-wide time per OS without any module coupling.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OsTimeRow {
  os: string
  codigoPeca: string
  descricao: string
  programaOrigem: string
  maquina: string | null
  operador: string | null
  setupSecs: number
  producaoSecs: number
  quantidade: number
  status: string
  sector: 'corte' | 'dobra' | 'solda' | string
}

export interface OsAggregate {
  os: string
  totalSetupSecs: number
  totalProducaoSecs: number
  totalSecs: number
  totalQtd: number
  programs: string[]
  machines: string[]
  operators: string[]
  /** Percentage of grand total machine time */
  pct: number
}

// ─── Distribution ─────────────────────────────────────────────────────────────

/**
 * Distribute setup and production time EQUALLY across linked OSes.
 * Use when per-OS quantities are not available (e.g. Dobra tasks).
 * Remainder quantity is assigned to the last OS.
 */
export function distributeTimeEqual(
  setupSecs: number,
  producaoSecs: number,
  osVinculadas: string[],
  totalQtd: number,
): Array<{ os: string; setupSecs: number; producaoSecs: number; qtdShare: number }> {
  const count = osVinculadas.length
  if (count === 0) return []
  const setupEach = Math.round(setupSecs / count)
  const prodEach = Math.round(producaoSecs / count)
  const qtdEach = Math.round(totalQtd / count)
  return osVinculadas.map((os, i) => ({
    os,
    setupSecs: setupEach,
    producaoSecs: prodEach,
    qtdShare: i === count - 1 ? totalQtd - qtdEach * (count - 1) : qtdEach,
  }))
}

/**
 * Distribute time PROPORTIONALLY by quantity.
 * Use when per-OS quantities are known (e.g. Corte sessions with distinct ordens).
 */
export function distributeTimeProportional(
  setupSecs: number,
  producaoSecs: number,
  distributions: Array<{ os: string; quantidade: number }>,
): Array<{ os: string; setupSecs: number; producaoSecs: number; qtdShare: number }> {
  const total = distributions.reduce((a, d) => a + d.quantidade, 0)
  if (total === 0) return []
  return distributions.map((d) => ({
    os: d.os,
    setupSecs: Math.round((d.quantidade / total) * setupSecs),
    producaoSecs: Math.round((d.quantidade / total) * producaoSecs),
    qtdShare: d.quantidade,
  }))
}

// ─── Aggregation ──────────────────────────────────────────────────────────────

/**
 * Aggregate an array of OsTimeRow entries into per-OS totals.
 *
 * This is the core function for Dashboard cross-sector aggregation:
 *   const allRows = [...corteRows, ...dobraRows, ...soldaRows]
 *   const byOs = aggregateByOs(allRows)
 */
export function aggregateByOs(rows: OsTimeRow[]): OsAggregate[] {
  const map: Record<string, {
    setup: number
    prod: number
    qtd: number
    programs: Set<string>
    machines: Set<string>
    operators: Set<string>
  }> = {}

  rows.forEach((row) => {
    if (!map[row.os]) {
      map[row.os] = {
        setup: 0, prod: 0, qtd: 0,
        programs: new Set(),
        machines: new Set(),
        operators: new Set(),
      }
    }
    map[row.os].setup += row.setupSecs
    map[row.os].prod += row.producaoSecs
    map[row.os].qtd += row.quantidade
    if (row.programaOrigem) map[row.os].programs.add(row.programaOrigem)
    if (row.maquina) map[row.os].machines.add(row.maquina)
    if (row.operador) map[row.os].operators.add(row.operador.split(' ')[0])
  })

  const grandTotal = Object.values(map).reduce((a, v) => a + v.setup + v.prod, 0)

  return Object.entries(map)
    .map(([os, v]) => ({
      os,
      totalSetupSecs: v.setup,
      totalProducaoSecs: v.prod,
      totalSecs: v.setup + v.prod,
      totalQtd: v.qtd,
      programs: Array.from(v.programs),
      machines: Array.from(v.machines),
      operators: Array.from(v.operators),
      pct: grandTotal > 0 ? Math.round(((v.setup + v.prod) / grandTotal) * 100) : 0,
    }))
    .sort((a, b) => b.totalSecs - a.totalSecs)
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/** Format seconds into a human-readable duration string (e.g. "1h 5m" or "8min"). */
export function fmtSecs(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}min`
}
