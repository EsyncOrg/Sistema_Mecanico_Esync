// ─── Bitola → Espessura mapping ───────────────────────────────────────────────
//
// Future: extend with per-material and per-company tables via Supabase config
// e.g. bitolaMapInox, bitolaMapAluminio, bitolaMapGalvanizado

export interface BitolaEntry {
  bitola:    string   // gauge number as string (used in code: ES.FAB.NNNNN.14.A)
  espessura: number   // thickness in mm stored in Peca.espessura
  label:     string   // display label for UI chips
}

export const BITOLA_TABLE: BitolaEntry[] = [
  { bitola: '11', espessura: 3,    label: '11' },
  { bitola: '12', espessura: 2.7,  label: '12' },
  { bitola: '13', espessura: 2.3,  label: '13' },
  { bitola: '14', espessura: 1.9,  label: '14' },
  { bitola: '16', espessura: 1.5,  label: '16' },
  { bitola: '18', espessura: 1.2,  label: '18' },
  { bitola: '19', espessura: 1.1,  label: '19' },
  { bitola: '20', espessura: 0.95, label: '20' },
  { bitola: '22', espessura: 0.8,  label: '22' },
]

/** All valid bitola strings, in table order. */
export const BITOLAS: string[] = BITOLA_TABLE.map((b) => b.bitola)

// ─── Lookups ──────────────────────────────────────────────────────────────────

/** Returns the espessura (mm) for a given bitola, or null if not found. */
export function getBitolaEspessura(bitola: string): number | null {
  return BITOLA_TABLE.find((b) => b.bitola === bitola)?.espessura ?? null
}

/**
 * Reverse lookup: given an espessura value, returns the matching bitola string.
 * Returns null for legacy parts whose espessura doesn't match any standard bitola.
 */
export function getBitolaFromEspessura(espessura: number): string | null {
  return BITOLA_TABLE.find((b) => b.espessura === espessura)?.bitola ?? null
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Formats an espessura number for display using pt-BR notation.
 * Examples: 1.9 → "1,9 mm" | 2.7 → "2,7 mm" | 3 → "3 mm" | 0.95 → "0,95 mm"
 */
export function formatEspessura(mm: number): string {
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(mm)
  return `${formatted} mm`
}
