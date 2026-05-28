import type { FieldConfig, ValidationError, ValidationResult } from './types'

// Strip accents and non-alphanumeric to compare column names flexibly
function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '')
}

export function buildAutoMapping(
  fileHeaders: string[],
  fields: FieldConfig[]
): Record<string, string> {
  const mapping: Record<string, string> = {}
  for (const field of fields) {
    const candidates = [
      field.key,
      field.label,
      ...(field.aliases ?? []),
    ].map(normalize)

    const match = fileHeaders.find((h) => candidates.includes(normalize(h)))
    mapping[field.key] = match ?? ''
  }
  return mapping
}

export function validateRows(
  rows: Record<string, string>[],
  fields: FieldConfig[],
  mapping: Record<string, string>
): ValidationResult {
  const valid: Record<string, unknown>[] = []
  const errors: ValidationError[] = []

  rows.forEach((row, idx) => {
    const lineNum = idx + 2 // row 1 is the header
    const normalized: Record<string, unknown> = {}
    let rowHasError = false

    for (const field of fields) {
      const fileCol = mapping[field.key]
      const rawValue = fileCol ? (row[fileCol] ?? '') : ''
      const value = rawValue.trim()

      if (field.required && !value) {
        errors.push({ linha: lineNum, campo: field.label, erro: 'Campo obrigatório vazio' })
        rowHasError = true
        continue
      }

      if (value && field.validate) {
        const err = field.validate(value)
        if (err) {
          errors.push({ linha: lineNum, campo: field.label, erro: err })
          rowHasError = true
          continue
        }
      }

      normalized[field.key] = value || null
    }

    if (!rowHasError) {
      valid.push(normalized)
    }
  })

  return { valid, errors, totalRows: rows.length }
}
