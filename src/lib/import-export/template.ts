import * as XLSX from 'xlsx'
import type { TemplateField } from './types'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadTemplateXLSX(moduleName: string, fields: TemplateField[]): void {
  const wb = XLSX.utils.book_new()

  // ── Data sheet ──
  const headers = fields.map((f) => `${f.label}${f.required ? ' *' : ''}`)
  const examples = fields.map((f) => f.example ?? '')

  const ws = XLSX.utils.aoa_to_sheet([headers, examples])

  ws['!cols'] = fields.map((f) => ({ wch: Math.max(f.label.length + 4, 16) }))
  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 } as XLSX.ColInfo

  XLSX.utils.book_append_sheet(wb, ws, 'Dados')

  // ── Instructions sheet ──
  const instrRows: (string | boolean)[][] = [
    ['Campo', 'Obrigatório', 'Instruções'],
    ...fields.map((f) => [
      f.label,
      f.required ? 'Sim' : 'Não',
      f.note ?? `Preencher o campo: ${f.label}`,
    ]),
  ]
  const wsInstr = XLSX.utils.aoa_to_sheet(instrRows)
  wsInstr['!cols'] = [{ wch: 24 }, { wch: 12 }, { wch: 48 }]
  XLSX.utils.book_append_sheet(wb, wsInstr, 'Instruções')

  // ── Meta sheet (hidden) ──
  const metaRows = [
    ['ESYNC_TEMPLATE_VERSION', '1.0'],
    ['ESYNC_TEMPLATE_TYPE', moduleName.toUpperCase()],
    ['ESYNC_APP', 'Esync ERP v1.0'],
    ['ESYNC_GENERATED_AT', new Date().toISOString()],
  ]
  const wsMeta = XLSX.utils.aoa_to_sheet(metaRows)
  XLSX.utils.book_append_sheet(wb, wsMeta, '_meta')

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  downloadBlob(blob, `ESYNC_MODELO_${moduleName.toUpperCase()}.xlsx`)
}

export function downloadTemplateCSV(moduleName: string, fields: TemplateField[]): void {
  const bom = '﻿'
  const headerRow = fields.map((f) => f.label)
  const exampleRow = fields.map((f) => {
    const v = f.example ?? ''
    return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v
  })

  const csv = [headerRow.join(','), exampleRow.join(',')].join('\r\n')
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `ESYNC_MODELO_${moduleName.toUpperCase()}.csv`)
}
