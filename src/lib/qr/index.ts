/**
 * QR Code generation utilities.
 *
 * Future: swap mock-based URL for Supabase-persisted product records.
 */

import QRCode from 'qrcode'
import jsPDF from 'jspdf'
import type { Conjunto } from '@/types/conjuntos'

// ─── URL builder ──────────────────────────────────────────────────────────────

/**
 * Returns the full public URL for a product's technical page.
 * Source: NEXT_PUBLIC_APP_URL env var — configure per environment.
 */
export function buildProductUrl(codigo: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return `${base.replace(/\/$/, '')}/produto/${encodeURIComponent(codigo)}`
}

// ─── QR generation ───────────────────────────────────────────────────────────

/** Generates a high-res PNG data URL for a product QR code. */
export async function generateQRDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width:               512,
    margin:              2,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#ffffff' },
  })
}

// ─── Download helpers ─────────────────────────────────────────────────────────

/** Triggers a PNG download of the QR code for a product. */
export async function downloadQRPng(codigo: string): Promise<void> {
  const url      = buildProductUrl(codigo)
  const dataUrl  = await generateQRDataUrl(url)
  const link     = document.createElement('a')
  link.href      = dataUrl
  link.download  = `qr-${codigo}.png`
  link.click()
}

/** Generates and downloads a professional printable PDF label for a product. */
export async function downloadQRLabel(conjunto: Conjunto, qrDataUrl: string): Promise<void> {
  // Label size: 85×54mm (standard 3.5"×2.1" label)
  const doc = new jsPDF({
    orientation: 'landscape',
    unit:        'mm',
    format:      [85, 54],
  })

  // ── Background ──
  doc.setFillColor(10, 15, 20)           // dark background
  doc.rect(0, 0, 85, 54, 'F')

  // ── QR Code (right side) ──
  const qrSize = 30
  const qrX    = 85 - qrSize - 4
  const qrY    = (54 - qrSize) / 2
  doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

  // ── Branding (top-left) ──
  doc.setTextColor(212, 175, 55)          // gold
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('ESYNC', 4, 8)

  doc.setTextColor(150, 160, 170)
  doc.setFontSize(5.5)
  doc.setFont('helvetica', 'normal')
  doc.text('Sistema Mecânico de Gestão', 4, 12)

  // ── Separator ──
  doc.setDrawColor(212, 175, 55)
  doc.setLineWidth(0.3)
  doc.line(4, 14.5, qrX - 3, 14.5)

  // ── Product code ──
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(conjunto.codigo, 4, 22)

  // ── Product name ──
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(190, 200, 210)
  const nameLines = doc.splitTextToSize(conjunto.nome, qrX - 7)
  doc.text(nameLines.slice(0, 2), 4, 28)

  // ── Revision ──
  doc.setFontSize(6)
  doc.setTextColor(150, 160, 170)
  doc.text(`Rev: ${conjunto.revisao}`, 4, 37)

  // ── Client ──
  doc.text(conjunto.cliente, 4, 42)

  // ── Timestamp + piece count ──
  const peçaCount = conjunto.pecas.length
  doc.text(`${peçaCount} peça${peçaCount !== 1 ? 's' : ''} · ${new Date().toLocaleDateString('pt-BR')}`, 4, 49)

  doc.save(`label-${conjunto.codigo}.pdf`)
}
