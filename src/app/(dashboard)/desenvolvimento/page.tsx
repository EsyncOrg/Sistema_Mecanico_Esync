'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Activity,
  CheckCircle2,
  TrendingUp,
  BarChart2,
  Search,
  Plus,
  Trash2,
  ArrowDown,
  ChevronRight,
  ChevronDown,
  Download,
  FileText,
  AlertTriangle,
  AlertCircle,
  Package,
  Scissors,
  FoldVertical,
  Flame,
  Paintbrush,
  Wrench,
  LayoutDashboard,
  History,
  Send,
  Layers,
  Hash,
  Boxes,
  X,
  Zap,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import Link from 'next/link'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { PauseModal } from '@/components/shared/PauseModal'
import { useAuth } from '@/contexts/AuthContext'
import { useDesenvolvimento } from '@/contexts/DesenvolvimentoContext'
import { useConjuntos } from '@/contexts/ConjuntosContext'
import type { Conjunto } from '@/types/conjuntos'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { mockAnalyticsDesenvolvimento } from '@/mocks/desenvolvimento'
import type {
  TarefaDesenvolvimento,
  StatusDesenvolvimento,
  PrioridadeDesenvolvimento,
  SetorProcesso,
  PecaSolicitacao,
  OsDistribuicao,
} from '@/types/desenvolvimento'
import { MATERIAIS } from '@/lib/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabView = 'dashboard' | 'pecas' | 'conjuntos' | 'nova_solicitacao' | 'historico' | 'analises'

// ─── Config ───────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#0f4c5c', '#000080', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const STATUS_CFG: Record<StatusDesenvolvimento, {
  label: string; color: string; bg: string; border: string; dot: string; pulse: boolean
}> = {
  pendente:              { label: 'Pendente',               color: 'text-warning',          bg: 'bg-warning/10',      border: 'border-warning/25',      dot: 'bg-warning',          pulse: false },
  em_desenvolvimento:    { label: 'Em Desenvolvimento',     color: 'text-primary',          bg: 'bg-primary/10',      border: 'border-primary/25',      dot: 'bg-primary',          pulse: true  },
  pausado:               { label: 'Pausado',                color: 'text-destructive',      bg: 'bg-destructive/10',  border: 'border-destructive/25',  dot: 'bg-destructive',      pulse: false },
  aguardando_aprovacao:  { label: 'Aguardando Aprovação',   color: 'text-accent',           bg: 'bg-accent/10',       border: 'border-accent/25',       dot: 'bg-accent',           pulse: true  },
  finalizado:            { label: 'Finalizado',             color: 'text-muted-foreground', bg: 'bg-muted',           border: 'border-border',          dot: 'bg-muted-foreground', pulse: false },
}

const PRIO_CFG: Record<PrioridadeDesenvolvimento, { label: string; color: string; bg: string }> = {
  alta:  { label: 'Alta',  color: 'text-destructive',      bg: 'bg-destructive/8' },
  media: { label: 'Média', color: 'text-warning',          bg: 'bg-warning/8'     },
  baixa: { label: 'Baixa', color: 'text-muted-foreground', bg: 'bg-muted'         },
}

const SETORES_CONFIG: Record<SetorProcesso, {
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string
  bg: string
  border: string
  future?: boolean
}> = {
  corte:    { label: 'Corte',    icon: Scissors,    color: 'text-primary',          bg: 'bg-primary/10',          border: 'border-primary/30'          },
  dobra:    { label: 'Dobra',    icon: FoldVertical, color: 'text-accent',           bg: 'bg-accent/10',           border: 'border-accent/30'           },
  solda:    { label: 'Solda',    icon: Flame,        color: 'text-warning',          bg: 'bg-warning/10',          border: 'border-warning/30'          },
  pintura:  { label: 'Pintura',  icon: Paintbrush,   color: 'text-muted-foreground', bg: 'bg-muted',               border: 'border-border',   future: true },
  montagem: { label: 'Montagem', icon: Wrench,       color: 'text-muted-foreground', bg: 'bg-muted',               border: 'border-border',   future: true },
}

const PROCESS_ORDER: SetorProcesso[] = ['corte', 'dobra', 'solda', 'pintura', 'montagem']

const MOTIVOS_DEV = [
  'Aguardando especificação do cliente',
  'Revisão técnica',
  'Falta de referência/desenho',
  'Aguardando material',
  'Pausa do engenheiro',
  'Reunião interna',
  'Outro',
]

const RESPONSAVEIS = [
  'Carlos Mendes',
  'Ana Lima',
  'Roberto Silva',
  'Fernanda Rocha',
  'Paulo Santos',
  'Marcos Oliveira',
]

const TABS: { id: TabView; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'dashboard',        label: 'Dashboard',         icon: LayoutDashboard },
  { id: 'pecas',            label: 'Desenvolv. de Peças', icon: Lightbulb      },
  { id: 'conjuntos',        label: 'Conjuntos',         icon: Layers          },
  { id: 'nova_solicitacao', label: 'Nova Solicitação',  icon: Send            },
  { id: 'historico',        label: 'Histórico',         icon: History         },
  { id: 'analises',         label: 'Análises',          icon: BarChart2       },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtTimer(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function fmtHM(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}min`
}

function getPauseSecs(t: TarefaDesenvolvimento, now: number): number {
  return t.pausas.reduce((acc, p) => {
    const endMs = p.fim ? p.fim.getTime() : now
    return acc + Math.max(0, Math.floor((endMs - p.inicio.getTime()) / 1000))
  }, 0)
}

function getTotalSecs(t: TarefaDesenvolvimento, now: number): number {
  if (!t.iniciadoEm) return 0
  const endMs = t.finalizadoEm ? t.finalizadoEm.getTime() : now
  return Math.max(0, Math.floor((endMs - t.iniciadoEm.getTime()) / 1000))
}

function getLiquidoSecs(t: TarefaDesenvolvimento, now: number): number {
  return Math.max(0, getTotalSecs(t, now) - getPauseSecs(t, now))
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadgeDev({ status }: { status: StatusDesenvolvimento }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold', cfg.bg, cfg.color)}>
      <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', cfg.dot, cfg.pulse && 'animate-pulse')} />
      {cfg.label}
    </span>
  )
}

function PrioridadeBadge({ prioridade }: { prioridade: PrioridadeDesenvolvimento }) {
  const cfg = PRIO_CFG[prioridade]
  return (
    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', cfg.bg, cfg.color)}>
      {cfg.label}
    </span>
  )
}

function TimerBlock({ label, secs, accent = false, large = false }: {
  label: string; secs: number; accent?: boolean; large?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</span>
      <span className={cn(
        'font-mono font-bold tabular-nums',
        large ? 'text-2xl' : 'text-sm',
        accent ? 'text-accent' : 'text-foreground'
      )}>
        {fmtTimer(secs)}
      </span>
    </div>
  )
}

function SetorTag({ setor }: { setor: SetorProcesso }) {
  const cfg = SETORES_CONFIG[setor]
  const Icon = cfg.icon
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold',
      cfg.bg, cfg.color, cfg.future && 'opacity-60'
    )}>
      <Icon size={9} />
      {cfg.label}
    </span>
  )
}

// ─── Task Card ────────────────────────────────────────────────────────────────

function TarefaCard({
  tarefa, now, onIniciar, onPausar, onRetomar, onEnviarAprovacao, onFinalizar, canEdit, index,
}: {
  tarefa: TarefaDesenvolvimento
  now: number
  onIniciar: (id: string) => void
  onPausar: (id: string) => void
  onRetomar: (id: string) => void
  onEnviarAprovacao: (id: string) => void
  onFinalizar: (id: string) => void
  canEdit: boolean
  index: number
}) {
  const cfg = STATUS_CFG[tarefa.status]
  const totalSecs = getTotalSecs(tarefa, now)
  const pauseSecs = getPauseSecs(tarefa, now)
  const liquidoSecs = getLiquidoSecs(tarefa, now)
  const isActive = tarefa.status === 'em_desenvolvimento'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: 'easeOut' }}
      className={cn(
        'relative flex flex-col rounded-xl border bg-card shadow-card transition-all duration-200 overflow-hidden',
        cfg.border,
        isActive && 'shadow-card-hover'
      )}
    >
      {/* Status stripe */}
      <div className={cn('h-0.5 w-full', {
        'bg-warning':             tarefa.status === 'pendente',
        'bg-primary':             tarefa.status === 'em_desenvolvimento',
        'bg-destructive':         tarefa.status === 'pausado',
        'bg-accent':              tarefa.status === 'aguardando_aprovacao',
        'bg-muted-foreground/30': tarefa.status === 'finalizado',
      })} />

      <div className="p-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadgeDev status={tarefa.status} />
            <PrioridadeBadge prioridade={tarefa.prioridade} />
          </div>
          <span className="text-xs text-muted-foreground font-mono flex-shrink-0">{tarefa.numeroOS}</span>
        </div>

        {/* Piece info */}
        <div>
          <p className="font-mono font-bold text-base text-accent leading-none">{tarefa.codigoPeca}</p>
          <p className="text-sm text-foreground mt-0.5">{tarefa.descricao}</p>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">{tarefa.cliente}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{tarefa.responsavel}</span>
          </div>
          {tarefa.observacoesTecnicas && (
            <p className="text-xs text-muted-foreground/70 mt-1.5 italic leading-snug line-clamp-2">
              {tarefa.observacoesTecnicas}
            </p>
          )}
        </div>

        {/* Process tags */}
        <div className="flex flex-wrap gap-1">
          {tarefa.processos.map((s) => <SetorTag key={s} setor={s} />)}
        </div>

        {/* Timer — only when active or done */}
        {tarefa.iniciadoEm && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 grid grid-cols-3 gap-2">
            <TimerBlock label="Total"   secs={totalSecs}   large={isActive} accent={isActive} />
            <TimerBlock label="Pausado" secs={pauseSecs}   />
            <TimerBlock label="Líquido" secs={liquidoSecs} />
          </div>
        )}

        {/* Actions */}
        {canEdit && tarefa.status !== 'finalizado' && (
          <div className="flex flex-wrap gap-2 pt-1">
            {tarefa.status === 'pendente' && (
              <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-white h-8" onClick={() => onIniciar(tarefa.id)}>
                <Play size={12} />
                Iniciar
              </Button>
            )}
            {tarefa.status === 'em_desenvolvimento' && (
              <>
                <Button size="sm" variant="outline" className="gap-1.5 h-8 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => onPausar(tarefa.id)}>
                  <Pause size={12} />
                  Pausar
                </Button>
                <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => onEnviarAprovacao(tarefa.id)}>
                  <Send size={12} />
                  Aprovação
                </Button>
                <Button size="sm" className="gap-1.5 bg-success hover:bg-success/90 text-white h-8" onClick={() => onFinalizar(tarefa.id)}>
                  <CheckCircle2 size={12} />
                  Finalizar
                </Button>
              </>
            )}
            {tarefa.status === 'pausado' && (
              <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-white h-8" onClick={() => onRetomar(tarefa.id)}>
                <RotateCcw size={12} />
                Retomar
              </Button>
            )}
            {tarefa.status === 'aguardando_aprovacao' && (
              <Button size="sm" className="gap-1.5 bg-success hover:bg-success/90 text-white h-8" onClick={() => onFinalizar(tarefa.id)}>
                <CheckCircle2 size={12} />
                Aprovar e Finalizar
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Flow Preview ─────────────────────────────────────────────────────────────

function FlowPreview({ processos }: { processos: SetorProcesso[] }) {
  const ordered = PROCESS_ORDER.filter((s) => processos.includes(s))

  const steps = [
    { label: 'Desenvolvimento', icon: Lightbulb, color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30' },
    { label: 'Programação', icon: FileText, color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/30' },
    ...ordered.map((s) => {
      const cfg = SETORES_CONFIG[s]
      return { label: cfg.label, icon: cfg.icon, color: cfg.color, bg: cfg.bg, border: cfg.border }
    }),
    { label: 'Finalizado', icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10', border: 'border-success/30' },
  ]

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Fluxo de Produção
      </p>
      {/* Vertical flow on mobile, horizontal on md+ */}
      <div className="flex flex-col md:flex-row md:flex-wrap md:items-center gap-1">
        {steps.map((step, i) => {
          const Icon = step.icon
          return (
            <React.Fragment key={i}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2',
                  step.bg, step.border
                )}
              >
                <Icon size={13} className={step.color} />
                <span className={cn('text-xs font-semibold', step.color)}>{step.label}</span>
              </motion.div>
              {i < steps.length - 1 && (
                <div className="flex md:hidden items-center justify-center ml-4">
                  <ArrowDown size={14} className="text-muted-foreground/50" />
                </div>
              )}
              {i < steps.length - 1 && (
                <div className="hidden md:flex items-center justify-center">
                  <ChevronRight size={14} className="text-muted-foreground/50" />
                </div>
              )}
            </React.Fragment>
          )
        })}
      </div>
      {ordered.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Selecione ao menos um setor para visualizar o fluxo completo.
        </p>
      )}
    </div>
  )
}

// ─── Setor Toggle ─────────────────────────────────────────────────────────────

function SetorToggle({
  setor, selected, onToggle,
}: {
  setor: SetorProcesso
  selected: boolean
  onToggle: (s: SetorProcesso) => void
}) {
  const cfg = SETORES_CONFIG[setor]
  const Icon = cfg.icon
  return (
    <button
      type="button"
      onClick={() => onToggle(setor)}
      className={cn(
        'relative flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-all duration-150 select-none',
        selected
          ? cn(cfg.bg, cfg.color, cfg.border, 'shadow-sm')
          : 'border-border text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground bg-card',
        cfg.future && 'opacity-60'
      )}
    >
      <Icon size={18} />
      <span>{cfg.label}</span>
      {cfg.future && (
        <span className="absolute top-1 right-1 text-[8px] text-muted-foreground/60 font-normal">Em breve</span>
      )}
      {selected && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white"
        >
          <CheckCircle2 size={9} strokeWidth={3} />
        </motion.span>
      )}
    </button>
  )
}

// ─── Importar Conjunto Modal ─────────────────────────────────────────────────

const CATEGORIA_LABELS: Record<string, string> = {
  painel: 'Painel', estrutura: 'Estrutura', gabinete: 'Gabinete',
  maquina: 'Máquina', suporte: 'Suporte', montagem: 'Montagem', outro: 'Outro',
}

function ImportarConjuntoModal({
  conjuntos,
  onImportar,
  onClose,
}: {
  conjuntos: Conjunto[]
  onImportar: (conjuntoId: string, quantidade: number) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('todos')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [qtd, setQtd] = useState(1)

  const categorias = useMemo(() => [...new Set(conjuntos.map((c) => c.categoria))], [conjuntos])

  const filtered = useMemo(() => conjuntos.filter((c) => {
    if (c.status === 'inativo' || c.status === 'descontinuado') return false
    const textOk = search === '' ||
      c.codigo.toLowerCase().includes(search.toLowerCase()) ||
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.cliente.toLowerCase().includes(search.toLowerCase())
    const catOk = catFilter === 'todos' || c.categoria === catFilter
    return textOk && catOk
  }), [conjuntos, search, catFilter])

  const selected = conjuntos.find((c) => c.id === selectedId) ?? null
  const totalUnidades = selected ? selected.pecas.reduce((s, p) => s + p.quantidade * qtd, 0) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: 32, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
        className="relative w-full sm:max-w-3xl flex flex-col bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[92vh] sm:max-h-[88vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Boxes size={15} className="text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">Importar Conjunto</h2>
              <p className="text-xs text-muted-foreground">Selecione um conjunto e o ERP importa todas as peças automaticamente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Search + Category filters */}
        <div className="px-5 py-3 border-b border-border flex-shrink-0 space-y-2.5">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              placeholder="Buscar por código, nome ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-muted/40 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(['todos', ...categorias] as string[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setCatFilter(cat)}
                className={cn(
                  'rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all',
                  catFilter === cat
                    ? 'border-primary/40 bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground bg-card'
                )}
              >
                {cat === 'todos' ? 'Todos' : (CATEGORIA_LABELS[cat] ?? cat)}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Boxes size={28} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Nenhum conjunto encontrado</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Ajuste os filtros ou cadastre novos conjuntos</p>
            </div>
          ) : (
            filtered.map((c) => {
              const isSelected = c.id === selectedId
              const totalUnids = c.pecas.reduce((s, p) => s + p.quantidade, 0)
              return (
                <motion.button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(isSelected ? null : c.id)}
                  whileHover={{ scale: 1.004 }}
                  whileTap={{ scale: 0.998 }}
                  className={cn(
                    'w-full rounded-xl border p-3.5 text-left transition-all duration-150 outline-none',
                    isSelected
                      ? 'border-primary/40 bg-primary/8 shadow-sm ring-1 ring-primary/20'
                      : 'border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/30'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-accent">{c.codigo}</span>
                        {c.status === 'em_revisao' && (
                          <span className="text-[10px] font-semibold rounded px-1.5 py-0.5 bg-warning/10 text-warning border border-warning/20">
                            Em revisão
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-0.5 ml-auto">
                          {CATEGORIA_LABELS[c.categoria] ?? c.categoria}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-0.5 font-medium">{c.nome}</p>
                      <div className="flex items-center gap-2.5 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>{c.cliente}</span>
                        <span className="text-border">·</span>
                        <span>{c.revisao}</span>
                        <span className="text-border">·</span>
                        <span>{c.pecas.length} tipo{c.pecas.length !== 1 ? 's' : ''} de peça</span>
                        <span className="text-border">·</span>
                        <span className="font-semibold text-foreground">{totalUnids} un. por conjunto</span>
                      </div>
                    </div>
                    <div className={cn(
                      'flex-shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all',
                      isSelected ? 'border-primary bg-primary shadow-sm' : 'border-muted-foreground/30'
                    )}>
                      {isSelected && <CheckCircle2 size={11} className="text-white" strokeWidth={3} />}
                    </div>
                  </div>

                  {/* Expandable piece preview */}
                  <AnimatePresence initial={false}>
                    {isSelected && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 pt-3 border-t border-primary/20 space-y-1.5">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-2 flex items-center gap-1.5">
                            <Boxes size={9} />
                            Peças que serão importadas ({c.pecas.length})
                          </p>
                          {c.pecas.map((p) => (
                            <div key={p.id} className="flex items-center gap-2 text-xs">
                              <span className="font-mono font-semibold text-accent min-w-[80px] shrink-0">{p.codigo}</span>
                              <span className="text-muted-foreground truncate flex-1">{p.descricao}</span>
                              <span className="flex-shrink-0 font-bold text-foreground bg-primary/10 px-2 py-0.5 rounded-full text-[11px]">
                                {p.quantidade * qtd}×
                              </span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              )
            })
          )}
        </div>

        {/* Sticky footer */}
        <div className={cn(
          'border-t border-border px-5 py-4 flex-shrink-0 rounded-b-2xl transition-colors',
          selected ? 'bg-primary/5' : 'bg-muted/20'
        )}>
          {selected ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Quantity multiplier */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Quantidade de Conjuntos
                  </p>
                  <Input
                    type="number"
                    min={1}
                    value={qtd}
                    onChange={(e) => setQtd(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 h-8 text-sm font-semibold"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">
                    Resultado
                  </p>
                  <p className="text-xs text-foreground">
                    <span className="font-bold text-primary">{selected.pecas.length}</span> tipos de peça ·{' '}
                    <span className="font-bold text-primary">{totalUnidades}</span> unidades no total
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {qtd > 1 && `${selected.pecas.length} peças × ${qtd} conjuntos = ${totalUnidades} unidades`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" className="h-9" onClick={onClose}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 h-9 bg-primary hover:bg-primary/90 text-white"
                  onClick={() => onImportar(selected.id, qtd)}
                >
                  <Boxes size={13} />
                  Importar {selected.pecas.length} Peça{selected.pecas.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-muted-foreground">
                {filtered.length} conjunto{filtered.length !== 1 ? 's' : ''} disponível{filtered.length !== 1 ? 'is' : ''} — selecione um para configurar a importação
              </p>
              <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DesenvolvimentoPage() {
  const { canEdit } = useAuth()
  const {
    tarefas, solicitacoes,
    iniciarDesenvolvimento, pausarDesenvolvimento,
    retomarDesenvolvimento, enviarParaAprovacao, finalizarDesenvolvimento,
    criarSolicitacao,
  } = useDesenvolvimento()
  const { conjuntos: registeredConjuntos } = useConjuntos()

  const [now, setNow] = useState(Date.now())
  const [activeTab, setActiveTab] = useState<TabView>('dashboard')
  const [statusFilter, setStatusFilter] = useState<StatusDesenvolvimento | 'todos'>('todos')
  const [searchHistorico, setSearchHistorico] = useState('')
  const [prioridadeFilter, setPrioridadeFilter] = useState<PrioridadeDesenvolvimento | 'todos'>('todos')

  // Pause modal state
  const [pauseModal, setPauseModal] = useState<{ open: boolean; tarefaId: string | null }>({ open: false, tarefaId: null })

  // Import conjunto modal state
  const [importModal, setImportModal] = useState(false)

  // Nova Solicitação form — step wizard
  const [solStep, setSolStep] = useState(1)
  const [solForm, setSolForm] = useState({
    titulo: '',
    cliente: '',
    numeroOS: '',
    descricao: '',
    prioridade: 'media' as PrioridadeDesenvolvimento,
    observacoes: '',
    responsavel: '',
  })
  const [solPecas, setSolPecas] = useState<PecaSolicitacao[]>([])
  const [expandedPecas, setExpandedPecas] = useState<Set<string>>(new Set())

  // Piece form being built inside step 2
  const [novaPecaForm, setNovaPecaForm] = useState<Omit<PecaSolicitacao, 'id'>>({
    codigo: '', descricao: '', quantidade: 1, material: 'Aço Carbono 1020',
    espessura: 3.0, observacoes: '', processos: [],
    osDistribuicao: [],
  })

  // Live timer
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // ── Derived values ────────────────────────────────────────────────────────

  const filteredTarefas = useMemo(() => {
    return tarefas.filter((t) => {
      const statusOk = statusFilter === 'todos' || t.status === statusFilter
      return statusOk && t.status !== 'finalizado'
    })
  }, [tarefas, statusFilter])

  const historicoTarefas = useMemo(() => {
    return tarefas
      .filter((t) => {
        const textMatch =
          searchHistorico === '' ||
          t.codigoPeca.toLowerCase().includes(searchHistorico.toLowerCase()) ||
          t.descricao.toLowerCase().includes(searchHistorico.toLowerCase()) ||
          t.cliente.toLowerCase().includes(searchHistorico.toLowerCase()) ||
          t.numeroOS.toLowerCase().includes(searchHistorico.toLowerCase())
        const prioOk = prioridadeFilter === 'todos' || t.prioridade === prioridadeFilter
        return textMatch && prioOk
      })
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
  }, [tarefas, searchHistorico, prioridadeFilter])

  const kpis = useMemo(() => {
    const active = tarefas.filter((t) => t.status === 'em_desenvolvimento').length
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTasks = tarefas.filter((t) => t.iniciadoEm && t.iniciadoEm >= today)
    const totalSecsToday = todayTasks.reduce((a, t) => a + getLiquidoSecs(t, now), 0)
    const finalized = tarefas.filter((t) => t.status === 'finalizado')
    const avgSecs = finalized.length > 0
      ? finalized.reduce((a, t) => a + getLiquidoSecs(t, t.finalizadoEm?.getTime() ?? now), 0) / finalized.length
      : 0
    const urgent = tarefas.filter((t) => t.prioridade === 'alta' && t.status !== 'finalizado').length
    return { active, totalSecsToday, avgSecs, finalized: finalized.length, urgent }
  }, [tarefas, now])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handlePausar = useCallback((id: string) => {
    setPauseModal({ open: true, tarefaId: id })
  }, [])

  const confirmarPausa = useCallback((motivo: string) => {
    if (!pauseModal.tarefaId) return
    pausarDesenvolvimento(pauseModal.tarefaId, motivo)
    setPauseModal({ open: false, tarefaId: null })
    toast('warning', 'Desenvolvimento pausado')
  }, [pauseModal.tarefaId, pausarDesenvolvimento])

  const handleIniciar = useCallback((id: string) => {
    iniciarDesenvolvimento(id)
    toast('success', 'Desenvolvimento iniciado')
  }, [iniciarDesenvolvimento])

  const handleRetomar = useCallback((id: string) => {
    retomarDesenvolvimento(id)
    toast('success', 'Desenvolvimento retomado')
  }, [retomarDesenvolvimento])

  const handleEnviarAprovacao = useCallback((id: string) => {
    enviarParaAprovacao(id)
    toast('info', 'Enviado para aprovação')
  }, [enviarParaAprovacao])

  const handleFinalizar = useCallback((id: string) => {
    finalizarDesenvolvimento(id)
    toast('success', 'Desenvolvimento finalizado!')
  }, [finalizarDesenvolvimento])

  const toggleProcesso = useCallback((setor: SetorProcesso, list: SetorProcesso[], setList: (v: SetorProcesso[]) => void) => {
    setList(list.includes(setor) ? list.filter((s) => s !== setor) : [...list, setor])
  }, [])

  // ── OS distribution helpers ──────────────────────────────────────────────

  const addOsToNovaPeca = useCallback(() => {
    setNovaPecaForm((f) => ({
      ...f,
      osDistribuicao: [
        ...f.osDistribuicao,
        { id: `os-${Date.now()}`, numeroOS: '', quantidade: 0 } as OsDistribuicao,
      ],
    }))
  }, [])

  const removeOsFromNovaPeca = useCallback((id: string) => {
    setNovaPecaForm((f) => ({
      ...f,
      osDistribuicao: f.osDistribuicao.filter((e) => e.id !== id),
    }))
  }, [])

  const updateOsEntry = useCallback((id: string, field: 'numeroOS' | 'quantidade', value: string | number) => {
    setNovaPecaForm((f) => ({
      ...f,
      osDistribuicao: f.osDistribuicao.map((e) =>
        e.id === id ? { ...e, [field]: field === 'quantidade' ? Number(value) || 0 : value } : e
      ),
    }))
  }, [])

  const toggleExpandPeca = useCallback((id: string) => {
    setExpandedPecas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }, [])

  // ── Import conjunto into solicitação ──────────────────────────────────────

  const handleImportarConjunto = useCallback((conjuntoId: string, qtd: number) => {
    const conjunto = registeredConjuntos.find((c) => c.id === conjuntoId)
    if (!conjunto) return
    const novasPecas: PecaSolicitacao[] = conjunto.pecas.map((p, i) => ({
      id:           `sp-import-${Date.now()}-${i}`,
      codigo:       p.codigo,
      descricao:    p.descricao,
      quantidade:   p.quantidade * qtd,
      material:     p.material,
      espessura:    p.espessura,
      observacoes:  p.observacoes,
      processos:    [...p.processos],
      osDistribuicao: [],
    }))
    setSolPecas((prev) => [...prev, ...novasPecas])
    setImportModal(false)
    toast('success', `${novasPecas.length} peça(s) de "${conjunto.nome}" importadas com sucesso!`)
  }, [registeredConjuntos])

  // ── Piece / solicitação submission ────────────────────────────────────────

  const addPecaToSolicitacao = useCallback(() => {
    if (!novaPecaForm.codigo.trim() || !novaPecaForm.descricao.trim()) {
      toast('error', 'Preencha código e descrição da peça')
      return
    }
    // Validate OS distribution if any entries exist
    const osTotal = novaPecaForm.osDistribuicao.reduce((s, e) => s + (e.quantidade || 0), 0)
    if (novaPecaForm.osDistribuicao.length > 0 && osTotal !== novaPecaForm.quantidade) {
      toast('warning', `Distribuição OS: ${osTotal} distribuídas de ${novaPecaForm.quantidade} — verifique antes de continuar`)
    }
    const nova: PecaSolicitacao = { ...novaPecaForm, id: `sp-${Date.now()}` }
    setSolPecas((prev) => [...prev, nova])
    setNovaPecaForm({ codigo: '', descricao: '', quantidade: 1, material: 'Aço Carbono 1020', espessura: 3.0, observacoes: '', processos: [], osDistribuicao: [] })
    toast('success', 'Peça adicionada')
  }, [novaPecaForm])

  const handleSubmitSolicitacao = useCallback(() => {
    if (!solForm.titulo.trim() || !solForm.cliente.trim()) {
      toast('error', 'Preencha os campos obrigatórios (Título e Cliente)')
      return
    }
    if (solPecas.length === 0) {
      toast('error', 'Adicione ao menos uma peça')
      return
    }
    // Warn if any piece has mismatched OS distribution
    const mismatch = solPecas.filter((p) => {
      if (p.osDistribuicao.length === 0) return false
      const sum = p.osDistribuicao.reduce((s, e) => s + e.quantidade, 0)
      return sum !== p.quantidade
    })
    if (mismatch.length > 0) {
      toast('warning', `${mismatch.length} peça(s) com distribuição OS incompleta — verifique os dados`)
      return
    }
    criarSolicitacao({
      titulo: solForm.titulo,
      cliente: solForm.cliente,
      numeroOS: solForm.numeroOS,
      descricao: solForm.descricao,
      prioridade: solForm.prioridade,
      observacoes: solForm.observacoes,
      responsavel: solForm.responsavel,
      pecas: solPecas,
      conjuntos: [],
    })
    // Reset
    setSolStep(1)
    setSolForm({ titulo: '', cliente: '', numeroOS: '', descricao: '', prioridade: 'media', observacoes: '', responsavel: '' })
    setSolPecas([])
    setExpandedPecas(new Set())
    setActiveTab('historico')
    toast('success', 'Solicitação criada com sucesso!')
  }, [solForm, solPecas, criarSolicitacao])

  const allSolProcessos = useMemo((): SetorProcesso[] => {
    const set = new Set<SetorProcesso>()
    solPecas.forEach((p) => p.processos.forEach((s) => set.add(s)))
    return PROCESS_ORDER.filter((s) => set.has(s))
  }, [solPecas])

  // ── KPI Data ──────────────────────────────────────────────────────────────

  const dashKpis = [
    { label: 'Em andamento', value: kpis.active, icon: Activity, bg: 'bg-primary/10', color: 'text-primary', ring: 'ring-primary/20' },
    { label: 'Tempo total hoje', value: fmtHM(kpis.totalSecsToday), icon: Clock, bg: 'bg-accent/10', color: 'text-accent', ring: 'ring-accent/20' },
    { label: 'Tempo médio por OS', value: kpis.avgSecs > 0 ? fmtHM(kpis.avgSecs) : '—', icon: TrendingUp, bg: 'bg-success/10', color: 'text-success', ring: 'ring-success/20', suffix: 'média de concluídos' },
    { label: 'Concluídos', value: kpis.finalized, icon: CheckCircle2, bg: 'bg-success/10', color: 'text-success', ring: 'ring-success/20' },
    { label: 'Urgentes', value: kpis.urgent, icon: AlertTriangle, bg: 'bg-destructive/10', color: 'text-destructive', ring: 'ring-destructive/20' },
  ]

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PermissionGate module="desenvolvimento">
    <div className="space-y-6">

      <PageHeader
        title="Desenvolvimento"
        subtitle="Engenharia e geração de demandas de produção"
        breadcrumbs={[{ label: 'Início', href: '/dashboard' }, { label: 'Desenvolvimento' }]}
        actions={
          canEdit('desenvolvimento') ? (
            <Button size="sm" className="gap-1.5" onClick={() => { setActiveTab('nova_solicitacao'); setSolStep(1) }}>
              <Plus size={14} />
              Nova Solicitação
            </Button>
          ) : undefined
        }
      />

      {/* ── Tabs ── */}
      <div className="mb-4 flex items-center gap-1 rounded-xl border border-border bg-muted p-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon size={14} />
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">

        {/* ════════════════ DASHBOARD ════════════════ */}
        {activeTab === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <div className="space-y-6">

              {/* KPI Cards */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                {dashKpis.map((kpi, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="group rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5"
                  >
                    <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl ring-4 transition-transform duration-200 group-hover:scale-105', kpi.bg, kpi.color, kpi.ring)}>
                      <kpi.icon size={16} />
                    </div>
                    <p className="text-xl font-bold tracking-tight text-foreground">{kpi.value}</p>
                    <p className="mt-0.5 text-xs font-medium text-muted-foreground">{kpi.label}</p>
                    {'suffix' in kpi && kpi.suffix && (
                      <p className="mt-0.5 text-[10px] text-muted-foreground/60">{kpi.suffix}</p>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Charts row 1 */}
              <div className="grid gap-4 lg:grid-cols-2">

                {/* Tempo por OS */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Tempo por OS</CardTitle>
                    <CardDescription className="text-xs">Minutos gastos por ordem de serviço</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={mockAnalyticsDesenvolvimento.tempoPorOS} layout="vertical" margin={{ left: 8, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="os" tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} width={72} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v} min`, 'Tempo']} />
                        <Bar dataKey="minutos" fill="#000080" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Tempo por Operador */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Tempo por Responsável</CardTitle>
                    <CardDescription className="text-xs">Minutos de desenvolvimento líquido</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={mockAnalyticsDesenvolvimento.tempoPorOperador} margin={{ left: 0, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                        <XAxis dataKey="operador" tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v} min`, 'Tempo']} />
                        <Bar dataKey="minutos" fill="#0f4c5c" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Charts row 2 */}
              <div className="grid gap-4 lg:grid-cols-2">

                {/* Tempo por Prioridade */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Tempo por Prioridade</CardTitle>
                    <CardDescription className="text-xs">Distribuição de esforço por nível de prioridade</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="55%" height={160}>
                        <PieChart>
                          <Pie data={mockAnalyticsDesenvolvimento.tempoPorPrioridade} dataKey="minutos" cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3}>
                            {mockAnalyticsDesenvolvimento.tempoPorPrioridade.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v} min`, 'Tempo']} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-2">
                        {mockAnalyticsDesenvolvimento.tempoPorPrioridade.map((e, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: e.fill }} />
                            <span className="text-muted-foreground">{e.prioridade}</span>
                            <span className="ml-auto font-semibold text-foreground">{e.minutos}min</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Status distribution */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Distribuição por Status</CardTitle>
                    <CardDescription className="text-xs">Quantidade de solicitações por status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="55%" height={160}>
                        <PieChart>
                          <Pie data={mockAnalyticsDesenvolvimento.statusDistribuicao} dataKey="count" cx="50%" cy="50%" innerRadius={40} outerRadius={68} paddingAngle={3}>
                            {mockAnalyticsDesenvolvimento.statusDistribuicao.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v} tarefas`, 'Qtd']} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-2">
                        {mockAnalyticsDesenvolvimento.statusDistribuicao.map((e, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: e.fill }} />
                            <span className="text-muted-foreground">{e.status}</span>
                            <span className="ml-auto font-semibold text-foreground">{e.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Evolução semanal */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Evolução Semanal</CardTitle>
                  <CardDescription className="text-xs">Tarefas iniciadas vs. concluídas por dia</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={mockAnalyticsDesenvolvimento.evolucaoSemanal} margin={{ left: 0, right: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                      <XAxis dataKey="dia" tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line type="monotone" dataKey="iniciadas" name="Iniciadas" stroke="#000080" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="concluidas" name="Concluídas" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

            </div>
          </motion.div>
        )}

        {/* ════════════════ DESENVOLVIMENTO DE PEÇAS ════════════════ */}
        {activeTab === 'pecas' && (
          <motion.div key="pecas" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <div className="space-y-4">

              {/* Status filter */}
              <div className="flex flex-wrap gap-2">
                {(['todos', 'em_desenvolvimento', 'pausado', 'aguardando_aprovacao', 'pendente'] as const).map((s) => {
                  const count = s === 'todos'
                    ? tarefas.filter((t) => t.status !== 'finalizado').length
                    : tarefas.filter((t) => t.status === s).length
                  const cfg = s !== 'todos' ? STATUS_CFG[s] : null
                  return (
                    <button
                      key={s}
                      onClick={() => setStatusFilter(s)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all',
                        statusFilter === s
                          ? s === 'todos'
                            ? 'border-foreground/20 bg-foreground text-background'
                            : cn('border-current', cfg?.bg, cfg?.color)
                          : 'border-border text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                      )}
                    >
                      {s !== 'todos' && cfg && <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />}
                      {s === 'todos' ? 'Todos' : STATUS_CFG[s as StatusDesenvolvimento].label}
                      <span className={cn('rounded px-1 py-0.5 text-[10px] font-bold', statusFilter === s && s !== 'todos' ? 'bg-white/20' : 'bg-muted-foreground/10')}>
                        {count}
                      </span>
                    </button>
                  )
                })}

                {canEdit('desenvolvimento') && (
                  <Button size="sm" className="ml-auto gap-1.5 h-8" onClick={() => { setActiveTab('nova_solicitacao'); setSolStep(1) }}>
                    <Plus size={13} />
                    Nova Solicitação
                  </Button>
                )}
              </div>

              {/* Task grid */}
              {filteredTarefas.length === 0 ? (
                <div className="rounded-xl border border-border bg-muted/30 p-12 text-center">
                  <Lightbulb size={32} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhuma tarefa encontrada</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Crie uma nova tarefa de desenvolvimento para começar</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredTarefas.map((t, i) => (
                    <TarefaCard
                      key={t.id}
                      tarefa={t}
                      now={now}
                      onIniciar={handleIniciar}
                      onPausar={handlePausar}
                      onRetomar={handleRetomar}
                      onEnviarAprovacao={handleEnviarAprovacao}
                      onFinalizar={handleFinalizar}
                      canEdit={canEdit('desenvolvimento')}
                      index={i}
                    />
                  ))}
                </div>
              )}

            </div>
          </motion.div>
        )}

        {/* ════════════════ ÁREA DE INTEGRAÇÃO DE CONJUNTOS ════════════════ */}
        {activeTab === 'conjuntos' && (
          <motion.div key="conjuntos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <div className="space-y-8">

              {/* ── Hero Header ── */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-5">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="relative flex-shrink-0"
                  >
                    <div className="absolute inset-0 rounded-xl bg-primary/20 blur-lg scale-125" />
                    <div className="relative flex h-14 w-14 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 shadow-lg">
                      <Boxes size={26} className="text-primary" />
                    </div>
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground leading-none mb-1">Área de Integração de Conjuntos</h2>
                    <p className="text-xs text-muted-foreground mb-3">Geração inteligente de demandas de produção a partir de estruturas cadastradas</p>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                      Conjuntos são estruturas industriais completas — painéis, gabinetes, estruturas — compostas por múltiplas peças.
                      Na <strong className="text-foreground">Nova Solicitação</strong>, selecione um conjunto, defina a quantidade e o ERP
                      calcula automaticamente todas as peças necessárias, verifica o estoque e gera apenas a produção faltante.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0 sm:items-end">
                  <Link href="/conjuntos">
                    <Button className="gap-2 bg-primary hover:bg-primary/90 text-white w-full sm:w-auto">
                      <Boxes size={14} />
                      Módulo de Conjuntos
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    className="gap-2 w-full sm:w-auto"
                    onClick={() => { setActiveTab('nova_solicitacao'); setSolStep(2) }}
                  >
                    <Plus size={14} />
                    Nova Solicitação
                  </Button>
                </div>
              </div>

              {/* ── How It Works — 3 Steps ── */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Como funciona</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    {
                      step: '01',
                      title: 'Selecionar Conjunto',
                      desc: 'Escolha um conjunto cadastrado. Defina quantos conjuntos completos precisam ser fabricados — as quantidades são multiplicadas automaticamente.',
                      icon: Boxes,
                      color: 'text-primary', bg: 'bg-primary/8', border: 'border-primary/20', numColor: 'text-primary/15',
                    },
                    {
                      step: '02',
                      title: 'Verificação de Estoque',
                      desc: 'O ERP consulta o estoque de cada peça individualmente. Separa o que já está disponível do que precisa ser produzido — zero desperdício.',
                      icon: TrendingUp,
                      color: 'text-accent', bg: 'bg-accent/8', border: 'border-accent/20', numColor: 'text-accent/15',
                    },
                    {
                      step: '03',
                      title: 'Produção Inteligente',
                      desc: 'Apenas as peças faltantes são enviadas para produção com seus processos e rotas preservados. Fluxo Corte → Dobra → Solda configurado automaticamente.',
                      icon: CheckCircle2,
                      color: 'text-success', bg: 'bg-success/8', border: 'border-success/20', numColor: 'text-success/15',
                    },
                  ].map((item, i) => {
                    const Icon = item.icon
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1, type: 'spring', stiffness: 260, damping: 26 }}
                        className={cn('relative rounded-xl border p-5 overflow-hidden', item.bg, item.border)}
                      >
                        <span className={cn('absolute top-2 right-3 text-6xl font-black leading-none select-none', item.numColor)}>{item.step}</span>
                        <div className={cn('flex h-9 w-9 items-center justify-center rounded-xl mb-3', item.bg, 'border', item.border)}>
                          <Icon size={16} className={item.color} />
                        </div>
                        <p className="text-sm font-bold text-foreground mb-2">{item.title}</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              {/* ── Animated Production Flow ── */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Fluxo de Produção Industrial</CardTitle>
                  <CardDescription className="text-xs">Do conjunto cadastrado à peça finalizada — visão completa do pipeline</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto pb-2">
                    <div className="flex items-center gap-0 min-w-max py-2 px-1">
                      {[
                        { label: 'Conjunto',    icon: Boxes,        color: 'text-primary',          bg: 'bg-primary/10',    border: 'border-primary/30'   },
                        { label: 'Estoque',     icon: Package,      color: 'text-accent',           bg: 'bg-accent/10',     border: 'border-accent/30'    },
                        { label: 'Δ Produção',  icon: TrendingUp,   color: 'text-warning',          bg: 'bg-warning/10',    border: 'border-warning/30'   },
                        { label: 'Programação', icon: FileText,     color: 'text-primary',          bg: 'bg-primary/10',    border: 'border-primary/30'   },
                        { label: 'Corte',       icon: Scissors,     color: 'text-primary',          bg: 'bg-primary/10',    border: 'border-primary/30'   },
                        { label: 'Dobra',       icon: FoldVertical, color: 'text-accent',           bg: 'bg-accent/10',     border: 'border-accent/30'    },
                        { label: 'Solda',       icon: Flame,        color: 'text-warning',          bg: 'bg-warning/10',    border: 'border-warning/30'   },
                        { label: 'Finalizado',  icon: CheckCircle2, color: 'text-success',          bg: 'bg-success/10',    border: 'border-success/30'   },
                      ].map((step, i) => {
                        const Icon = step.icon
                        return (
                          <React.Fragment key={i}>
                            <motion.div
                              initial={{ opacity: 0, scale: 0.75 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.1, type: 'spring', stiffness: 300, damping: 22 }}
                              className={cn(
                                'flex flex-col items-center gap-2 rounded-xl border px-4 py-3',
                                step.bg, step.border
                              )}
                            >
                              <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', step.bg)}>
                                <Icon size={15} className={step.color} />
                              </div>
                              <span className={cn('text-[11px] font-semibold text-center whitespace-nowrap', step.color)}>{step.label}</span>
                            </motion.div>
                            {i < 7 && (
                              <motion.div
                                initial={{ opacity: 0, scaleX: 0 }}
                                animate={{ opacity: 1, scaleX: 1 }}
                                transition={{ delay: i * 0.1 + 0.08, duration: 0.25 }}
                                className="flex items-center"
                                style={{ transformOrigin: 'left' }}
                              >
                                <div className="h-px w-3 bg-border" />
                                <ChevronRight size={12} className="text-muted-foreground/50 -mx-0.5" />
                                <div className="h-px w-3 bg-border" />
                              </motion.div>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Feature Cards 2×2 ── */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Capacidades da Integração</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    {
                      icon: TrendingUp,
                      title: 'Multiplicação Automática de Quantidades',
                      desc: '1 conjunto com 5 peças × 10 conjuntos = 50 unidades geradas instantaneamente. Nenhum cálculo manual necessário.',
                      color: 'text-primary', bg: 'bg-primary/10',
                    },
                    {
                      icon: Package,
                      title: 'Inteligência de Estoque',
                      desc: 'Verifica cada peça individualmente. Separa o que já existe em estoque do que precisa ser fabricado. Produção cirúrgica.',
                      color: 'text-accent', bg: 'bg-accent/10',
                    },
                    {
                      icon: Wrench,
                      title: 'Fluxo de Processo Preservado',
                      desc: 'Corte, Dobra, Solda, Pintura e Montagem são importados automaticamente do cadastro. Editáveis antes de confirmar.',
                      color: 'text-warning', bg: 'bg-warning/10',
                    },
                    {
                      icon: Layers,
                      title: 'Liberdade Total de Edição',
                      desc: 'Peças importadas são 100% editáveis: quantidade, material, processos, distribuição por OS — tudo antes de confirmar.',
                      color: 'text-success', bg: 'bg-success/10',
                    },
                  ].map((f, i) => {
                    const Icon = f.icon
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 + i * 0.08 }}
                        className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl', f.bg)}>
                          <Icon size={16} className={f.color} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{f.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.desc}</p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              {/* ── Conjuntos ativos preview ── */}
              {registeredConjuntos.filter((c) => c.status === 'ativo').length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                    Conjuntos Disponíveis para Importação ({registeredConjuntos.filter((c) => c.status === 'ativo').length})
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {registeredConjuntos.filter((c) => c.status === 'ativo').slice(0, 4).map((c, i) => (
                      <motion.div
                        key={c.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.65 + i * 0.06 }}
                        className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 hover:shadow-card-hover hover:border-primary/20 transition-all duration-200"
                      >
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary/8">
                          <Boxes size={14} className="text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-accent">{c.codigo}</span>
                            <span className="text-xs text-muted-foreground truncate">{c.nome}</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{c.pecas.length} peças · {c.cliente}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="flex-shrink-0 h-7 text-xs text-primary hover:bg-primary/10"
                          onClick={() => { setActiveTab('nova_solicitacao'); setSolStep(2); setTimeout(() => setImportModal(true), 50) }}
                        >
                          Importar
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                  {registeredConjuntos.filter((c) => c.status === 'ativo').length > 4 && (
                    <Link href="/conjuntos">
                      <p className="text-xs text-primary hover:underline mt-2 text-center">
                        Ver todos os {registeredConjuntos.filter((c) => c.status === 'ativo').length} conjuntos →
                      </p>
                    </Link>
                  )}
                </div>
              )}

              {/* ── Future AI preview ── */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="relative rounded-xl border border-dashed border-primary/25 p-6 overflow-hidden"
              >
                {/* Diagonal grid texture */}
                <div
                  className="absolute inset-0 opacity-[0.035] pointer-events-none"
                  style={{ backgroundImage: 'repeating-linear-gradient(45deg, hsl(240 100% 25%), hsl(240 100% 25%) 1px, transparent 1px, transparent 12px)' }}
                />
                <div className="relative flex flex-col sm:flex-row items-start gap-4">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], rotate: [0, 8, 0] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-gradient-to-br from-primary/15 to-accent/15 shadow-lg"
                  >
                    <Zap size={22} className="text-primary" />
                  </motion.div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-sm font-bold text-foreground">Otimização por Inteligência Artificial</span>
                      <span className="rounded-full border border-accent/30 bg-accent/8 px-2.5 py-0.5 text-[10px] font-bold text-accent uppercase tracking-wide">
                        Em desenvolvimento
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                      O ERP utilizará IA para sugerir agrupamentos de OS similares, prever necessidades de estoque com base em histórico,
                      otimizar sequenciamento de corte para máximo aproveitamento de chapa e identificar gargalos no fluxo de produção.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {['Agrupamento de OS', 'Previsão de Estoque', 'Sequenciamento de Corte', 'Análise de Gargalo', 'Aproveitamento de Chapa'].map((tag) => (
                        <span key={tag} className="rounded-full border border-border bg-muted/60 px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

            </div>
          </motion.div>
        )}

        {/* ════════════════ NOVA SOLICITAÇÃO ════════════════ */}
        {activeTab === 'nova_solicitacao' && (
          <motion.div key="nova_solicitacao" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <div className="max-w-4xl space-y-6">

              {/* Step indicator */}
              <div className="flex items-center gap-0">
                {[
                  { n: 1, label: 'Informações Gerais' },
                  { n: 2, label: 'Peças' },
                  { n: 3, label: 'Revisão' },
                ].map((step, i) => (
                  <React.Fragment key={step.n}>
                    <button
                      onClick={() => solStep > step.n && setSolStep(step.n)}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                        solStep === step.n ? 'text-primary' : solStep > step.n ? 'text-muted-foreground hover:text-foreground cursor-pointer' : 'text-muted-foreground/50 cursor-default'
                      )}
                    >
                      <span className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                        solStep === step.n ? 'bg-primary text-white' : solStep > step.n ? 'bg-success text-white' : 'bg-muted text-muted-foreground'
                      )}>
                        {solStep > step.n ? <CheckCircle2 size={12} /> : step.n}
                      </span>
                      <span className="hidden sm:inline">{step.label}</span>
                    </button>
                    {i < 2 && <ChevronRight size={14} className="text-muted-foreground/30 flex-shrink-0" />}
                  </React.Fragment>
                ))}
              </div>

              {/* ── Step 1: General Info ── */}
              {solStep === 1 && (
                <motion.div key="sol-step-1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Informações Gerais</CardTitle>
                      <CardDescription className="text-xs">Dados principais da solicitação de produção</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider">Título *</Label>
                        <Input
                          placeholder="Ex: Painel Elétrico Cliente X, Estrutura Linha 04"
                          value={solForm.titulo}
                          onChange={(e) => setSolForm((f) => ({ ...f, titulo: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider">Cliente *</Label>
                          <Input placeholder="Nome do cliente" value={solForm.cliente} onChange={(e) => setSolForm((f) => ({ ...f, cliente: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider">Número da OS</Label>
                          <Input placeholder="OS:XXXX" value={solForm.numeroOS} onChange={(e) => setSolForm((f) => ({ ...f, numeroOS: e.target.value }))} />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider">Responsável</Label>
                          <select
                            className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:border-accent"
                            value={solForm.responsavel}
                            onChange={(e) => setSolForm((f) => ({ ...f, responsavel: e.target.value }))}
                          >
                            <option value="">Selecionar...</option>
                            {RESPONSAVEIS.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider">Descrição</Label>
                        <Input placeholder="Descrição da solicitação" value={solForm.descricao} onChange={(e) => setSolForm((f) => ({ ...f, descricao: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider">Prioridade</Label>
                        <div className="flex gap-2">
                          {(['alta', 'media', 'baixa'] as const).map((p) => {
                            const cfg = PRIO_CFG[p]
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setSolForm((f) => ({ ...f, prioridade: p }))}
                                className={cn(
                                  'flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-all',
                                  solForm.prioridade === p ? cn('border-current', cfg.bg, cfg.color) : 'border-border text-muted-foreground hover:text-foreground'
                                )}
                              >
                                {cfg.label}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider">Observações</Label>
                        <textarea
                          rows={3}
                          placeholder="Observações técnicas ou comerciais..."
                          value={solForm.observacoes}
                          onChange={(e) => setSolForm((f) => ({ ...f, observacoes: e.target.value }))}
                          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-accent"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-end">
                    <Button
                      onClick={() => {
                        if (!solForm.titulo.trim() || !solForm.cliente.trim()) {
                          toast('error', 'Preencha os campos obrigatórios (Título e Cliente)')
                          return
                        }
                        setSolStep(2)
                      }}
                    >
                      Próximo: Peças
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 2: Pieces ── */}
              {solStep === 2 && (
                <motion.div key="sol-step-2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">

                  {/* Add piece form */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Adicionar Peça</CardTitle>
                      <CardDescription className="text-xs">Defina os dados e o fluxo de processo de cada peça</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider">Código *</Label>
                          <Input placeholder="SUP-001" value={novaPecaForm.codigo} onChange={(e) => setNovaPecaForm((f) => ({ ...f, codigo: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider">Descrição *</Label>
                          <Input placeholder="Nome da peça" value={novaPecaForm.descricao} onChange={(e) => setNovaPecaForm((f) => ({ ...f, descricao: e.target.value }))} />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider">Quantidade</Label>
                          <Input type="number" min={1} value={novaPecaForm.quantidade} onChange={(e) => setNovaPecaForm((f) => ({ ...f, quantidade: parseInt(e.target.value) || 1 }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider">Material</Label>
                          <select
                            className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:border-accent"
                            value={novaPecaForm.material}
                            onChange={(e) => setNovaPecaForm((f) => ({ ...f, material: e.target.value }))}
                          >
                            {MATERIAIS.map((m) => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold uppercase tracking-wider">Espessura (mm)</Label>
                          <Input type="number" step="0.1" min={0.1} value={novaPecaForm.espessura} onChange={(e) => setNovaPecaForm((f) => ({ ...f, espessura: parseFloat(e.target.value) || 1 }))} />
                        </div>
                      </div>

                      {/* Process selection */}
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold uppercase tracking-wider">Setores / Processos</Label>
                        <p className="text-xs text-muted-foreground">Selecione os setores pelos quais esta peça deve passar</p>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                          {PROCESS_ORDER.map((s) => (
                            <SetorToggle
                              key={s}
                              setor={s}
                              selected={novaPecaForm.processos.includes(s)}
                              onToggle={(setor) => toggleProcesso(setor, novaPecaForm.processos, (v) => setNovaPecaForm((f) => ({ ...f, processos: v })))}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Flow preview for this piece */}
                      {novaPecaForm.processos.length > 0 && (
                        <FlowPreview processos={novaPecaForm.processos} />
                      )}

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold uppercase tracking-wider">Observações</Label>
                        <Input placeholder="Observações técnicas desta peça" value={novaPecaForm.observacoes} onChange={(e) => setNovaPecaForm((f) => ({ ...f, observacoes: e.target.value }))} />
                      </div>

                      {/* ── OS Distribution ── */}
                      <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Label className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                              <Hash size={11} />
                              Distribuição por OS
                              <span className="font-normal text-muted-foreground lowercase tracking-normal">(opcional)</span>
                            </Label>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Informe quantas unidades desta peça pertencem a cada Ordem de Serviço.
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-1 h-7 text-xs flex-shrink-0"
                            onClick={addOsToNovaPeca}
                          >
                            <Plus size={11} />
                            Adicionar OS
                          </Button>
                        </div>

                        {novaPecaForm.osDistribuicao.length > 0 ? (
                          <div className="space-y-2">
                            {novaPecaForm.osDistribuicao.map((entry) => (
                              <div key={entry.id} className="flex items-center gap-2">
                                <Input
                                  placeholder="OS:XXXX"
                                  value={entry.numeroOS}
                                  onChange={(e) => updateOsEntry(entry.id, 'numeroOS', e.target.value)}
                                  className="flex-1 h-8 text-xs font-mono"
                                />
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="Qtd"
                                  value={entry.quantidade || ''}
                                  onChange={(e) => updateOsEntry(entry.id, 'quantidade', e.target.value)}
                                  className="w-20 h-8 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeOsFromNovaPeca(entry.id)}
                                  className="flex-shrink-0 rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                            {/* Validation indicator */}
                            {(() => {
                              const distributed = novaPecaForm.osDistribuicao.reduce((s, e) => s + e.quantidade, 0)
                              const ok = distributed === novaPecaForm.quantidade
                              const diff = novaPecaForm.quantidade - distributed
                              return ok ? (
                                <div className="flex items-center gap-1.5 text-xs text-success font-medium">
                                  <CheckCircle2 size={12} />
                                  Distribuição completa — {distributed}/{novaPecaForm.quantidade} unidades alocadas
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                                  <AlertCircle size={12} />
                                  {diff > 0 ? `Faltam ${diff}` : `Excesso de ${Math.abs(diff)}`} unidade(s) — total da peça: {novaPecaForm.quantidade}
                                </div>
                              )
                            })()}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground text-center py-1">
                            Nenhuma OS adicionada — clique em &ldquo;Adicionar OS&rdquo; para distribuir as {novaPecaForm.quantidade} unidade(s)
                          </p>
                        )}
                      </div>

                      <Button variant="outline" className="gap-1.5 w-full" onClick={addPecaToSolicitacao}>
                        <Plus size={14} />
                        Adicionar Peça à Solicitação
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Pieces list */}
                  {solPecas.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Peças Adicionadas ({solPecas.length})</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {solPecas.map((p, i) => {
                          const isExpanded = expandedPecas.has(p.id)
                          const osSum = p.osDistribuicao.reduce((s, e) => s + e.quantidade, 0)
                          const osOk = p.osDistribuicao.length === 0 || osSum === p.quantidade
                          return (
                            <motion.div
                              key={p.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04 }}
                              className="rounded-xl border border-border bg-muted/30 overflow-hidden"
                            >
                              <div className="flex items-start gap-3 p-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono font-bold text-sm text-accent">{p.codigo}</span>
                                    <span className="text-xs text-muted-foreground">·</span>
                                    <span className="text-sm text-foreground">{p.descricao}</span>
                                    <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                                      {p.quantidade}x · {p.material} · {p.espessura}mm
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <div className="flex flex-wrap gap-1">
                                      {p.processos.map((s) => <SetorTag key={s} setor={s} />)}
                                    </div>
                                    {p.osDistribuicao.length > 0 && (
                                      <button
                                        type="button"
                                        onClick={() => toggleExpandPeca(p.id)}
                                        className={cn(
                                          'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold transition-colors ml-auto',
                                          osOk
                                            ? 'text-success bg-success/10 hover:bg-success/20'
                                            : 'text-warning bg-warning/10 hover:bg-warning/20'
                                        )}
                                      >
                                        <Hash size={9} />
                                        {p.osDistribuicao.length} OS
                                        <ChevronDown size={10} className={cn('transition-transform', isExpanded && 'rotate-180')} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <button
                                  onClick={() => setSolPecas((prev) => prev.filter((x) => x.id !== p.id))}
                                  className="flex-shrink-0 rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>

                              {/* Collapsible OS distribution */}
                              <AnimatePresence initial={false}>
                                {isExpanded && p.osDistribuicao.length > 0 && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="border-t border-border bg-muted/40 px-3 py-2 space-y-1">
                                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                                        <Hash size={9} /> Distribuição por OS
                                      </p>
                                      {p.osDistribuicao.map((os) => (
                                        <div key={os.id} className="flex items-center justify-between text-xs">
                                          <span className="font-mono text-muted-foreground">{os.numeroOS || '—'}</span>
                                          <span className="font-semibold text-foreground">{os.quantidade}x</span>
                                        </div>
                                      ))}
                                      <div className={cn(
                                        'flex items-center gap-1 text-[10px] font-semibold mt-1 pt-1 border-t border-border',
                                        osOk ? 'text-success' : 'text-warning'
                                      )}>
                                        {osOk ? <CheckCircle2 size={9} /> : <AlertCircle size={9} />}
                                        {osSum}/{p.quantidade} distribuídas
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          )
                        })}
                      </CardContent>
                    </Card>
                  )}

                  {/* Global flow preview */}
                  {allSolProcessos.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fluxo Global da Solicitação</p>
                      <FlowPreview processos={allSolProcessos} />
                    </div>
                  )}

                  {/* Import Conjunto action */}
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="rounded-xl border border-primary/25 bg-gradient-to-r from-primary/5 to-accent/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20">
                        <Boxes size={18} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Importar de Conjunto Cadastrado</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Selecione um conjunto, defina a quantidade e todas as peças são carregadas automaticamente com processos e quantidades multiplicados.
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      className="gap-2 flex-shrink-0 bg-primary hover:bg-primary/90 text-white"
                      onClick={() => setImportModal(true)}
                    >
                      <Boxes size={14} />
                      Importar Conjunto
                    </Button>
                  </motion.div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setSolStep(1)}>Voltar</Button>
                    <Button
                      onClick={() => {
                        if (solPecas.length === 0) { toast('error', 'Adicione ao menos uma peça'); return }
                        setSolStep(3)
                      }}
                    >
                      Próximo: Revisão
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* ── Step 3: Review ── */}
              {solStep === 3 && (
                <motion.div key="sol-step-3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Revisão da Solicitação</CardTitle>
                      <CardDescription className="text-xs">Confirme todos os dados antes de enviar</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">

                      {/* General */}
                      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informações Gerais</p>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                          <div className="col-span-2"><span className="text-muted-foreground text-xs">Título:</span><br /><span className="font-semibold text-foreground">{solForm.titulo}</span></div>
                          <div><span className="text-muted-foreground text-xs">Cliente:</span><br /><span className="font-semibold">{solForm.cliente}</span></div>
                          <div><span className="text-muted-foreground text-xs">OS:</span><br /><span className="font-semibold">{solForm.numeroOS || '—'}</span></div>
                          <div><span className="text-muted-foreground text-xs">Responsável:</span><br /><span className="font-semibold">{solForm.responsavel || '—'}</span></div>
                          <div><span className="text-muted-foreground text-xs">Prioridade:</span><br /><PrioridadeBadge prioridade={solForm.prioridade} /></div>
                          {solForm.descricao && <div className="col-span-2"><span className="text-muted-foreground text-xs">Descrição:</span><br /><span>{solForm.descricao}</span></div>}
                        </div>
                      </div>

                      {/* Pieces */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Peças ({solPecas.length})</p>
                        <div className="overflow-x-auto rounded-xl border border-border">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-border bg-muted/40">
                                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Código</th>
                                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Descrição</th>
                                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Qtd</th>
                                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Material</th>
                                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Processos</th>
                                <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Dist. OS</th>
                              </tr>
                            </thead>
                            <tbody>
                              {solPecas.map((p) => {
                                const osSum = p.osDistribuicao.reduce((s, e) => s + e.quantidade, 0)
                                const osOk = p.osDistribuicao.length === 0 || osSum === p.quantidade
                                return (
                                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                                    <td className="px-3 py-2 font-mono font-semibold text-accent">{p.codigo}</td>
                                    <td className="px-3 py-2">{p.descricao}</td>
                                    <td className="px-3 py-2 font-semibold">{p.quantidade}</td>
                                    <td className="px-3 py-2 text-muted-foreground">{p.material} · {p.espessura}mm</td>
                                    <td className="px-3 py-2">
                                      <div className="flex flex-wrap gap-1">
                                        {p.processos.map((s) => <SetorTag key={s} setor={s} />)}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2">
                                      {p.osDistribuicao.length === 0 ? (
                                        <span className="text-muted-foreground/50">—</span>
                                      ) : (
                                        <div className="space-y-0.5">
                                          {p.osDistribuicao.map((os) => (
                                            <div key={os.id} className="flex items-center gap-1.5">
                                              <span className="font-mono text-muted-foreground">{os.numeroOS || '—'}</span>
                                              <span className="font-semibold text-foreground">{os.quantidade}x</span>
                                            </div>
                                          ))}
                                          <div className={cn(
                                            'flex items-center gap-1 text-[10px] font-semibold',
                                            osOk ? 'text-success' : 'text-warning'
                                          )}>
                                            {osOk ? <CheckCircle2 size={9} /> : <AlertCircle size={9} />}
                                            {osSum}/{p.quantidade}
                                          </div>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Global flow */}
                      {allSolProcessos.length > 0 && <FlowPreview processos={allSolProcessos} />}

                      {/* Conjuntos integration note */}
                      <div className="flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
                        <Boxes size={14} className="flex-shrink-0 mt-0.5 text-primary" />
                        <div>
                          <span className="font-semibold text-foreground">Integração com Conjuntos ativa.</span>
                          <span className="text-muted-foreground ml-1">
                            Peças importadas via Conjunto preservam código, material, espessura e processos originais.
                            Quantidades foram multiplicadas automaticamente. Distribuição por OS disponível para cada peça.
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setSolStep(2)}>Voltar</Button>
                    <Button className="gap-1.5 bg-success hover:bg-success/90 text-white" onClick={handleSubmitSolicitacao}>
                      <Send size={14} />
                      Enviar Solicitação
                    </Button>
                  </div>
                </motion.div>
              )}

            </div>
          </motion.div>
        )}

        {/* ════════════════ HISTÓRICO ════════════════ */}
        {activeTab === 'historico' && (
          <motion.div key="historico" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <div className="space-y-4">

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por código, OS, cliente..."
                    value={searchHistorico}
                    onChange={(e) => setSearchHistorico(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  {(['todos', 'alta', 'media', 'baixa'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPrioridadeFilter(p)}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all',
                        prioridadeFilter === p
                          ? p === 'todos'
                            ? 'border-foreground/20 bg-foreground text-background'
                            : cn('border-current', PRIO_CFG[p].bg, PRIO_CFG[p].color)
                          : 'border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {p === 'todos' ? 'Todas' : PRIO_CFG[p].label}
                    </button>
                  ))}
                  <Button variant="outline" size="sm" className="gap-1.5 h-9 ml-auto">
                    <Download size={13} />
                    Exportar
                  </Button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Código</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">OS</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Cliente</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prioridade</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Responsável</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tempo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Criado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoTarefas.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                          Nenhuma tarefa encontrada
                        </td>
                      </tr>
                    ) : (
                      historicoTarefas.map((t, i) => {
                        const liquido = getLiquidoSecs(t, t.finalizadoEm?.getTime() ?? now)
                        return (
                          <motion.tr
                            key={t.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.03 }}
                            className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-4 py-3 font-mono font-semibold text-accent">{t.codigoPeca}</td>
                            <td className="px-4 py-3 text-muted-foreground">{t.numeroOS}</td>
                            <td className="px-4 py-3 text-foreground">{t.cliente}</td>
                            <td className="px-4 py-3"><PrioridadeBadge prioridade={t.prioridade} /></td>
                            <td className="px-4 py-3 text-muted-foreground">{t.responsavel || '—'}</td>
                            <td className="px-4 py-3 font-mono text-xs">{liquido > 0 ? fmtHM(liquido) : '—'}</td>
                            <td className="px-4 py-3"><StatusBadgeDev status={t.status} /></td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {t.criadoEm.toLocaleDateString('pt-BR')}
                            </td>
                          </motion.tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <p className="text-xs text-muted-foreground">
                {historicoTarefas.length} tarefa{historicoTarefas.length !== 1 ? 's' : ''} encontrada{historicoTarefas.length !== 1 ? 's' : ''}
              </p>
            </div>
          </motion.div>
        )}

        {/* ════════════════ ANÁLISES ════════════════ */}
        {activeTab === 'analises' && (
          <motion.div key="analises" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <div className="space-y-6">

              {/* Efficiency KPIs */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Tempo médio por peça', value: fmtHM(kpis.avgSecs), icon: Clock, bg: 'bg-primary/10', color: 'text-primary', ring: 'ring-primary/20' },
                  { label: 'Eficiência média', value: '84%', icon: TrendingUp, bg: 'bg-success/10', color: 'text-success', ring: 'ring-success/20', suffix: 'Tempo líquido / total' },
                  { label: 'Solicitações concluídas', value: solicitacoes.filter((s) => s.status === 'finalizado').length, icon: CheckCircle2, bg: 'bg-success/10', color: 'text-success', ring: 'ring-success/20' },
                  { label: 'Tarefas urgentes abertas', value: kpis.urgent, icon: AlertTriangle, bg: 'bg-destructive/10', color: 'text-destructive', ring: 'ring-destructive/20' },
                ].map((kpi, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                    className="group rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
                    <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl ring-4 transition-transform duration-200 group-hover:scale-105', kpi.bg, kpi.color, kpi.ring)}>
                      <kpi.icon size={16} />
                    </div>
                    <p className="text-xl font-bold tracking-tight text-foreground">{kpi.value}</p>
                    <p className="mt-0.5 text-xs font-medium text-muted-foreground">{kpi.label}</p>
                    {'suffix' in kpi && kpi.suffix && <p className="mt-0.5 text-[10px] text-muted-foreground/60">{kpi.suffix}</p>}
                  </motion.div>
                ))}
              </div>

              {/* Charts grid */}
              <div className="grid gap-4 lg:grid-cols-2">

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Tempo por OS</CardTitle>
                    <CardDescription className="text-xs">Minutos de desenvolvimento por ordem de serviço</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={mockAnalyticsDesenvolvimento.tempoPorOS} layout="vertical" margin={{ left: 8, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="os" tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} width={72} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v} min`, 'Tempo']} />
                        <Bar dataKey="minutos" radius={[0, 4, 4, 0]}>
                          {mockAnalyticsDesenvolvimento.tempoPorOS.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Tempo por Responsável</CardTitle>
                    <CardDescription className="text-xs">Distribuição de carga de trabalho</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={mockAnalyticsDesenvolvimento.tempoPorOperador} margin={{ left: 0, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                        <XAxis dataKey="operador" tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v} min`, 'Tempo']} />
                        <Bar dataKey="minutos" fill="#0f4c5c" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Evolução Semanal</CardTitle>
                    <CardDescription className="text-xs">Tarefas iniciadas vs. concluídas por dia</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={mockAnalyticsDesenvolvimento.evolucaoSemanal} margin={{ left: 0, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                        <XAxis dataKey="dia" tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="iniciadas" name="Iniciadas" stroke="#000080" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="concluidas" name="Concluídas" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Prioridade × Status</CardTitle>
                    <CardDescription className="text-xs">Distribuição cruzada de prioridade e status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-6">
                      <ResponsiveContainer width="55%" height={200}>
                        <PieChart>
                          <Pie data={mockAnalyticsDesenvolvimento.tempoPorPrioridade} dataKey="minutos" cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={3}>
                            {mockAnalyticsDesenvolvimento.tempoPorPrioridade.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v} min`, 'Tempo']} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-3 flex-1">
                        {mockAnalyticsDesenvolvimento.tempoPorPrioridade.map((e, i) => {
                          const total = mockAnalyticsDesenvolvimento.tempoPorPrioridade.reduce((a, x) => a + x.minutos, 0)
                          const pct = total > 0 ? Math.round((e.minutos / total) * 100) : 0
                          return (
                            <div key={i} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1.5">
                                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: e.fill }} />
                                  {e.prioridade}
                                </span>
                                <span className="font-semibold">{pct}%</span>
                              </div>
                              <div className="h-1.5 w-full rounded-full bg-muted">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${pct}%` }}
                                  transition={{ duration: 0.8, delay: i * 0.1 }}
                                  className="h-1.5 rounded-full"
                                  style={{ background: e.fill }}
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* ════════════════ MODALS ════════════════ */}

      {/* Pause modal */}
      <PauseModal
        open={pauseModal.open}
        onClose={() => setPauseModal({ open: false, tarefaId: null })}
        onConfirm={confirmarPausa}
        title="Pausar Desenvolvimento"
        motivos={MOTIVOS_DEV}
        radioName="motivo-desenvolvimento"
      />

      {/* Import Conjunto modal */}
      <AnimatePresence>
        {importModal && (
          <ImportarConjuntoModal
            conjuntos={registeredConjuntos}
            onImportar={handleImportarConjunto}
            onClose={() => setImportModal(false)}
          />
        )}
      </AnimatePresence>

    </div>
    </PermissionGate>
  )
}
