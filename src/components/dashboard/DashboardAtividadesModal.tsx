'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Search, Package, Layers, Code2, Activity,
  Upload, Download, Cpu, ShieldAlert, Settings,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogBody,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/utils'
import {
  getRecentActivities,
  ACTIVITY_MODULE_LABELS,
  ACTIVITY_ACTION_LABELS,
  type ActivityAction,
  type ActivityModuleKey,
} from '@/lib/activity/activityLog'

// ─── Config ───────────────────────────────────────────────────────────────────

const ACTION_CFG: Record<ActivityAction, { icon: typeof Package; color: string; bg: string }> = {
  criado:    { icon: Package,    color: 'text-success',    bg: 'bg-success/10'    },
  editado:   { icon: Settings,   color: 'text-primary',    bg: 'bg-primary/10'    },
  excluido:  { icon: Package,    color: 'text-destructive',bg: 'bg-destructive/10'},
  importado: { icon: Upload,     color: 'text-[#0f4c5c]',  bg: 'bg-[#0f4c5c]/10' },
  exportado: { icon: Download,   color: 'text-accent',     bg: 'bg-accent/10'     },
  estado:    { icon: Cpu,        color: 'text-warning',    bg: 'bg-warning/10'    },
  seguranca: { icon: ShieldAlert,color: 'text-destructive',bg: 'bg-destructive/10'},
  sistema:   { icon: Activity,   color: 'text-muted-foreground', bg: 'bg-muted'   },
}

const MODULE_ICON: Record<string, typeof Package> = {
  maquinas:      Cpu,
  pecas:         Package,
  retalhos:      Layers,
  programas:     Code2,
  usuarios:      Activity,
  seguranca:     ShieldAlert,
  sistema:       Activity,
  estoque:       Package,
  desenvolvimento: Settings,
  programacao:   Code2,
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DashboardAtividadesModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardAtividadesModal({ open, onOpenChange }: DashboardAtividadesModalProps) {
  const [search,       setSearch]       = useState('')
  const [modFilter,    setModFilter]    = useState<ActivityModuleKey | 'todos'>('todos')
  const [actionFilter, setActionFilter] = useState<ActivityAction   | 'todos'>('todos')

  const allEvents = useMemo(() => getRecentActivities(), [])

  const filtered = useMemo(() => {
    return allEvents.filter((e) => {
      if (modFilter    !== 'todos' && e.module !== modFilter)    return false
      if (actionFilter !== 'todos' && e.action !== actionFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!e.title.toLowerCase().includes(q) &&
            !e.description.toLowerCase().includes(q) &&
            !e.user.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [allEvents, modFilter, actionFilter, search])

  const activeModules = useMemo(
    () => Array.from(new Set(allEvents.map((e) => e.module))),
    [allEvents]
  )
  const activeActions = useMemo(
    () => Array.from(new Set(allEvents.map((e) => e.action))),
    [allEvents]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity size={17} className="text-primary" />
            Histórico de Atividades
          </DialogTitle>
          <DialogDescription>
            {allEvents.length} evento{allEvents.length !== 1 ? 's' : ''} registrado{allEvents.length !== 1 ? 's' : ''} — máquinas, peças, importações e operações de segurança
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-3 pb-4">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Pesquisar por ação, módulo ou usuário..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          {/* Module filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Módulo:</span>
            {(['todos', ...activeModules] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModFilter(m as ActivityModuleKey | 'todos')}
                className={cn(
                  'rounded-lg px-2 py-0.5 text-[11px] font-medium transition-colors',
                  modFilter === m
                    ? 'bg-primary/15 text-primary'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                )}
              >
                {m === 'todos' ? 'Todos' : ACTIVITY_MODULE_LABELS[m as ActivityModuleKey]}
              </button>
            ))}
          </div>

          {/* Action filter */}
          {activeActions.length > 2 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Ação:</span>
              {(['todos', ...activeActions] as const).map((a) => {
                const cfg = a !== 'todos' ? ACTION_CFG[a as ActivityAction] : null
                return (
                  <button
                    key={a}
                    onClick={() => setActionFilter(a as ActivityAction | 'todos')}
                    className={cn(
                      'flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium transition-all',
                      actionFilter === a
                        ? cfg ? `${cfg.bg} ${cfg.color} ring-1 ring-current/30` : 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground hover:bg-muted/70'
                    )}
                  >
                    {a === 'todos' ? 'Todas' : ACTIVITY_ACTION_LABELS[a as ActivityAction]}
                  </button>
                )
              })}
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            {filtered.length} evento{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </p>

          {/* Timeline */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <Activity size={22} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Nenhuma atividade encontrada</p>
              <p className="text-xs text-muted-foreground">Tente ajustar os filtros de busca</p>
            </div>
          ) : (
            <div className="space-y-0">
              {filtered.map((event, i) => {
                const cfg     = ACTION_CFG[event.action]
                const ModIcon = MODULE_ICON[event.module] ?? Activity
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02, duration: 0.18 }}
                    className="flex gap-3 py-2.5 border-b border-border/50 last:border-0"
                  >
                    {/* Action icon */}
                    <div className="relative flex flex-col items-center flex-shrink-0">
                      <div className={cn('flex h-7 w-7 items-center justify-center rounded-lg', cfg.bg)}>
                        <cfg.icon size={13} className={cfg.color} />
                      </div>
                      {i < filtered.length - 1 && (
                        <div className="mt-1 w-px flex-1 bg-border/60 min-h-[8px]" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1 pb-2">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold text-foreground">{event.title}</span>
                        <span className="flex items-center gap-0.5 rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">
                          <ModIcon size={8} />
                          {ACTIVITY_MODULE_LABELS[event.module]}
                        </span>
                      </div>
                      {event.description && (
                        <p className="text-[11px] text-muted-foreground leading-snug">{event.description}</p>
                      )}
                      <p className="mt-1 text-[10px] text-muted-foreground/60">
                        {relativeTime(event.timestamp)} · {event.user}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
