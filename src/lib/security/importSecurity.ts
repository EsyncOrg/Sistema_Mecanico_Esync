import type { ImportAuditEvent, ActionAuditEvent } from '@/types/security'

/**
 * Validates the import security password.
 *
 * Currently checks NEXT_PUBLIC_IMPORT_SECURITY_PASSWORD on the client.
 * TODO (Supabase): replace the body with a server-side RPC call so the
 * secret never ships in the browser bundle, e.g.:
 *   const { data } = await supabase.rpc('validate_import_password', { pwd: password, empresa_id })
 */
export async function validateImportPassword(password: string): Promise<boolean> {
  const expected = process.env.NEXT_PUBLIC_IMPORT_SECURITY_PASSWORD
  if (!expected) {
    console.warn('[ImportSecurity] NEXT_PUBLIC_IMPORT_SECURITY_PASSWORD is not configured.')
    return false
  }
  // Deliberate async delay — placeholder latency for the future network round-trip
  await new Promise((r) => setTimeout(r, 500))
  return password === expected
}

// ─── In-memory audit log ──────────────────────────────────────────────────────
// Future: swap the push() for a supabase.from('import_audit_log').insert(entry) call

const _log: ImportAuditEvent[] = []

export function logImportAudit(event: Omit<ImportAuditEvent, 'id' | 'timestamp'>): void {
  const entry: ImportAuditEvent = {
    ...event,
    id: Math.random().toString(36).slice(2, 11),
    timestamp: new Date().toISOString(),
  }
  _log.push(entry)
  if (process.env.NODE_ENV === 'development') {
    console.info('[ImportAudit]', entry)
  }
}

export function getImportAuditLog(): ImportAuditEvent[] {
  return [..._log]
}

// ─── Generic action audit log ─────────────────────────────────────────────────
// Covers edit, delete, and future actions. Future: persist via Supabase.

const _actionLog: ActionAuditEvent[] = []

export function logActionAudit(event: Omit<ActionAuditEvent, 'id' | 'timestamp'>): void {
  const entry: ActionAuditEvent = {
    ...event,
    id:        Math.random().toString(36).slice(2, 11),
    timestamp: new Date().toISOString(),
  }
  _actionLog.push(entry)
  if (process.env.NODE_ENV === 'development') {
    console.info('[ActionAudit]', entry)
  }
}

export function getActionAuditLog(): ActionAuditEvent[] {
  return [..._actionLog]
}
