'use client'

// ─── Tempos Industriais Section ────────────────────────────────────────────────
//
// Reusable section used inside NovaPecaModal and EditarPecaModal.
// Provides:
//   • Process time input cards (one per ProcessoIndustrial)
//   • Template selector with apply button
//   • Auto-computed total time
//   • Optional breakdown visualization (when existing times are non-zero)

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb, Code2, Scissors, FoldVertical,
  Flame, Paintbrush, Wrench, Clock, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { cn }     from '@/lib/utils'
import { useTempos } from '@/contexts/TemposContext'
import type { TemposPecaValues, ProcessoNome, ProcessoIndustrial } from '@/types/tempos'
import { PROCESSO_FIELD, calcularTempoTotal } from '@/types/tempos'
import { calcularBreakdown } from '@/lib/tempos/analytics'

// ─── Process icon map ─────────────────────────────────────────────────────────

const ICONE_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Lightbulb,
  Code2,
  Scissors,
  FoldVertical,
  Flame,
  Paintbrush,
  Wrench,
}

// ─── Process card color ───────────────────────────────────────────────────────

const PROCESSO_COLOR: Record<ProcessoNome, string> = {
  'Desenvolvimento': 'text-primary    bg-primary/10',
  'Programação':     'text-accent     bg-accent/10',
  'Corte':           'text-destructive bg-destructive/8',
  'Dobra':           'text-warning    bg-warning/10',
  'Solda':           'text-orange-500 bg-orange-500/10',
  'Pintura':         'text-success    bg-success/10',
  'Montagem':        'text-secondary-foreground bg-muted',
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

// ─── Single process card ──────────────────────────────────────────────────────

function ProcessCard({
  processo, valor, onChange, readonly,
}: {
  processo: ProcessoIndustrial
  valor: number
  onChange: (v: number) => void
  readonly?: boolean
}) {
  const Icon = ICONE_MAP[processo.icone] ?? Clock
  const colorCls = PROCESSO_COLOR[processo.nome]

  return (
    <div className={cn(
      'rounded-xl border border-border bg-card p-3 transition-all duration-150',
      !readonly && 'hover:border-primary/30 hover:shadow-sm',
      valor > 0 && 'ring-1 ring-primary/10',
    )}>
      <div className="mb-2.5 flex items-center gap-2">
        <div className={cn('flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md', colorCls)}>
          <Icon size={12} />
        </div>
        <span className="text-xs font-semibold text-foreground leading-none">{processo.nome}</span>
      </div>

      <div className="flex items-center gap-1.5">
        <Input
          type="number"
          min={0}
          step={1}
          value={valor === 0 ? '' : valor}
          placeholder="0"
          disabled={readonly}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10)
            onChange(isNaN(v) || v < 0 ? 0 : v)
          }}
          className="h-7 text-right font-mono tabular-nums text-sm px-2"
        />
        <span className="shrink-0 text-[11px] text-muted-foreground">min</span>
      </div>

      {/* Mini progress bar */}
      {valor > 0 && (
        <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary/40"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(valor / 60 * 100, 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}
    </div>
  )
}

// ─── Breakdown bars (visualization) ──────────────────────────────────────────

function BreakdownBars({ tempos }: { tempos: TemposPecaValues }) {
  const items = calcularBreakdown(tempos)
  if (items.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Distribuição por processo
      </p>
      {items.map((item) => {
        const Icon = ICONE_MAP[
          // Map nome → icone key — same as ProcessoIndustrial.icone
          item.nome === 'Desenvolvimento' ? 'Lightbulb'   :
          item.nome === 'Programação'     ? 'Code2'        :
          item.nome === 'Corte'           ? 'Scissors'     :
          item.nome === 'Dobra'           ? 'FoldVertical' :
          item.nome === 'Solda'           ? 'Flame'        :
          item.nome === 'Pintura'         ? 'Paintbrush'   :
          'Wrench'
        ] ?? Wrench
        return (
          <div key={item.nome} className="flex items-center gap-2">
            <Icon size={11} className="shrink-0 text-muted-foreground" />
            <span className="w-24 shrink-0 text-[11px] text-muted-foreground">{item.nome}</span>
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary/50"
                initial={{ width: 0 }}
                animate={{ width: `${item.percentual}%` }}
                transition={{ duration: 0.4, delay: 0.05 }}
              />
            </div>
            <span className="w-16 text-right text-[11px] tabular-nums text-muted-foreground">
              {item.minutos}min
            </span>
            <span className="w-12 text-right text-[11px] tabular-nums font-semibold text-foreground">
              {item.percentual}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface TemposIndustriaisSectionProps {
  tempos:   TemposPecaValues
  onChange: (tempos: TemposPecaValues) => void
  /** Shows process cards as read-only (for display-only contexts) */
  readonly?: boolean
  /** When true, shows the breakdown visualization below the cards */
  showBreakdown?: boolean
}

export function TemposIndustriaisSection({
  tempos,
  onChange,
  readonly = false,
  showBreakdown = false,
}: TemposIndustriaisSectionProps) {
  const { processos, templates, aplicarTemplate } = useTempos()
  const [templateId, setTemplateId] = useState('')

  const total = calcularTempoTotal(tempos)

  function handleApplyTemplate() {
    if (!templateId) return
    const vals = aplicarTemplate(templateId)
    if (vals) onChange(vals)
  }

  function handleChange(processo: ProcessoNome, value: number) {
    const field = PROCESSO_FIELD[processo]
    onChange({ ...tempos, [field]: value })
  }

  return (
    <div className="space-y-4">
      <SectionLabel label="Tempos Industriais" />

      {/* Template selector */}
      {!readonly && (
        <div className="flex gap-2 items-center">
          <Zap size={13} className="text-warning shrink-0" />
          <select
            className="flex-1 h-8 rounded-lg border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:border-primary"
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
          >
            <option value="">Selecionar template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome} — {t.totalMinutos}min total
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 text-xs shrink-0"
            disabled={!templateId}
            onClick={handleApplyTemplate}
          >
            Aplicar
          </Button>
        </div>
      )}

      {/* Process cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {processos.filter((p) => p.ativo).map((proc) => (
          <ProcessCard
            key={proc.id}
            processo={proc}
            valor={tempos[PROCESSO_FIELD[proc.nome]] as number}
            onChange={(v) => handleChange(proc.nome, v)}
            readonly={readonly}
          />
        ))}
      </div>

      {/* Total */}
      <div className={cn(
        'flex items-center justify-between rounded-xl border px-4 py-3',
        total > 0
          ? 'border-primary/20 bg-primary/5'
          : 'border-border bg-muted/30',
      )}>
        <div className="flex items-center gap-2">
          <Clock size={14} className={total > 0 ? 'text-primary' : 'text-muted-foreground'} />
          <span className="text-xs font-semibold text-foreground">Tempo Total da Peça</span>
        </div>
        <div className="text-right">
          <span className={cn(
            'text-lg font-bold tabular-nums',
            total > 0 ? 'text-primary' : 'text-muted-foreground',
          )}>
            {total}
          </span>
          <span className="ml-1 text-xs text-muted-foreground">min</span>
          {total >= 60 && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {Math.floor(total / 60)}h {total % 60}min
            </p>
          )}
        </div>
      </div>

      {/* Breakdown visualization */}
      {showBreakdown && total > 0 && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <BreakdownBars tempos={tempos} />
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  )
}
