'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, AlertCircle, Info, Search, Shield } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogBody,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/utils'
import {
  getAllSystemAlerts,
  ALERT_MODULE_LABELS,
  type AlertSeverity,
  type AlertModuleKey,
} from '@/lib/alerts/alertSystem'

// ─── Config ───────────────────────────────────────────────────────────────────

const SEV_CFG: Record<AlertSeverity, { label: string; icon: typeof AlertTriangle; color: string; bg: string; border: string; dot: string }> = {
  critical: { label: 'Crítico', icon: AlertCircle,  color: 'text-destructive', bg: 'bg-destructive/8',  border: 'border-destructive/20', dot: '#ef4444' },
  warning:  { label: 'Aviso',   icon: AlertTriangle, color: 'text-warning',    bg: 'bg-warning/8',     border: 'border-warning/20',     dot: '#f59e0b' },
  info:     { label: 'Info',    icon: Info,           color: 'text-primary',    bg: 'bg-primary/8',     border: 'border-primary/20',     dot: '#000080' },
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DashboardAlertsModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardAlertsModal({ open, onOpenChange }: DashboardAlertsModalProps) {
  const [search, setSearch]       = useState('')
  const [sevFilter, setSevFilter] = useState<AlertSeverity | 'todos'>('todos')
  const [modFilter, setModFilter] = useState<AlertModuleKey | 'todos'>('todos')

  const allAlerts = useMemo(() => getAllSystemAlerts(), [])

  const filtered = useMemo(() => {
    return allAlerts.filter((a) => {
      if (sevFilter !== 'todos' && a.severity !== sevFilter) return false
      if (modFilter !== 'todos' && a.module !== modFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!a.title.toLowerCase().includes(q) && !a.description.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [allAlerts, sevFilter, modFilter, search])

  const counts = useMemo(() => ({
    critical: allAlerts.filter((a) => a.severity === 'critical').length,
    warning:  allAlerts.filter((a) => a.severity === 'warning').length,
    info:     allAlerts.filter((a) => a.severity === 'info').length,
  }), [allAlerts])

  const activeModules = useMemo(() =>
    Array.from(new Set(allAlerts.map((a) => a.module))),
  [allAlerts])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield size={17} className="text-warning" />
            Alertas do Sistema
            {allAlerts.length > 0 && (
              <span className="ml-1 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-bold text-destructive">
                {counts.critical > 0 ? `${counts.critical} crítico${counts.critical !== 1 ? 's' : ''}` : `${allAlerts.length}`}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Alertas derivados em tempo real de todos os módulos do sistema
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-3 pb-4">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar alertas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Severity filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['todos', 'critical', 'warning', 'info'] as const).map((s) => {
              const active = sevFilter === s
              const cfg    = s !== 'todos' ? SEV_CFG[s] : null
              const count  = s === 'todos' ? allAlerts.length : counts[s]
              return (
                <button
                  key={s}
                  onClick={() => setSevFilter(s)}
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
                    active
                      ? cfg
                        ? `${cfg.bg} ${cfg.color} ring-1 ${cfg.border}`
                        : 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  )}
                >
                  {cfg && <cfg.icon size={10} />}
                  {s === 'todos' ? 'Todos' : cfg!.label}
                  <span className="ml-0.5 text-[10px] opacity-70">{count}</span>
                </button>
              )
            })}
          </div>

          {/* Module filter */}
          {activeModules.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Módulo:</span>
              {(['todos', ...activeModules] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setModFilter(m as AlertModuleKey | 'todos')}
                  className={cn(
                    'rounded-lg px-2 py-0.5 text-[11px] font-medium transition-colors',
                    modFilter === m
                      ? 'bg-primary/15 text-primary'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  )}
                >
                  {m === 'todos' ? 'Todos' : ALERT_MODULE_LABELS[m as AlertModuleKey]}
                </button>
              ))}
            </div>
          )}

          {/* Count */}
          <p className="text-[11px] text-muted-foreground">
            {filtered.length} alerta{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </p>

          {/* Alert list */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10">
                <Shield size={22} className="text-success" />
              </div>
              <p className="text-sm font-medium text-success">Nenhum alerta encontrado</p>
              <p className="text-xs text-muted-foreground">
                {search || sevFilter !== 'todos' || modFilter !== 'todos'
                  ? 'Tente ajustar os filtros'
                  : 'Todos os módulos estão operando normalmente'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {filtered.map((alert, i) => {
                  const cfg = SEV_CFG[alert.severity]
                  return (
                    <motion.div
                      key={alert.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ delay: i * 0.025, duration: 0.2 }}
                      className={cn(
                        'flex items-start gap-3 rounded-xl border p-3.5 transition-opacity hover:opacity-90',
                        cfg.bg, cfg.border
                      )}
                    >
                      {/* Severity icon */}
                      <div className={cn('flex-shrink-0 mt-0.5', cfg.color)}>
                        <cfg.icon size={15} />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{alert.title}</span>
                          <span
                            className={cn(
                              'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                              cfg.bg, cfg.color
                            )}
                          >
                            {cfg.label}
                          </span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                            {ALERT_MODULE_LABELS[alert.module]}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{alert.description}</p>
                      </div>

                      {/* Time */}
                      <span className="flex-shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">
                        {relativeTime(alert.timestamp)}
                      </span>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
