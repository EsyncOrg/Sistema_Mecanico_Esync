'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldAlert, Eye, EyeOff, Loader2, AlertTriangle, Pencil, Trash2,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
  DialogBody, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import { validateImportPassword } from '@/lib/security/importSecurity'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SecurityConfirmModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  variant: 'warning' | 'destructive'
  title: string
  description: string
  confirmLabel: string
  contextInfo?: { label: string; value: string }[]
  onConfirmed: () => void
}

// ─── Variant config ───────────────────────────────────────────────────────────

const VARIANT_CFG = {
  warning: {
    bar:     'linear-gradient(90deg, #f59e0b 0%, #e07319 60%, #ef4444 100%)',
    iconBg:  'rgba(245,158,11,0.1)',
    border:  'border-warning/25',
    header:  'rgba(245,158,11,0.07)',
    ring:    'focus:ring-warning/40',
    inputHover: 'hover:border-warning/40 focus:border-warning/60',
    confirmBg: 'linear-gradient(135deg, #e07319 0%, #f59e0b 100%)',
    Icon:    ShieldAlert,
    iconCls: 'text-warning',
  },
  destructive: {
    bar:     'linear-gradient(90deg, #dc2626 0%, #b91c1c 60%, #991b1b 100%)',
    iconBg:  'rgba(239,68,68,0.1)',
    border:  'border-destructive/25',
    header:  'rgba(239,68,68,0.06)',
    ring:    'focus:ring-destructive/40',
    inputHover: 'hover:border-destructive/40 focus:border-destructive/60',
    confirmBg: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
    Icon:    Trash2,
    iconCls: 'text-destructive',
  },
} as const

// ─── Component ────────────────────────────────────────────────────────────────

export function SecurityConfirmModal({
  open, onOpenChange,
  variant, title, description, confirmLabel,
  contextInfo,
  onConfirmed,
}: SecurityConfirmModalProps) {
  const [password, setPassword]       = useState('')
  const [showPwd, setShowPwd]         = useState(false)
  const [isLoading, setIsLoading]     = useState(false)
  const [error, setError]             = useState('')
  const [capsLock, setCapsLock]       = useState(false)
  const [shake, setShake]             = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const cfg = VARIANT_CFG[variant]

  useEffect(() => {
    if (open) {
      setPassword('')
      setShowPwd(false)
      setError('')
      setCapsLock(false)
      setIsLoading(false)
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [open])

  function handleKeyEvent(e: React.KeyboardEvent) {
    setCapsLock(e.getModifierState('CapsLock'))
  }

  async function handleConfirm() {
    if (!password.trim() || isLoading) return
    setIsLoading(true)
    setError('')

    const valid = await validateImportPassword(password)

    if (valid) {
      setIsLoading(false)
      onOpenChange(false)
      onConfirmed()
    } else {
      setIsLoading(false)
      setError('Senha incorreta. Tente novamente.')
      setShake(true)
      setTimeout(() => setShake(false), 600)
      toast('error', 'Senha de segurança incorreta', 'Operação bloqueada.')
      setPassword('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    handleKeyEvent(e)
    if (e.key === 'Enter') handleConfirm()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isLoading) onOpenChange(v) }}>
      <DialogContent size="sm" hideClose={isLoading} className="overflow-hidden">

        {/* Accent bar */}
        <div className="h-1 w-full flex-shrink-0" style={{ background: cfg.bar }} />

        {/* Header section */}
        <div
          className={`flex flex-col items-center gap-4 px-6 pb-4 pt-6 text-center border-b border-border`}
          style={{ background: `linear-gradient(180deg, ${cfg.header} 0%, transparent 100%)` }}
        >
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${cfg.border}`}
            style={{ background: cfg.iconBg }}
          >
            <cfg.Icon size={28} className={cfg.iconCls} />
          </motion.div>

          <div>
            <DialogTitle className="text-base font-bold text-foreground">{title}</DialogTitle>
            <DialogDescription className="mt-1.5 text-xs leading-relaxed text-center">
              {description}
            </DialogDescription>
          </div>

          {/* Context info chips */}
          {contextInfo && contextInfo.length > 0 && (
            <div className="flex w-full flex-col gap-1.5">
              {contextInfo.map((info) => (
                <div
                  key={info.label}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2"
                >
                  <span className="text-[11px] text-muted-foreground">{info.label}</span>
                  <span className="font-mono text-[11px] font-semibold text-foreground">{info.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogBody className="pt-3 pb-1">
          <motion.div
            animate={shake ? { x: [0, -9, 9, -7, 7, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.45 }}
            className="space-y-1.5"
          >
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Senha de segurança
            </label>

            <div className="relative">
              <input
                ref={inputRef}
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyEvent}
                placeholder="••••••••••••"
                disabled={isLoading}
                className={`w-full rounded-xl border bg-muted/40 px-4 py-2.5 pr-11 text-sm font-mono text-foreground
                  placeholder:text-muted-foreground/50 transition-all duration-150
                  focus:outline-none focus:ring-2 disabled:opacity-60
                  ${cfg.ring}
                  ${error ? 'border-destructive ring-1 ring-destructive/30' : `border-border ${cfg.inputHover}`}`}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                disabled={isLoading}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <AnimatePresence>
              {capsLock && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-1.5 overflow-hidden">
                  <AlertTriangle size={11} className="flex-shrink-0 text-warning" />
                  <span className="text-[10px] text-warning">Caps Lock ativado</span>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-1.5 overflow-hidden">
                  <ShieldAlert size={11} className="flex-shrink-0 text-destructive" />
                  <span className="text-[10px] font-medium text-destructive">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </DialogBody>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!password.trim() || isLoading}
            className="min-w-[160px]"
            style={!isLoading && password.trim() ? { background: cfg.confirmBg, color: '#fff', border: 'none' } : undefined}
          >
            {isLoading ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
                  <Loader2 size={14} />
                </motion.div>
                Validando...
              </>
            ) : (
              <>{variant === 'warning' ? <Pencil size={14} /> : <Trash2 size={14} />} {confirmLabel}</>
            )}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}
