// ─── Shared types for the import/export system ───────────────────────────────

export interface ExportColumn {
  key: string
  label: string
}

export type ExportFormat = 'xlsx' | 'csv' | 'pdf'

export interface FieldConfig {
  key: string
  label: string
  required: boolean
  aliases?: string[]
  validate?: (value: string) => string | null
}

export interface ParseResult {
  headers: string[]
  rows: Record<string, string>[]
  totalRows: number
}

export interface ValidationError {
  linha: number
  campo: string
  erro: string
}

export interface ValidationResult {
  valid: Record<string, unknown>[]
  errors: ValidationError[]
  totalRows: number
}

export interface TemplateField {
  label: string
  required: boolean
  example?: string
  note?: string
}
