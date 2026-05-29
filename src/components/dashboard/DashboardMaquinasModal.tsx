'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, Clock, Cpu, User } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogBody,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { mockMaquinas } from '@/mocks/maquinas'
import type { StatusMaquina, SetorMaquina } from '@/types'

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<StatusMaquina, { label: string; dot: string; pulse: boolean; text: string; bg: string }> = {
  operando:   { label: 'Operando',   dot: '#10b981', pulse: true,  text: 'text-[#10b981]',   bg: 'bg-[#10b981]/8'  },
  setup:      { label: 'Setup',      dot: '#000080', pulse: true,  text: 'text-primary',      bg: 'bg-primary/8'    },
  pausada:    { label: 'Pausada',    dot: '#f59e0b', pulse: false, text: 'text-warning',      bg: 'bg-warning/8'    },
  ociosa:     { label: 'Ociosa',     dot: '#6b7280', pulse: false, text: 'text-muted-foreground', bg: 'bg-muted/40' },
  manutencao: { label: 'Manutenção', dot: '#ef4444', pulse: false, text: 'text-destructive',  bg: 'bg-destructive/8' },
}

const SETOR_LABELS: Record<SetorMaquina, string> = {
  corte:         'Corte',
  dobra:         'Dobra',
  solda:         'Solda',
  pintura:       'Pintura',
  desenvolvimento: 'Desenvolvimento',
  outros:        'Outros',
}

const SETOR_COLORS: Record<SetorMaquina, { text: string; bg: string }> = {
  corte:         { text: 'text-[#0f4c5c]', bg: 'bg-[#0f4c5c]/10' },
  dobra:         { text: 'text-primary',   bg: 'bg-primary/10'   },
  solda:         { text: 'text-warning',   bg: 'bg-warning/10'   },
  pintura:       { text: 'text-[#8b5cf6]', bg: 'bg-[#8b5cf6]/10' },
  desenvolvimento: { text: 'text-success', bg: 'bg-success/10'   },
  outros:        { text: 'text-muted-foreground', bg: 'bg-muted'  },
}

function fmtHM(secs: number): string {
  if (secs <= 0) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}min`
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DashboardMaquinasModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardMaquinasModal({ open, onOpenChange }: DashboardMaquinasModalProps) {
  const [search,     setSearch]     = useState('')
  const [setorFilter, setSetorFilter] = useState<SetorMaquina | 'todos'>('todos')
  const [statusFilter, setStatusFilter] = useState<StatusMaquina | 'todos'>('todos')

  const filtered = useMemo(() => {
    return mockMaquinas.filter((m) => {
      if (setorFilter  !== 'todos' && m.setor  !== setorFilter)  return false
      if (statusFilter !== 'todos' && m.status !== statusFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        if (!m.nome.toLowerCase().includes(q) &&
            !m.codigo.toLowerCase().includes(q) &&
            !m.fabricante.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [search, setorFilter, statusFilter])

  const summary = useMemo(() => ({
    operando:   mockMaquinas.filter((m) => m.status === 'operando' || m.status === 'setup').length,
    pausada:    mockMaquinas.filter((m) => m.status === 'pausada').length,
    ociosa:     mockMaquinas.filter((m) => m.status === 'ociosa').length,
    manutencao: mockMaquinas.filter((m) => m.status === 'manutencao').length,
    efMedia:    Math.round(mockMaquinas.reduce((s, m) => s + m.eficiencia, 0) / mockMaquinas.length),
  }), [])

  const setores = useMemo(
    () => Array.from(new Set(mockMaquinas.map((m) => m.setor))),
    []
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cpu size={17} className="text-primary" />
            Painel de Máquinas
          </DialogTitle>
          <DialogDescription>
            {mockMaquinas.length} máquinas cadastradas · {summary.operando} em operação · {summary.efMedia}% eficiência média
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-3 pb-4">
          {/* Summary chips */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: `${summary.operando} ativas`,        dot: '#10b981' },
              { label: `${summary.pausada} pausadas`,       dot: '#f59e0b' },
              { label: `${summary.ociosa} ociosas`,         dot: '#6b7280' },
              { label: `${summary.manutencao} manutenção`,  dot: '#ef4444' },
              { label: `${summary.efMedia}% eficiência`,    dot: '#000080' },
            ].map((c) => (
              <div key={c.label} className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: c.dot }} />
                <span className="text-[11px] font-medium text-foreground">{c.label}</span>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Pesquisar por código, nome ou fabricante..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          {/* Setor filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Setor:</span>
            {(['todos', ...setores] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSetorFilter(s as SetorMaquina | 'todos')}
                className={cn(
                  'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
                  setorFilter === s
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/70'
                )}
              >
                {s === 'todos' ? 'Todos' : SETOR_LABELS[s as SetorMaquina]}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Status:</span>
            {(['todos', 'operando', 'setup', 'pausada', 'ociosa', 'manutencao'] as const).map((s) => {
              const cfg = s !== 'todos' ? STATUS_CFG[s] : null
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s as StatusMaquina | 'todos')}
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                    statusFilter === s
                      ? cfg ? `${cfg.bg} ${cfg.text} ring-1 ring-current/30` : 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/70'
                  )}
                >
                  {cfg && (
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: cfg.dot }} />
                  )}
                  {s === 'todos' ? 'Todos' : cfg!.label}
                </button>
              )
            })}
          </div>

          <p className="text-[11px] text-muted-foreground">
            {filtered.length} máquina{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
          </p>

          {/* Machine grid */}
          <div className="grid gap-2.5 sm:grid-cols-2">
            {filtered.map((m, i) => {
              const scfg = STATUS_CFG[m.status]
              const scol = SETOR_COLORS[m.setor]
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  className="rounded-xl border border-border bg-card p-3.5 transition-colors hover:bg-muted/20"
                >
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Pulsing status dot */}
                      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                        {scfg.pulse && (
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: scfg.dot }} />
                        )}
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: scfg.dot }} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground leading-none">{m.codigo}</p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{m.nome}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide', scfg.bg, scfg.text)}>
                        {scfg.label}
                      </span>
                      <span className={cn('rounded px-1.5 py-0.5 text-[9px] font-semibold', scol.bg, scol.text)}>
                        {SETOR_LABELS[m.setor]}
                      </span>
                    </div>
                  </div>

                  {/* Efficiency bar */}
                  <div className="mb-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-muted-foreground">Eficiência</span>
                      <span className={cn('text-[10px] font-bold tabular-nums', scfg.text)}>
                        {m.eficiencia}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${m.eficiencia}%`, background: scfg.dot }}
                      />
                    </div>
                  </div>

                  {/* Info row */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User size={10} />
                      {m.operadorAtual ?? '—'}
                    </span>
                    {m.osAtual && (
                      <span className="flex items-center gap-1 font-mono">
                        {m.osAtual}
                      </span>
                    )}
                    {m.tempoOperacionalHoje > 0 && (
                      <span className="ml-auto flex items-center gap-1">
                        <Clock size={10} />
                        {fmtHM(m.tempoOperacionalHoje)}
                      </span>
                    )}
                  </div>

                  {/* Pause reason */}
                  {m.motivoPausa && (
                    <p className="mt-1.5 text-[10px] text-warning leading-snug">
                      ⚠ {m.motivoPausa}
                    </p>
                  )}
                </motion.div>
              )
            })}
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
