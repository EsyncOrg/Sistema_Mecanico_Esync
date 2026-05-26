'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react'
import { useToasts, dismissToast, type Toast } from '@/lib/toast'
import { cn } from '@/lib/utils'

const META: Record<Toast['type'], { icon: React.ElementType; bar: string; text: string }> = {
  success: { icon: CheckCircle2, bar: 'bg-success', text: 'text-success' },
  error: { icon: XCircle, bar: 'bg-destructive', text: 'text-destructive' },
  info: { icon: Info, bar: 'bg-primary', text: 'text-primary' },
  warning: { icon: AlertTriangle, bar: 'bg-warning', text: 'text-warning' },
}

function ToastItem({ t }: { t: Toast }) {
  const { icon: Icon, bar, text } = META[t.type]
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className="relative flex w-[340px] items-start gap-3 overflow-hidden rounded-xl border border-border bg-card px-4 py-3.5 shadow-lg"
    >
      {/* accent bar */}
      <div className={cn('absolute left-0 inset-y-0 w-1 rounded-l-xl', bar)} />
      <Icon size={16} className={cn('mt-0.5 flex-shrink-0', text)} />
      <div className="min-w-0 flex-1 pl-1">
        <p className="text-sm font-semibold text-foreground leading-snug">{t.title}</p>
        {t.message && (
          <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{t.message}</p>
        )}
      </div>
      <button
        onClick={() => dismissToast(t.id)}
        className="ml-1 flex-shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X size={13} />
      </button>
    </motion.div>
  )
}

export function Toaster() {
  const toasts = useToasts()
  return (
    <div className="fixed bottom-6 right-6 z-[300] flex flex-col-reverse gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto">
            <ToastItem t={t} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
