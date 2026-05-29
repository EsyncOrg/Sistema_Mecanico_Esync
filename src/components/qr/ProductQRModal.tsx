'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { QrCode, Download, Printer, Copy, Check, ExternalLink, Tag, Loader2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogBody, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import {
  buildProductUrl,
  generateQRDataUrl,
  downloadQRPng,
  downloadQRLabel,
} from '@/lib/qr'
import type { Conjunto } from '@/types/conjuntos'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductQRModalProps {
  open:          boolean
  onOpenChange:  (v: boolean) => void
  conjunto:      Conjunto | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductQRModal({ open, onOpenChange, conjunto }: ProductQRModalProps) {
  const [qrDataUrl,  setQrDataUrl]  = useState<string | null>(null)
  const [isLoading,  setIsLoading]  = useState(false)
  const [copied,     setCopied]     = useState(false)

  const productUrl = conjunto ? buildProductUrl(conjunto.codigo) : ''

  // Generate QR data URL whenever the product or modal changes
  useEffect(() => {
    if (!open || !conjunto) { setQrDataUrl(null); return }
    setIsLoading(true)
    generateQRDataUrl(productUrl).then((url) => {
      setQrDataUrl(url)
      setIsLoading(false)
    })
  }, [open, conjunto, productUrl])

  const handleCopyUrl = useCallback(async () => {
    await navigator.clipboard.writeText(productUrl)
    setCopied(true)
    toast('success', 'URL copiada', productUrl)
    setTimeout(() => setCopied(false), 2500)
  }, [productUrl])

  const handleDownloadPng = useCallback(async () => {
    if (!conjunto) return
    await downloadQRPng(conjunto.codigo)
    toast('success', 'QR Code baixado', `qr-${conjunto.codigo}.png`)
  }, [conjunto])

  const handleDownloadLabel = useCallback(async () => {
    if (!conjunto || !qrDataUrl) return
    await downloadQRLabel(conjunto, qrDataUrl)
    toast('success', 'Etiqueta gerada', `label-${conjunto.codigo}.pdf`)
  }, [conjunto, qrDataUrl])

  const handlePrint = useCallback(() => {
    if (!qrDataUrl || !conjunto) return
    const w = window.open('', '_blank', 'width=400,height=600')
    if (!w) return
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR — ${conjunto.codigo}</title>
          <style>
            body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; background: #fff; }
            .label { text-align: center; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; max-width: 280px; }
            img { width: 200px; height: 200px; }
            h2 { margin: 12px 0 4px; font-size: 16px; font-weight: 700; font-family: monospace; }
            p  { margin: 0; color: #6b7280; font-size: 12px; }
            small { display: block; margin-top: 8px; color: #9ca3af; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="label">
            <img src="${qrDataUrl}" alt="QR Code">
            <h2>${conjunto.codigo}</h2>
            <p>${conjunto.nome}</p>
            <p>${conjunto.revisao} · ${conjunto.cliente}</p>
            <small>${productUrl}</small>
          </div>
          <script>window.onload = function(){ window.print(); window.close(); }</script>
        </body>
      </html>
    `)
    w.document.close()
  }, [qrDataUrl, conjunto, productUrl])

  if (!conjunto) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode size={17} className="text-primary" />
            QR Code — {conjunto.codigo}
          </DialogTitle>
          <DialogDescription>
            {conjunto.nome} · {conjunto.revisao}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col items-center gap-4 pb-2">
          {/* QR Preview */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="relative flex h-52 w-52 items-center justify-center rounded-2xl border-2 border-primary/20 bg-white p-3 shadow-lg"
          >
            {isLoading ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <Loader2 size={32} className="text-primary/40" />
              </motion.div>
            ) : qrDataUrl ? (
              <img src={qrDataUrl} alt={`QR Code ${conjunto.codigo}`} className="h-full w-full" />
            ) : null}

            {/* Corner accents */}
            {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos) => (
              <div key={pos} className={`absolute ${pos} m-1.5 h-4 w-4 border-primary`}
                style={{
                  borderTopWidth:    pos.includes('top')    ? 2 : 0,
                  borderLeftWidth:   pos.includes('left')   ? 2 : 0,
                  borderBottomWidth: pos.includes('bottom') ? 2 : 0,
                  borderRightWidth:  pos.includes('right')  ? 2 : 0,
                  borderRadius:      pos.includes('top-0 left')   ? '4px 0 0 0' :
                                     pos.includes('top-0 right')  ? '0 4px 0 0' :
                                     pos.includes('bottom-0 left')? '0 0 0 4px' : '0 0 4px 0',
                }}
              />
            ))}
          </motion.div>

          {/* URL display */}
          <div className="w-full rounded-xl border border-border bg-muted/40 p-3">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              URL do Produto
            </p>
            <div className="flex items-center gap-2">
              <p className="flex-1 truncate font-mono text-[11px] text-foreground">{productUrl}</p>
              <button
                onClick={handleCopyUrl}
                className="flex-shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
              </button>
              <a
                href={productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ExternalLink size={13} />
              </a>
            </div>
          </div>

          {/* Product summary */}
          <div className="grid w-full grid-cols-3 gap-2">
            {[
              { label: 'Peças',     value: String(conjunto.pecas.length)        },
              { label: 'Revisão',   value: conjunto.revisao                     },
              { label: 'Categoria', value: conjunto.categoria.charAt(0).toUpperCase() + conjunto.categoria.slice(1) },
            ].map((item) => (
              <div key={item.label} className="rounded-lg border border-border bg-muted/30 p-2 text-center">
                <p className="font-mono text-xs font-bold text-foreground">{item.value}</p>
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </DialogBody>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1">
            <Printer size={13} /> Imprimir
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPng} className="flex-1" disabled={!qrDataUrl}>
            <Download size={13} /> PNG
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadLabel}
            disabled={!qrDataUrl}
            className="flex-1"
            style={{ background: 'linear-gradient(135deg, #0f4c5c 0%, #000080 100%)', color: '#fff', border: 'none' }}
          >
            <Tag size={13} /> Etiqueta PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
