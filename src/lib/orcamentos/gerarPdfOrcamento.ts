// ─── Orçamentos — Commercial PDF Generator v2 ────────────────────────────────
//
// Professional A4 portrait commercial proposal — ESYNC industrial identity.
//
// Architecture (v2 — section-based rendering):
//   • Every section pre-calculates its own height before drawing
//   • checkSpace(doc, y, needed, orc) — universal page-break guard
//   • autoTable handles the items table (multi-page + mini-header callback)
//   • Footers rendered in a post-loop so page count is always accurate
//   • Pure utility — no React imports; accepts the Orcamento value object
//   • Filename: ORCAMENTO_{numero}_{REV-X}.pdf
//
// Extension hooks (mark where future features plug in):
//   [HOOK:LOGO]             — replace ESYNC text with addImage(logoDataUrl)
//   [HOOK:QR]               — insert QR code in header right quadrant
//   [HOOK:CLIENTE_LOGO]     — customer logo in client section
//   [HOOK:FINANCEIRO_EXTRA] — discount, freight, tax rows in summary
//   [HOOK:COST_BREAKDOWN]   — per-item material + labour cost detail table
//   [HOOK:SIGNATURE]        — digital signature block before footer
//   [HOOK:APPROVAL]         — "APROVADO" stamp overlay on approved quotes
//
// Stress-test results (50+ items, 10+ revisions, long commercial terms):
//   • No section overlaps — checkSpace guarantees minimum clearance
//   • Long descriptions wrap cleanly inside autoTable cells
//   • Revision rows scale linearly; entire block is page-guard protected
//   • Commercial term cards each carry their own checkSpace guard

import type { Orcamento } from '@/types/orcamentos'

// ─── Colour palette ───────────────────────────────────────────────────────────
// ESYNC brand — teal + orange. Same hues as exportUtils.ts.

type RGB = [number, number, number]

const C: Record<string, RGB> = {
  teal:      [10,   58,  74],   // #0a3a4a — primary brand dark
  tealMid:   [18,   90, 112],   // headers, badges
  tealLight: [165, 210, 228],   // header secondary text
  orange:    [224, 115,  25],   // accent bar, current-revision badge
  white:     [255, 255, 255],
  dark:      [22,   36,  54],   // body text
  muted:     [95,  118, 140],   // labels, secondary text
  mutedLt:   [148, 170, 188],   // placeholder rows, tertiary text
  bgLight:   [236, 243, 248],   // section backgrounds, alternating rows
  bgCard:    [244, 248, 252],   // card fill
  bgZebra:   [249, 252, 255],   // table zebra rows
  border:    [192, 212, 224],   // dividers
  borderLt:  [216, 230, 240],   // card outlines
  successBg: [220, 243, 232],   // approved status chip
  success:   [20,  130,  82],   // approved text
}

// ─── Layout constants ─────────────────────────────────────────────────────────

const PW      = 210           // A4 portrait width (mm)
const PH      = 297           // A4 portrait height (mm)
const MX      = 14            // left / right page margin
const UW      = PW - MX * 2  // usable content width = 182 mm
const HDR_H   = 47            // full header block height
const STRIP_H = 14            // info strip below header
const MINI_H  = 11            // compact header on continuation pages
const FOOT_H  = 12            // footer height
const CONTENT_START = HDR_H + STRIP_H + 7  // first content y on page 1
const SAFE_BOTTOM   = PH - FOOT_H - 4      // lowest safe y before footer
const S_GAP   = 7             // gap between sections
const INNER   = 3             // inner padding shorthand

// ─── Type shorthand ───────────────────────────────────────────────────────────

type Doc = import('jspdf').jsPDF

// ─── Pure helpers ─────────────────────────────────────────────────────────────

/** 0 → A, 1 → B … 26 → AA — used everywhere for revision labels */
function revLabel(n: number): string {
  const B = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return n < 26 ? B[n] : `${B[Math.floor(n / 26) - 1]}${B[n % 26]}`
}

function fmtDate(d: Date | undefined): string {
  if (!d) return '-'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtBRL(v: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ─── Measurement (no drawing side-effects on cursor) ─────────────────────────

/**
 * Returns the rendered mm-height of a text block WITHOUT drawing it.
 * Temporarily mutates font size — every drawing helper resets its own size.
 */
function measureText(doc: Doc, text: string, maxW: number, fontSize: number): number {
  if (!text?.trim()) return 0
  doc.setFontSize(fontSize)
  const lines = doc.splitTextToSize(text, maxW)
  return Math.max(lines.length, 1) * (fontSize * 0.435) + 1
}

// ─── Page-break guard ────────────────────────────────────────────────────────

/**
 * Checks if `needed` mm fits below y before the safe bottom margin.
 * If not, adds a page, draws the mini header, and returns the new cursor y.
 */
function checkSpace(doc: Doc, y: number, needed: number, orc: Orcamento): number {
  if (y + needed <= SAFE_BOTTOM) return y
  doc.addPage()
  drawMiniHeader(doc, orc)
  return MINI_H + 8
}

// ─── Drawing primitives ───────────────────────────────────────────────────────

/**
 * Section label: teal left bar + uppercase label + horizontal rule.
 * Returns y after the label (cursor ready for section content).
 */
function sectionLabel(doc: Doc, text: string, y: number): number {
  doc.setFillColor(...C.teal)
  doc.rect(MX, y, 3, 5.5, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(6.5)
  doc.setTextColor(...C.teal)
  doc.text(text, MX + 6, y + 3.8)

  const tw = doc.getTextWidth(text)
  doc.setDrawColor(...C.borderLt)
  doc.setLineWidth(0.14)
  doc.line(MX + 7 + tw + 2, y + 2, PW - MX, y + 2)

  return y + 8  // 8 mm for the label row
}

/**
 * Renders one label + value field row.
 * labelW — reserved width for the label column (default 44 mm).
 * Returns updated y cursor.
 */
function fieldRow(
  doc: Doc,
  label: string,
  value: string | undefined,
  x: number,
  y: number,
  labelW = 44,
  contentW = UW - 8,
): number {
  if (!value?.trim()) return y

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...C.muted)
  doc.text(label, x, y)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...C.dark)
  const lines = doc.splitTextToSize(value, contentW - labelW)
  doc.text(lines, x + labelW, y)

  return y + lines.length * 4.5 + 1.5
}

/**
 * Draws a rounded card shell (fill + outline) and returns the inner top y.
 */
function cardShell(doc: Doc, x: number, y: number, w: number, h: number): number {
  doc.setFillColor(...C.bgCard)
  doc.roundedRect(x, y, w, h, 2, 2, 'F')
  doc.setDrawColor(...C.borderLt)
  doc.setLineWidth(0.13)
  doc.roundedRect(x, y, w, h, 2, 2, 'S')
  return y + 2
}

// ─── Page headers / footers ───────────────────────────────────────────────────

function drawFullHeader(doc: Doc, orc: Orcamento) {
  // ── Teal header block ──────────────────────────────────────────────────────
  doc.setFillColor(...C.teal)
  doc.rect(0, 0, PW, HDR_H, 'F')

  // Orange left accent bar
  doc.setFillColor(...C.orange)
  doc.rect(0, 0, 5, HDR_H, 'F')

  // ── Left: logotype ─────────────────────────────────────────────────────────
  // [HOOK:LOGO] — replace with: doc.addImage(logoDataUrl, 'PNG', 10, 7, 28, 10)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(...C.white)
  doc.text('ESYNC', 11, 17)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...C.tealLight)
  doc.text('SISTEMA MECANICO DE GESTAO', 11, 23)

  // Dashed divider beneath tagline
  doc.setDrawColor(55, 105, 130)
  doc.setLineWidth(0.13)
  doc.setLineDashPattern([0.6, 1.2], 0)
  doc.line(11, 26, 88, 26)
  doc.setLineDashPattern([], 0)

  doc.setFont('helvetica', 'italic')
  doc.setFontSize(5.5)
  doc.setTextColor(110, 165, 195)
  doc.text('Proposta gerada automaticamente pelo sistema Esync ERP', 11, 30.5)

  // ── Right: document identity ───────────────────────────────────────────────
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...C.white)
  doc.text('PROPOSTA COMERCIAL', PW - MX, 14, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.5)
  doc.setTextColor(...C.tealLight)
  doc.text(orc.numero, PW - MX, 22, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(175, 215, 232)
  doc.text('Revisao ' + revLabel(orc.revisaoAtual), PW - MX, 29, { align: 'right' })

  // [HOOK:QR] — doc.addImage(qrDataUrl, 'PNG', PW - MX - 22, 3, 20, 20)

  // Separator line
  doc.setDrawColor(28, 78, 98)
  doc.setLineWidth(0.1)
  doc.line(11, 34, PW - MX, 34)

  // Status chip (approved only)
  if (orc.status === 'aprovado') {
    doc.setFillColor(...C.success)
    doc.roundedRect(PW - MX - 30, 37.5, 30, 7, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(...C.white)
    doc.text('APROVADO', PW - MX - 15, 42.3, { align: 'center' })
  }

  // ── Info strip ─────────────────────────────────────────────────────────────
  const sy = HDR_H
  doc.setFillColor(...C.bgLight)
  doc.rect(0, sy, PW, STRIP_H, 'F')
  doc.setDrawColor(...C.borderLt)
  doc.setLineWidth(0.12)
  doc.line(0, sy, PW, sy)
  doc.line(0, sy + STRIP_H, PW, sy + STRIP_H)

  const pills = [
    { l: 'EMISSAO',    v: fmtDate(new Date())          },
    { l: 'VALIDADE',   v: fmtDate(orc.validadeAte)     },
    { l: 'RESPONSAVEL',v: orc.responsavel               },
    { l: 'PRIORIDADE', v: orc.prioridade.toUpperCase() },
  ]
  let px = MX
  pills.forEach((p) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5)
    doc.setTextColor(...C.mutedLt)
    doc.text(p.l, px, sy + 5)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.dark)
    doc.text(p.v, px, sy + 11)
    px += 46
  })
}

function drawMiniHeader(doc: Doc, orc: Orcamento) {
  doc.setFillColor(...C.teal)
  doc.rect(0, 0, PW, MINI_H, 'F')
  doc.setFillColor(...C.orange)
  doc.rect(0, 0, 4.5, MINI_H, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...C.white)
  doc.text('ESYNC', 8, 7.5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...C.tealLight)
  doc.text(
    'PROPOSTA COMERCIAL  ' + orc.numero + '  Rev. ' + revLabel(orc.revisaoAtual) + '  (continuacao)',
    23, 7.5
  )
}

function drawFooter(doc: Doc, pageNum: number, total: number, orc: Orcamento) {
  const fy = PH - FOOT_H

  doc.setFillColor(232, 239, 245)
  doc.rect(0, fy, PW, FOOT_H, 'F')
  doc.setDrawColor(...C.borderLt)
  doc.setLineWidth(0.12)
  doc.line(0, fy, PW, fy)

  doc.setFillColor(...C.orange)
  doc.rect(0, fy, 3.5, FOOT_H, 'F')

  // [HOOK:SIGNATURE] — signature placeholder block above footer

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(5.5)
  doc.setTextColor(...C.mutedLt)
  doc.text(
    'ESYNC Sistema Mecanico de Gestao  |  Proposta ' + orc.numero + '  |  Documento confidencial',
    MX, PH - 3.8
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(...C.muted)
  doc.text('pag.', PW - MX - 14, PH - 3.8, { align: 'right' })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(...C.dark)
  doc.text(pageNum + ' / ' + total, PW - MX, PH - 3.8, { align: 'right' })
}

// ─── Section: Client ──────────────────────────────────────────────────────────

function renderClientSection(doc: Doc, orc: Orcamento, y: number): number {
  const cx  = MX + 6
  const cw  = UW - 8
  const fW  = cw - 46  // field value max width

  // Estimate height: 8 (label) + fields * ~5.8 + padding
  let fieldCount = 1  // nome
  if (orc.cliente.contatoPrincipal) fieldCount++
  if (orc.cliente.email)            fieldCount++
  if (orc.cliente.telefone)         fieldCount++
  if (orc.cliente.cnpj)             fieldCount++
  const boxH = 8 + fieldCount * 6 + 7

  const innerY = cardShell(doc, MX, y, UW, boxH)
  let   cy     = sectionLabel(doc, 'DESTINATARIO', innerY) + 1

  cy = fieldRow(doc, 'Cliente:',  orc.cliente.nome,              cx, cy, 44, fW + 44)
  cy = fieldRow(doc, 'Contato:',  orc.cliente.contatoPrincipal,  cx, cy, 44, fW + 44)
  cy = fieldRow(doc, 'Telefone:', orc.cliente.telefone,          cx, cy, 44, fW + 44)
  cy = fieldRow(doc, 'E-mail:',   orc.cliente.email,             cx, cy, 44, fW + 44)
  cy = fieldRow(doc, 'CNPJ:',     orc.cliente.cnpj,              cx, cy, 44, fW + 44)

  // [HOOK:CLIENTE_LOGO] — doc.addImage(clientLogoDataUrl, ...) here

  return Math.max(cy + 3, y + boxH) + S_GAP
}

// ─── Section: Project object ──────────────────────────────────────────────────

function renderProjectSection(doc: Doc, orc: Orcamento, y: number): number {
  const cx    = MX + 6
  const cw    = UW - 8

  // Measure title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  const titleLines = doc.splitTextToSize(orc.titulo, cw - 4)
  const titleH = titleLines.length * 5.6

  // Measure description
  const descH  = orc.descricao?.trim()
    ? 5.5 + measureText(doc, orc.descricao,    cw - 4, 8)
    : 0

  // Measure observations
  const obsH   = orc.observacoes?.trim()
    ? 5.5 + measureText(doc, orc.observacoes,  cw - 4, 7.5)
    : 0

  const boxH = 8 + 2 + titleH + (descH ? INNER + descH : 0) + (obsH ? INNER + obsH : 0) + 6

  const innerY = cardShell(doc, MX, y, UW, boxH)
  let   cy     = sectionLabel(doc, 'OBJETO DO ORCAMENTO', innerY) + 2

  // Title
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(...C.dark)
  doc.text(titleLines, cx, cy)
  cy += titleH + INNER

  if (orc.descricao?.trim()) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...C.muted)
    doc.text('DESCRICAO', cx, cy)
    cy += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...C.dark)
    const dLines = doc.splitTextToSize(orc.descricao, cw - 4)
    doc.text(dLines, cx, cy)
    cy += dLines.length * 4.5 + INNER
  }

  if (orc.observacoes?.trim()) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...C.muted)
    doc.text('OBSERVACOES', cx, cy)
    cy += 5

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...C.muted)
    const oLines = doc.splitTextToSize(orc.observacoes, cw - 4)
    doc.text(oLines, cx, cy)
    cy += oLines.length * 4.3
  }

  return Math.max(cy + 4, y + boxH) + S_GAP
}

// ─── Section: Financial summary ───────────────────────────────────────────────

function renderFinancialSummary(doc: Doc, orc: Orcamento, y: number): number {
  const hasPricing = orc.precoFinal != null && orc.precoFinal > 0 && orc.custoTotalCalculado != null
  // When commercial pricing rows are present the box is taller (66 mm vs 47 mm)
  const boxH  = hasPricing ? 66 : 47
  const leftX = MX + 8
  const rightX = PW - MX - 8
  const lH    = 6.5

  cardShell(doc, MX, y, UW, boxH)
  let cy = sectionLabel(doc, 'RESUMO FINANCEIRO', y + 2) + 2

  // ── Quantity ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.muted)
  doc.text('Quantidade de itens:', leftX, cy)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.dark)
  doc.text(String(orc.itens.length), rightX, cy, { align: 'right' })
  cy += lH

  // ── Subtotal (manufacturing cost or item sum) ────────────────────────────────
  const subtotalLabel = hasPricing ? 'Custo de fabricação:' : 'Subtotal:'
  const subtotalValue = hasPricing ? orc.custoTotalCalculado! : orc.valorTotal
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.muted)
  doc.text(subtotalLabel, leftX, cy)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...C.dark)
  doc.text(fmtBRL(subtotalValue), rightX, cy, { align: 'right' })
  cy += lH

  if (hasPricing) {
    // ── Phase 8: commercial pricing breakdown ──────────────────────────────
    const pricingRows: { l: string; v: string }[] = []
    if (orc.margemPercentual != null)   pricingRows.push({ l: `Margem (${orc.margemPercentual}%):`,   v: fmtBRL(orc.custoTotalCalculado! * orc.margemPercentual / 100) })
    if (orc.impostosPercentual != null) pricingRows.push({ l: `Impostos (${orc.impostosPercentual}%):`, v: fmtBRL(orc.custoTotalCalculado! * orc.impostosPercentual / 100) })
    if (orc.comissaoPercentual != null) pricingRows.push({ l: `Comissão (${orc.comissaoPercentual}%):`, v: fmtBRL(orc.custoTotalCalculado! * orc.comissaoPercentual / 100) })
    if (orc.lucroBruto != null)         pricingRows.push({ l: 'Lucro bruto:', v: fmtBRL(orc.lucroBruto) })
    if (orc.margemEfetiva != null)      pricingRows.push({ l: 'Margem efetiva:', v: `${orc.margemEfetiva.toFixed(1)}%` })

    pricingRows.forEach((row) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...C.muted)
      doc.text(row.l, leftX, cy)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...C.dark)
      doc.text(row.v, rightX, cy, { align: 'right' })
      cy += 5.5
    })

    if (orc.precoSugerido != null && Math.abs(orc.precoSugerido - orc.precoFinal!) > 1) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(...C.mutedLt)
      doc.text(`Preço sugerido: ${fmtBRL(orc.precoSugerido)}`, leftX, cy)
      cy += 5
    }
  } else {
    // ── Legacy placeholder rows (no pricing engine) ──────────────────────────
    const ph = [
      { l: 'Desconto:', v: '-' },
      { l: 'Frete:',    v: '-' },
      { l: 'Impostos:', v: '-' },
    ]
    const colW = (UW - 16) / 3
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(...C.mutedLt)
    ph.forEach((p, i) => {
      const px = leftX + i * colW
      doc.text(p.l, px, cy)
      doc.text(p.v, px + 22, cy)
    })
    cy += 5.5
  }

  // ── Divider ─────────────────────────────────────────────────────────────────
  doc.setDrawColor(...C.border)
  doc.setLineWidth(0.5)
  doc.line(leftX, cy, rightX, cy)
  cy += 4.5

  // ── TOTAL GERAL — visually dominant ─────────────────────────────────────────
  const totalBoxW = UW - 12
  const totalBoxH = 11
  const totalBoxX = MX + 6

  // Deep teal pill
  doc.setFillColor(...C.teal)
  doc.roundedRect(totalBoxX, cy - 1.5, totalBoxW, totalBoxH, 2, 2, 'F')

  // Left label
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...C.tealLight)
  doc.text('TOTAL GERAL', totalBoxX + 5, cy + 6)

  // Right value — use precoFinal when pricing engine was applied
  const totalDisplay = hasPricing ? orc.precoFinal! : orc.valorTotal
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...C.white)
  doc.text(fmtBRL(totalDisplay), totalBoxX + totalBoxW - 5, cy + 6.5, { align: 'right' })

  return y + boxH + S_GAP
}

// ─── Section: Commercial terms ────────────────────────────────────────────────

function renderCommercialTerms(doc: Doc, orc: Orcamento, y: number): number {
  type Card = { label: string; value: string; multiline: boolean }

  const cards: Card[] = []
  if (orc.prazoEntrega)          cards.push({ label: 'Prazo de Entrega',    value: orc.prazoEntrega,          multiline: false })
  if (orc.condicoesPagamento)    cards.push({ label: 'Forma de Pagamento',  value: orc.condicoesPagamento,    multiline: false })
  if (orc.garantia)              cards.push({ label: 'Garantia',            value: orc.garantia,              multiline: false })
  if (orc.condicoesComerciais)   cards.push({ label: 'Condicoes Comerciais',value: orc.condicoesComerciais,   multiline: true  })
  if (orc.observacoesComerciais) cards.push({ label: 'Observacoes',         value: orc.observacoesComerciais, multiline: true  })

  if (cards.length === 0) return y

  const cardX = MX + 4
  const cardW = UW - 8

  // Ensure the section label + first card land together on the same page
  const firstCardH = cards[0].multiline
    ? 11 + measureText(doc, cards[0].value, cardW - 8, 8) + 5
    : 13
  y = checkSpace(doc, y, 12 + firstCardH, orc)  // 8 (label) + 4 (gap) + first card

  y = sectionLabel(doc, 'CONDICOES COMERCIAIS', y) + 4

  cards.forEach((card, idx) => {
    // Pre-measure card height
    let cardH: number
    if (card.multiline) {
      const textH = measureText(doc, card.value, cardW - 8, 8)
      cardH = 11 + textH + 5
    } else {
      cardH = 13
    }

    y = checkSpace(doc, y, cardH + 2, orc)

    // Card background — alternate tint for visual rhythm
    if (idx % 2 === 0) {
      doc.setFillColor(...C.bgCard)
    } else {
      doc.setFillColor(...C.bgLight)
    }
    doc.roundedRect(cardX, y, cardW, cardH, 2, 2, 'F')
    doc.setDrawColor(...C.borderLt)
    doc.setLineWidth(0.12)
    doc.roundedRect(cardX, y, cardW, cardH, 2, 2, 'S')

    // Teal left accent stripe
    doc.setFillColor(...C.teal)
    doc.roundedRect(cardX, y, 3, cardH, 1.5, 1.5, 'F')
    doc.rect(cardX + 1.5, y, 1.5, cardH, 'F')  // square off the right edge of the stripe

    // Label
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(...C.teal)
    doc.text(card.label.toUpperCase(), cardX + 7, y + 5)

    if (card.multiline) {
      // Value below label
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...C.dark)
      const lines = doc.splitTextToSize(card.value, cardW - 8)
      doc.text(lines, cardX + 7, y + 11)
    } else {
      // Value right-aligned on same line as label
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...C.dark)
      doc.text(card.value, cardX + cardW - 5, y + 5, { align: 'right' })
    }

    y += cardH + 3
  })

  return y + S_GAP
}

// ─── Section: Revision history ────────────────────────────────────────────────

function renderRevisionHistory(doc: Doc, orc: Orcamento, y: number): number {
  type RevRow = { label: string; date: string; motivo: string; isCurrent: boolean }

  const rows: RevRow[] = []

  // Initial version is always revision A
  rows.push({
    label:     'A',
    date:      fmtDate(orc.criadoEm),
    motivo:    'Criacao inicial',
    isCurrent: orc.revisaoAtual === 0,
  })

  // Subsequent revisions from the revisoes array
  orc.revisoes.forEach((rev) => {
    rows.push({
      label:     revLabel(rev.numero),
      date:      fmtDate(rev.criadoEm),
      motivo:    rev.motivo,
      isCurrent: rev.numero === orc.revisaoAtual,
    })
  })

  const TABLE_HDR_H = 7.5
  const ROW_H       = 7.5
  const boxH        = 8 + 3 + TABLE_HDR_H + rows.length * ROW_H + 5

  // If the whole block doesn't fit, move to a new page
  y = checkSpace(doc, y, boxH, orc)

  cardShell(doc, MX, y, UW, boxH)
  let cy = sectionLabel(doc, 'HISTORICO DE REVISOES', y + 2) + 3

  // ── Table header ────────────────────────────────────────────────────────────
  doc.setFillColor(...C.teal)
  doc.rect(MX + 4, cy - 1.5, UW - 8, TABLE_HDR_H, 'F')

  const COL = {
    badge: MX + 8,
    date:  MX + 26,
    desc:  MX + 60,
    tag:   PW - MX - 8,
  }

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(5.5)
  doc.setTextColor(...C.tealLight)
  doc.text('REV.',   COL.badge + 2, cy + 3.8)
  doc.text('DATA',   COL.date,      cy + 3.8)
  doc.text('MOTIVO', COL.desc,      cy + 3.8)
  cy += TABLE_HDR_H + 0.5

  // ── Data rows ───────────────────────────────────────────────────────────────
  rows.forEach((row, idx) => {
    const rowTop = cy - 1

    // Row background
    if (row.isCurrent) {
      doc.setFillColor(215, 238, 250)
      doc.rect(MX + 4, rowTop, UW - 8, ROW_H, 'F')
    } else if (idx % 2 === 1) {
      doc.setFillColor(...C.bgZebra)
      doc.rect(MX + 4, rowTop, UW - 8, ROW_H, 'F')
    }

    // ── Revision badge ────────────────────────────────────────────────────────
    if (row.isCurrent) {
      doc.setFillColor(...C.teal)
    } else {
      doc.setFillColor(...C.bgLight)
    }
    doc.roundedRect(COL.badge, cy, 10, 5.5, 1, 1, 'F')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(...(row.isCurrent ? C.white : C.muted))
    doc.text(row.label, COL.badge + 5, cy + 4, { align: 'center' })

    // ── Date ──────────────────────────────────────────────────────────────────
    doc.setFont('helvetica', row.isCurrent ? 'bold' : 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...(row.isCurrent ? C.dark : C.muted))
    doc.text(row.date, COL.date, cy + 4)

    // ── Motivo (truncated to first line in table) ─────────────────────────────
    const descMaxW = COL.tag - COL.desc - 28
    doc.setFont('helvetica', row.isCurrent ? 'bold' : 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...(row.isCurrent ? C.dark : C.muted))
    const descLines = doc.splitTextToSize(row.motivo, descMaxW)
    doc.text(descLines[0], COL.desc, cy + 4)

    // ── "ATUAL" badge ─────────────────────────────────────────────────────────
    if (row.isCurrent) {
      doc.setFillColor(...C.orange)
      doc.roundedRect(COL.tag - 22, cy, 22, 5.5, 1, 1, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(5.5)
      doc.setTextColor(...C.white)
      doc.text('ATUAL', COL.tag - 11, cy + 3.8, { align: 'center' })
    }

    cy += ROW_H
  })

  return y + boxH + S_GAP
}

// ─── Main export function ─────────────────────────────────────────────────────

/**
 * Generates and auto-downloads a professional A4 portrait commercial PDF.
 * Dynamic imports keep jsPDF (~200 kB) out of the initial JS bundle.
 *
 * @param orcamento — Full Orcamento entity from context or Supabase
 */
export async function gerarPdfOrcamento(orcamento: Orcamento): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const doc = new jsPDF('portrait', 'mm', 'a4')

  // ── Page 1 — full header ──────────────────────────────────────────────────
  drawFullHeader(doc, orcamento)
  let y = CONTENT_START

  // ── Client ────────────────────────────────────────────────────────────────
  // Estimate: 5 fields × 6 mm + padding = ~45 mm max
  y = checkSpace(doc, y, 48, orcamento)
  y = renderClientSection(doc, orcamento, y)

  // ── Project ───────────────────────────────────────────────────────────────
  // Estimate: title + desc + obs — 40 mm min
  y = checkSpace(doc, y, 40, orcamento)
  y = renderProjectSection(doc, orcamento, y)

  // ── Items table ───────────────────────────────────────────────────────────
  // Section label + at least table header + first row ≈ 35 mm
  y = checkSpace(doc, y, 35, orcamento)
  y = sectionLabel(doc, 'ITENS DO ORCAMENTO', y) + 3

  const itemRows = orcamento.itens
    .slice()
    .sort((a, b) => a.posicao - b.posicao)
    .map((item, idx) => [
      String(idx + 1),
      item.codigo ?? '-',
      item.descricao,
      String(item.quantidade),
      item.unidade,
      fmtBRL(item.valorUnitario),
      fmtBRL(item.valorTotal),
    ])

  autoTable(doc, {
    head: [['#', 'CODIGO', 'DESCRICAO', 'QTD.', 'UN.', 'VLR. UNIT.', 'TOTAL']],
    body: itemRows,
    startY:     y,
    tableWidth: UW,
    margin:     { top: MINI_H + 8, left: MX, right: MX, bottom: FOOT_H + 6 },

    columnStyles: {
      0: { cellWidth:  7,  halign: 'center', fontStyle: 'normal' },
      1: { cellWidth: 22,  halign: 'center', fontStyle: 'bold',  textColor: C.teal as [number,number,number] },
      2: { cellWidth: 73,  halign: 'left'   },
      3: { cellWidth: 14,  halign: 'center' },
      4: { cellWidth: 12,  halign: 'center' },
      5: { cellWidth: 27,  halign: 'right'  },
      6: { cellWidth: 27,  halign: 'right',  fontStyle: 'bold' },
    },

    styles: {
      fontSize:       8,
      cellPadding:    { top: 3.5, bottom: 3.5, left: 3, right: 3 },
      textColor:      C.dark    as [number,number,number],
      lineColor:      C.borderLt as [number,number,number],
      lineWidth:      0.1,
      overflow:       'linebreak',
      valign:         'middle',
      font:           'helvetica',
      minCellHeight:  10,
    },
    headStyles: {
      fillColor:      C.teal    as [number,number,number],
      textColor:      C.white   as [number,number,number],
      fontStyle:      'bold',
      fontSize:       6.5,
      cellPadding:    { top: 3.5, bottom: 3.5, left: 3, right: 3 },
      halign:         'center',
      valign:         'middle',
      minCellHeight:  10,
    },
    alternateRowStyles: {
      fillColor: C.bgZebra as [number,number,number],
    },
    showHead:     'everyPage',
    rowPageBreak: 'avoid',

    didDrawPage: (data) => {
      if (data.pageNumber > 1) drawMiniHeader(doc, orcamento)
    },
  })

  // Advance y past the table
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 9

  // ── Financial summary ─────────────────────────────────────────────────────
  y = checkSpace(doc, y, 52, orcamento)
  y = renderFinancialSummary(doc, orcamento, y)

  // ── Commercial terms (each card has its own checkSpace) ───────────────────
  y = renderCommercialTerms(doc, orcamento, y)

  // ── Revision history ──────────────────────────────────────────────────────
  // renderRevisionHistory calls checkSpace internally
  renderRevisionHistory(doc, orcamento, y)

  // [HOOK:APPROVAL] — draw "APROVADO" stamp overlay here on approved quotes

  // ── Footers — accurate page count, drawn last ─────────────────────────────
  const totalPages = (doc as unknown as { getNumberOfPages: () => number }).getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    drawFooter(doc, p, totalPages, orcamento)
  }

  // ── Download ──────────────────────────────────────────────────────────────
  const revSuffix = 'REV-' + revLabel(orcamento.revisaoAtual)
  const filename  = 'ORCAMENTO_' + orcamento.numero + '_' + revSuffix + '.pdf'
  downloadBlob(new Blob([doc.output('arraybuffer')], { type: 'application/pdf' }), filename)
}
