'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Pause } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface PauseModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (motivo: string) => void
  /** Dialog title text, e.g. "Pausar Produção" or "Pausar Dobra" */
  title: string
  /** Sector-specific pause reasons; must include "Outro" as the last item */
  motivos: string[]
  /** Unique radio group name — prevents cross-modal selection conflicts */
  radioName?: string
}

export function PauseModal({
  open,
  onClose,
  onConfirm,
  title,
  motivos,
  radioName = 'motivo-pausa',
}: PauseModalProps) {
  const [motivo, setMotivo] = useState(motivos[0])
  const [outro, setOutro] = useState('')

  // Reset selection whenever the modal closes so stale state never persists
  useEffect(() => {
    if (!open) {
      setMotivo(motivos[0])
      setOutro('')
    }
  }, [open, motivos])

  function handleConfirm() {
    const final = motivo === 'Outro' ? (outro.trim() || 'Outro') : motivo
    onConfirm(final)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause size={15} className="flex-shrink-0 text-destructive" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione o motivo da pausa. O tempo será registrado para análise de produtividade.
          </p>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider">Motivo</Label>
            <div className="grid gap-2">
              {motivos.map((m) => (
                <label
                  key={m}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors',
                    motivo === m
                      ? 'border-accent bg-accent/5 text-foreground'
                      : 'border-border text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                  )}
                >
                  <input
                    type="radio"
                    name={radioName}
                    value={m}
                    checked={motivo === m}
                    onChange={() => setMotivo(m)}
                    className="accent-accent"
                  />
                  {m}
                </label>
              ))}
            </div>
            {motivo === 'Outro' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                <input
                  type="text"
                  placeholder="Descreva o motivo..."
                  value={outro}
                  onChange={(e) => setOutro(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </motion.div>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={handleConfirm}
          >
            <Pause size={13} />
            Confirmar Pausa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
