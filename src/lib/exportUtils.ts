// ─── Esync ERP — Export Utilities ────────────────────────────────────────────
// Real file generation for ExportModal (CSV, XLSX, PDF).
// Filename convention: {base}_{HH-MM}.{ext}

import * as XLSX from 'xlsx'

export interface ExportColumn {
  key: string
  label: string
}

export type ExportFormat = 'xlsx' | 'csv' | 'pdf'

// ─── Shared helpers ───────────────────────────────────────────────────────────

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

function timeTag(): string {
  const now = new Date()
  return `_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}`
}

// Normalize for column classification: lowercase, strip accents, collapse spaces
function _norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '')
}

// True if a column carries long free-text (description-class)
function _isDescCol(col: ExportColumn): boolean {
  const t = _norm(`${col.key} ${col.label}`)
  return /descri|descr/.test(t) && !/^cod/.test(t)
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

export function exportCSV(
  filenameBase: string,
  columns: ExportColumn[],
  data: Record<string, unknown>[]
): void {
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s
  }
  const header = columns.map((c) => escape(c.label)).join(',')
  const rows = data.map((row) => columns.map((c) => escape(row[c.key])).join(','))
  const csv = '﻿' + [header, ...rows].join('\r\n') // UTF-8 BOM for Excel
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${filenameBase}${timeTag()}.csv`)
}

// ─── XLSX ─────────────────────────────────────────────────────────────────────

export async function exportXLSX(
  filenameBase: string,
  columns: ExportColumn[],
  data: Record<string, unknown>[]
): Promise<void> {
  const wb = XLSX.utils.book_new()

  // ── Data sheet ──
  const headerRow = columns.map((c) => c.label)
  const dataRows  = data.map((row) => columns.map((c) => row[c.key] ?? ''))
  const wsData    = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows])

  // Auto-fit column widths
  wsData['!cols'] = columns.map((col, ci) => {
    const maxLen = Math.max(
      col.label.length,
      ...dataRows.map((r) => String(r[ci] ?? '').length)
    )
    return { wch: Math.min(Math.max(maxLen + 2, 10), 45) }
  })

  // Freeze top row
  wsData['!freeze'] = { xSplit: 0, ySplit: 1 } as XLSX.ColInfo

  // Auto-filter across all columns
  if (headerRow.length > 0) {
    wsData['!autofilter'] = {
      ref: `A1:${XLSX.utils.encode_col(headerRow.length - 1)}1`,
    }
  }

  // ── Cell alignment ──
  // Center all cells horizontally + vertically.
  // Description columns: left-align for readability, but still vertically centered.
  const wsRef = wsData['!ref']
  if (wsRef) {
    const rng = XLSX.utils.decode_range(wsRef)
    for (let R = rng.s.r; R <= rng.e.r; R++) {
      for (let C = rng.s.c; C <= rng.e.c; C++) {
        const addr = XLSX.utils.encode_cell({ r: R, c: C })
        if (!wsData[addr]) continue
        const col   = columns[C]
        const isDesc = col ? _isDescCol(col) : false
        wsData[addr].s = {
          alignment: {
            horizontal: isDesc ? 'left' : 'center',
            vertical:   'center',
            wrapText:   true,
          },
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, wsData, 'Dados')

  // ── Meta sheet — enables round-trip import recognition ──
  const moduleType = filenameBase.split('-')[1]?.toUpperCase() ?? 'DADOS'
  const wsMeta     = XLSX.utils.aoa_to_sheet([
    ['ESYNC_TEMPLATE_VERSION', '1.0'],
    ['ESYNC_EXPORT_TYPE',      moduleType],
    ['ESYNC_EXPORTED_AT',      new Date().toISOString()],
    ['ESYNC_RECORDS',          String(data.length)],
    ['ESYNC_APP',              'Esync ERP v1.0'],
  ])
  wsMeta['!cols'] = [{ wch: 28 }, { wch: 42 }]
  XLSX.utils.book_append_sheet(wb, wsMeta, '_meta')

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx', cellStyles: true })
  downloadBlob(
    new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${filenameBase}${timeTag()}.xlsx`
  )
}

// ─── PDF — Premium Industrial Report ─────────────────────────────────────────
//
// Architecture:
//   • Always landscape A4 (297 × 210 mm)
//   • Page 1: full-height header band + info strip + table
//   • Page 2+: compact 10 mm header repeated by autoTable hook
//   • Column widths computed dynamically from semantic column type
//   • All cells: halign center, valign middle
//   • Description columns: halign left (readability), valign middle
//   • overflow:'linebreak' — headers NEVER stack vertically
//   • Footer drawn post-loop so "X / Y" total count is always accurate

// ── Column semantics ─────────────────────────────────────────────────────────

type ColCat = 'description' | 'code' | 'percentage' | 'measurement' | 'date' | 'file' | 'category' | 'default'

function _classify(col: ExportColumn): ColCat {
  const t = _norm(`${col.key} ${col.label}`)
  if (_isDescCol(col))                                               return 'description'
  if (/%/.test(col.label))                                           return 'percentage'
  if (/sistema|sist/.test(t))                                        return 'code'
  if (/\bcod|codigo|code|sku/.test(t))                               return 'code'
  if (/atualiz|atualizad|updatedat|updated/.test(t))                 return 'date'
  if (/\b3d\b|arquivo3d|ipt/.test(t))                                return 'file'
  if (/planodobra|planodefabricacao|plano|dobra/.test(t))            return 'file'
  if (/areapeca|area|desperdicio|espessura|peso\b|kg/.test(t))       return 'measurement'
  if (/grupo|familia|fam|cor\b/.test(t))                             return 'category'
  return 'default'
}

// Base widths (mm) before proportional scaling
const _BASE: Record<ColCat, number> = {
  description: 54,
  code:         22,
  percentage:   12,
  measurement:  16,
  date:         20,
  file:         12,
  category:     18,
  default:      18,
}

function _computeWidths(columns: ExportColumn[], usable: number): number[] {
  const bases  = columns.map((c) => _BASE[_classify(c)])
  const total  = bases.reduce((a, b) => a + b, 0)
  const MIN    = 9

  let surplus = 0
  const scaled = bases.map((b) => {
    const w = (b / total) * usable
    if (w < MIN) { surplus += MIN - w; return MIN }
    return w
  })

  const descIdx    = columns.findIndex((c) => _classify(c) === 'description')
  const defaultIdx = columns.findIndex((c) => _classify(c) === 'default')
  const bigIdx     = descIdx >= 0 ? descIdx : defaultIdx >= 0 ? defaultIdx : 0
  scaled[bigIdx]   = Math.max(MIN, scaled[bigIdx] - surplus)

  const sum = scaled.reduce((a, b) => a + b, 0)
  scaled[bigIdx] += usable - sum

  return scaled
}

// All columns center-aligned; description stays left for readability
function _align(col: ExportColumn): 'left' | 'center' {
  return _isDescCol(col) ? 'left' : 'center'
}

// Convert file paths to a compact indicator for PDF readability
function _fmtCell(col: ExportColumn, val: unknown): string {
  if (val === null || val === undefined || val === '') return '—'
  const s = String(val)
  const t = _norm(`${col.key} ${col.label}`)
  if (/3d|arquivo3d|ipt|planodobra|plano|dobra/.test(t) && s.startsWith('/')) return 'Sim'
  return s
}

// ── PDF export ───────────────────────────────────────────────────────────────

export async function exportPDF(
  filenameBase: string,
  title: string,
  subtitle: string,
  columns: ExportColumn[],
  data: Record<string, unknown>[]
): Promise<void> {
  const { default: jsPDF }    = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF('landscape', 'mm', 'a4')
  const PW = doc.internal.pageSize.width   // 297 mm
  const PH = doc.internal.pageSize.height  // 210 mm

  // Layout constants
  const MX     = 10   // left/right margin
  const HDR_H  = 28   // full header height (page 1)
  const SUB_H  = 13   // info strip height (page 1)
  const MINI_H = 10   // compact header (page 2+)
  const FOOT_H = 11   // footer height
  const TBL_Y  = HDR_H + SUB_H   // table start on page 1 = 41 mm
  const UW     = PW - MX * 2     // usable table width    = 277 mm

  const colWidths = _computeWidths(columns, UW)

  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  // ── Page 1 — Full header ──────────────────────────────────────────────────

  doc.setFillColor(10, 58, 74)
  doc.rect(0, 0, PW, HDR_H, 'F')

  doc.setFillColor(224, 115, 25)
  doc.rect(0, 0, 3.5, HDR_H, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(255, 255, 255)
  doc.text('ESYNC', 9, 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(160, 205, 220)
  doc.text('SISTEMA MECÂNICO DE GESTÃO', 9, 18)

  doc.setDrawColor(255, 255, 255)
  doc.setLineWidth(0.1)
  doc.setLineDashPattern([0.8, 1.2], 0)
  doc.line(9, 21.5, 82, 21.5)
  doc.setLineDashPattern([], 0)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6)
  doc.setTextColor(140, 190, 210)
  doc.text('Relatório gerado automaticamente pelo sistema', 9, 25.5)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(255, 255, 255)
  doc.text(title.toUpperCase(), 92, 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(175, 215, 230)
  doc.text(subtitle, 92, 18.5)

  doc.setFontSize(6.5)
  doc.setTextColor(185, 225, 238)
  doc.text(`Gerado em  ${dateStr}`, PW - MX, 8.5,  { align: 'right' })
  doc.text(`${data.length} registros`,             PW - MX, 15,    { align: 'right' })
  doc.text(`${columns.length} colunas`,            PW - MX, 21.5,  { align: 'right' })

  // ── Page 1 — Info strip ───────────────────────────────────────────────────

  doc.setFillColor(239, 244, 248)
  doc.rect(0, HDR_H, PW, SUB_H, 'F')
  doc.setDrawColor(195, 212, 222)
  doc.setLineWidth(0.15)
  doc.line(0, HDR_H,          PW, HDR_H)
  doc.line(0, HDR_H + SUB_H,  PW, HDR_H + SUB_H)

  const pills: { l: string; v: string }[] = [
    { l: 'MÓDULO',    v: title               },
    { l: 'REGISTROS', v: String(data.length) },
    { l: 'EMISSÃO',   v: dateStr             },
    { l: 'SISTEMA',   v: 'Esync ERP v1.0'   },
  ]
  let px = MX
  pills.forEach((p) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(110, 140, 158)
    doc.text(p.l, px, HDR_H + 5)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(20, 35, 52)
    doc.text(p.v, px, HDR_H + 11.5)
    px += 62
  })

  // ── autoTable column styles ───────────────────────────────────────────────

  const columnStyles: Record<number, Record<string, unknown>> = {}
  columns.forEach((col, i) => {
    const cat = _classify(col)
    columnStyles[i] = {
      cellWidth: colWidths[i],
      halign:    _align(col),
      valign:    'middle',
      fontStyle: cat === 'code' && i === 0 ? 'bold' : 'normal',
      fontSize:  cat === 'description' ? 7 : 6.5,
    }
  })

  // ── Table ─────────────────────────────────────────────────────────────────

  autoTable(doc, {
    head: [columns.map((c) => c.label)],
    body: data.map((row) =>
      columns.map((c) => _fmtCell(c, row[c.key]))
    ),
    startY:     TBL_Y,
    tableWidth: UW,
    margin:     { top: MINI_H + 2, left: MX, right: MX, bottom: FOOT_H + 2 },

    styles: {
      fontSize:    7,
      cellPadding: { top: 2, bottom: 2, left: 2, right: 2 },
      textColor:   [20, 35, 52],
      lineColor:   [200, 215, 222],
      lineWidth:   0.12,
      overflow:    'linebreak',
      halign:      'center',   // default for all cells; overridden per column
      valign:      'middle',
      font:        'helvetica',
    },
    headStyles: {
      fillColor:     [10, 58, 74],
      textColor:     [255, 255, 255],
      fontStyle:     'bold',
      fontSize:      6,
      cellPadding:   { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      overflow:      'linebreak',
      halign:        'center',
      valign:        'middle',
      minCellHeight: 8,
    },
    alternateRowStyles: {
      fillColor: [245, 249, 252],
    },
    columnStyles,
    showHead:     'everyPage',
    rowPageBreak: 'avoid',

    didDrawPage: (hookData) => {
      if (hookData.pageNumber > 1) {
        doc.setFillColor(10, 58, 74)
        doc.rect(0, 0, PW, MINI_H, 'F')
        doc.setFillColor(224, 115, 25)
        doc.rect(0, 0, 3.5, MINI_H, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7)
        doc.setTextColor(255, 255, 255)
        doc.text('ESYNC', 9, 6.8)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(170, 212, 228)
        doc.text(`${title.toUpperCase()} — Continuação`, 26, 6.8)
      }
    },
  })

  // ── Footers — drawn after table so total page count is known ─────────────

  const totalPages = (doc as unknown as { getNumberOfPages: () => number }).getNumberOfPages()

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)

    doc.setFillColor(238, 243, 246)
    doc.rect(0, PH - FOOT_H, PW, FOOT_H, 'F')
    doc.setDrawColor(195, 212, 222)
    doc.setLineWidth(0.15)
    doc.line(0, PH - FOOT_H, PW, PH - FOOT_H)

    doc.setFillColor(224, 115, 25)
    doc.rect(0, PH - FOOT_H, 3, FOOT_H, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(95, 118, 132)
    doc.text(
      'ESYNC Sistema Mecânico — Documento confidencial, de uso interno.',
      MX, PH - 4
    )

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(95, 118, 132)
    doc.text('pág.', PW - MX - 13, PH - 4, { align: 'right' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(40, 65, 82)
    doc.text(`${p} / ${totalPages}`, PW - MX, PH - 4, { align: 'right' })
  }

  doc.save(`${filenameBase}${timeTag()}.pdf`)
}
