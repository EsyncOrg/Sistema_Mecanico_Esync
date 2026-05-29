'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldAlert, Eye, EyeOff, Loader2,
  AlertTriangle, FileSpreadsheet, Lock,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/lib/toast'
import { validateImportPassword, logImportAudit } from '@/lib/security/importSecurity'
import { useAuth } from '@/contexts/AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportPasswordModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  moduleName: string
  moduleTitle: string
  filename: string
  onConfirmed: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImportPasswordModal({
  open,
  onOpenChange,
  moduleName,
  moduleTitle,
  filename,
  onConfirmed,
}: ImportPasswordModalProps) {
  const { user } = useAuth()
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading]     = useState(false)
  const [error, setError]             = useState('')
  const [capsLock, setCapsLock]       = useState(false)
  const [shake, setShake]             = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setPassword('')
      setShowPassword(false)
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
      logImportAudit({
        userId:      user?.id      ?? 'anonymous',
        userName:    user?.nome    ?? 'Usuário',
        moduleName,
        moduleTitle,
        filename,
        status: 'success',
      })
      setIsLoading(false)
      onOpenChange(false)
      onConfirmed()
    } else {
      logImportAudit({
        userId:   user?.id   ?? 'anonymous',
        userName: user?.nome ?? 'Usuário',
        moduleName,
        moduleTitle,
        filename,
        status: 'blocked',
      })
      setIsLoading(false)
      setError('Senha incorreta. Tente novamente.')
      setShake(true)
      setTimeout(() => setShake(false), 600)
      toast('error', 'Senha de segurança incorreta', 'A importação foi bloqueada.')
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

        {/* ── Danger accent bar ── */}
        <div
          className="h-1 w-full flex-shrink-0"
          style={{ background: 'linear-gradient(90deg, #f59e0b 0%, #e07319 60%, #ef4444 100%)' }}
        />

        {/* ── Header section ── */}
        <div
          className="flex flex-col items-center gap-4 px-6 pb-4 pt-6 text-center"
          style={{ background: 'linear-gradient(180deg, rgba(245,158,11,0.07) 0%, transparent 100%)' }}
        >
          {/* Icon */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
            className="flex h-14 w-14 items-center justify-center rounded-2xl border border-warning/25"
            style={{ background: 'rgba(245,158,11,0.1)' }}
          >
            <ShieldAlert size={28} className="text-warning" />
          </motion.div>

          {/* Copy */}
          <div>
            <DialogTitle className="text-base font-bold text-foreground">
              Confirmação de Segurança
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-xs leading-relaxed text-center">
              Importações podem substituir ou alterar grandes volumes de dados.
              <br />
              Digite a senha de segurança para continuar.
            </DialogDescription>
          </div>

          {/* File context chip */}
          <div className="flex w-full items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
            <FileSpreadsheet size={14} className="flex-shrink-0 text-success" />
            <div className="min-w-0 text-left">
              <p className="truncate text-xs font-semibold text-foreground">{filename || `importação-${moduleName}`}</p>
              <p className="text-[10px] text-muted-foreground">Módulo: {moduleTitle}</p>
            </div>
            <Lock size={11} className="ml-auto flex-shrink-0 text-warning" />
          </div>
        </div>

        <DialogBody className="pt-0 pb-1">
          {/* ── Password field ── */}
          <motion.div
            animate={shake ? { x: [0, -9, 9, -7, 7, -4, 4, 0] } : { x: 0 }}
            transition={{ duration: 0.45 }}
            className="space-y-1.5"
          >
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Senha de segurança
            </label>

            <div className="relative">
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyEvent}
                placeholder="••••••••••••"
                disabled={isLoading}
                className={`w-full rounded-xl border bg-muted/40 px-4 py-2.5 pr-11 text-sm font-mono
                  text-foreground placeholder:text-muted-foreground/50
                  transition-all duration-150
                  focus:outline-none focus:ring-2 focus:ring-warning/40
                  disabled:opacity-60
                  ${error
                    ? 'border-destructive ring-1 ring-destructive/30'
                    : 'border-border hover:border-warning/40 focus:border-warning/60'
                  }`}
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={isLoading}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Caps Lock warning */}
            <AnimatePresence>
              {capsLock && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-1.5 overflow-hidden"
                >
                  <AlertTriangle size={11} className="flex-shrink-0 text-warning" />
                  <span className="text-[10px] text-warning">Caps Lock ativado</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-1.5 overflow-hidden"
                >
                  <ShieldAlert size={11} className="flex-shrink-0 text-destructive" />
                  <span className="text-[10px] font-medium text-destructive">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={!password.trim() || isLoading}
            className="min-w-[160px]"
            style={
              !isLoading && password.trim()
                ? { background: 'linear-gradient(135deg, #e07319 0%, #f59e0b 100%)', color: '#fff', border: 'none' }
                : undefined
            }
          >
            {isLoading ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 size={14} />
                </motion.div>
                Validando...
              </>
            ) : (
              <>
                <ShieldAlert size={14} />
                Confirmar Importação
              </>
            )}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}
