'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Trash2, AlertTriangle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
  DialogBody, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DeleteConfirmModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  targetCodigos: string[]
  onConfirmed: () => void
}

const MAX_LISTED = 5

// ─── Component ────────────────────────────────────────────────────────────────

export function DeleteConfirmModal({
  open, onOpenChange, targetCodigos, onConfirmed,
}: DeleteConfirmModalProps) {
  const count   = targetCodigos.length
  const visible = targetCodigos.slice(0, MAX_LISTED)
  const extra   = count - MAX_LISTED

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" className="overflow-hidden">

        {/* Destructive accent bar */}
        <div
          className="h-1 w-full flex-shrink-0"
          style={{ background: 'linear-gradient(90deg, #dc2626 0%, #b91c1c 60%, #991b1b 100%)' }}
        />

        {/* Icon header */}
        <div
          className="flex flex-col items-center gap-4 border-b border-border px-6 pb-5 pt-6 text-center"
          style={{ background: 'linear-gradient(180deg, rgba(239,68,68,0.06) 0%, transparent 100%)' }}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-destructive/25"
            style={{ background: 'rgba(239,68,68,0.1)' }}
          >
            <Trash2 size={28} className="text-destructive" />
          </motion.div>

          <div>
            <DialogTitle className="text-base font-bold text-foreground">
              Excluir {count === 1 ? 'Peça' : `${count} Peças`}
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-xs leading-relaxed text-center">
              Você está prestes a excluir{' '}
              <span className="font-semibold text-destructive">
                {count} {count === 1 ? 'peça' : 'peças'}
              </span>{' '}
              permanentemente. Esta operação não pode ser desfeita.
            </DialogDescription>
          </div>
        </div>

        <DialogBody className="space-y-3 py-4">
          {/* Pieces list */}
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {count === 1 ? 'Peça afetada' : 'Peças afetadas'}
            </p>
            <div className="rounded-xl border border-destructive/15 bg-destructive/5 p-2.5 space-y-1">
              {visible.map((codigo) => (
                <div key={codigo} className="flex items-center gap-2 rounded-lg bg-card/70 px-2.5 py-1.5">
                  <Trash2 size={11} className="flex-shrink-0 text-destructive/60" />
                  <span className="font-mono text-xs font-semibold text-foreground">{codigo}</span>
                </div>
              ))}
              {extra > 0 && (
                <p className="px-2.5 text-[11px] text-muted-foreground">
                  + {extra} peça{extra > 1 ? 's' : ''} adicional{extra > 1 ? 'is' : ''}
                </p>
              )}
            </div>
          </div>

          {/* Irreversibility warning */}
          <div className="flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/5 px-3 py-2.5">
            <AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-warning" />
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              Os registros serão removidos do sistema e não poderão ser recuperados. Verifique se os dados não são necessários antes de continuar.
            </p>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={onConfirmed}
            className="min-w-[180px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 size={14} />
            Excluir definitivamente
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}
