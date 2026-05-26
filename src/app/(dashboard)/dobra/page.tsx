'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FoldVertical,
  Play,
  Pause,
  Square,
  RotateCcw,
  Settings2,
  Clock,
  Activity,
  CheckCircle2,
  TrendingUp,
  BarChart2,
  ListChecks,
  Search,
  Tag,
  Ruler,
  Download,
  FileText,
  AlertTriangle,
  Package,
  Filter,
  ChevronDown,
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
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { useAuth } from '@/contexts/AuthContext'
import { useDobra } from '@/contexts/DobraContext'
import { useEstoque } from '@/contexts/EstoqueContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { OS_ESTOQUE } from '@/types/estoque'
import { aggregateByOs, distributeTimeEqual, type OsTimeRow } from '@/lib/analytics'
import type { TarefaDobra, StatusDobra, PrioridadeDobra } from '@/types/dobra'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabView = 'fila' | 'em_producao' | 'historico' | 'analise'

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<StatusDobra, {
  label: string; color: string; bg: string; border: string; dot: string; pulse: boolean
}> = {
  pendente:   { label: 'Pendente',   color: 'text-warning',          bg: 'bg-warning/10',      border: 'border-warning/25',      dot: 'bg-warning',          pulse: false },
  em_setup:   { label: 'Em Setup',   color: 'text-primary',          bg: 'bg-primary/10',      border: 'border-primary/25',      dot: 'bg-primary',          pulse: true  },
  produzindo: { label: 'Produzindo', color: 'text-success',          bg: 'bg-success/10',      border: 'border-success/25',      dot: 'bg-success',          pulse: true  },
  pausado:    { label: 'Pausado',    color: 'text-destructive',      bg: 'bg-destructive/10',  border: 'border-destructive/25',  dot: 'bg-destructive',      pulse: false },
  finalizado: { label: 'Finalizado', color: 'text-muted-foreground', bg: 'bg-muted',           border: 'border-border',          dot: 'bg-muted-foreground', pulse: false },
}

const PRIO_CFG: Record<PrioridadeDobra, { label: string; color: string; bg: string }> = {
  alta:  { label: 'Alta',  color: 'text-destructive',      bg: 'bg-destructive/8' },
  media: { label: 'Média', color: 'text-warning',          bg: 'bg-warning/8'     },
  baixa: { label: 'Baixa', color: 'text-muted-foreground', bg: 'bg-muted'         },
}

const MOTIVOS = [
  'Troca de punção',
  'Ajuste de ângulo',
  'Falta de material',
  'Manutenção não planejada',
  'Pausa do operador',
  'Inspeção dimensional',
  'Outro',
]

const MAQUINAS_DOBRA = ['PRESS-001', 'PRESS-002', 'PRESS-003', 'PRESS-004']

const STATUS_ORDER: Record<StatusDobra, number> = {
  produzindo: 0, em_setup: 1, pausado: 2, pendente: 3, finalizado: 4,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function getSetupSecs(t: TarefaDobra, now: number): number {
  if (!t.setupInicio) return 0
  const endMs = t.setupFim
    ? t.setupFim.getTime()
    : t.status === 'em_setup'
      ? now
      : t.producaoInicio?.getTime() ?? now
  return Math.max(0, Math.floor((endMs - t.setupInicio.getTime()) / 1000))
}

function getPauseSecs(t: TarefaDobra, now: number): number {
  return t.pausas.reduce((acc, p) => {
    const endMs = p.fim ? p.fim.getTime() : now
    return acc + Math.max(0, Math.floor((endMs - p.inicio.getTime()) / 1000))
  }, 0)
}

function getProducaoSecs(t: TarefaDobra, now: number): number {
  if (!t.producaoInicio) return 0
  const endMs = t.producaoFim ? t.producaoFim.getTime() : now
  const total = Math.max(0, Math.floor((endMs - t.producaoInicio.getTime()) / 1000))
  return Math.max(0, total - getPauseSecs(t, now))
}

function getMachineSecs(t: TarefaDobra, now: number): number {
  if (!t.setupInicio) return 0
  const endMs = t.producaoFim?.getTime() ?? now
  return Math.max(0, Math.floor((endMs - t.setupInicio.getTime()) / 1000))
}

function getEficiencia(t: TarefaDobra, now: number): number {
  const setup = getSetupSecs(t, now)
  const prod = getProducaoSecs(t, now)
  const total = setup + prod
  if (total === 0) return 0
  return Math.round((prod / total) * 100)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusDobra }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold', cfg.bg, cfg.color)}>
      <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', cfg.dot, cfg.pulse && 'animate-pulse')} />
      {cfg.label}
    </span>
  )
}

function PrioridadeBadge({ prioridade }: { prioridade: PrioridadeDobra }) {
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

function PauseModal({
  open, onClose, onConfirm,
}: {
  open: boolean; onClose: () => void; onConfirm: (motivo: string) => void
}) {
  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [outro, setOutro] = useState('')

  function handleConfirm() {
    const final = motivo === 'Outro' ? (outro.trim() || 'Outro') : motivo
    onConfirm(final)
    setMotivo(MOTIVOS[0])
    setOutro('')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause size={15} className="text-destructive" />
            Pausar Dobra
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 pb-2">
          <p className="text-sm text-muted-foreground">
            Selecione o motivo da pausa. O tempo será registrado para análise de produtividade.
          </p>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider">Motivo</Label>
            <div className="grid gap-2">
              {MOTIVOS.map((m) => (
                <label
                  key={m}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm transition-colors',
                    motivo === m
                      ? 'border-accent bg-accent/5 text-foreground'
                      : 'border-border text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
                  )}
                >
                  <input
                    type="radio"
                    name="motivo-dobra"
                    value={m}
                    checked={motivo === m}
                    onChange={() => setMotivo(m)}
                    className="accent-accent"
                  />
                  {m}
                </label>
              ))}
            </div>
            {motivo === 'Outro' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                <input
                  type="text"
                  placeholder="Descreva o motivo..."
                  value={outro}
                  onChange={(e) => setOutro(e.target.value)}
                  className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </motion.div>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button size="sm" className="bg-destructive text-white hover:bg-destructive/90" onClick={handleConfirm}>
            <Pause size={13} />
            Confirmar Pausa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmacaoDobraModal({
  open, tarefa, onClose, onConfirm,
}: {
  open: boolean
  tarefa: TarefaDobra | null
  onClose: () => void
  onConfirm: (qtdReal: number) => void
}) {
  const [qtdReal, setQtdReal] = useState('')
  const [qualidade, setQualidade] = useState(false)

  useEffect(() => {
    if (open && tarefa) {
      setQtdReal(String(tarefa.quantidade))
      setQualidade(false)
    }
  }, [open, tarefa])

  if (!tarefa) return null

  const qtdNum = parseInt(qtdReal, 10)
  const diff = isNaN(qtdNum) ? 0 : qtdNum - tarefa.quantidade
  const perdaPct = tarefa.quantidade > 0 && !isNaN(qtdNum)
    ? Math.round(((tarefa.quantidade - qtdNum) / tarefa.quantidade) * 100)
    : 0
  const temPerda = !isNaN(qtdNum) && qtdNum < tarefa.quantidade
  const temExcedente = !isNaN(qtdNum) && qtdNum > tarefa.quantidade
  const goesToEstoque = tarefa.osVinculadas.some((os) => os === OS_ESTOQUE)
  const canConfirm = qualidade && !isNaN(qtdNum) && qtdNum > 0

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-success" />
            Confirmar Produção — Dobra
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-5 pb-2">
          {/* Part info */}
          <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Peça</p>
              <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {tarefa.osVinculadas.map((os, i) => (
                  <span
                    key={i}
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px] font-bold',
                      os === OS_ESTOQUE
                        ? 'bg-accent/15 text-accent border border-accent/25'
                        : 'bg-muted-foreground/10 text-muted-foreground'
                    )}
                  >
                    {os}
                  </span>
                ))}
              </div>
            </div>
            <p className="font-mono font-bold text-lg text-accent leading-none">{tarefa.codigoPeca}</p>
            <p className="text-sm text-foreground">{tarefa.descricao}</p>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-xs text-muted-foreground">{tarefa.material} · {tarefa.espessura}mm</span>
              <span className="text-xs text-muted-foreground font-mono">{tarefa.programaOrigem}</span>
            </div>
          </div>

          {/* Quantity inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card p-3 space-y-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Recebido do Corte</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">{tarefa.quantidade}</p>
              <p className="text-[10px] text-muted-foreground">peças planejadas</p>
            </div>
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 space-y-1.5">
              <Label className="text-[10px] text-muted-foreground uppercase tracking-wide block">Real Dobrado</Label>
              <Input
                type="number"
                min={0}
                value={qtdReal}
                onChange={(e) => setQtdReal(e.target.value)}
                className="h-9 text-lg font-bold tabular-nums border-accent/30 focus-visible:ring-accent/30"
              />
              <p className="text-[10px] text-muted-foreground">peças reais produzidas</p>
            </div>
          </div>

          {/* Loss analysis */}
          {!isNaN(qtdNum) && qtdNum >= 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-xl border p-4 space-y-3',
                temPerda ? 'border-destructive/25 bg-destructive/5' : 'border-success/25 bg-success/5'
              )}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Análise de Perda</p>
                <span className={cn(
                  'rounded-full px-2.5 py-0.5 text-xs font-bold',
                  temPerda     ? 'bg-destructive/10 text-destructive' :
                  temExcedente ? 'bg-success/15 text-success' :
                                 'bg-success/15 text-success'
                )}>
                  {temPerda ? 'PERDA DETECTADA' : temExcedente ? 'EXCEDENTE' : 'SEM PERDA'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Esperado</p>
                  <p className="text-base font-bold text-foreground">{tarefa.quantidade}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Real</p>
                  <p className="text-base font-bold text-foreground">{qtdNum}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Diferença</p>
                  <p className={cn(
                    'text-base font-bold',
                    diff < 0 ? 'text-destructive' : diff > 0 ? 'text-success' : 'text-foreground'
                  )}>
                    {diff > 0 ? '+' : ''}{diff}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  {temPerda
                    ? <><span>Perda: {tarefa.quantidade - qtdNum} pç ({perdaPct}%)</span><span>Eficiência: {100 - perdaPct}%</span></>
                    : <><span>Aproveitamento: 100%</span><span>Eficiência: máxima</span></>
                  }
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div
                    className={cn('h-2 rounded-full transition-all duration-500', temPerda ? 'bg-destructive' : 'bg-success')}
                    style={{ width: `${temPerda ? 100 - perdaPct : 100}%` }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Stock entry notice */}
          {goesToEstoque && !isNaN(qtdNum) && qtdNum > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 rounded-xl border border-accent/25 bg-accent/5 p-3"
            >
              <Package size={14} className="text-accent flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-accent">Entrada no Estoque</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <span className="font-semibold text-foreground">{qtdNum} pç</span> de{' '}
                  <span className="font-mono">{tarefa.codigoPeca}</span> serão registradas no inventário via{' '}
                  <span className="font-semibold">OS:1508</span>.
                </p>
              </div>
            </motion.div>
          )}

          {/* Quality checkbox */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 transition-colors hover:border-muted-foreground/30">
            <input
              type="checkbox"
              checked={qualidade}
              onChange={(e) => setQualidade(e.target.checked)}
              className="mt-0.5 accent-accent h-4 w-4 flex-shrink-0"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">Confirmo qualidade das peças</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                As peças dobradas estão dentro das tolerâncias dimensionais e sem defeitos visuais.
              </p>
            </div>
          </label>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            size="sm"
            disabled={!canConfirm}
            className="gap-1.5 bg-success hover:bg-success/90 text-white disabled:opacity-40"
            onClick={() => onConfirm(qtdNum)}
          >
            <CheckCircle2 size={13} />
            Confirmar Produção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function TarefaCard({
  tarefa, now, onIniciarSetup, onIniciarProducao, onPausar, onRetomar, onFinalizar, index,
}: {
  tarefa: TarefaDobra
  now: number
  onIniciarSetup: (id: string) => void
  onIniciarProducao: (id: string) => void
  onPausar: (id: string) => void
  onRetomar: (id: string) => void
  onFinalizar: (id: string) => void
  index: number
}) {
  const { canEdit } = useAuth()
  const cfg = STATUS_CFG[tarefa.status]
  const setupSecs = getSetupSecs(tarefa, now)
  const producaoSecs = getProducaoSecs(tarefa, now)
  const pauseSecs = getPauseSecs(tarefa, now)
  const machineSecs = getMachineSecs(tarefa, now)
  const eficiencia = getEficiencia(tarefa, now)
  const isActive = tarefa.status === 'produzindo' || tarefa.status === 'em_setup'

  // Estimated: 2 min per piece
  const estimadoSecs = tarefa.quantidade * 120
  const progressPct = estimadoSecs > 0
    ? Math.min(100, Math.round((producaoSecs / estimadoSecs) * 100))
    : 0

  const quantidadeAlterada = tarefa.quantidade !== tarefa.quantidadePlanejada

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
      {/* Status accent stripe */}
      <div className={cn('h-0.5 w-full', {
        'bg-warning':              tarefa.status === 'pendente',
        'bg-primary':              tarefa.status === 'em_setup',
        'bg-success':              tarefa.status === 'produzindo',
        'bg-destructive':          tarefa.status === 'pausado',
        'bg-muted-foreground/30':  tarefa.status === 'finalizado',
      })} />

      <div className="p-4 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={tarefa.status} />
            <PrioridadeBadge prioridade={tarefa.prioridade} />
          </div>
          {tarefa.maquina && (
            <span className="flex-shrink-0 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
              {tarefa.maquina}
            </span>
          )}
        </div>

        {/* Part identity */}
        <div>
          <div className="flex items-baseline gap-2">
            <p className="text-sm font-mono font-bold text-accent">{tarefa.codigoPeca}</p>
            {quantidadeAlterada && (
              <span className="rounded bg-warning/10 px-1.5 py-0.5 text-[9px] font-bold text-warning uppercase tracking-wide">
                Qtd ajustada
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-foreground mt-0.5 leading-snug">{tarefa.descricao}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Origem: <span className="font-mono">{tarefa.programaOrigem}</span>
            {' · '}
            {relativeTime(tarefa.liberadoEm)}
          </p>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Tag size={11} className="flex-shrink-0" />
            <span className="truncate">{tarefa.material}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Ruler size={11} className="flex-shrink-0" />
            <span>{tarefa.espessura}mm</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <ListChecks size={11} className="flex-shrink-0 text-muted-foreground" />
            <span className="font-semibold text-foreground">{tarefa.quantidade}</span>
            {quantidadeAlterada && (
              <span className="text-muted-foreground line-through ml-1">{tarefa.quantidadePlanejada}</span>
            )}
            <span className="text-muted-foreground ml-0.5">pç</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={11} className="flex-shrink-0" />
            <span>Est. {Math.round(estimadoSecs / 60)}min</span>
          </div>
        </div>

        {/* OS badges */}
        <div className="flex flex-wrap gap-1">
          {tarefa.osVinculadas.map((os, i) => (
            <span
              key={`${tarefa.id}-${os}-${i}`}
              className="rounded-md border border-accent/20 bg-accent/5 px-1.5 py-0.5 text-[10px] font-semibold text-accent"
            >
              {os}
            </span>
          ))}
        </div>

        {/* Timer section */}
        {tarefa.status !== 'pendente' && (
          <>
            <Separator />

            {tarefa.status === 'em_setup' && (
              <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/15 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Settings2 size={14} className="text-primary animate-spin" style={{ animationDuration: '3s' }} />
                  <span className="text-xs font-semibold text-primary">Setup em andamento</span>
                </div>
                <TimerBlock label="Tempo" secs={setupSecs} accent />
              </div>
            )}

            {(tarefa.status === 'produzindo' || tarefa.status === 'pausado') && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-muted/60 px-2.5 py-2">
                    <TimerBlock label="Setup" secs={setupSecs} />
                  </div>
                  <div className={cn(
                    'rounded-lg px-2.5 py-2',
                    tarefa.status === 'produzindo'
                      ? 'bg-success/8 border border-success/15'
                      : 'bg-muted/60'
                  )}>
                    <TimerBlock label="Produção" secs={producaoSecs} accent={tarefa.status === 'produzindo'} />
                  </div>
                  {tarefa.pausas.length > 0 && (
                    <div className="rounded-lg bg-destructive/8 px-2.5 py-2">
                      <TimerBlock label="Pausas" secs={pauseSecs} />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Progresso estimado</span>
                    <span>{progressPct}%</span>
                  </div>
                  <Progress value={progressPct} accent className="h-1.5" />
                </div>
              </div>
            )}

            {tarefa.status === 'finalizado' && (
              <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Setup</p>
                    <p className="text-sm font-bold text-foreground">{fmtHM(setupSecs)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Produção</p>
                    <p className="text-sm font-bold text-success">{fmtHM(producaoSecs)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Eficiência</p>
                    <p className={cn('text-sm font-bold',
                      eficiencia >= 70 ? 'text-success' : eficiencia >= 50 ? 'text-warning' : 'text-destructive'
                    )}>
                      {eficiencia}%
                    </p>
                  </div>
                </div>
                <div className="text-center border-t border-border/50 pt-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tempo Total de Máquina</p>
                  <p className="text-sm font-bold text-foreground">{fmtHM(machineSecs)}</p>
                </div>
                {tarefa.operador && (
                  <p className="text-[10px] text-center text-muted-foreground">
                    Operador: <span className="font-medium text-foreground">{tarefa.operador}</span>
                  </p>
                )}
              </div>
            )}
          </>
        )}

        {/* Actions */}
        {canEdit('dobra') && tarefa.status !== 'finalizado' && (
          <div className="flex flex-wrap gap-2 pt-1">
            {tarefa.status === 'pendente' && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1.5 border-primary/30 text-primary hover:bg-primary/8 hover:border-primary"
                onClick={() => onIniciarSetup(tarefa.id)}
              >
                <Settings2 size={13} />
                Iniciar Setup
              </Button>
            )}
            {tarefa.status === 'em_setup' && (
              <Button
                size="sm"
                className="flex-1 gap-1.5 bg-success hover:bg-success/90 text-white"
                onClick={() => onIniciarProducao(tarefa.id)}
              >
                <Play size={13} />
                Iniciar Produção
              </Button>
            )}
            {tarefa.status === 'produzindo' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-warning/30 text-warning hover:bg-warning/8 hover:border-warning"
                  onClick={() => onPausar(tarefa.id)}
                >
                  <Pause size={13} />
                  Pausar
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1.5 bg-accent hover:bg-accent/90 text-white"
                  onClick={() => onFinalizar(tarefa.id)}
                >
                  <Square size={13} />
                  Finalizar
                </Button>
              </>
            )}
            {tarefa.status === 'pausado' && (
              <>
                <Button
                  size="sm"
                  className="flex-1 gap-1.5 bg-success hover:bg-success/90 text-white"
                  onClick={() => onRetomar(tarefa.id)}
                >
                  <RotateCcw size={13} />
                  Retomar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 border-accent/30 text-accent hover:bg-accent/8 hover:border-accent"
                  onClick={() => onFinalizar(tarefa.id)}
                >
                  <Square size={13} />
                  Finalizar
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ─── Analytics View ───────────────────────────────────────────────────────────

function AnalyticsView({ tarefas, now }: { tarefas: TarefaDobra[]; now: number }) {
  const materialData = useMemo(() => {
    const map: Record<string, number> = {}
    tarefas.forEach((t) => { map[t.material] = (map[t.material] ?? 0) + t.quantidade })
    return Object.entries(map)
      .map(([name, value]) => ({ name: name.replace('Aço Carbono', 'A.C.').replace('Alumínio', 'Al.'), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }, [tarefas])

  const statusData = useMemo(() => [
    { name: 'Pendente',   value: tarefas.filter((t) => t.status === 'pendente').length,   color: '#f59e0b' },
    { name: 'Em Setup',   value: tarefas.filter((t) => t.status === 'em_setup').length,   color: '#000080' },
    { name: 'Produzindo', value: tarefas.filter((t) => t.status === 'produzindo').length, color: '#10b981' },
    { name: 'Pausado',    value: tarefas.filter((t) => t.status === 'pausado').length,    color: '#ef4444' },
    { name: 'Finalizado', value: tarefas.filter((t) => t.status === 'finalizado').length, color: '#6b7280' },
  ].filter((d) => d.value > 0), [tarefas])

  const operatorData = useMemo(() => {
    const map: Record<string, number> = {}
    tarefas.forEach((t) => {
      if (t.operador) {
        const secs = getProducaoSecs(t, now)
        if (secs > 0) map[t.operador.split(' ')[0]] = (map[t.operador.split(' ')[0]] ?? 0) + secs
      }
    })
    return Object.entries(map)
      .map(([op, secs]) => ({ operador: op, minutos: Math.round(secs / 60) }))
      .sort((a, b) => b.minutos - a.minutos)
  }, [tarefas, now])

  const finalizadas = tarefas.filter((t) => t.status === 'finalizado')
  const avgEficiencia = finalizadas.length > 0
    ? Math.round(finalizadas.reduce((a, t) => a + getEficiencia(t, now), 0) / finalizadas.length)
    : 0

  // ── OS Time Distribution ─────────────────────────────────────────────────

  const [osFilterPeriod, setOsFilterPeriod] = useState<'todos' | 'hoje' | 'semana' | 'mes'>('todos')
  const [osTableExpanded, setOsTableExpanded] = useState(false)

  const osTarefas = useMemo(() => {
    if (osFilterPeriod === 'todos') return tarefas
    const cutoff = new Date()
    cutoff.setHours(0, 0, 0, 0)
    if (osFilterPeriod === 'semana') cutoff.setDate(cutoff.getDate() - 7)
    else if (osFilterPeriod === 'mes') cutoff.setDate(cutoff.getDate() - 30)
    return tarefas.filter((t) => {
      const ref = t.producaoFim ?? t.producaoInicio ?? t.liberadoEm
      return ref >= cutoff
    })
  }, [tarefas, osFilterPeriod])

  const osRows = useMemo((): OsTimeRow[] => {
    const rows: OsTimeRow[] = []
    osTarefas.forEach((t) => {
      if (!t.osVinculadas.length) return
      const setupSecs = getSetupSecs(t, now)
      const prodSecs = getProducaoSecs(t, now)
      if (setupSecs === 0 && prodSecs === 0) return
      const shares = distributeTimeEqual(setupSecs, prodSecs, t.osVinculadas, t.quantidade)
      shares.forEach(({ os, setupSecs: s, producaoSecs: p, qtdShare }) => {
        rows.push({
          os,
          codigoPeca: t.codigoPeca,
          descricao: t.descricao,
          programaOrigem: t.programaOrigem,
          maquina: t.maquina,
          operador: t.operador,
          setupSecs: s,
          producaoSecs: p,
          quantidade: qtdShare,
          status: t.status,
          sector: 'dobra',
        })
      })
    })
    return rows
  }, [osTarefas, now])

  const osAggregated = useMemo(() => aggregateByOs(osRows), [osRows])

  const osChartData = useMemo(() => osAggregated.map((o) => ({
    os: o.os,
    setup: Math.round(o.totalSetupSecs / 60),
    producao: Math.round(o.totalProducaoSecs / 60),
  })), [osAggregated])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Tarefas',   value: tarefas.length,                                    icon: ListChecks,  color: 'text-primary',     bg: 'bg-primary/10'     },
          { label: 'Peças na Fila',   value: tarefas.filter((t) => t.status !== 'finalizado').reduce((a, t) => a + t.quantidade, 0), icon: Package, color: 'text-warning', bg: 'bg-warning/10' },
          { label: 'Concluídas',      value: finalizadas.length,                                icon: CheckCircle2, color: 'text-success',    bg: 'bg-success/10'    },
          { label: 'Efic. Média',     value: avgEficiencia > 0 ? `${avgEficiencia}%` : '—',    icon: TrendingUp,  color: avgEficiencia >= 70 ? 'text-success' : 'text-warning', bg: avgEficiencia >= 70 ? 'bg-success/10' : 'bg-warning/10' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-card"
          >
            <div className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl', item.bg, item.color)}>
              <item.icon size={16} />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground leading-none">{item.value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Peças por Material</CardTitle>
            <CardDescription>Total de peças pendentes agrupadas por material</CardDescription>
          </CardHeader>
          <CardContent>
            {materialData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={materialData} layout="vertical" margin={{ top: 4, right: 4, bottom: 0, left: -8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} width={48} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12 }}
                    formatter={(v) => [`${v} pç`, 'Quantidade']}
                  />
                  <Bar dataKey="value" fill="#0f4c5c" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">Sem dados disponíveis</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Distribuição de Status</CardTitle>
            <CardDescription>Tarefas por estado atual</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-1 flex-col gap-1.5">
                  {statusData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">Sem dados disponíveis</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Operator chart */}
      {operatorData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tempo Produtivo por Operador</CardTitle>
            <CardDescription>Minutos de produção ativa em dobra (sem pausa)</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={operatorData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                <XAxis dataKey="operador" tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12 }}
                  formatter={(v) => [`${v} min`, 'T. Produtivo']}
                />
                <Bar dataKey="minutos" fill="#000080" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
      {/* ── OS Time Distribution ── */}
      <div className="space-y-4">
        {/* Section header + period filter */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Distribuição de Tempo por OS</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tempo de dobra dividido proporcionalmente entre as ordens vinculadas
            </p>
          </div>
          <div className="flex items-center gap-0.5 rounded-xl border border-border bg-muted p-0.5">
            {(['todos', 'hoje', 'semana', 'mes'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setOsFilterPeriod(p)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150',
                  osFilterPeriod === p
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {p === 'todos' ? 'Todos' : p === 'hoje' ? 'Hoje' : p === 'semana' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>

        {osAggregated.length > 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* OS summary cards */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {osAggregated.slice(0, 4).map((agg, i) => (
                <motion.div
                  key={agg.os}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-xl border border-border bg-card p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">
                      {agg.os}
                    </span>
                    <span className={cn(
                      'text-xs font-bold',
                      agg.pct >= 40 ? 'text-accent' : 'text-muted-foreground'
                    )}>
                      {agg.pct}%
                    </span>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-foreground tabular-nums leading-none">
                      {fmtHM(agg.totalSecs)}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">tempo total de máquina</p>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Setup</span>
                      <span className="font-medium text-primary">{fmtHM(agg.totalSetupSecs)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Produção</span>
                      <span className="font-medium text-success">{fmtHM(agg.totalProducaoSecs)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-muted-foreground">Peças</span>
                      <span className="font-semibold text-foreground">{agg.totalQtd} pç</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${agg.pct}%` }}
                        transition={{ duration: 0.7, delay: i * 0.06 + 0.2 }}
                        className="h-1.5 rounded-full bg-accent"
                      />
                    </div>
                    {agg.programs.length > 0 && (
                      <p className="text-[9px] text-muted-foreground/60 truncate">
                        {agg.programs.join(' · ')}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Stacked bar chart — setup vs. production per OS */}
            {osChartData.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Tempo por OS (minutos)</CardTitle>
                  <CardDescription>Distribuição de setup vs. produção ativa por ordem de serviço</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
                      <span className="text-[10px] text-muted-foreground">Setup</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-sm bg-success" />
                      <span className="text-[10px] text-muted-foreground">Produção</span>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={osChartData} margin={{ top: 4, right: 4, bottom: 0, left: -16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                      <XAxis dataKey="os" tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12 }}
                        formatter={(v, name) => [`${v}min`, name === 'setup' ? 'Setup' : 'Produção']}
                      />
                      <Bar dataKey="setup" stackId="a" fill="#000080" name="setup" />
                      <Bar dataKey="producao" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} name="producao" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Expandable detail table */}
            <Card>
              <CardHeader
                className="pb-3 cursor-pointer select-none"
                onClick={() => setOsTableExpanded((v) => !v)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">Detalhe por OS</CardTitle>
                    <CardDescription>
                      {osRows.length} registro(s) — tempo distribuído proporcionalmente por quantidade
                    </CardDescription>
                  </div>
                  <motion.div
                    animate={{ rotate: osTableExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={16} className="text-muted-foreground" />
                  </motion.div>
                </div>
              </CardHeader>
              <AnimatePresence initial={false}>
                {osTableExpanded && (
                  <motion.div
                    key="os-table"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-border bg-muted/40">
                              {['Ordem', 'Código', 'Descrição', 'Programa', 'Máquina', 'Operador', 'Setup', 'Produção', 'Total', 'Qtd.', 'Status'].map((h) => (
                                <th key={h} className="px-4 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wide text-[10px] whitespace-nowrap">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {osRows.map((row, i) => {
                              const scfg = STATUS_CFG[row.status as StatusDobra]
                              return (
                                <tr
                                  key={i}
                                  className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                                >
                                  <td className="px-4 py-3 font-semibold text-accent whitespace-nowrap">{row.os}</td>
                                  <td className="px-4 py-3 font-mono text-accent whitespace-nowrap text-[10px]">{row.codigoPeca}</td>
                                  <td className="px-4 py-3 text-foreground whitespace-nowrap">{row.descricao}</td>
                                  <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap text-[10px]">{row.programaOrigem}</td>
                                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{row.maquina ?? '—'}</td>
                                  <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{row.operador?.split(' ')[0] ?? '—'}</td>
                                  <td className="px-4 py-3 font-semibold text-primary whitespace-nowrap">{row.setupSecs > 0 ? fmtHM(row.setupSecs) : '—'}</td>
                                  <td className="px-4 py-3 font-semibold text-success whitespace-nowrap">{row.producaoSecs > 0 ? fmtHM(row.producaoSecs) : '—'}</td>
                                  <td className="px-4 py-3 font-bold text-foreground whitespace-nowrap">{fmtHM(row.setupSecs + row.producaoSecs)}</td>
                                  <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{row.quantidade} pç</td>
                                  <td className="px-4 py-3 whitespace-nowrap">
                                    {scfg && (
                                      <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-semibold', scfg.bg, scfg.color)}>
                                        {scfg.label}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Clock size={28} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold text-foreground">Sem dados para o período selecionado</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Inicie tarefas de dobra para ver a distribuição de tempo por OS.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  )
}

// ─── Histórico View ───────────────────────────────────────────────────────────

function HistoricoView({ tarefas, now }: { tarefas: TarefaDobra[]; now: number }) {
  const [search, setSearch] = useState('')

  const finalizadas = tarefas
    .filter((t) => t.status === 'finalizado')
    .filter((t) =>
      !search ||
      t.codigoPeca.toLowerCase().includes(search.toLowerCase()) ||
      t.descricao.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => (b.producaoFim?.getTime() ?? 0) - (a.producaoFim?.getTime() ?? 0))

  const totalPecas = finalizadas.reduce((a, t) => a + t.quantidade, 0)
  const avgEfic = finalizadas.length > 0
    ? Math.round(finalizadas.reduce((a, t) => a + getEficiencia(t, now), 0) / finalizadas.length)
    : 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar tarefa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 rounded-lg border border-border bg-card pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent w-56"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {finalizadas.length} tarefa(s) · {totalPecas} peças · efic. média {avgEfic > 0 ? `${avgEfic}%` : '—'}
          </span>
          <Button variant="outline" size="sm">
            <Download size={13} />
            Exportar
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {finalizadas.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    {['Código', 'Descrição', 'Material', 'Esp.', 'Qtd.', 'Programa', 'OS', 'Setup', 'Produção', 'Efic.', 'Operador', 'Máquina'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wide text-[10px] whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {finalizadas.map((t, i) => {
                    const setupMin = Math.round(getSetupSecs(t, now) / 60)
                    const prodMin = Math.round(getProducaoSecs(t, now) / 60)
                    const efic = getEficiencia(t, now)
                    return (
                      <motion.tr
                        key={t.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.03 }}
                        className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-accent whitespace-nowrap">{t.codigoPeca}</td>
                        <td className="px-4 py-3 text-foreground whitespace-nowrap">{t.descricao}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{t.material}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{t.espessura}mm</td>
                        <td className="px-4 py-3 font-semibold text-foreground">
                          {t.quantidadeConfirmada !== undefined ? (
                            <span className="flex items-center gap-1.5">
                              {t.quantidadeConfirmada}
                              {t.quantidadeConfirmada !== t.quantidade && (
                                <span className={cn(
                                  'text-[10px] font-bold',
                                  t.quantidadeConfirmada < t.quantidade ? 'text-destructive' : 'text-success'
                                )}>
                                  ({t.quantidadeConfirmada < t.quantidade ? '' : '+'}{t.quantidadeConfirmada - t.quantidade})
                                </span>
                              )}
                            </span>
                          ) : t.quantidade}
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">{t.programaOrigem}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {t.osVinculadas.map((os, j) => (
                              <span key={j} className="rounded border border-accent/20 bg-accent/5 px-1 py-0.5 text-[10px] font-semibold text-accent">
                                {os}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary whitespace-nowrap">{setupMin > 0 ? `${setupMin}min` : '—'}</td>
                        <td className="px-4 py-3 font-semibold text-success whitespace-nowrap">{prodMin > 0 ? `${prodMin}min` : '—'}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {efic > 0 ? (
                            <span className={cn('font-bold', efic >= 70 ? 'text-success' : efic >= 50 ? 'text-warning' : 'text-destructive')}>
                              {efic}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{t.operador ?? '—'}</td>
                        <td className="px-4 py-3 font-mono text-muted-foreground whitespace-nowrap">{t.maquina ?? '—'}</td>
                      </motion.tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText size={28} className="text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold text-foreground">Nenhuma tarefa finalizada</p>
              <p className="mt-1 text-xs text-muted-foreground">As tarefas concluídas aparecerão aqui.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DobraPage() {
  const { tarefas, atualizarTarefa } = useDobra()
  const { addEntrada } = useEstoque()

  const [activeTab, setActiveTab] = useState<TabView>('fila')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusDobra | 'todos'>('todos')
  const [materialFilter, setMaterialFilter] = useState('todos')
  const [prioridadeFilter, setPrioridadeFilter] = useState<PrioridadeDobra | 'todas'>('todas')
  const [pauseModal, setPauseModal] = useState<{ open: boolean; tarefaId: string | null }>({ open: false, tarefaId: null })
  const [finalizacaoModal, setFinalizacaoModal] = useState<{ open: boolean; tarefaId: string | null }>({ open: false, tarefaId: null })
  const [, setTick] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1)
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const mutate = useCallback((id: string, updater: (t: TarefaDobra) => TarefaDobra) => {
    atualizarTarefa(id, updater)
  }, [atualizarTarefa])

  function iniciarSetup(id: string) {
    const maquina = MAQUINAS_DOBRA[Math.floor(Math.random() * MAQUINAS_DOBRA.length)]
    mutate(id, (t) => ({ ...t, status: 'em_setup', setupInicio: new Date(), maquina }))
    toast('info', 'Setup iniciado', 'Temporizador de setup em andamento.')
  }

  function iniciarProducao(id: string) {
    const now2 = new Date()
    mutate(id, (t) => ({ ...t, status: 'produzindo', setupFim: now2, producaoInicio: now2 }))
    toast('success', 'Produção iniciada', 'Temporizador de produção em andamento.')
  }

  function abrirPausaModal(id: string) {
    setPauseModal({ open: true, tarefaId: id })
  }

  function confirmarPausa(motivo: string) {
    if (!pauseModal.tarefaId) return
    const id = pauseModal.tarefaId
    const pausa = { id: `dp-${Date.now()}`, motivo, inicio: new Date(), fim: null, duracao: null }
    mutate(id, (t) => ({ ...t, status: 'pausado', pausas: [...t.pausas, pausa] }))
    setPauseModal({ open: false, tarefaId: null })
    toast('warning', 'Dobra pausada', `Motivo: ${motivo}`)
  }

  function retomar(id: string) {
    const fim = new Date()
    mutate(id, (t) => ({
      ...t,
      status: 'produzindo',
      pausas: t.pausas.map((p) => {
        if (p.fim !== null) return p
        return { ...p, fim, duracao: Math.floor((fim.getTime() - p.inicio.getTime()) / 1000) }
      }),
    }))
    toast('success', 'Produção retomada', 'Temporizador reativado.')
  }

  function abrirFinalizacaoModal(id: string) {
    setFinalizacaoModal({ open: true, tarefaId: id })
  }

  function confirmarFinalizacao(qtdReal: number) {
    if (!finalizacaoModal.tarefaId) return
    const id = finalizacaoModal.tarefaId
    const tarefa = tarefas.find((t) => t.id === id)
    if (!tarefa) return

    const fim = new Date()
    mutate(id, (t) => ({
      ...t,
      status: 'finalizado',
      producaoFim: fim,
      quantidadeConfirmada: qtdReal,
      pausas: t.pausas.map((p) => {
        if (p.fim !== null) return p
        return { ...p, fim, duracao: Math.floor((fim.getTime() - p.inicio.getTime()) / 1000) }
      }),
    }))

    const os1508 = tarefa.osVinculadas.find((os) => os === OS_ESTOQUE)
    if (os1508) {
      addEntrada([{
        codigoPeca: tarefa.codigoPeca,
        descricaoPeca: tarefa.descricao,
        quantidade: qtdReal,
        material: tarefa.material,
        espessura: tarefa.espessura,
        programaOrigem: tarefa.programaOrigem,
        os: OS_ESTOQUE,
        operador: tarefa.operador ?? 'Sistema',
        observacao: qtdReal !== tarefa.quantidade
          ? `Perda de ${tarefa.quantidade - qtdReal} pç na dobra`
          : undefined,
        tarefaDobraId: tarefa.id,
        programaCorteId: tarefa.programaOrigemId,
      }])
      toast('success', 'Estoque atualizado', `${qtdReal} pç de ${tarefa.codigoPeca} registradas no inventário.`)
    } else {
      toast('success', 'Tarefa finalizada', 'Dobra concluída com sucesso.')
    }

    setFinalizacaoModal({ open: false, tarefaId: null })
  }

  // ── KPI ───────────────────────────────────────────────────────────────────

  const pendentes   = tarefas.filter((t) => t.status === 'pendente').length
  const emAtivo     = tarefas.filter((t) => ['em_setup', 'produzindo', 'pausado'].includes(t.status)).length
  const finalizadas = tarefas.filter((t) => t.status === 'finalizado')
  const pecasHoje   = finalizadas.reduce((a, t) => a + t.quantidade, 0)

  const setupFinalizadas = finalizadas.filter((t) => t.setupInicio && t.setupFim)
  const avgSetupMin = setupFinalizadas.length > 0
    ? Math.round(
        setupFinalizadas.reduce((a, t) => a + getSetupSecs(t, now), 0) /
        setupFinalizadas.length / 60
      )
    : 0

  const totalSetupSecs = tarefas.reduce((a, t) => a + getSetupSecs(t, now), 0)
  const totalProdSecs  = tarefas.reduce((a, t) => a + getProducaoSecs(t, now), 0)
  const totalMach      = totalSetupSecs + totalProdSecs
  const eficienciaGlobal = totalMach > 0 ? Math.round((totalProdSecs / totalMach) * 100) : 0

  // ── Filter & sort ─────────────────────────────────────────────────────────

  const materiais = useMemo(
    () => ['todos', ...Array.from(new Set(tarefas.map((t) => t.material)))],
    [tarefas]
  )

  function applyFilters(list: TarefaDobra[]) {
    return list
      .filter((t) =>
        !search ||
        t.codigoPeca.toLowerCase().includes(search.toLowerCase()) ||
        t.descricao.toLowerCase().includes(search.toLowerCase()) ||
        t.programaOrigem.toLowerCase().includes(search.toLowerCase())
      )
      .filter((t) => statusFilter === 'todos' || t.status === statusFilter)
      .filter((t) => materialFilter === 'todos' || t.material === materialFilter)
      .filter((t) => prioridadeFilter === 'todas' || t.prioridade === prioridadeFilter)
  }

  const filaItems = applyFilters(tarefas.filter((t) => t.status !== 'finalizado'))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || (a.prioridade === 'alta' ? -1 : 1))

  const emProducaoItems = applyFilters(
    tarefas.filter((t) => ['em_setup', 'produzindo', 'pausado'].includes(t.status))
  ).sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])

  const TABS = [
    { id: 'fila'        as TabView, label: 'Fila de Dobra', icon: ListChecks, count: filaItems.length          },
    { id: 'em_producao' as TabView, label: 'Em Produção',   icon: Activity,   count: emProducaoItems.length    },
    { id: 'historico'   as TabView, label: 'Histórico',     icon: Clock                                        },
    { id: 'analise'     as TabView, label: 'Análise',       icon: BarChart2                                    },
  ]

  const showFilters = activeTab === 'fila' || activeTab === 'em_producao'

  return (
    <PermissionGate module="dobra">
    <div>
      <PageHeader
        title="Dobra"
        subtitle="Controle de Produção — Prensa Dobradeira"
        breadcrumbs={[{ label: 'Esync', href: '/dashboard' }, { label: 'Dobra' }]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/8 px-3 py-1.5 text-xs font-semibold text-success">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              {emAtivo} em operação
            </div>
          </div>
        }
      />

      {/* ── KPI Cards ── */}
      <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        {[
          {
            label: 'Tarefas Pendentes',
            value: pendentes,
            icon: Package,
            color: 'text-warning',
            bg: 'bg-warning/10',
            ring: 'ring-warning/20',
            suffix: 'aguardando início',
          },
          {
            label: 'Em Produção',
            value: emAtivo,
            icon: Activity,
            color: 'text-success',
            bg: 'bg-success/10',
            ring: 'ring-success/20',
            suffix: 'tarefas ativas',
          },
          {
            label: 'Peças Finalizadas',
            value: pecasHoje,
            icon: CheckCircle2,
            color: 'text-accent',
            bg: 'bg-accent/10',
            ring: 'ring-accent/20',
            suffix: 'peças produzidas',
          },
          {
            label: 'Setup Médio',
            value: avgSetupMin > 0 ? `${avgSetupMin}min` : '—',
            icon: Settings2,
            color: 'text-primary',
            bg: 'bg-primary/10',
            ring: 'ring-primary/20',
            suffix: 'por tarefa finalizada',
          },
          {
            label: 'Eficiência',
            value: `${eficienciaGlobal}%`,
            icon: TrendingUp,
            color: eficienciaGlobal >= 70 ? 'text-success' : eficienciaGlobal >= 50 ? 'text-warning' : 'text-destructive',
            bg:    eficienciaGlobal >= 70 ? 'bg-success/10' : eficienciaGlobal >= 50 ? 'bg-warning/10' : 'bg-destructive/10',
            ring:  eficienciaGlobal >= 70 ? 'ring-success/20' : eficienciaGlobal >= 50 ? 'ring-warning/20' : 'ring-destructive/20',
            suffix: 'produção / máquina',
          },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="group rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5"
          >
            <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl ring-4 transition-transform duration-200 group-hover:scale-105', kpi.bg, kpi.color, kpi.ring)}>
              <kpi.icon size={16} />
            </div>
            <p className="text-xl font-bold tracking-tight text-foreground">{kpi.value}</p>
            <p className="mt-0.5 text-xs font-medium text-muted-foreground">{kpi.label}</p>
            {kpi.suffix && <p className="mt-0.5 text-[10px] text-muted-foreground/60">{kpi.suffix}</p>}
          </motion.div>
        ))}
      </div>

      {/* ── Filters ── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 space-y-3 overflow-hidden"
          >
            {/* Search + dropdowns */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar código ou descrição..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 rounded-lg border border-border bg-card pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-accent w-64"
                />
              </div>

              {/* Material filter */}
              <div className="relative">
                <Filter size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={materialFilter}
                  onChange={(e) => setMaterialFilter(e.target.value)}
                  className="h-9 appearance-none rounded-lg border border-border bg-card pl-8 pr-8 text-sm text-foreground outline-none focus:border-accent"
                >
                  {materiais.map((m) => (
                    <option key={m} value={m}>{m === 'todos' ? 'Todos os materiais' : m}</option>
                  ))}
                </select>
                <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>

              {/* Priority filter */}
              <div className="relative">
                <select
                  value={prioridadeFilter}
                  onChange={(e) => setPrioridadeFilter(e.target.value as PrioridadeDobra | 'todas')}
                  className="h-9 appearance-none rounded-lg border border-border bg-card px-3 pr-8 text-sm text-foreground outline-none focus:border-accent"
                >
                  <option value="todas">Todas as prioridades</option>
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
                <ChevronDown size={11} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>

              {(search || materialFilter !== 'todos' || prioridadeFilter !== 'todas') && (
                <button
                  onClick={() => { setSearch(''); setMaterialFilter('todos'); setPrioridadeFilter('todas') }}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {/* Status filter pills */}
            <div className="flex flex-wrap gap-2">
              {(['todos', 'produzindo', 'em_setup', 'pausado', 'pendente'] as const).map((s) => {
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
                    {s === 'todos' ? 'Todos' : STATUS_CFG[s].label}
                    <span className={cn(
                      'rounded px-1 py-0.5 text-[10px] font-bold',
                      statusFilter === s && s !== 'todos' ? 'bg-white/20' : 'bg-muted-foreground/10'
                    )}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tabs ── */}
      <div className="mb-4 flex items-center gap-1 rounded-xl border border-border bg-muted p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150',
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon size={14} />
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={cn(
                'ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
                activeTab === tab.id
                  ? 'bg-accent/15 text-accent'
                  : 'bg-muted-foreground/15 text-muted-foreground'
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'fila' && (
          <motion.div
            key="fila"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {filaItems.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filaItems.map((t, i) => (
                  <TarefaCard
                    key={t.id}
                    tarefa={t}
                    now={now}
                    index={i}
                    onIniciarSetup={iniciarSetup}
                    onIniciarProducao={iniciarProducao}
                    onPausar={abrirPausaModal}
                    onRetomar={retomar}
                    onFinalizar={abrirFinalizacaoModal}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
                  <FoldVertical size={24} className="text-muted-foreground" />
                </div>
                <p className="text-base font-semibold text-foreground">Fila de dobra vazia</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {search || materialFilter !== 'todos' || prioridadeFilter !== 'todas' || statusFilter !== 'todos'
                    ? 'Nenhuma tarefa corresponde aos filtros aplicados.'
                    : 'As tarefas geradas pelo Corte aparecerão aqui.'}
                </p>
                {(search || materialFilter !== 'todos' || prioridadeFilter !== 'todas' || statusFilter !== 'todos') && (
                  <button
                    onClick={() => { setSearch(''); setMaterialFilter('todos'); setPrioridadeFilter('todas'); setStatusFilter('todos') }}
                    className="mt-3 text-sm text-accent hover:underline"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'em_producao' && (
          <motion.div
            key="em_producao"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {emProducaoItems.length > 0 ? (
              <>
                {/* Active production alert banner */}
                <AnimatePresence>
                  {emProducaoItems.some((t) => t.status === 'pausado') && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="mb-4 flex items-center gap-3 rounded-xl border border-warning/25 bg-warning/8 px-4 py-3"
                    >
                      <AlertTriangle size={15} className="text-warning flex-shrink-0" />
                      <p className="text-sm font-semibold text-warning">
                        {emProducaoItems.filter((t) => t.status === 'pausado').length} tarefa(s) pausada(s) — retome para continuar a produção.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="grid gap-4 lg:grid-cols-2">
                  {emProducaoItems.map((t, i) => (
                    <TarefaCard
                      key={t.id}
                      tarefa={t}
                      now={now}
                      index={i}
                      onIniciarSetup={iniciarSetup}
                      onIniciarProducao={iniciarProducao}
                      onPausar={abrirPausaModal}
                      onRetomar={retomar}
                      onFinalizar={abrirFinalizacaoModal}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
                  <Activity size={24} className="text-muted-foreground" />
                </div>
                <p className="text-base font-semibold text-foreground">Nenhuma dobra em andamento</p>
                <p className="mt-1 text-sm text-muted-foreground">Inicie o setup de uma tarefa para ela aparecer aqui.</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'historico' && (
          <motion.div
            key="historico"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <HistoricoView tarefas={tarefas} now={now} />
          </motion.div>
        )}

        {activeTab === 'analise' && (
          <motion.div
            key="analise"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <AnalyticsView tarefas={tarefas} now={now} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause modal */}
      <PauseModal
        open={pauseModal.open}
        onClose={() => setPauseModal({ open: false, tarefaId: null })}
        onConfirm={confirmarPausa}
      />

      {/* Finalization modal */}
      <ConfirmacaoDobraModal
        open={finalizacaoModal.open}
        tarefa={tarefas.find((t) => t.id === finalizacaoModal.tarefaId) ?? null}
        onClose={() => setFinalizacaoModal({ open: false, tarefaId: null })}
        onConfirm={confirmarFinalizacao}
      />
    </div>
    </PermissionGate>
  )
}
