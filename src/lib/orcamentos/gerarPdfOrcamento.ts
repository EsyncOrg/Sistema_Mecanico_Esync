// ─── Orçamentos — Commercial PDF Generator ────────────────────────────────────
//
// Generates a professional A4 portrait commercial quote (Proposta Comercial)
// ready to be sent to customers.
//
// Architecture:
//   • Portrait A4 (210 × 297 mm)
//   • Dynamic jsPDF + jsPdf-autotable imports (same pattern as exportUtils.ts)
//   • y-cursor layout: each section returns the next y position
//   • Page-break guard before every major section
//   • Items table uses autoTable with showHead:'everyPage'
//   • Footers drawn post-loop so page count is always accurate
//   • Filename: ORCAMENTO_{numero}_{REV-X}.pdf
//
// Future extension points (comments mark each hook):
//   • Company logo:  [HOOK:LOGO]  — replace text "ESYNC" with addImage()
//   • Customer logo: [HOOK:CLIENTE_LOGO] — addImage() in the client section
//   • Digital signature: [HOOK:SIGNATURE] — signature block before footer
//   • QR code: [HOOK:QR] — addImage() of the QR data URL in the header
//   • Discount/freight/tax: [HOOK:FINANCEIRO_EXTRA] — rows after subtotal
//   • Cost breakdown: [HOOK:COST_BREAKDOWN] — detail table per item
//   • Approval stamp: [HOOK:APPROVAL] — overlay on approved PDFs
//   • Supabase: wrap this function in a server action that fetches the
//     orcamento by ID from Supabase before calling gerarPdfOrcamento()

import type { Orcamento } from '@/types/orcamentos'

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Maps revisaoAtual (0 = A, 1 = B …) to the letter label used in PDF. */
function revLabel(n: number): string {
  const base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (n < 26) return base[n]
  return `${base[Math.floor(n / 26) - 1]}${base[n % 26]}`
}

function fmtDate(d: Date | undefined): string {
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

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

// ─── Color constants ──────────────────────────────────────────────────────────
// Shared with exportUtils.ts — same ESYNC brand palette

const C = {
  teal:      [10,  58,  74]  as [number, number, number],  // #0a3a4a
  orange:    [224, 115, 25]  as [number, number, number],  // #e07319
  white:     [255, 255, 255] as [number, number, number],
  lightTeal: [160, 205, 220] as [number, number, number],  // header subtitle
  dark:      [20,  35,  52]  as [number, number, number],  // main text
  muted:     [100, 120, 140] as [number, number, number],  // secondary text
  mutedLt:   [140, 165, 185] as [number, number, number],  // tertiary text
  bgLight:   [239, 244, 248] as [number, number, number],  // section bg
  bgZebra:   [245, 249, 252] as [number, number, number],  // table zebra
  border:    [200, 215, 225] as [number, number, number],  // lines
  sectionHd: [10,  58,  74]  as [number, number, number],  // section label
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const PW   = 210   // page width mm (portrait A4)
const PH   = 297   // page height mm
const MX   = 14    // left/right margin
const UW   = PW - MX * 2   // usable width = 182mm
const HDR  = 44    // header block height
const MINI = 10    // compact header on continuation pages
const FOOT = 12    // footer height

// ─── Drawing helpers ──────────────────────────────────────────────────────────

// Draws the dividing line between label and content in a section
function drawSectionDivider(doc: import('jspdf').jsPDF, y: number) {
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.18)
  doc.line(MX, y, PW - MX, y)
}

// SECTION HEADER: small uppercase label with teal left-rule
function drawSectionHeader(doc: import('jspdf').jsPDF, label: string, y: number): number {
  doc.setFillColor(...C.sectionHd)
  doc.rect(MX, y, 2.5, 4.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.sectionHd)
  doc.text(label, MX + 5, y + 3.5)
  return y + 7  // returns y after the header label
}

// TWO-COLUMN FIELD: [Label]  [Value] on a single line
function drawField(
  doc: import('jspdf').jsPDF,
  label: string,
  value: string | undefined,
  x: number,
  y: number,
  maxW = UW,
): number {
  if (!value?.trim()) return y  // gracefully skip empty fields
  const labelW = 42
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.muted)
  doc.text(label, x, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.dark)
  const lines = doc.splitTextToSize(value, maxW - labelW)
  doc.text(lines, x + labelW, y)
  return y + lines.length * 4.5 + 1.5
}

// MULTI-LINE TEXT BLOCK: wrapped text with optional label
function drawTextBlock(
  doc: import('jspdf').jsPDF,
  text: string,
  x: number,
  y: number,
  maxW = UW,
  fontSize = 8,
): number {
  if (!text?.trim()) return y
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(fontSize)
  doc.setTextColor(...C.dark)
  const lines = doc.splitTextToSize(text, maxW)
  doc.text(lines, x, y)
  return y + lines.length * (fontSize * 0.42) + 2
}

// PAGE BREAK CHECK — adds a page and draws mini header if content won't fit
function guardPageBreak(
  doc: import('jspdf').jsPDF,
  y: number,
  neededMm: number,
  orcamento: Orcamento,
): number {
  if (y + neededMm <= PH - FOOT - 4) return y
  doc.addPage()
  drawMiniHeader(doc, orcamento)
  return MINI + 8
}

// ─── Page components ──────────────────────────────────────────────────────────

function drawFullHeader(doc: import('jspdf').jsPDF, orcamento: Orcamento) {
  // Background
  doc.setFillColor(...C.teal)
  doc.rect(0, 0, PW, HDR, 'F')

  // Orange left accent bar
  doc.setFillColor(...C.orange)
  doc.rect(0, 0, 5, HDR, 'F')

  // [HOOK:LOGO] — replace with: doc.addImage(logoDataUrl, 'PNG', 9, 8, 30, 10)
  // ESYNC logotype
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...C.white)
  doc.text('ESYNC', 10, 15)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.lightTeal)
  doc.text('SISTEMA MECÂNICO DE GESTÃO', 10, 21)

  // Dashed divider
  doc.setDrawColor(80, 130, 155)
  doc.setLineWidth(0.15)
  doc.setLineDashPattern([0.8, 1.4], 0)
  doc.line(10, 24, 90, 24)
  doc.setLineDashPattern([], 0)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6)
  doc.setTextColor(130, 180, 205)
  doc.text('Proposta gerada automaticamente pelo sistema Esync ERP', 10, 28)

  // Document type — right side
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(...C.white)
  doc.text('PROPOSTA COMERCIAL', PW - MX, 12, { align: 'right' })

  // Quote number + revision
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...C.lightTeal)
  doc.text(orcamento.numero, PW - MX, 20, { align: 'right' })

  const revText = `Rev. ${revLabel(orcamento.revisaoAtual)}`
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(190, 220, 235)
  doc.text(revText, PW - MX, 26.5, { align: 'right' })

  // [HOOK:QR] — insert QR code here:
  // doc.addImage(qrDataUrl, 'PNG', PW - MX - 22, 2, 20, 20)

  // Info strip below header
  const stripY = HDR
  const stripH = 13
  doc.setFillColor(...C.bgLight)
  doc.rect(0, stripY, PW, stripH, 'F')
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.15)
  doc.line(0, stripY, PW, stripY)
  doc.line(0, stripY + stripH, PW, stripY + stripH)

  const pills = [
    { l: 'EMISSÃO',   v: fmtDate(new Date()) },
    { l: 'VALIDADE',  v: fmtDate(orcamento.validadeAte) },
    { l: 'RESPONSÁVEL', v: orcamento.responsavel },
    { l: 'STATUS',    v: orcamento.status === 'aprovado' ? 'APROVADO' : orcamento.status === 'enviado' ? 'ENVIADO' : 'EM ELABORAÇÃO' },
  ]

  let px = MX
  pills.forEach((p) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(...C.muted)
    doc.text(p.l, px, stripY + 5)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.dark)
    doc.text(p.v, px, stripY + 10)
    px += 46
  })
}

function drawMiniHeader(doc: import('jspdf').jsPDF, orcamento: Orcamento) {
  doc.setFillColor(...C.teal)
  doc.rect(0, 0, PW, MINI, 'F')
  doc.setFillColor(...C.orange)
  doc.rect(0, 0, 4, MINI, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...C.white)
  doc.text('ESYNC', 8, 7)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.lightTeal)
  doc.text(`PROPOSTA COMERCIAL — ${orcamento.numero} · Rev. ${revLabel(orcamento.revisaoAtual)} — Continuação`, 22, 7)
}

function drawFooter(doc: import('jspdf').jsPDF, pageNum: number, total: number, orcamento: Orcamento) {
  doc.setFillColor(235, 241, 245)
  doc.rect(0, PH - FOOT, PW, FOOT, 'F')
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.15)
  doc.line(0, PH - FOOT, PW, PH - FOOT)

  // Orange footer accent
  doc.setFillColor(...C.orange)
  doc.rect(0, PH - FOOT, 3.5, FOOT, 'F')

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...C.muted)
  doc.text(
    `ESYNC Sistema Mecânico de Gestão — Proposta ${orcamento.numero} — Documento confidencial`,
    MX, PH - 4
  )

  // [HOOK:SIGNATURE] — e.g. draw a signature placeholder before footer

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.text('pág.', PW - MX - 10, PH - 4, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...C.dark)
  doc.text(`${pageNum} / ${total}`, PW - MX, PH - 4, { align: 'right' })
}

// ─── Content sections ─────────────────────────────────────────────────────────

function drawSectionCliente(doc: import('jspdf').jsPDF, orcamento: Orcamento, y: number): number {
  // Section bg
  doc.setFillColor(...C.bgLight)
  doc.roundedRect(MX, y - 1, UW, 32, 1.5, 1.5, 'F')

  y = drawSectionHeader(doc, 'DESTINATÁRIO', y + 1)
  y = drawField(doc, 'Cliente:', orcamento.cliente.nome, MX + 5, y)
  if (orcamento.cliente.contatoPrincipal) y = drawField(doc, 'Contato:', orcamento.cliente.contatoPrincipal, MX + 5, y)
  if (orcamento.cliente.telefone)         y = drawField(doc, 'Telefone:', orcamento.cliente.telefone, MX + 5, y)
  if (orcamento.cliente.email)            y = drawField(doc, 'E-mail:', orcamento.cliente.email, MX + 5, y)
  if (orcamento.cliente.cnpj)             y = drawField(doc, 'CNPJ:', orcamento.cliente.cnpj, MX + 5, y)
  // [HOOK:CLIENTE_LOGO] — addImage() of customer logo if available
  return y + 4
}

function drawSectionProjeto(doc: import('jspdf').jsPDF, orcamento: Orcamento, y: number): number {
  y = drawSectionHeader(doc, 'OBJETO DO ORÇAMENTO', y)
  drawSectionDivider(doc, y - 2)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...C.dark)
  const titleLines = doc.splitTextToSize(orcamento.titulo, UW)
  doc.text(titleLines, MX, y + 1)
  y += titleLines.length * 5 + 2

  if (orcamento.descricao?.trim()) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.muted)
    doc.text('Descrição:', MX, y)
    y += 4.5
    y = drawTextBlock(doc, orcamento.descricao, MX + 4, y, UW - 4)
    y += 2
  }

  if (orcamento.observacoes?.trim()) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.muted)
    doc.text('Observações:', MX, y)
    y += 4.5
    y = drawTextBlock(doc, orcamento.observacoes, MX + 4, y, UW - 4)
  }

  return y + 6
}

function drawSectionFinanceiro(doc: import('jspdf').jsPDF, orcamento: Orcamento, y: number): number {
  const boxH = 28
  doc.setFillColor(...C.bgLight)
  doc.roundedRect(MX, y, UW, boxH, 1.5, 1.5, 'F')
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.18)
  doc.roundedRect(MX, y, UW, boxH, 1.5, 1.5, 'S')

  y = drawSectionHeader(doc, 'RESUMO FINANCEIRO', y + 2)

  const colLeft  = MX + 6
  const colRight = PW - MX - 6
  const lineH    = 5.5

  // Row: items count
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.muted)
  doc.text('Quantidade de itens:', colLeft, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.dark)
  doc.text(String(orcamento.itens.length), colRight, y, { align: 'right' })
  y += lineH

  // Row: subtotal
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...C.muted)
  doc.text('Subtotal:', colLeft, y)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...C.dark)
  doc.text(fmtBRL(orcamento.valorTotal), colRight, y, { align: 'right' })
  y += lineH

  // [HOOK:FINANCEIRO_EXTRA] — insert Desconto, Frete, Impostos rows here when implemented
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.mutedLt)
  doc.text('Desconto: —', colLeft, y)
  doc.text('Frete: —', colLeft + 38, y)
  doc.text('Impostos: —', colLeft + 72, y)
  y += lineH + 1

  // Divider
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.18)
  doc.line(colLeft, y - 1, colRight, y - 1)

  // TOTAL row
  doc.setFillColor(...C.teal)
  doc.roundedRect(PW - MX - 60, y - 0.5, 60 - MX + MX, 7, 1, 1, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...C.muted)
  doc.text('TOTAL GERAL:', colLeft, y + 4.5)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...C.white)
  doc.text(fmtBRL(orcamento.valorTotal), colRight, y + 5, { align: 'right' })
  y += 8

  return y + 4
}

function drawSectionTermos(doc: import('jspdf').jsPDF, orcamento: Orcamento, y: number): number {
  const hasContent =
    orcamento.prazoEntrega      ||
    orcamento.condicoesPagamento ||
    orcamento.garantia           ||
    orcamento.condicoesComerciais||
    orcamento.observacoesComerciais

  if (!hasContent) return y

  y = drawSectionHeader(doc, 'CONDIÇÕES COMERCIAIS', y)
  drawSectionDivider(doc, y - 2)

  y = drawField(doc, 'Prazo de Entrega:', orcamento.prazoEntrega, MX, y + 2)
  y = drawField(doc, 'Forma de Pagamento:', orcamento.condicoesPagamento, MX, y)
  y = drawField(doc, 'Garantia:', orcamento.garantia, MX, y)

  if (orcamento.condicoesComerciais?.trim()) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.muted)
    doc.text('Condições Comerciais:', MX, y)
    y += 4.5
    y = drawTextBlock(doc, orcamento.condicoesComerciais, MX + 4, y, UW - 4)
    y += 2
  }

  if (orcamento.observacoesComerciais?.trim()) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.muted)
    doc.text('Observações Comerciais:', MX, y)
    y += 4.5
    y = drawTextBlock(doc, orcamento.observacoesComerciais, MX + 4, y, UW - 4)
  }

  return y + 6
}

function drawSectionRevisoes(doc: import('jspdf').jsPDF, orcamento: Orcamento, y: number): number {
  y = drawSectionHeader(doc, 'HISTÓRICO DE REVISÕES', y)
  drawSectionDivider(doc, y - 2)
  y += 2

  // Current revision (always shown)
  const curRevLetter = revLabel(orcamento.revisaoAtual)

  // List past revisions first (chronological)
  const allRevs: { letter: string; date: string; motivo: string }[] = []

  // Initial version always exists
  allRevs.push({
    letter: 'A',
    date:   fmtDate(orcamento.criadoEm),
    motivo: 'Criação inicial',
  })

  // Subsequent revisions from the revisoes array
  orcamento.revisoes.forEach((rev) => {
    allRevs.push({
      letter: revLabel(rev.numero),
      date:   fmtDate(rev.criadoEm),
      motivo: rev.motivo,
    })
  })

  allRevs.forEach((r) => {
    const isCurrent = r.letter === curRevLetter
    const bullet = isCurrent ? '▶' : '·'

    doc.setFont('helvetica', isCurrent ? 'bold' : 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...(isCurrent ? C.teal : C.muted))

    doc.text(bullet, MX + 2, y)
    doc.text(`Rev. ${r.letter}`, MX + 6, y)
    doc.text(r.date, MX + 22, y)
    doc.text(r.motivo, MX + 46, y)
    if (isCurrent) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6)
      doc.setTextColor(...C.mutedLt)
      doc.text('← revisão atual', PW - MX, y, { align: 'right' })
    }
    y += 5.5
  })

  return y + 4
}

// ─── Main export function ─────────────────────────────────────────────────────

/**
 * Generates and downloads a professional A4 portrait commercial quote PDF.
 * Uses dynamic imports to avoid SSR bundle impact (same as exportUtils.ts).
 *
 * @param orcamento — The full Orcamento entity from context or Supabase
 */
export async function gerarPdfOrcamento(orcamento: Orcamento): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF('portrait', 'mm', 'a4')

  // ── Page 1 — Full header ─────────────────────────────────────────────────

  drawFullHeader(doc, orcamento)

  // y cursor starts below the header info strip
  let y = HDR + 13 + 6  // 44 + 13 + 6 = 63mm

  // ── Client section ───────────────────────────────────────────────────────

  y = guardPageBreak(doc, y, 36, orcamento)
  y = drawSectionCliente(doc, orcamento, y)

  // ── Project section ──────────────────────────────────────────────────────

  y = guardPageBreak(doc, y, 30, orcamento)
  y = drawSectionProjeto(doc, orcamento, y)

  // ── Items table — uses autoTable with y as startY ────────────────────────

  const itemRows = orcamento.itens
    .sort((a, b) => a.posicao - b.posicao)
    .map((item, idx) => [
      String(idx + 1),
      item.codigo ?? '—',
      item.descricao,
      String(item.quantidade),
      item.unidade,
      fmtBRL(item.valorUnitario),
      fmtBRL(item.valorTotal),
    ])

  y = guardPageBreak(doc, y, 28, orcamento)

  // Section header for table
  const tableHeaderY = y
  y = drawSectionHeader(doc, 'ITENS DO ORÇAMENTO', y)
  drawSectionDivider(doc, y - 2)

  autoTable(doc, {
    head:  [['#', 'CÓDIGO', 'DESCRIÇÃO', 'QTD.', 'UN.', 'VLR. UNIT.', 'TOTAL']],
    body:  itemRows,
    startY:     tableHeaderY + 8,
    tableWidth: UW,
    margin:     { top: MINI + 6, left: MX, right: MX, bottom: FOOT + 4 },

    columnStyles: {
      0: { cellWidth:  7,  halign: 'center', fontStyle: 'normal' },
      1: { cellWidth: 22,  halign: 'center', fontStyle: 'bold',  textColor: C.teal },
      2: { cellWidth: 73,  halign: 'left'   },  // description — widest, left
      3: { cellWidth: 14,  halign: 'center' },
      4: { cellWidth: 12,  halign: 'center' },
      5: { cellWidth: 27,  halign: 'right'  },
      6: { cellWidth: 27,  halign: 'right', fontStyle: 'bold' },
    },

    styles: {
      fontSize:    8,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      textColor:   C.dark,
      lineColor:   C.border,
      lineWidth:   0.12,
      overflow:    'linebreak',
      valign:      'middle',
      font:        'helvetica',
    },
    headStyles: {
      fillColor:     C.teal,
      textColor:     C.white,
      fontStyle:     'bold',
      fontSize:      6.5,
      cellPadding:   { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      halign:        'center',
      valign:        'middle',
      minCellHeight: 8,
    },
    alternateRowStyles: { fillColor: C.bgZebra },
    showHead:     'everyPage',
    rowPageBreak: 'avoid',

    didDrawPage: (hookData) => {
      if (hookData.pageNumber > 1) {
        drawMiniHeader(doc, orcamento)
      }
    },
  })

  // After autoTable, advance y to after the table
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  // ── Financial summary ─────────────────────────────────────────────────────

  y = guardPageBreak(doc, y, 34, orcamento)
  y = drawSectionFinanceiro(doc, orcamento, y)

  // ── Commercial terms ──────────────────────────────────────────────────────

  y = guardPageBreak(doc, y, 24, orcamento)
  y = drawSectionTermos(doc, orcamento, y)

  // ── Revision history ──────────────────────────────────────────────────────

  y = guardPageBreak(doc, y, 20 + orcamento.revisoes.length * 6, orcamento)
  drawSectionRevisoes(doc, orcamento, y)

  // [HOOK:APPROVAL] — draw approval stamp here on approved quotes

  // ── Footers — drawn post-loop for accurate page count ─────────────────────

  const totalPages = (doc as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter(doc, p, totalPages, orcamento)
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  const revSuffix = `REV-${revLabel(orcamento.revisaoAtual)}`
  const filename  = `ORCAMENTO_${orcamento.numero}_${revSuffix}.pdf`

  const pdfArrayBuffer = doc.output('arraybuffer')
  downloadBlob(new Blob([pdfArrayBuffer], { type: 'application/pdf' }), filename)
}
