'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Boxes,
  LayoutDashboard,
  Plus,
  Layers,
  GitBranch,
  FlaskConical,
  History,
  BarChart2,
  Scissors,
  FoldVertical,
  Flame,
  Paintbrush,
  Wrench,
  ChevronDown,
  ChevronRight,
  Trash2,
  Play,
  CheckCircle2,
  AlertTriangle,
  Package,
  TrendingUp,
  Clock,
  Zap,
  Search,
  Download,
  RefreshCw,
  Eye,
  TreePine,
  AlertCircle,
  Info,
  Star,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import { PageHeader }       from '@/components/shared/PageHeader'
import { PermissionGate }   from '@/components/shared/PermissionGate'
import { useAuth }          from '@/contexts/AuthContext'
import { useConjuntos }     from '@/contexts/ConjuntosContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button }  from '@/components/ui/button'
import { Input }   from '@/components/ui/input'
import { Label }   from '@/components/ui/label'
import { cn }      from '@/lib/utils'
import { toast }   from '@/lib/toast'
import { MATERIAIS } from '@/lib/constants'
import { mockAnalyticsConjuntos } from '@/mocks/conjuntos'
import type {
  Conjunto,
  PecaConjunto,
  StatusConjunto,
  CategoriaConjunto,
  PrioridadeConjunto,
  ResultadoSimulacao,
  NovoConjuntoInput,
} from '@/types/conjuntos'
import type { SetorProcesso } from '@/types/desenvolvimento'

// ─── Tab types ────────────────────────────────────────────────────────────────

type TabView = 'dashboard' | 'cadastro' | 'estrutura' | 'simulacao' | 'historico' | 'analises'

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#000080', '#0f4c5c', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

const PROCESS_ORDER: SetorProcesso[] = ['corte', 'dobra', 'solda', 'pintura', 'montagem']

const TABS: { id: TabView; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'dashboard',  label: 'Dashboard',     icon: LayoutDashboard },
  { id: 'cadastro',   label: 'Cadastro',       icon: Plus            },
  { id: 'estrutura',  label: 'Estrutura',      icon: TreePine        },
  { id: 'simulacao',  label: 'Simulação',      icon: FlaskConical    },
  { id: 'historico',  label: 'Histórico',      icon: History         },
  { id: 'analises',   label: 'Análises',       icon: BarChart2       },
]

const STATUS_CFG: Record<StatusConjunto, { label: string; color: string; bg: string; dot: string; pulse: boolean }> = {
  ativo:         { label: 'Ativo',        color: 'text-success',          bg: 'bg-success/10',      dot: 'bg-success',          pulse: false },
  inativo:       { label: 'Inativo',      color: 'text-muted-foreground', bg: 'bg-muted',           dot: 'bg-muted-foreground', pulse: false },
  em_revisao:    { label: 'Em Revisão',   color: 'text-warning',          bg: 'bg-warning/10',      dot: 'bg-warning',          pulse: true  },
  descontinuado: { label: 'Descontinuado',color: 'text-destructive',      bg: 'bg-destructive/10',  dot: 'bg-destructive',      pulse: false },
}

const PRIO_CFG: Record<PrioridadeConjunto, { label: string; color: string; bg: string }> = {
  alta:  { label: 'Alta',  color: 'text-destructive',      bg: 'bg-destructive/8' },
  media: { label: 'Média', color: 'text-warning',          bg: 'bg-warning/8'     },
  baixa: { label: 'Baixa', color: 'text-muted-foreground', bg: 'bg-muted'         },
}

const CATEGORIA_CFG: Record<CategoriaConjunto, { label: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  painel:    { label: 'Painel',    icon: Boxes      },
  estrutura: { label: 'Estrutura', icon: GitBranch  },
  gabinete:  { label: 'Gabinete',  icon: Package    },
  maquina:   { label: 'Máquina',   icon: Zap        },
  suporte:   { label: 'Suporte',   icon: Layers     },
  montagem:  { label: 'Montagem',  icon: Wrench     },
  outro:     { label: 'Outro',     icon: Boxes      },
}

const SETORES_CFG: Record<SetorProcesso, {
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string; bg: string; border: string; future?: boolean
}> = {
  corte:    { label: 'Corte',    icon: Scissors,     color: 'text-primary',          bg: 'bg-primary/10',     border: 'border-primary/30'          },
  dobra:    { label: 'Dobra',    icon: FoldVertical, color: 'text-accent',           bg: 'bg-accent/10',      border: 'border-accent/30'           },
  solda:    { label: 'Solda',    icon: Flame,        color: 'text-warning',          bg: 'bg-warning/10',     border: 'border-warning/30'          },
  pintura:  { label: 'Pintura',  icon: Paintbrush,   color: 'text-muted-foreground', bg: 'bg-muted',          border: 'border-border',   future: true },
  montagem: { label: 'Montagem', icon: Wrench,       color: 'text-muted-foreground', bg: 'bg-muted',          border: 'border-border',   future: true },
}

const RESPONSAVEIS = ['Carlos Mendes', 'Ana Lima', 'Roberto Silva', 'Fernanda Rocha', 'Paulo Santos', 'Marcos Oliveira']
const CATEGORIAS: CategoriaConjunto[] = ['painel', 'estrutura', 'gabinete', 'maquina', 'suporte', 'montagem', 'outro']

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusConjunto }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold', cfg.bg, cfg.color)}>
      <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', cfg.dot, cfg.pulse && 'animate-pulse')} />
      {cfg.label}
    </span>
  )
}

function PrioBadge({ prioridade }: { prioridade: PrioridadeConjunto }) {
  const cfg = PRIO_CFG[prioridade]
  return (
    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', cfg.bg, cfg.color)}>
      {cfg.label}
    </span>
  )
}

function SetorTag({ setor, size = 'sm' }: { setor: SetorProcesso; size?: 'sm' | 'xs' }) {
  const cfg = SETORES_CFG[setor]
  const Icon = cfg.icon
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold',
      size === 'sm' ? 'text-[10px]' : 'text-[9px]',
      cfg.bg, cfg.color, cfg.future && 'opacity-60'
    )}>
      <Icon size={size === 'sm' ? 9 : 8} />
      {cfg.label}
    </span>
  )
}

function SetorToggleBtn({
  setor, selected, onToggle,
}: { setor: SetorProcesso; selected: boolean; onToggle: (s: SetorProcesso) => void }) {
  const cfg = SETORES_CFG[setor]
  const Icon = cfg.icon
  return (
    <button
      type="button"
      onClick={() => onToggle(setor)}
      className={cn(
        'relative flex flex-col items-center gap-1.5 rounded-xl border p-2.5 text-xs font-semibold transition-all select-none',
        selected
          ? cn(cfg.bg, cfg.color, cfg.border, 'shadow-sm')
          : 'border-border text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground bg-card',
        cfg.future && 'opacity-60'
      )}
    >
      <Icon size={16} />
      <span className="text-[10px]">{cfg.label}</span>
      {cfg.future && <span className="absolute top-1 right-1 text-[8px] text-muted-foreground/60">Em breve</span>}
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

// ─── Assembly Card ────────────────────────────────────────────────────────────

function ConjuntoCard({
  conjunto, index, onVerEstrutura, onSimular, onExcluir, canEdit,
}: {
  conjunto: Conjunto
  index: number
  onVerEstrutura: (c: Conjunto) => void
  onSimular: (c: Conjunto) => void
  onExcluir: (id: string) => void
  canEdit: boolean
}) {
  const totalPecas = conjunto.pecas.reduce((s, p) => s + p.quantidade, 0)
  const allSetores = [...new Set(conjunto.pecas.flatMap((p) => p.processos))]
  const orderedSetores = PROCESS_ORDER.filter((s) => allSetores.includes(s))
  const CatIcon = CATEGORIA_CFG[conjunto.categoria].icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: 'easeOut' }}
      className="relative flex flex-col rounded-xl border border-border bg-card shadow-card overflow-hidden transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5"
    >
      {/* Status stripe */}
      <div className={cn('h-0.5 w-full', {
        'bg-success':          conjunto.status === 'ativo',
        'bg-muted-foreground': conjunto.status === 'inativo',
        'bg-warning':          conjunto.status === 'em_revisao',
        'bg-destructive':      conjunto.status === 'descontinuado',
      })} />

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header row */}
        <div className="flex items-start gap-2">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <CatIcon size={16} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-mono font-bold text-sm text-accent leading-none">{conjunto.codigo}</p>
            <p className="text-sm text-foreground mt-0.5 truncate">{conjunto.nome}</p>
          </div>
          <StatusBadge status={conjunto.status} />
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <span>{conjunto.cliente}</span>
          <span>·</span>
          <span>{conjunto.revisao}</span>
          <span>·</span>
          <PrioBadge prioridade={conjunto.prioridade} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-2.5">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-bold text-foreground">{conjunto.pecas.length}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">peças</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-bold text-foreground">{totalPecas}</span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">unidades</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-xs font-bold text-foreground">{conjunto.vezesProduzido}×</span>
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">produzido</span>
          </div>
        </div>

        {/* Setores */}
        <div className="flex flex-wrap gap-1">
          {orderedSetores.map((s) => <SetorTag key={s} setor={s} />)}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 gap-1.5 h-8 text-xs"
            onClick={() => onVerEstrutura(conjunto)}
          >
            <Eye size={12} />
            Estrutura
          </Button>
          <Button
            size="sm"
            className="flex-1 gap-1.5 h-8 text-xs bg-primary hover:bg-primary/90 text-white"
            onClick={() => onSimular(conjunto)}
          >
            <FlaskConical size={12} />
            Simular
          </Button>
          {canEdit && (
            <button
              onClick={() => onExcluir(conjunto.id)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Tree View ─────────────────────────────────────────────────────────────────

function PecaTreeRow({ peca, isLast }: { peca: PecaConjunto; isLast: boolean }) {
  const orderedSetores = PROCESS_ORDER.filter((s) => peca.processos.includes(s))
  return (
    <div className="flex items-stretch gap-0">
      {/* Tree lines */}
      <div className="flex w-8 flex-shrink-0 flex-col items-center">
        <div className="w-px flex-1 bg-border/60" />
        <div className="h-px w-4 bg-border/60" />
        {!isLast && <div className="w-px flex-1 bg-border/60" />}
        {isLast  && <div className="w-px flex-1 bg-transparent" />}
      </div>
      {/* Row content */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex-1 flex items-center gap-3 py-2 pr-2 group"
      >
        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-muted">
          <Package size={11} className="text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-xs text-accent">{peca.codigo}</span>
            <span className="text-xs text-foreground truncate">{peca.descricao}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground">{peca.material} · {peca.espessura}mm · {peca.pesoEstimado}kg</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex flex-wrap gap-0.5">
            {orderedSetores.map((s) => <SetorTag key={s} setor={s} size="xs" />)}
          </div>
          <span className="flex h-6 min-w-[28px] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
            {peca.quantidade}×
          </span>
        </div>
      </motion.div>
    </div>
  )
}

function ConjuntoTreeView({ conjunto }: { conjunto: Conjunto }) {
  const CatIcon = CATEGORIA_CFG[conjunto.categoria].icon
  const totalUnidades = conjunto.pecas.reduce((s, p) => s + p.quantidade, 0)
  const setores = [...new Set(conjunto.pecas.flatMap((p) => p.processos))]
  const orderedSetores = PROCESS_ORDER.filter((s) => setores.includes(s))
  const pesoTotal = conjunto.pecas.reduce((s, p) => s + p.pesoEstimado * p.quantidade, 0)

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Root node */}
      <div className="flex items-center gap-3 p-4 border-b border-border bg-muted/30">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <CatIcon size={18} className="text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-mono font-bold text-base text-accent leading-none">{conjunto.codigo}</p>
            <StatusBadge status={conjunto.status} />
            <PrioBadge prioridade={conjunto.prioridade} />
          </div>
          <p className="text-sm text-foreground mt-0.5">{conjunto.nome}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{conjunto.cliente} · {conjunto.revisao}</p>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1 text-xs text-muted-foreground text-right">
          <span><strong className="text-foreground">{conjunto.pecas.length}</strong> tipos de peça</span>
          <span><strong className="text-foreground">{totalUnidades}</strong> unidades totais</span>
          <span><strong className="text-foreground">{pesoTotal.toFixed(2)} kg</strong> estimado</span>
        </div>
      </div>

      {/* Summary tags */}
      <div className="flex flex-wrap gap-1 px-4 py-2 border-b border-border bg-muted/10">
        {orderedSetores.map((s) => <SetorTag key={s} setor={s} />)}
      </div>

      {/* Piece rows */}
      <div className="px-2 py-3">
        {conjunto.pecas.map((peca, i) => (
          <PecaTreeRow
            key={peca.id}
            peca={peca}
            isLast={i === conjunto.pecas.length - 1}
          />
        ))}
        {conjunto.pecas.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhuma peça cadastrada</p>
        )}
      </div>
    </div>
  )
}

// ─── Simulation Result ────────────────────────────────────────────────────────

function SimulacaoResult({ resultado }: { resultado: ResultadoSimulacao }) {
  const itemsEstoque  = resultado.itens.filter((i) => i.quantidadeDisponivel > 0)
  const itemsProduzir = resultado.itens.filter((i) => i.quantidadeProduzir   > 0)

  const tempoH = Math.floor(resultado.tempoEstimadoMinutos / 60)
  const tempoM = resultado.tempoEstimadoMinutos % 60
  const tempoLabel = tempoH > 0 ? `~${tempoH}h ${tempoM}min` : `~${tempoM}min`

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Peças distintas',   value: resultado.totalPecasDistintas,     icon: Package,     color: 'text-primary',     bg: 'bg-primary/10',     ring: 'ring-primary/20'     },
          { label: 'Unidades totais',   value: resultado.totalUnidadesNecessarias, icon: Layers,      color: 'text-accent',      bg: 'bg-accent/10',      ring: 'ring-accent/20'      },
          { label: 'Em estoque',        value: resultado.totalUnidadesEstoque,     icon: CheckCircle2,color: 'text-success',     bg: 'bg-success/10',     ring: 'ring-success/20'     },
          { label: 'A produzir',        value: resultado.totalUnidadesProduzir,    icon: Zap,         color: 'text-warning',     bg: 'bg-warning/10',     ring: 'ring-warning/20'     },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.07 }}
            className={cn('rounded-xl border border-border bg-card p-4 shadow-card ring-1', kpi.ring)}
          >
            <div className={cn('mb-2 flex h-8 w-8 items-center justify-center rounded-lg', kpi.bg)}>
              <kpi.icon size={15} className={kpi.color} />
            </div>
            <p className={cn('text-xl font-bold', kpi.color)}>{kpi.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Stock usage bar */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <TrendingUp size={14} className="text-success" />
            Aproveitamento de Estoque
          </span>
          <span className={cn(
            'font-bold text-lg',
            resultado.percentualAproveitamento >= 70 ? 'text-success' :
            resultado.percentualAproveitamento >= 40 ? 'text-warning' : 'text-destructive'
          )}>
            {resultado.percentualAproveitamento}%
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${resultado.percentualAproveitamento}%` }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.3 }}
            className={cn('h-full rounded-full', {
              'bg-success': resultado.percentualAproveitamento >= 70,
              'bg-warning': resultado.percentualAproveitamento >= 40 && resultado.percentualAproveitamento < 70,
              'bg-destructive': resultado.percentualAproveitamento < 40,
            })}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {resultado.totalUnidadesEstoque} de {resultado.totalUnidadesNecessarias} unidades disponíveis em estoque —{' '}
          {resultado.totalUnidadesProduzir > 0
            ? `${resultado.totalUnidadesProduzir} precisam ser fabricadas`
            : 'nenhuma produção necessária!'}
        </p>
      </div>

      {/* Tables */}
      <div className="grid gap-4 lg:grid-cols-2">

        {/* Available from stock */}
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-success">
            <CheckCircle2 size={15} />
            Disponível em Estoque ({resultado.totalUnidadesEstoque} unidades)
          </h3>
          {itemsEstoque.length === 0 ? (
            <div className="rounded-xl border border-border bg-muted/30 p-6 text-center text-xs text-muted-foreground">
              Nenhuma peça disponível em estoque
            </div>
          ) : (
            <div className="rounded-xl border border-success/20 bg-success/5 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-success/20 bg-success/10">
                    <th className="px-3 py-2 text-left font-semibold text-success">Código</th>
                    <th className="px-3 py-2 text-left font-semibold text-success">Descrição</th>
                    <th className="px-3 py-2 text-right font-semibold text-success">Necessário</th>
                    <th className="px-3 py-2 text-right font-semibold text-success">Estoque</th>
                    <th className="px-3 py-2 text-right font-semibold text-success">Usar</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsEstoque.map((item) => (
                    <tr key={item.pecaId} className="border-b border-success/10 last:border-0">
                      <td className="px-3 py-2 font-mono font-semibold text-success">{item.codigo}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.descricao}</td>
                      <td className="px-3 py-2 text-right text-foreground">{item.quantidadeNecessaria}</td>
                      <td className="px-3 py-2 text-right text-success font-medium">{item.quantidadeEstoque}</td>
                      <td className="px-3 py-2 text-right font-bold text-success">{item.quantidadeDisponivel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Needs production */}
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-warning">
            <Zap size={15} />
            Necessita Produção ({resultado.totalUnidadesProduzir} unidades)
          </h3>
          {itemsProduzir.length === 0 ? (
            <div className="rounded-xl border border-success/20 bg-success/5 p-6 text-center">
              <CheckCircle2 size={24} className="mx-auto text-success mb-2" />
              <p className="text-xs font-semibold text-success">Tudo disponível em estoque!</p>
              <p className="text-xs text-muted-foreground mt-1">Nenhuma peça precisa ser fabricada</p>
            </div>
          ) : (
            <div className="rounded-xl border border-warning/20 bg-warning/5 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-warning/20 bg-warning/10">
                    <th className="px-3 py-2 text-left font-semibold text-warning">Código</th>
                    <th className="px-3 py-2 text-left font-semibold text-warning">Descrição</th>
                    <th className="px-3 py-2 text-right font-semibold text-warning">Necessário</th>
                    <th className="px-3 py-2 text-right font-semibold text-warning">Estoque</th>
                    <th className="px-3 py-2 text-right font-semibold text-warning">Produzir</th>
                    <th className="px-3 py-2 text-left font-semibold text-warning">Setores</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsProduzir.map((item) => (
                    <tr key={item.pecaId} className="border-b border-warning/10 last:border-0">
                      <td className="px-3 py-2 font-mono font-semibold text-warning">{item.codigo}</td>
                      <td className="px-3 py-2 text-muted-foreground">{item.descricao}</td>
                      <td className="px-3 py-2 text-right text-foreground">{item.quantidadeNecessaria}</td>
                      <td className="px-3 py-2 text-right text-muted-foreground">{item.quantidadeEstoque}</td>
                      <td className="px-3 py-2 text-right font-bold text-warning">{item.quantidadeProduzir}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-0.5">
                          {PROCESS_ORDER.filter((s) => item.processos.includes(s)).map((s) => (
                            <SetorTag key={s} setor={s} size="xs" />
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Footer summary */}
      <div className="rounded-xl border border-border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resumo da Produção</p>
            <div className="flex flex-wrap gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <Clock size={12} className="text-accent" />
                <span className="text-muted-foreground">Tempo estimado:</span>
                <strong className="text-foreground">{tempoLabel}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Package size={12} className="text-accent" />
                <span className="text-muted-foreground">Peso a produzir:</span>
                <strong className="text-foreground">{resultado.pesoEstimadoTotal.toFixed(2)} kg</strong>
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {resultado.setoresEnvolvidos.map((s) => <SetorTag key={s} setor={s} />)}
              {resultado.setoresEnvolvidos.length === 0 && (
                <span className="text-xs text-muted-foreground">Nenhum setor envolvido na produção</span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button
              size="sm"
              className="gap-1.5 bg-success/80 hover:bg-success/70 text-white cursor-not-allowed opacity-60"
              disabled
            >
              <Play size={12} />
              Enviar para Produção
            </Button>
            <p className="text-[10px] text-muted-foreground">Integração em desenvolvimento</p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConjuntosPage() {
  const { canEdit } = useAuth()
  const { conjuntos, historico, criarConjunto, excluirConjunto, executarSimulacao } = useConjuntos()

  const [activeTab, setActiveTab] = useState<TabView>('dashboard')

  // Estrutura tab
  const [selectedConjuntoId, setSelectedConjuntoId] = useState<string>(conjuntos[0]?.id ?? '')

  // Simulação tab
  const [simConjuntoId, setSimConjuntoId] = useState<string>(conjuntos[0]?.id ?? '')
  const [simQtd, setSimQtd] = useState(1)
  const [simResult, setSimResult] = useState<ResultadoSimulacao | null>(null)
  const [simLoading, setSimLoading] = useState(false)

  // Histórico tab
  const [searchHistorico, setSearchHistorico] = useState('')

  // Cadastro tab — form state
  const [showForm, setShowForm] = useState(false)
  const [conjForm, setConjForm] = useState<{
    codigo: string; nome: string; cliente: string; categoria: CategoriaConjunto
    revisao: string; prioridade: PrioridadeConjunto; observacoesTecnicas: string; responsavel: string
  }>({
    codigo: '', nome: '', cliente: '', categoria: 'painel',
    revisao: 'Rev. 01', prioridade: 'media', observacoesTecnicas: '', responsavel: '',
  })
  const [formPecas, setFormPecas] = useState<Omit<PecaConjunto, 'id'>[]>([])
  const [novaPeca, setNovaPeca] = useState<Omit<PecaConjunto, 'id'>>({
    codigo: '', descricao: '', quantidade: 1, material: 'Aço Carbono 1020',
    espessura: 3.0, pesoEstimado: 1.0, observacoes: '', processos: [],
  })
  const [expandedFormTree, setExpandedFormTree] = useState(true)

  // ── Derived ─────────────────────────────────────────────────────────────────

  const selectedConjunto = useMemo(
    () => conjuntos.find((c) => c.id === selectedConjuntoId) ?? conjuntos[0],
    [conjuntos, selectedConjuntoId]
  )

  const simConjunto = useMemo(
    () => conjuntos.find((c) => c.id === simConjuntoId) ?? conjuntos[0],
    [conjuntos, simConjuntoId]
  )

  const filteredHistorico = useMemo(
    () => historico.filter((h) => {
      const q = searchHistorico.toLowerCase()
      return !q || h.codigo.toLowerCase().includes(q) ||
        h.nome.toLowerCase().includes(q) ||
        h.cliente.toLowerCase().includes(q)
    }).sort((a, b) => b.data.getTime() - a.data.getTime()),
    [historico, searchHistorico]
  )

  const dashKpis = useMemo(() => {
    const ativos = conjuntos.filter((c) => c.status === 'ativo').length
    const totalPecas = conjuntos.reduce((s, c) => s + c.pecas.length, 0)
    const maisUsado = [...conjuntos].sort((a, b) => b.vezesProduzido - a.vezesProduzido)[0]
    const economiaTotalUnidades = historico.reduce((s, h) => s + h.quantidadeEconomizadaEstoque, 0)
    return { total: conjuntos.length, ativos, totalPecas, maisUsado, economiaTotalUnidades }
  }, [conjuntos, historico])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const togglePecaSetor = useCallback((setor: SetorProcesso) => {
    setNovaPeca((f) => ({
      ...f,
      processos: f.processos.includes(setor) ? f.processos.filter((s) => s !== setor) : [...f.processos, setor],
    }))
  }, [])

  const handleAddPeca = useCallback(() => {
    if (!novaPeca.codigo.trim() || !novaPeca.descricao.trim()) {
      toast('error', 'Preencha código e descrição da peça')
      return
    }
    setFormPecas((prev) => [...prev, { ...novaPeca }])
    setNovaPeca({ codigo: '', descricao: '', quantidade: 1, material: 'Aço Carbono 1020', espessura: 3.0, pesoEstimado: 1.0, observacoes: '', processos: [] })
    toast('success', 'Peça adicionada')
  }, [novaPeca])

  const handleSubmitConjunto = useCallback(() => {
    if (!conjForm.codigo.trim() || !conjForm.nome.trim() || !conjForm.cliente.trim()) {
      toast('error', 'Preencha os campos obrigatórios (Código, Nome e Cliente)')
      return
    }
    if (formPecas.length === 0) {
      toast('error', 'Adicione ao menos uma peça')
      return
    }
    const input: NovoConjuntoInput = { ...conjForm, pecas: formPecas }
    criarConjunto(input)
    // Reset
    setConjForm({ codigo: '', nome: '', cliente: '', categoria: 'painel', revisao: 'Rev. 01', prioridade: 'media', observacoesTecnicas: '', responsavel: '' })
    setFormPecas([])
    setNovaPeca({ codigo: '', descricao: '', quantidade: 1, material: 'Aço Carbono 1020', espessura: 3.0, pesoEstimado: 1.0, observacoes: '', processos: [] })
    setShowForm(false)
    toast('success', 'Conjunto criado com sucesso!')
  }, [conjForm, formPecas, criarConjunto])

  const handleVerEstrutura = useCallback((c: Conjunto) => {
    setSelectedConjuntoId(c.id)
    setActiveTab('estrutura')
  }, [])

  const handleSimularFromCard = useCallback((c: Conjunto) => {
    setSimConjuntoId(c.id)
    setSimResult(null)
    setActiveTab('simulacao')
  }, [])

  const handleExcluir = useCallback((id: string) => {
    excluirConjunto(id)
    toast('warning', 'Conjunto removido')
  }, [excluirConjunto])

  const handleExecutarSimulacao = useCallback(() => {
    if (!simConjunto || simQtd <= 0) return
    setSimLoading(true)
    setSimResult(null)
    // Simulate async delay for UX
    setTimeout(() => {
      const res = executarSimulacao(simConjunto.id, simQtd)
      setSimResult(res)
      setSimLoading(false)
    }, 600)
  }, [simConjunto, simQtd, executarSimulacao])

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <PermissionGate module="conjuntos">
    <div className="space-y-6">

      <PageHeader
        title="Conjuntos"
        subtitle="Montagens industriais e simulação de produção"
        breadcrumbs={[{ label: 'Início', href: '/dashboard' }, { label: 'Conjuntos' }]}
        actions={
          canEdit('conjuntos') ? (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => { setShowForm(true); setActiveTab('cadastro') }}
            >
              <Plus size={14} />
              Novo Conjunto
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
                {[
                  { label: 'Total de conjuntos',     value: dashKpis.total,                icon: Boxes,       bg: 'bg-primary/10',     color: 'text-primary',     ring: 'ring-primary/20'     },
                  { label: 'Conjuntos ativos',        value: dashKpis.ativos,               icon: CheckCircle2,bg: 'bg-success/10',     color: 'text-success',     ring: 'ring-success/20'     },
                  { label: 'Tipos de peças vinculadas',value: dashKpis.totalPecas,           icon: Package,     bg: 'bg-accent/10',      color: 'text-accent',      ring: 'ring-accent/20'      },
                  { label: 'Mais produzido',          value: dashKpis.maisUsado?.codigo ?? '—', icon: Star,    bg: 'bg-warning/10',     color: 'text-warning',     ring: 'ring-warning/20'     },
                  { label: 'Unidades econ. via estoque',value: dashKpis.economiaTotalUnidades, icon: TrendingUp,bg: 'bg-success/10',  color: 'text-success',     ring: 'ring-success/20'     },
                ].map((kpi, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="group rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5"
                  >
                    <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl ring-4 transition-transform group-hover:scale-105', kpi.bg, kpi.color, kpi.ring)}>
                      <kpi.icon size={16} />
                    </div>
                    <p className="text-xl font-bold tracking-tight text-foreground">{kpi.value}</p>
                    <p className="mt-0.5 text-xs font-medium text-muted-foreground">{kpi.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Charts row 1 */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Uso por Conjunto</CardTitle>
                    <CardDescription className="text-xs">Quantidade de vezes produzido</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={mockAnalyticsConjuntos.usoPorConjunto} margin={{ left: 0, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                        <XAxis dataKey="nome" tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v} usos`, 'Produções']} />
                        <Bar dataKey="usos" radius={[4, 4, 0, 0]}>
                          {mockAnalyticsConjuntos.usoPorConjunto.map((e, i) => (
                            <Cell key={i} fill={e.fill ?? CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Economia Mensal via Estoque</CardTitle>
                    <CardDescription className="text-xs">Peças economizadas vs. produzidas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={mockAnalyticsConjuntos.economiaEstoqueMensal} margin={{ left: 0, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="economizadas" name="Economizadas" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="produzidas"   name="Produzidas"   stroke="#000080" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Charts row 2 */}
              <div className="grid gap-4 lg:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Distribuição por Categoria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="55%" height={160}>
                        <PieChart>
                          <Pie data={mockAnalyticsConjuntos.distribuicaoCategoria} dataKey="count" cx="50%" cy="50%" innerRadius={38} outerRadius={65} paddingAngle={3}>
                            {mockAnalyticsConjuntos.distribuicaoCategoria.map((e, i) => (
                              <Cell key={i} fill={e.fill} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-1.5">
                        {mockAnalyticsConjuntos.distribuicaoCategoria.map((e, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: e.fill }} />
                            <span className="text-muted-foreground">{e.categoria}</span>
                            <span className="ml-auto font-bold text-foreground">{e.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Setores Mais Utilizados</CardTitle>
                    <CardDescription className="text-xs">Frequência por setor de produção</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={mockAnalyticsConjuntos.setoresMaisUsados} layout="vertical" margin={{ left: 8, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="setor" tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} width={68} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v} peças`, 'Uso']} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          {mockAnalyticsConjuntos.setoresMaisUsados.map((e, i) => (
                            <Cell key={i} fill={e.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Conjuntos quick list */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Conjuntos Cadastrados</CardTitle>
                  <CardDescription className="text-xs">Visão geral rápida</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="pb-2 text-left font-semibold text-muted-foreground uppercase tracking-wide">Código</th>
                          <th className="pb-2 text-left font-semibold text-muted-foreground uppercase tracking-wide">Nome</th>
                          <th className="pb-2 text-left font-semibold text-muted-foreground uppercase tracking-wide">Cliente</th>
                          <th className="pb-2 text-left font-semibold text-muted-foreground uppercase tracking-wide">Peças</th>
                          <th className="pb-2 text-left font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                          <th className="pb-2 text-left font-semibold text-muted-foreground uppercase tracking-wide">Produções</th>
                        </tr>
                      </thead>
                      <tbody>
                        {conjuntos.map((c) => (
                          <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                            <td className="py-2.5 pr-3 font-mono font-semibold text-accent">{c.codigo}</td>
                            <td className="py-2.5 pr-3">{c.nome}</td>
                            <td className="py-2.5 pr-3 text-muted-foreground">{c.cliente}</td>
                            <td className="py-2.5 pr-3 font-semibold">{c.pecas.length}</td>
                            <td className="py-2.5 pr-3"><StatusBadge status={c.status} /></td>
                            <td className="py-2.5 text-muted-foreground">{c.vezesProduzido}×</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

            </div>
          </motion.div>
        )}

        {/* ════════════════ CADASTRO ════════════════ */}
        {activeTab === 'cadastro' && (
          <motion.div key="cadastro" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <div className="space-y-6">

              {/* Header */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {conjuntos.length} conjunto{conjuntos.length !== 1 ? 's' : ''} cadastrado{conjuntos.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Gerencie montagens industriais completas</p>
                </div>
                {canEdit('conjuntos') && (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setShowForm((v) => !v)}
                  >
                    <Plus size={14} />
                    {showForm ? 'Cancelar' : 'Novo Conjunto'}
                  </Button>
                )}
              </div>

              {/* Form */}
              <AnimatePresence>
                {showForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="max-w-4xl space-y-5 pb-2">

                      {/* General info */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Informações Gerais</CardTitle>
                          <CardDescription className="text-xs">Identifique o conjunto industrial</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold uppercase tracking-wider">Código *</Label>
                              <Input placeholder="PAINEL-800" value={conjForm.codigo} onChange={(e) => setConjForm((f) => ({ ...f, codigo: e.target.value }))} className="font-mono" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold uppercase tracking-wider">Nome *</Label>
                              <Input placeholder="Painel Elétrico 800x600" value={conjForm.nome} onChange={(e) => setConjForm((f) => ({ ...f, nome: e.target.value }))} />
                            </div>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold uppercase tracking-wider">Cliente *</Label>
                              <Input placeholder="Nome do cliente" value={conjForm.cliente} onChange={(e) => setConjForm((f) => ({ ...f, cliente: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold uppercase tracking-wider">Revisão</Label>
                              <Input placeholder="Rev. 01" value={conjForm.revisao} onChange={(e) => setConjForm((f) => ({ ...f, revisao: e.target.value }))} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold uppercase tracking-wider">Responsável</Label>
                              <select
                                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:border-accent"
                                value={conjForm.responsavel}
                                onChange={(e) => setConjForm((f) => ({ ...f, responsavel: e.target.value }))}
                              >
                                <option value="">Selecionar...</option>
                                {RESPONSAVEIS.map((r) => <option key={r} value={r}>{r}</option>)}
                              </select>
                            </div>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold uppercase tracking-wider">Categoria</Label>
                              <div className="grid grid-cols-4 gap-1.5">
                                {CATEGORIAS.map((cat) => {
                                  const cfg = CATEGORIA_CFG[cat]
                                  const Icon = cfg.icon
                                  return (
                                    <button
                                      key={cat}
                                      type="button"
                                      onClick={() => setConjForm((f) => ({ ...f, categoria: cat }))}
                                      className={cn(
                                        'flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px] font-semibold transition-all',
                                        conjForm.categoria === cat
                                          ? 'border-primary bg-primary/10 text-primary'
                                          : 'border-border text-muted-foreground hover:text-foreground'
                                      )}
                                    >
                                      <Icon size={14} />
                                      {cfg.label}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold uppercase tracking-wider">Prioridade Padrão</Label>
                              <div className="flex gap-2">
                                {(['alta', 'media', 'baixa'] as const).map((p) => {
                                  const cfg = PRIO_CFG[p]
                                  return (
                                    <button
                                      key={p}
                                      type="button"
                                      onClick={() => setConjForm((f) => ({ ...f, prioridade: p }))}
                                      className={cn(
                                        'flex-1 rounded-lg border px-2 py-2.5 text-xs font-semibold transition-all',
                                        conjForm.prioridade === p ? cn('border-current', cfg.bg, cfg.color) : 'border-border text-muted-foreground hover:text-foreground'
                                      )}
                                    >
                                      {cfg.label}
                                    </button>
                                  )
                                })}
                              </div>
                              <div className="space-y-1.5 mt-3">
                                <Label className="text-xs font-semibold uppercase tracking-wider">Observações Técnicas</Label>
                                <textarea
                                  rows={3}
                                  placeholder="Referências técnicas, materiais especiais, acabamentos..."
                                  value={conjForm.observacoesTecnicas}
                                  onChange={(e) => setConjForm((f) => ({ ...f, observacoesTecnicas: e.target.value }))}
                                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:border-accent"
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Piece builder */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Estrutura de Peças</CardTitle>
                          <CardDescription className="text-xs">Defina cada peça que compõe o conjunto</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold uppercase tracking-wider">Código *</Label>
                              <Input placeholder="LAT-E-001" value={novaPeca.codigo} onChange={(e) => setNovaPeca((f) => ({ ...f, codigo: e.target.value }))} className="font-mono" />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold uppercase tracking-wider">Descrição *</Label>
                              <Input placeholder="Lateral Esquerda 800x600" value={novaPeca.descricao} onChange={(e) => setNovaPeca((f) => ({ ...f, descricao: e.target.value }))} />
                            </div>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold uppercase tracking-wider">Qtd / Conj.</Label>
                              <Input type="number" min={1} value={novaPeca.quantidade} onChange={(e) => setNovaPeca((f) => ({ ...f, quantidade: parseInt(e.target.value) || 1 }))} />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                              <Label className="text-xs font-semibold uppercase tracking-wider">Material</Label>
                              <select
                                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:border-accent"
                                value={novaPeca.material}
                                onChange={(e) => setNovaPeca((f) => ({ ...f, material: e.target.value }))}
                              >
                                {MATERIAIS.map((m) => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold uppercase tracking-wider">Esp. (mm)</Label>
                              <Input type="number" step="0.1" min={0.1} value={novaPeca.espessura} onChange={(e) => setNovaPeca((f) => ({ ...f, espessura: parseFloat(e.target.value) || 1 }))} />
                            </div>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold uppercase tracking-wider">Peso Est. (kg)</Label>
                              <Input type="number" step="0.01" min={0} value={novaPeca.pesoEstimado} onChange={(e) => setNovaPeca((f) => ({ ...f, pesoEstimado: parseFloat(e.target.value) || 0 }))} />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs font-semibold uppercase tracking-wider">Observações</Label>
                              <Input placeholder="Dobra 90°, furação M8..." value={novaPeca.observacoes} onChange={(e) => setNovaPeca((f) => ({ ...f, observacoes: e.target.value }))} />
                            </div>
                          </div>
                          {/* Process selection */}
                          <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase tracking-wider">Setores / Processos</Label>
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                              {PROCESS_ORDER.map((s) => (
                                <SetorToggleBtn
                                  key={s}
                                  setor={s}
                                  selected={novaPeca.processos.includes(s)}
                                  onToggle={togglePecaSetor}
                                />
                              ))}
                            </div>
                          </div>
                          <Button variant="outline" className="w-full gap-1.5" onClick={handleAddPeca}>
                            <Plus size={14} />
                            Adicionar Peça ao Conjunto
                          </Button>
                        </CardContent>
                      </Card>

                      {/* Live tree preview */}
                      {formPecas.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <CardTitle className="text-sm">Pré-visualização da Estrutura</CardTitle>
                                <CardDescription className="text-xs">{formPecas.length} peça(s) adicionada(s)</CardDescription>
                              </div>
                              <button
                                type="button"
                                onClick={() => setExpandedFormTree((v) => !v)}
                                className="text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <ChevronDown size={16} className={cn('transition-transform', !expandedFormTree && '-rotate-90')} />
                              </button>
                            </div>
                          </CardHeader>
                          <AnimatePresence initial={false}>
                            {expandedFormTree && (
                              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                <CardContent>
                                  {/* Root preview */}
                                  <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-muted/40 border border-border">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                                      {(() => { const Icon = CATEGORIA_CFG[conjForm.categoria].icon; return <Icon size={15} className="text-primary" /> })()}
                                    </div>
                                    <div>
                                      <p className="font-mono font-bold text-sm text-accent">{conjForm.codigo || '(código)'}</p>
                                      <p className="text-xs text-muted-foreground">{conjForm.nome || '(nome)'}</p>
                                    </div>
                                    <span className="ml-auto text-xs text-muted-foreground">{formPecas.length} peças</span>
                                  </div>
                                  {/* Piece rows */}
                                  <div className="space-y-0">
                                    {formPecas.map((p, i) => {
                                      return (
                                        <div key={i} className="flex items-center gap-0">
                                          <div className="flex w-8 flex-shrink-0 flex-col items-center">
                                            <div className="w-px flex-1 bg-border/60" />
                                            <div className="h-px w-4 bg-border/60" />
                                            {i < formPecas.length - 1
                                              ? <div className="w-px flex-1 bg-border/60" />
                                              : <div className="w-px flex-1 bg-transparent" />
                                            }
                                          </div>
                                          <div className="flex-1 flex items-center gap-2 py-1.5 min-w-0">
                                            <span className="font-mono font-bold text-xs text-accent">{p.codigo}</span>
                                            <span className="text-xs text-muted-foreground truncate">{p.descricao}</span>
                                            <span className="ml-auto flex-shrink-0 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">{p.quantidade}×</span>
                                            <button
                                              type="button"
                                              onClick={() => setFormPecas((prev) => prev.filter((_, idx) => idx !== i))}
                                              className="flex-shrink-0 rounded p-0.5 text-muted-foreground hover:text-destructive transition-colors"
                                            >
                                              <Trash2 size={11} />
                                            </button>
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </CardContent>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </Card>
                      )}

                      {/* Actions */}
                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => { setShowForm(false); setFormPecas([]) }}>
                          Cancelar
                        </Button>
                        <Button className="gap-1.5 bg-success hover:bg-success/90 text-white" onClick={handleSubmitConjunto}>
                          <CheckCircle2 size={14} />
                          Criar Conjunto
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Existing assemblies grid */}
              {conjuntos.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {conjuntos.map((c, i) => (
                    <ConjuntoCard
                      key={c.id}
                      conjunto={c}
                      index={i}
                      onVerEstrutura={handleVerEstrutura}
                      onSimular={handleSimularFromCard}
                      onExcluir={handleExcluir}
                      canEdit={canEdit('conjuntos')}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-16 text-center">
                  <Boxes size={36} className="mx-auto text-muted-foreground/40 mb-4" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhum conjunto cadastrado</p>
                  <p className="text-xs text-muted-foreground/60 mt-1 mb-4">Crie seu primeiro conjunto industrial</p>
                  <Button size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
                    <Plus size={13} /> Criar Conjunto
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ════════════════ ESTRUTURA ════════════════ */}
        {activeTab === 'estrutura' && (
          <motion.div key="estrutura" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <div className="space-y-5">

              {/* Selector */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex items-center gap-3 flex-1">
                  <TreePine size={16} className="text-primary flex-shrink-0" />
                  <div className="space-y-1 flex-1">
                    <Label className="text-xs font-semibold uppercase tracking-wider">Conjunto</Label>
                    <select
                      className="h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:border-accent"
                      value={selectedConjuntoId}
                      onChange={(e) => setSelectedConjuntoId(e.target.value)}
                    >
                      {conjuntos.map((c) => (
                        <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {selectedConjunto && (
                  <Button
                    size="sm"
                    className="gap-1.5 flex-shrink-0"
                    onClick={() => handleSimularFromCard(selectedConjunto)}
                  >
                    <FlaskConical size={13} />
                    Simular Produção
                  </Button>
                )}
              </div>

              {/* Summary cards */}
              {selectedConjunto && (() => {
                const totalUnids = selectedConjunto.pecas.reduce((s, p) => s + p.quantidade, 0)
                const pesoTotal = selectedConjunto.pecas.reduce((s, p) => s + p.pesoEstimado * p.quantidade, 0)
                const tempoEst = totalUnids * 15
                const tempoH = Math.floor(tempoEst / 60)
                const tempoM = tempoEst % 60

                return (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: 'Tipos de peça',    value: selectedConjunto.pecas.length, icon: Package,    color: 'text-primary',  bg: 'bg-primary/10'  },
                      { label: 'Total de unidades', value: totalUnids,                    icon: Layers,     color: 'text-accent',   bg: 'bg-accent/10'   },
                      { label: 'Peso estimado',     value: `${pesoTotal.toFixed(2)} kg`,  icon: TrendingUp, color: 'text-success',  bg: 'bg-success/10'  },
                      { label: 'Tempo estimado',    value: tempoH > 0 ? `~${tempoH}h ${tempoM}min` : `~${tempoM}min`, icon: Clock, color: 'text-warning', bg: 'bg-warning/10'  },
                    ].map((kpi, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="rounded-xl border border-border bg-card p-3 shadow-card"
                      >
                        <div className={cn('mb-2 flex h-7 w-7 items-center justify-center rounded-lg', kpi.bg)}>
                          <kpi.icon size={13} className={kpi.color} />
                        </div>
                        <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                        <p className="text-xs text-muted-foreground">{kpi.label}</p>
                      </motion.div>
                    ))}
                  </div>
                )
              })()}

              {/* Tree */}
              {selectedConjunto && <ConjuntoTreeView conjunto={selectedConjunto} />}

              {/* Sector flow */}
              {selectedConjunto && (() => {
                const setores = [...new Set(selectedConjunto.pecas.flatMap((p) => p.processos))]
                const ordSetores = PROCESS_ORDER.filter((s) => setores.includes(s))
                if (ordSetores.length === 0) return null
                return (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Fluxo de Produção</CardTitle>
                      <CardDescription className="text-xs">Setores envolvidos neste conjunto</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
                        {[
                          { label: 'Desenvolvimento', color: 'text-primary',  bg: 'bg-primary/10',  border: 'border-primary/30',  Icon: Boxes   },
                          { label: 'Programação',      color: 'text-accent',   bg: 'bg-accent/10',   border: 'border-accent/30',   Icon: BarChart2 },
                          ...ordSetores.map((s) => {
                            const cfg = SETORES_CFG[s]
                            return { label: cfg.label, color: cfg.color, bg: cfg.bg, border: cfg.border, Icon: cfg.icon }
                          }),
                          { label: 'Finalizado', color: 'text-success', bg: 'bg-success/10', border: 'border-success/30', Icon: CheckCircle2 },
                        ].map((step, i, arr) => (
                          <React.Fragment key={i}>
                            <div className={cn('flex items-center gap-2 rounded-lg border px-3 py-2', step.bg, step.border)}>
                              <step.Icon size={13} className={step.color} />
                              <span className={cn('text-xs font-semibold', step.color)}>{step.label}</span>
                            </div>
                            {i < arr.length - 1 && <ChevronRight size={14} className="text-muted-foreground/50 hidden sm:block flex-shrink-0" />}
                          </React.Fragment>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })()}

              {/* Technical notes */}
              {selectedConjunto?.observacoesTecnicas && (
                <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-4">
                  <Info size={15} className="text-accent flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-1">Observações Técnicas</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedConjunto.observacoesTecnicas}</p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ════════════════ SIMULAÇÃO ════════════════ */}
        {activeTab === 'simulacao' && (
          <motion.div key="simulacao" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <div className="space-y-5">

              {/* Intro */}
              <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <FlaskConical size={16} className="text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Simulador de Produção</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Selecione um conjunto, informe a quantidade e execute a simulação para visualizar
                    exatamente o que já está em estoque e o que precisa ser fabricado.
                  </p>
                </div>
              </div>

              {/* Selection card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Configurar Simulação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="flex-1 space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider">Conjunto</Label>
                      <select
                        className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:border-accent"
                        value={simConjuntoId}
                        onChange={(e) => { setSimConjuntoId(e.target.value); setSimResult(null) }}
                      >
                        {conjuntos.map((c) => (
                          <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:w-36 space-y-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider">Quantidade</Label>
                      <Input
                        type="number"
                        min={1}
                        max={999}
                        value={simQtd}
                        onChange={(e) => { setSimQtd(Math.max(1, parseInt(e.target.value) || 1)); setSimResult(null) }}
                        className="h-10"
                      />
                    </div>
                    <Button
                      className="gap-2 h-10 bg-primary hover:bg-primary/90 text-white px-6 flex-shrink-0"
                      onClick={handleExecutarSimulacao}
                      disabled={simLoading}
                    >
                      {simLoading ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <FlaskConical size={14} />
                      )}
                      {simLoading ? 'Simulando...' : 'Executar Simulação'}
                    </Button>
                  </div>

                  {/* Preview of selected conjunto */}
                  {simConjunto && (
                    <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-mono font-bold text-sm text-accent">{simConjunto.codigo}</p>
                        <span className="text-xs text-muted-foreground">{simConjunto.nome}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{simConjunto.pecas.length} tipos de peça</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-foreground font-medium">
                          {simConjunto.pecas.reduce((s, p) => s + p.quantidade, 0)} unidades por conjunto →
                          {' '}<strong>{simConjunto.pecas.reduce((s, p) => s + p.quantidade, 0) * simQtd}</strong> unidades totais
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Simulation result */}
              {simResult && <SimulacaoResult resultado={simResult} />}

              {/* Empty state */}
              {!simResult && !simLoading && (
                <div className="rounded-xl border border-dashed border-border bg-muted/20 p-12 text-center">
                  <FlaskConical size={36} className="mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Aguardando simulação</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    Configure o conjunto e a quantidade, depois clique em &ldquo;Executar Simulação&rdquo;
                  </p>
                </div>
              )}

            </div>
          </motion.div>
        )}

        {/* ════════════════ HISTÓRICO ════════════════ */}
        {activeTab === 'historico' && (
          <motion.div key="historico" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por código, nome, cliente..."
                    value={searchHistorico}
                    onChange={(e) => setSearchHistorico(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 h-9 flex-shrink-0">
                  <Download size={13} />
                  Exportar
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      {['Código', 'Nome', 'Cliente', 'Revisão', 'Produzidos', 'Econ. Estoque', 'Responsável', 'Status', 'Data'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistorico.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-sm text-muted-foreground">
                          Nenhum registro encontrado
                        </td>
                      </tr>
                    ) : filteredHistorico.map((h, i) => (
                      <motion.tr
                        key={h.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-accent">{h.codigo}</td>
                        <td className="px-4 py-3 text-foreground">{h.nome}</td>
                        <td className="px-4 py-3 text-muted-foreground">{h.cliente}</td>
                        <td className="px-4 py-3 text-muted-foreground">{h.revisao}</td>
                        <td className="px-4 py-3 font-semibold text-center">{h.quantidadeProduzida}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-success">{h.quantidadeEconomizadaEstoque}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{h.responsavel}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold',
                            h.status === 'concluido'   && 'bg-success/10 text-success',
                            h.status === 'em_producao' && 'bg-primary/10 text-primary',
                            h.status === 'cancelado'   && 'bg-destructive/10 text-destructive',
                          )}>
                            <span className={cn('h-1.5 w-1.5 rounded-full', {
                              'bg-success':     h.status === 'concluido',
                              'bg-primary':     h.status === 'em_producao',
                              'bg-destructive': h.status === 'cancelado',
                            })} />
                            {h.status === 'concluido' ? 'Concluído' : h.status === 'em_producao' ? 'Em Produção' : 'Cancelado'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {h.data.toLocaleDateString('pt-BR')}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                {filteredHistorico.length} registro{filteredHistorico.length !== 1 ? 's' : ''} encontrado{filteredHistorico.length !== 1 ? 's' : ''}
              </p>
            </div>
          </motion.div>
        )}

        {/* ════════════════ ANÁLISES ════════════════ */}
        {activeTab === 'analises' && (
          <motion.div key="analises" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <div className="space-y-6">

              {/* KPI cards */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Produções registradas', value: historico.length, icon: History, bg: 'bg-primary/10', color: 'text-primary', ring: 'ring-primary/20' },
                  { label: 'Total produzido',        value: historico.reduce((s, h) => s + h.quantidadeProduzida, 0), icon: Boxes, bg: 'bg-accent/10', color: 'text-accent', ring: 'ring-accent/20' },
                  { label: 'Total econ. via estoque',value: historico.reduce((s, h) => s + h.quantidadeEconomizadaEstoque, 0), icon: TrendingUp, bg: 'bg-success/10', color: 'text-success', ring: 'ring-success/20' },
                  { label: 'Conjuntos em revisão',   value: conjuntos.filter((c) => c.status === 'em_revisao').length, icon: AlertTriangle, bg: 'bg-warning/10', color: 'text-warning', ring: 'ring-warning/20' },
                ].map((kpi, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="group rounded-xl border border-border bg-card p-4 shadow-card transition-all hover:shadow-card-hover hover:-translate-y-0.5"
                  >
                    <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl ring-4 transition-transform group-hover:scale-105', kpi.bg, kpi.color, kpi.ring)}>
                      <kpi.icon size={16} />
                    </div>
                    <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                    <p className="mt-0.5 text-xs font-medium text-muted-foreground">{kpi.label}</p>
                  </motion.div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                {/* Most used conjuntos */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Conjuntos Mais Produzidos</CardTitle>
                    <CardDescription className="text-xs">Por quantidade de produções realizadas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={mockAnalyticsConjuntos.usoPorConjunto} margin={{ left: 0, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                        <XAxis dataKey="nome" tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v} produções`, 'Uso']} />
                        <Bar dataKey="usos" radius={[4, 4, 0, 0]}>
                          {mockAnalyticsConjuntos.usoPorConjunto.map((e, i) => (
                            <Cell key={i} fill={e.fill ?? CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Most used pieces */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Peças Mais Utilizadas</CardTitle>
                    <CardDescription className="text-xs">Frequência de uso em produções</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2.5">
                      {mockAnalyticsConjuntos.pecasMaisUsadas.map((p, i) => {
                        const max = mockAnalyticsConjuntos.pecasMaisUsadas[0].usos
                        const pct = Math.round((p.usos / max) * 100)
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-2">
                                <span className="font-mono font-bold text-accent">{p.codigo}</span>
                                <span className="text-muted-foreground truncate max-w-[160px]">{p.descricao}</span>
                              </span>
                              <span className="font-bold text-foreground ml-2 flex-shrink-0">{p.usos}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, delay: i * 0.07 }}
                                className="h-1.5 rounded-full bg-primary"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Stock savings over time */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Economia via Estoque — Mensal</CardTitle>
                    <CardDescription className="text-xs">Peças aproveitadas do estoque vs. produzidas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={mockAnalyticsConjuntos.economiaEstoqueMensal} margin={{ left: 0, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Line type="monotone" dataKey="economizadas" name="Economizadas" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="produzidas"   name="Produzidas"   stroke="#000080" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Sectors usage */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Setores mais Utilizados</CardTitle>
                    <CardDescription className="text-xs">Aproveitamento industrial por setor</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {mockAnalyticsConjuntos.setoresMaisUsados.map((s, i) => {
                        const max = mockAnalyticsConjuntos.setoresMaisUsados[0].count
                        const pct = Math.round((s.count / max) * 100)
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5 font-medium text-foreground">{s.setor}</span>
                              <span className="font-bold text-foreground">{s.count} peças</span>
                            </div>
                            <div className="h-2 w-full rounded-full bg-muted">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, delay: i * 0.08 }}
                                className="h-2 rounded-full"
                                style={{ background: s.fill }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Future integration note */}
              <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-4 text-xs text-muted-foreground">
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5 text-accent" />
                <div>
                  <strong className="text-foreground">Integração futura:</strong>{' '}
                  Quando conectado a Desenvolvimento, Estoque e Produção, este painel exibirá
                  dados em tempo real — ordens abertas, peças em progresso, economia real de materiais
                  e análise de custo por conjunto produzido.
                </div>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
    </PermissionGate>
  )
}
