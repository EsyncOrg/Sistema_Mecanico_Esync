import type { Peca } from '@/types'

// ─── Config ───────────────────────────────────────────────────────────────────

export const CODE_PREFIX = 'ES.FAB'

// ─── Parsers ──────────────────────────────────────────────────────────────────

/**
 * Extracts the sequential number from a code with format ES.FAB.NNNNN.BB.R.
 * Returns null for any code that doesn't follow the pattern.
 */
export function extractCodeSequence(codigo: string): number | null {
  const parts = codigo.split('.')
  if (parts.length !== 5) return null
  if (parts[0] !== 'ES' || parts[1] !== 'FAB') return null
  const n = parseInt(parts[2], 10)
  return isNaN(n) ? null : n
}

export interface ParsedPecaCode {
  seq:    number
  bitola: string   // the gauge number embedded in the code (e.g. "14")
  revisao: string
}

/**
 * Full parser: returns all three variable components of an ES.FAB code.
 * Returns null for legacy codes (PCA-XXXX, etc.).
 */
export function parsePecaCode(codigo: string): ParsedPecaCode | null {
  const parts = codigo.split('.')
  if (parts.length !== 5 || parts[0] !== 'ES' || parts[1] !== 'FAB') return null
  const seq = parseInt(parts[2], 10)
  if (isNaN(seq)) return null
  return { seq, bitola: parts[3], revisao: parts[4] }
}

// ─── Generators ───────────────────────────────────────────────────────────────

/**
 * Scans all existing parts and returns the next safe sequence number.
 * Guarantees no collision even after deletions or bulk imports.
 */
export function nextPartSequence(pecas: Peca[]): number {
  let max = 0
  for (const p of pecas) {
    const n = extractCodeSequence(p.codigo)
    if (n !== null && n > max) max = n
  }
  return max + 1
}

/**
 * Assembles the full part code from its three variable components.
 * ES.FAB.NNNNN.BB.R  (BB = bitola number, e.g. 14)
 */
export function generatePartCode(seq: number, bitola: string, revisao: string): string {
  const seq5   = String(seq).padStart(5, '0')
  const bit    = bitola.trim()
  // Revisão: uppercase, up to 2 chars (A, B … AA, AB for future revisions)
  const revUp  = revisao.trim().toUpperCase().slice(0, 2) || 'A'
  return `${CODE_PREFIX}.${seq5}.${bit}.${revUp}`
}

/** Returns true if the code is already used by any existing part. */
export function isCodeDuplicate(codigo: string, pecas: Peca[]): boolean {
  return pecas.some((p) => p.codigo === codigo)
}
