// ─── Import Security Types ────────────────────────────────────────────────────

export type ImportAuditStatus = 'success' | 'blocked' | 'failure'

export interface ImportAuditEvent {
  id: string
  userId: string
  userName: string
  moduleName: string
  moduleTitle: string
  filename: string
  timestamp: string
  status: ImportAuditStatus
  rowsImported?: number
  errorCount?: number
  // Future: empresaId (multi-company), supabaseRef (DB persistence)
}

// ─── Action Audit ─────────────────────────────────────────────────────────────

export type ActionAuditType = 'import' | 'edit' | 'delete'
export type ActionAuditStatus = 'success' | 'blocked' | 'failure'

export interface ActionAuditEvent {
  id: string
  userId: string
  userName: string
  moduleName: string
  actionType: ActionAuditType
  targetIds: string[]          // record IDs affected
  targetSummary: string        // human-readable summary
  timestamp: string
  status: ActionAuditStatus
  changedFields?: string[]     // for edit: which fields changed
  // Future: empresaId, supabaseRef, approvalWorkflowId
}

// Future RBAC — granular data-operation permissions per module/role
export interface DataOperationPermissions {
  canImport: boolean
  canExport: boolean
  canEdit: boolean
  canDelete: boolean
}
