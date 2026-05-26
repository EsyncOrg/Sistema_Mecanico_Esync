export interface ExportColumn {
  key: string
  label: string
}

export type ExportFormat = 'xlsx' | 'csv' | 'pdf'

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

export function exportCSV(filename: string, columns: ExportColumn[], data: Record<string, unknown>[]) {
  const escape = (v: unknown) => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s
  }
  const header = columns.map((c) => escape(c.label)).join(',')
  const rows = data.map((row) => columns.map((c) => escape(row[c.key])).join(','))
  const csv = '﻿' + [header, ...rows].join('\r\n')
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${filename}.csv`)
}

export async function exportXLSX(filename: string, columns: ExportColumn[], data: Record<string, unknown>[]) {
  const XLSX = (await import('xlsx')).default
  const wsData = [
    columns.map((c) => c.label),
    ...data.map((row) => columns.map((c) => row[c.key] ?? '')),
  ]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  // Auto column widths
  ws['!cols'] = columns.map((c) => ({
    wch: Math.max(c.label.length, ...data.map((r) => String(r[c.key] ?? '').length), 10),
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Dados')
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export async function exportPDF(
  filename: string,
  title: string,
  subtitle: string,
  columns: ExportColumn[],
  data: Record<string, unknown>[]
) {
  const { default: jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const isLandscape = columns.length > 6
  const doc = new jsPDF(isLandscape ? 'landscape' : 'portrait', 'mm', 'a4')
  const pageW = doc.internal.pageSize.width
  const pageH = doc.internal.pageSize.height

  // ── Header band ──
  doc.setFillColor(15, 76, 92)
  doc.rect(0, 0, pageW, 24, 'F')

  // Logo text
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(255, 255, 255)
  doc.text('Esync', 14, 11)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(180, 215, 225)
  doc.text('Sistema Mecânico de Gestão', 14, 17)

  // Orange accent bar
  doc.setFillColor(0, 0, 128)
  doc.rect(pageW - 6, 0, 6, 24, 'F')

  // ── Report title ──
  doc.setTextColor(15, 76, 92)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.text(title, 14, 33)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(107, 117, 133)

  const now = new Date()
  const dateStr = now.toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
  doc.text(`${subtitle}  |  Gerado em ${dateStr}  |  ${data.length} registros`, 14, 40)

  // Divider
  doc.setDrawColor(226, 230, 238)
  doc.setLineWidth(0.3)
  doc.line(14, 44, pageW - 14, 44)

  // ── Table ──
  autoTable(doc, {
    head: [columns.map((c) => c.label)],
    body: data.map((row) => columns.map((c) => String(row[c.key] ?? '-'))),
    startY: 48,
    styles: {
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
      textColor: [40, 42, 61],
    },
    headStyles: {
      fillColor: [15, 76, 92],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: { 0: { fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  })

  // ── Footer on every page ──
  const pageCount = (doc as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFillColor(248, 249, 251)
    doc.rect(0, pageH - 12, pageW, 12, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(107, 117, 133)
    doc.text('Esync Sistema Mecânico — Documento confidencial', 14, pageH - 5)
    doc.text(`Página ${i} de ${pageCount}`, pageW - 14, pageH - 5, { align: 'right' })
  }

  doc.save(`${filename}.pdf`)
}
