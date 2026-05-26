'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Scissors,
  Play,
  Pause,
  Square,
  RotateCcw,
  Settings2,
  Clock,
  Activity,
  Cpu,
  CheckCircle2,
  TrendingUp,
  BarChart2,
  ListChecks,
  User,
  Tag,
  Download,
  FileText,
  PackageCheck,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { toast } from '@/lib/toast'
import { OS_ESTOQUE } from '@/types/estoque'
import { useDobra } from '@/contexts/DobraContext'
import { Input } from '@/components/ui/input'

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusProducao = 'pendente' | 'em_setup' | 'produzindo' | 'pausado' | 'finalizado'
type Prioridade = 'alta' | 'media' | 'baixa'
type TabView = 'fila' | 'analise' | 'relatorios'
type ReportPeriod = 'hoje' | 'semana' | 'mes'

interface OrdemServico {
  numero: string
  codigoPeca: string
  peca: string
  quantidade: number
  material: string
  espessura: number
}

interface PausaRegistro {
  id: string
  motivo: string
  inicio: Date
  fim: Date | null
  duracao: number | null
}

interface SessaoProducao {
  id: string
  codigo: string
  nome: string
  maquina: string
  operador: string
  material: string
  quantidadeProgramada: number
  ordens: OrdemServico[]
  prioridade: Prioridade
  tempoEstimadoMin: number
  status: StatusProducao
  criadoEm: Date
  setupInicio: Date | null
  setupFim: Date | null
  producaoInicio: Date | null
  producaoFim: Date | null
  pausas: PausaRegistro[]
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<StatusProducao, {
  label: string; color: string; bg: string; border: string; dot: string; pulse: boolean
}> = {
  pendente:   { label: 'Pendente',   color: 'text-warning',          bg: 'bg-warning/10',      border: 'border-warning/25',      dot: 'bg-warning',          pulse: false },
  em_setup:   { label: 'Em Setup',   color: 'text-primary',          bg: 'bg-primary/10',      border: 'border-primary/25',      dot: 'bg-primary',          pulse: true  },
  produzindo: { label: 'Produzindo', color: 'text-success',          bg: 'bg-success/10',      border: 'border-success/25',      dot: 'bg-success',          pulse: true  },
  pausado:    { label: 'Pausado',    color: 'text-destructive',      bg: 'bg-destructive/10',  border: 'border-destructive/25',  dot: 'bg-destructive',      pulse: false },
  finalizado: { label: 'Finalizado', color: 'text-muted-foreground', bg: 'bg-muted',           border: 'border-border',          dot: 'bg-muted-foreground', pulse: false },
}

const PRIO_CFG: Record<Prioridade, { label: string; color: string; bg: string }> = {
  alta:  { label: 'Alta',   color: 'text-destructive',      bg: 'bg-destructive/8' },
  media: { label: 'Média',  color: 'text-warning',          bg: 'bg-warning/8'     },
  baixa: { label: 'Baixa',  color: 'text-muted-foreground', bg: 'bg-muted'         },
}

const MOTIVOS = [
  'Troca de ferramenta',
  'Ajuste de parâmetros',
  'Falta de material',
  'Manutenção não planejada',
  'Pausa do operador',
  'Inspeção de qualidade',
  'Outro',
]

const CHART_COLORS = ['#0f4c5c', '#000080', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

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

function getSetupSecs(sess: SessaoProducao, now: number): number {
  if (!sess.setupInicio) return 0
  const endMs = sess.setupFim
    ? sess.setupFim.getTime()
    : sess.status === 'em_setup'
      ? now
      : sess.producaoInicio?.getTime() ?? now
  return Math.max(0, Math.floor((endMs - sess.setupInicio.getTime()) / 1000))
}

function getPauseSecs(sess: SessaoProducao, now: number): number {
  return sess.pausas.reduce((acc, p) => {
    const endMs = p.fim ? p.fim.getTime() : now
    return acc + Math.max(0, Math.floor((endMs - p.inicio.getTime()) / 1000))
  }, 0)
}

function getProducaoSecs(sess: SessaoProducao, now: number): number {
  if (!sess.producaoInicio) return 0
  const endMs = sess.producaoFim ? sess.producaoFim.getTime() : now
  const total = Math.max(0, Math.floor((endMs - sess.producaoInicio.getTime()) / 1000))
  return Math.max(0, total - getPauseSecs(sess, now))
}

function getMachineSecs(sess: SessaoProducao, now: number): number {
  if (!sess.setupInicio) return 0
  const endMs = sess.producaoFim?.getTime() ?? now
  return Math.max(0, Math.floor((endMs - sess.setupInicio.getTime()) / 1000))
}

function getEficiencia(sess: SessaoProducao, now: number): number {
  const setup = getSetupSecs(sess, now)
  const prod = getProducaoSecs(sess, now)
  const total = setup + prod
  if (total === 0) return 0
  return Math.round((prod / total) * 100)
}

// ─── Initial Data ─────────────────────────────────────────────────────────────

function buildInitialSessions(): SessaoProducao[] {
  const now = Date.now()
  const ago = (min: number) => new Date(now - min * 60 * 1000)

  return [
    {
      id: 'c1',
      codigo: 'CNC-P0421',
      nome: 'Usinagem Flange Ø150',
      maquina: 'CNC-001',
      operador: 'Carlos Lima',
      material: 'Aço Inox 304',
      quantidadeProgramada: 24,
      ordens: [
        { numero: 'OS:1508', codigoPeca: 'FLG-150-PN16', peca: 'Flange DN150 PN16', quantidade: 12, material: 'Aço Inox 304', espessura: 12.7 },
        { numero: 'OS:1508', codigoPeca: 'FLG-150-PN25', peca: 'Flange DN150 PN25', quantidade: 12, material: 'Aço Inox 304', espessura: 12.7 },
      ],
      prioridade: 'alta',
      tempoEstimadoMin: 45,
      status: 'produzindo',
      criadoEm: ago(180),
      setupInicio: ago(25),
      setupFim: ago(8),
      producaoInicio: ago(8),
      producaoFim: null,
      pausas: [],
    },
    {
      id: 'c2',
      codigo: 'LASER-P0118',
      nome: 'Corte Chapa 500x300',
      maquina: 'LASER-002',
      operador: 'Ana Ferreira',
      material: 'Aço Inox 316',
      quantidadeProgramada: 60,
      ordens: [
        { numero: 'OS:1025', codigoPeca: 'CHP-500-300', peca: 'Chapa recortada 500x300', quantidade: 60, material: 'Aço Inox 316', espessura: 3.0 },
      ],
      prioridade: 'media',
      tempoEstimadoMin: 12,
      status: 'em_setup',
      criadoEm: ago(45),
      setupInicio: ago(3),
      setupFim: null,
      producaoInicio: null,
      producaoFim: null,
      pausas: [],
    },
    {
      id: 'c3',
      codigo: 'CNC-P0388',
      nome: 'Fresa Suporte L-200',
      maquina: 'CNC-002',
      operador: 'Marcos Oliveira',
      material: 'Aço Carbono 1020',
      quantidadeProgramada: 18,
      ordens: [
        { numero: 'OS:1508', codigoPeca: 'SUP-L200-E', peca: 'Suporte L-200 Esq.', quantidade: 9, material: 'Aço Carbono 1020', espessura: 6.0 },
        { numero: 'OS:1019', codigoPeca: 'SUP-L200-D', peca: 'Suporte L-200 Dir.', quantidade: 9, material: 'Aço Carbono 1020', espessura: 6.0 },
      ],
      prioridade: 'alta',
      tempoEstimadoMin: 28,
      status: 'pausado',
      criadoEm: ago(120),
      setupInicio: ago(55),
      setupFim: ago(38),
      producaoInicio: ago(38),
      producaoFim: null,
      pausas: [
        {
          id: 'p1',
          motivo: 'Troca de ferramenta',
          inicio: ago(5),
          fim: null,
          duracao: null,
        },
      ],
    },
    {
      id: 'c4',
      codigo: 'PLASMA-P0067',
      nome: 'Corte Plasma Perfil U',
      maquina: 'PLASMA-001',
      operador: 'Roberto Costa',
      material: 'Aço Carbono 1020',
      quantidadeProgramada: 40,
      ordens: [
        { numero: 'OS:1010', codigoPeca: 'PFU-100x50', peca: 'Perfil U 100x50', quantidade: 20, material: 'Aço Carbono 1020', espessura: 4.0 },
        { numero: 'OS:1508', codigoPeca: 'PFU-150x75', peca: 'Perfil U 150x75', quantidade: 20, material: 'Aço Carbono 1020', espessura: 5.0 },
      ],
      prioridade: 'media',
      tempoEstimadoMin: 20,
      status: 'finalizado',
      criadoEm: ago(240),
      setupInicio: ago(230),
      setupFim: ago(210),
      producaoInicio: ago(210),
      producaoFim: ago(170),
      pausas: [],
    },
    {
      id: 'c5',
      codigo: 'CNC-P0219',
      nome: 'Torneamento Eixo Ø50',
      maquina: 'TORNO-001',
      operador: 'Paulo Santos',
      material: 'Aço Carbono 1045',
      quantidadeProgramada: 8,
      ordens: [
        { numero: 'OS:1005', codigoPeca: 'EXO-50-300', peca: 'Eixo Ø50 L=300', quantidade: 8, material: 'Aço Carbono 1045', espessura: 50.0 },
      ],
      prioridade: 'baixa',
      tempoEstimadoMin: 65,
      status: 'finalizado',
      criadoEm: ago(360),
      setupInicio: ago(350),
      setupFim: ago(320),
      producaoInicio: ago(320),
      producaoFim: ago(250),
      pausas: [
        {
          id: 'p2',
          motivo: 'Ajuste de parâmetros',
          inicio: ago(310),
          fim: ago(300),
          duracao: 600,
        },
      ],
    },
    {
      id: 'c6',
      codigo: 'CNC-P0445',
      nome: 'Tampa de Proteção CNC',
      maquina: 'CNC-003',
      operador: 'Carlos Lima',
      material: 'Alumínio 6061',
      quantidadeProgramada: 12,
      ordens: [
        { numero: 'OS:1508', codigoPeca: 'TPR-CNC3-S', peca: 'Tampa CNC-003 Sup.', quantidade: 6, material: 'Alumínio 6061', espessura: 4.0 },
        { numero: 'OS:1508', codigoPeca: 'TPR-CNC3-I', peca: 'Tampa CNC-003 Inf.', quantidade: 6, material: 'Alumínio 6061', espessura: 4.0 },
      ],
      prioridade: 'media',
      tempoEstimadoMin: 38,
      status: 'pendente',
      criadoEm: ago(30),
      setupInicio: null,
      setupFim: null,
      producaoInicio: null,
      producaoFim: null,
      pausas: [],
    },
    {
      id: 'c7',
      codigo: 'LASER-P0122',
      nome: 'Corte Perfil Estrutural',
      maquina: 'LASER-001',
      operador: 'Ana Ferreira',
      material: 'Aço Carbono 1020',
      quantidadeProgramada: 30,
      ordens: [
        { numero: 'OS:1508', codigoPeca: 'PFE-A-300', peca: 'Perfil Estrutural A', quantidade: 15, material: 'Aço Carbono 1020', espessura: 8.0 },
        { numero: 'OS:1034', codigoPeca: 'PFE-B-300', peca: 'Perfil Estrutural B', quantidade: 15, material: 'Aço Carbono 1020', espessura: 8.0 },
      ],
      prioridade: 'alta',
      tempoEstimadoMin: 22,
      status: 'pendente',
      criadoEm: ago(15),
      setupInicio: null,
      setupFim: null,
      producaoInicio: null,
      producaoFim: null,
      pausas: [],
    },
  ]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusProducao }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold', cfg.bg, cfg.color)}>
      <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', cfg.dot, cfg.pulse && 'animate-pulse')} />
      {cfg.label}
    </span>
  )
}

function PrioridadeBadge({ prioridade }: { prioridade: Prioridade }) {
  const cfg = PRIO_CFG[prioridade]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', cfg.bg, cfg.color)}>
      {cfg.label}
    </span>
  )
}

function TimerBlock({ label, secs, accent = false, large = false }: {
  label: string
  secs: number
  accent?: boolean
  large?: boolean
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

function OSDistributionBar({ ordens, producaoSecs }: { ordens: OrdemServico[]; producaoSecs: number }) {
  if (ordens.length === 0 || producaoSecs === 0) return null
  const secsPerOS = Math.floor(producaoSecs / ordens.length)

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        Distribuição por OS
      </p>
      {ordens.map((os, i) => {
        const pct = Math.round(100 / ordens.length)
        return (
          <div key={`${os.numero}-${i}`} className="space-y-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{os.numero}</span>
              <span className="text-muted-foreground">{fmtHM(secsPerOS)}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PauseModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (motivo: string) => void
}) {
  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [outro, setOutro] = useState('')

  function handleConfirm() {
    const finalMotivo = motivo === 'Outro' ? (outro.trim() || 'Outro') : motivo
    onConfirm(finalMotivo)
    setMotivo(MOTIVOS[0])
    setOutro('')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pause size={15} className="text-destructive" />
            Pausar Produção
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 pb-2">
          <p className="text-sm text-muted-foreground">
            Selecione o motivo da pausa. O tempo será registrado para análise de produtividade.
          </p>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider">Motivo da Pausa</Label>
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
                    name="motivo"
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
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
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
          <Button
            size="sm"
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={handleConfirm}
          >
            <Pause size={13} />
            Confirmar Pausa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmacaoProducaoModal({
  open,
  session,
  onClose,
  onConfirm,
}: {
  open: boolean
  session: SessaoProducao | null
  onClose: () => void
  onConfirm: (realQtys: Record<string, number>) => void
}) {
  const [qtys, setQtys] = useState<Record<string, number>>({})
  const [qualidadeOk, setQualidadeOk] = useState(false)

  useEffect(() => {
    if (session) {
      const initial: Record<string, number> = {}
      session.ordens.forEach((o) => { initial[o.codigoPeca] = o.quantidade })
      setQtys(initial)
      setQualidadeOk(false)
    }
  }, [session])

  const estoqueOrdens = session?.ordens.filter((o) => o.numero === OS_ESTOQUE) ?? []
  const outrasOrdens = session?.ordens.filter((o) => o.numero !== OS_ESTOQUE) ?? []

  function handleConfirm() {
    if (!qualidadeOk || !session) return
    onConfirm(qtys)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck size={15} className="text-accent" />
            Confirmar Finalização — {session?.nome}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-5 pb-2">
          <p className="text-sm text-muted-foreground">
            Informe as quantidades reais produzidas. Peças destinadas ao estoque (OS:1508) serão lançadas automaticamente no inventário.
          </p>

          {estoqueOrdens.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-bold text-accent">
                  OS:1508 — Entrará no Estoque após Dobra
                </span>
              </div>
              {estoqueOrdens.map((os) => (
                <div key={os.codigoPeca} className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{os.peca}</p>
                      <p className="text-xs font-mono text-muted-foreground">{os.codigoPeca}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {os.material} · Esp. {os.espessura}mm
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      Programado: {os.quantidade}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">Qtd. Real:</Label>
                    <Input
                      type="number"
                      min={0}
                      value={qtys[os.codigoPeca] ?? os.quantidade}
                      onChange={(e) =>
                        setQtys((prev) => ({ ...prev, [os.codigoPeca]: parseInt(e.target.value) || 0 }))
                      }
                      className="h-7 w-24 text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {outrasOrdens.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Ordens de Cliente (não entram no estoque)
              </p>
              {outrasOrdens.map((os) => (
                <div
                  key={os.codigoPeca}
                  className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
                >
                  <div>
                    <span className="text-xs font-semibold text-foreground">{os.peca}</span>
                    <span className="ml-2 text-xs font-mono text-muted-foreground">{os.numero}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{os.quantidade} pç</span>
                </div>
              ))}
            </div>
          )}

          <label
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
              qualidadeOk
                ? 'border-success/30 bg-success/5'
                : 'border-border hover:border-muted-foreground/30'
            )}
          >
            <input
              type="checkbox"
              checked={qualidadeOk}
              onChange={(e) => setQualidadeOk(e.target.checked)}
              className="h-4 w-4 accent-green-600"
            />
            <div>
              <p className="text-sm font-semibold text-foreground">Qualidade verificada</p>
              <p className="text-xs text-muted-foreground">
                Confirmo que as peças foram inspecionadas e aprovadas
              </p>
            </div>
          </label>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={!qualidadeOk}
            className="gap-1.5 bg-accent hover:bg-accent/90 text-white disabled:opacity-50"
            onClick={handleConfirm}
          >
            <PackageCheck size={13} />
            {estoqueOrdens.length > 0 ? 'Finalizar e Registrar Estoque' : 'Finalizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ProductionCard({
  sess,
  now,
  onIniciarSetup,
  onIniciarProducao,
  onPausar,
  onRetomar,
  onFinalizar,
  index,
}: {
  sess: SessaoProducao
  now: number
  onIniciarSetup: (id: string) => void
  onIniciarProducao: (id: string) => void
  onPausar: (id: string) => void
  onRetomar: (id: string) => void
  onFinalizar: (id: string) => void
  index: number
}) {
  const { canEdit } = useAuth()
  const cfg = STATUS_CFG[sess.status]
  const setupSecs = getSetupSecs(sess, now)
  const producaoSecs = getProducaoSecs(sess, now)
  const pauseSecs = getPauseSecs(sess, now)
  const machineSecs = getMachineSecs(sess, now)
  const eficiencia = getEficiencia(sess, now)
  const isActive = sess.status === 'produzindo' || sess.status === 'em_setup'
  const estimadoSecs = sess.tempoEstimadoMin * 60
  const progressPct = estimadoSecs > 0
    ? Math.min(100, Math.round((producaoSecs / estimadoSecs) * 100))
    : 0

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
      <div
        className={cn('h-0.5 w-full', {
          'bg-warning': sess.status === 'pendente',
          'bg-primary': sess.status === 'em_setup',
          'bg-success': sess.status === 'produzindo',
          'bg-destructive': sess.status === 'pausado',
          'bg-muted-foreground/30': sess.status === 'finalizado',
        })}
      />

      <div className="p-4 flex flex-col gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={sess.status} />
            <PrioridadeBadge prioridade={sess.prioridade} />
          </div>
          <span className="flex-shrink-0 rounded-md border border-border bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
            {sess.maquina}
          </span>
        </div>

        {/* Program info */}
        <div>
          <p className="text-sm font-bold text-foreground leading-snug">{sess.nome}</p>
          <p className="text-xs font-mono text-muted-foreground mt-0.5">{sess.codigo}</p>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User size={11} className="flex-shrink-0" />
            <span className="truncate">{sess.operador}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Tag size={11} className="flex-shrink-0" />
            <span className="truncate">{sess.material}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ListChecks size={11} className="flex-shrink-0" />
            <span>{sess.quantidadeProgramada} peças</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock size={11} className="flex-shrink-0" />
            <span>Est. {sess.tempoEstimadoMin}min</span>
          </div>
        </div>

        {/* OS list */}
        <div className="flex flex-wrap gap-1">
          {sess.ordens.map((os, i) => (
            <span
              key={`${sess.id}-${os.numero}-${i}`}
              className="rounded-md border border-accent/20 bg-accent/5 px-1.5 py-0.5 text-[10px] font-semibold text-accent"
            >
              {os.numero}
            </span>
          ))}
        </div>

        {/* Timer section */}
        {(sess.status !== 'pendente') && (
          <>
            <Separator />
            {sess.status === 'em_setup' && (
              <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/15 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Settings2 size={14} className="text-primary animate-spin" style={{ animationDuration: '3s' }} />
                  <span className="text-xs font-semibold text-primary">Setup em andamento</span>
                </div>
                <TimerBlock label="Tempo" secs={setupSecs} accent large={false} />
              </div>
            )}

            {(sess.status === 'produzindo' || sess.status === 'pausado') && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg bg-muted/60 px-2.5 py-2">
                    <TimerBlock label="Setup" secs={setupSecs} />
                  </div>
                  <div className={cn(
                    'rounded-lg px-2.5 py-2',
                    sess.status === 'produzindo' ? 'bg-success/8 border border-success/15' : 'bg-muted/60'
                  )}>
                    <TimerBlock label="Produção" secs={producaoSecs} accent={sess.status === 'produzindo'} />
                  </div>
                  {sess.pausas.length > 0 && (
                    <div className="rounded-lg bg-destructive/8 px-2.5 py-2">
                      <TimerBlock label="Pausas" secs={pauseSecs} />
                    </div>
                  )}
                </div>
                {/* Progress toward estimated time */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Progresso estimado</span>
                    <span>{progressPct}%</span>
                  </div>
                  <Progress value={progressPct} accent className="h-1.5" />
                </div>
                {/* OS distribution if producing */}
                {sess.status === 'produzindo' && producaoSecs > 0 && (
                  <OSDistributionBar ordens={sess.ordens} producaoSecs={producaoSecs} />
                )}
              </div>
            )}

            {sess.status === 'finalizado' && (
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
                    <p className={cn('text-sm font-bold', eficiencia >= 70 ? 'text-success' : eficiencia >= 50 ? 'text-warning' : 'text-destructive')}>
                      {eficiencia}%
                    </p>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Tempo Total de Máquina</p>
                  <p className="text-sm font-bold text-foreground">{fmtHM(machineSecs)}</p>
                </div>
                <OSDistributionBar ordens={sess.ordens} producaoSecs={producaoSecs} />
              </div>
            )}
          </>
        )}

        {/* Actions */}
        {canEdit('corte') && <div className="flex flex-wrap gap-2 pt-1">
          {sess.status === 'pendente' && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1.5 border-primary/30 text-primary hover:bg-primary/8 hover:border-primary"
              onClick={() => onIniciarSetup(sess.id)}
            >
              <Settings2 size={13} />
              Iniciar Setup
            </Button>
          )}

          {sess.status === 'em_setup' && (
            <Button
              size="sm"
              className="flex-1 gap-1.5 bg-success hover:bg-success/90 text-white"
              onClick={() => onIniciarProducao(sess.id)}
            >
              <Play size={13} />
              Iniciar Produção
            </Button>
          )}

          {sess.status === 'produzindo' && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-warning/30 text-warning hover:bg-warning/8 hover:border-warning"
                onClick={() => onPausar(sess.id)}
              >
                <Pause size={13} />
                Pausar
              </Button>
              <Button
                size="sm"
                className="flex-1 gap-1.5 bg-accent hover:bg-accent/90 text-white"
                onClick={() => onFinalizar(sess.id)}
              >
                <Square size={13} />
                Finalizar
              </Button>
            </>
          )}

          {sess.status === 'pausado' && (
            <>
              <Button
                size="sm"
                className="flex-1 gap-1.5 bg-success hover:bg-success/90 text-white"
                onClick={() => onRetomar(sess.id)}
              >
                <RotateCcw size={13} />
                Retomar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-accent/30 text-accent hover:bg-accent/8 hover:border-accent"
                onClick={() => onFinalizar(sess.id)}
              >
                <Square size={13} />
                Finalizar
              </Button>
            </>
          )}
        </div>}
      </div>
    </motion.div>
  )
}

// ─── Analytics View ───────────────────────────────────────────────────────────

function AnalyticsView({ sessions, now }: { sessions: SessaoProducao[]; now: number }) {
  const machineData = Object.entries(
    sessions.reduce((acc, s) => {
      const secs = getSetupSecs(s, now) + getProducaoSecs(s, now)
      acc[s.maquina] = (acc[s.maquina] ?? 0) + secs
      return acc
    }, {} as Record<string, number>)
  )
    .filter(([, secs]) => secs > 0)
    .map(([maq, secs]) => ({ maquina: maq, minutos: Math.round(secs / 60) }))
    .sort((a, b) => b.minutos - a.minutos)

  const operatorData = Object.entries(
    sessions.reduce((acc, s) => {
      const secs = getProducaoSecs(s, now)
      if (secs > 0) acc[s.operador] = (acc[s.operador] ?? 0) + secs
      return acc
    }, {} as Record<string, number>)
  ).map(([op, secs]) => ({
    operador: op.split(' ')[0],
    minutos: Math.round(secs / 60),
  }))

  const osData = sessions.flatMap((s) => {
    const prodSecs = getProducaoSecs(s, now)
    if (s.ordens.length === 0) return []
    const secsPerOS = Math.floor(prodSecs / s.ordens.length)
    return s.ordens.map((os) => ({
      numero: os.numero,
      programa: s.codigo,
      peca: os.peca,
      maquina: s.maquina,
      operador: s.operador.split(' ')[0],
      status: s.status,
      tempoMin: Math.round(secsPerOS / 60),
    }))
  })

  const pieData = machineData.map((m, i) => ({
    name: m.maquina,
    value: m.minutos,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }))

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Tempo por Máquina</CardTitle>
            <CardDescription>Minutos de utilização (hoje)</CardDescription>
          </CardHeader>
          <CardContent>
            {machineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={machineData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="maquina" tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12 }}
                    formatter={(v) => [`${v} min`, 'Tempo']}
                  />
                  <Bar dataKey="minutos" fill="#0f4c5c" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-44 items-center justify-center text-sm text-muted-foreground">Sem dados disponíveis</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Utilização de Máquinas</CardTitle>
            <CardDescription>Distribuição proporcional do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-1 flex-col gap-1.5">
                  {pieData.map((item, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-foreground">{item.value}min</span>
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
            <CardDescription>Minutos de produção ativa (sem pausa)</CardDescription>
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

      {/* OS distribution table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Distribuição de Tempo por OS</CardTitle>
          <CardDescription>
            Tempo de produção dividido proporcionalmente entre todas as ordens vinculadas ao programa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {osData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Ordem', 'Programa', 'Peça', 'Máquina', 'Operador', 'T. Atribuído', 'Status'].map((h) => (
                      <th key={h} className="pb-2 pr-4 text-left font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {osData.map((row, i) => {
                    const scfg = STATUS_CFG[row.status as StatusProducao]
                    return (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 pr-4 font-semibold text-accent">{row.numero}</td>
                        <td className="py-2.5 pr-4 font-mono text-muted-foreground">{row.programa}</td>
                        <td className="py-2.5 pr-4 text-foreground">{row.peca}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{row.maquina}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground">{row.operador}</td>
                        <td className="py-2.5 pr-4 font-semibold text-foreground">{row.tempoMin > 0 ? `${row.tempoMin}min` : '—'}</td>
                        <td className="py-2.5">
                          <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-semibold', scfg.bg, scfg.color)}>
                            {scfg.label}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <FileText size={24} className="text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum dado disponível. Inicie a produção para ver a distribuição por OS.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Reports View ─────────────────────────────────────────────────────────────

function RelatoriosView({ sessions, now }: { sessions: SessaoProducao[]; now: number }) {
  const [period, setPeriod] = useState<ReportPeriod>('hoje')

  const rows = sessions.map((s) => ({
    id: s.id,
    codigo: s.codigo,
    nome: s.nome,
    maquina: s.maquina,
    operador: s.operador,
    setupMin: Math.round(getSetupSecs(s, now) / 60),
    producaoMin: Math.round(getProducaoSecs(s, now) / 60),
    pausaMin: Math.round(getPauseSecs(s, now) / 60),
    totalMin: Math.round(getMachineSecs(s, now) / 60),
    eficiencia: getEficiencia(s, now),
    ordens: s.ordens.map((o) => o.numero).join(', '),
    status: s.status,
    qtd: s.quantidadeProgramada,
  }))

  const totalProducao = rows.reduce((a, r) => a + r.producaoMin, 0)
  const totalSetup = rows.reduce((a, r) => a + r.setupMin, 0)
  const totalPausa = rows.reduce((a, r) => a + r.pausaMin, 0)
  const finalizados = rows.filter((r) => r.status === 'finalizado').length
  const avgEficiencia = rows.filter((r) => r.eficiencia > 0).length > 0
    ? Math.round(rows.filter((r) => r.eficiencia > 0).reduce((a, r) => a + r.eficiencia, 0) / rows.filter((r) => r.eficiencia > 0).length)
    : 0

  const periodLabel = { hoje: 'Hoje', semana: 'Esta Semana', mes: 'Este Mês' }[period]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* Period selector */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
          {(['hoje', 'semana', 'mes'] as ReportPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-semibold transition-all',
                period === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {{ hoje: 'Hoje', semana: 'Semana', mes: 'Mês' }[p]}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm">
          <Download size={13} />
          Exportar {periodLabel}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'T. Produtivo', value: `${totalProducao}min`, icon: Activity, color: 'text-success', bg: 'bg-success/10' },
          { label: 'T. Setup',     value: `${totalSetup}min`,    icon: Settings2, color: 'text-primary', bg: 'bg-primary/10' },
          { label: 'T. Pausa',     value: `${totalPausa}min`,    icon: Pause,     color: 'text-destructive', bg: 'bg-destructive/10' },
          { label: 'Finalizados',  value: `${finalizados}`,      icon: CheckCircle2, color: 'text-accent', bg: 'bg-accent/10' },
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

      {/* Efficiency banner */}
      {avgEficiencia > 0 && (
        <div className={cn(
          'flex items-center justify-between rounded-xl border px-5 py-3',
          avgEficiencia >= 70 ? 'border-success/20 bg-success/5' : 'border-warning/20 bg-warning/5'
        )}>
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className={avgEficiencia >= 70 ? 'text-success' : 'text-warning'} />
            <span className="text-sm font-semibold text-foreground">Eficiência Média do Turno</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-32 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${avgEficiencia}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={cn('h-full rounded-full', avgEficiencia >= 70 ? 'bg-success' : 'bg-warning')}
              />
            </div>
            <span className={cn('text-lg font-bold', avgEficiencia >= 70 ? 'text-success' : 'text-warning')}>
              {avgEficiencia}%
            </span>
          </div>
        </div>
      )}

      {/* Report table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Relatório de Produção — {periodLabel}</CardTitle>
          <CardDescription>Todos os programas executados com métricas detalhadas</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  {['Programa', 'Máquina', 'Operador', 'Setup', 'Produção', 'Pausa', 'Total Máq.', 'Efic.', 'OS', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold text-muted-foreground uppercase tracking-wide text-[10px] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const scfg = STATUS_CFG[row.status]
                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-semibold text-foreground">{row.nome}</p>
                        <p className="font-mono text-muted-foreground">{row.codigo}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{row.maquina}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{row.operador.split(' ')[0]}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-primary">{row.setupMin > 0 ? `${row.setupMin}min` : '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-success">{row.producaoMin > 0 ? `${row.producaoMin}min` : '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-destructive">{row.pausaMin > 0 ? `${row.pausaMin}min` : '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold text-foreground">{row.totalMin > 0 ? `${row.totalMin}min` : '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.eficiencia > 0 ? (
                          <span className={cn('font-bold', row.eficiencia >= 70 ? 'text-success' : row.eficiencia >= 50 ? 'text-warning' : 'text-destructive')}>
                            {row.eficiencia}%
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-accent text-[10px] font-semibold">{row.ordens || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-semibold', scfg.bg, scfg.color)}>
                          {scfg.label}
                        </span>
                      </td>
                    </motion.tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CortePage() {
  const { adicionarTarefas } = useDobra()
  const [sessions, setSessions] = useState<SessaoProducao[]>(() => buildInitialSessions())
  const [activeTab, setActiveTab] = useState<TabView>('fila')
  const [statusFilter, setStatusFilter] = useState<StatusProducao | 'todos'>('todos')
  const [pauseModal, setPauseModal] = useState<{ open: boolean; sessionId: string | null }>({ open: false, sessionId: null })
  const [confirmacaoModal, setConfirmacaoModal] = useState<{ open: boolean; sessionId: string | null }>({ open: false, sessionId: null })
  const [, setTick] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  // Tick every second for live timers
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1)
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const mutate = useCallback((id: string, updater: (s: SessaoProducao) => SessaoProducao) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? updater(s) : s)))
  }, [])

  function iniciarSetup(id: string) {
    mutate(id, (s) => ({ ...s, status: 'em_setup', setupInicio: new Date() }))
    toast('info', 'Setup iniciado', 'Temporizador de setup em andamento.')
  }

  function iniciarProducao(id: string) {
    const t = new Date()
    mutate(id, (s) => ({ ...s, status: 'produzindo', setupFim: t, producaoInicio: t }))
    toast('success', 'Produção iniciada', 'Temporizador de produção em andamento.')
  }

  function abrirPausaModal(id: string) {
    setPauseModal({ open: true, sessionId: id })
  }

  function confirmarPausa(motivo: string) {
    if (!pauseModal.sessionId) return
    const id = pauseModal.sessionId
    const pausa: PausaRegistro = { id: `p-${Date.now()}`, motivo, inicio: new Date(), fim: null, duracao: null }
    mutate(id, (s) => ({ ...s, status: 'pausado', pausas: [...s.pausas, pausa] }))
    setPauseModal({ open: false, sessionId: null })
    toast('warning', 'Produção pausada', `Motivo: ${motivo}`)
  }

  function retomar(id: string) {
    const fim = new Date()
    mutate(id, (s) => {
      const pausas = s.pausas.map((p) => {
        if (p.fim !== null) return p
        const dur = Math.floor((fim.getTime() - p.inicio.getTime()) / 1000)
        return { ...p, fim, duracao: dur }
      })
      return { ...s, status: 'produzindo', pausas }
    })
    toast('success', 'Produção retomada', 'Temporizador reativado.')
  }

  function finalizar(id: string) {
    const fim = new Date()
    mutate(id, (s) => {
      const pausas = s.pausas.map((p) => {
        if (p.fim !== null) return p
        const dur = Math.floor((fim.getTime() - p.inicio.getTime()) / 1000)
        return { ...p, fim, duracao: dur }
      })
      return { ...s, status: 'finalizado', producaoFim: fim, pausas }
    })
    toast('success', 'Programa finalizado', 'Tempo total calculado com sucesso.')
  }

  function abrirConfirmacaoModal(id: string) {
    setConfirmacaoModal({ open: true, sessionId: id })
  }

  function confirmarProducao(realQtys: Record<string, number>) {
    if (!confirmacaoModal.sessionId) return
    const id = confirmacaoModal.sessionId
    const sess = sessions.find((s) => s.id === id)
    if (!sess) return

    adicionarTarefas(
      sess.ordens.map((o) => ({
        codigoPeca: o.codigoPeca,
        descricao: o.peca,
        quantidade: realQtys[o.codigoPeca] ?? o.quantidade,
        quantidadePlanejada: o.quantidade,
        programaOrigem: sess.codigo,
        programaOrigemId: sess.id,
        osVinculadas: [o.numero],
        prioridade: sess.prioridade,
        material: o.material,
        espessura: o.espessura,
        liberadoEm: new Date(),
      }))
    )
    toast('info', 'Dobra notificada', `${sess.ordens.length} tarefa(s) adicionada(s) à fila de dobra.`)

    setConfirmacaoModal({ open: false, sessionId: null })
    finalizar(id)
  }

  // KPI calculations
  const maquinasOperando = sessions.filter((s) => s.status === 'produzindo').length
  const finalizados = sessions.filter((s) => s.status === 'finalizado').length
  const totalSetupSecs = sessions.reduce((a, s) => a + getSetupSecs(s, now), 0)
  const totalProdSecs = sessions.reduce((a, s) => a + getProducaoSecs(s, now), 0)
  const totalMachSecs = totalSetupSecs + totalProdSecs
  const eficienciaGlobal = totalMachSecs > 0
    ? Math.round((totalProdSecs / totalMachSecs) * 100)
    : 0

  const filtered = sessions.filter((s) => statusFilter === 'todos' || s.status === statusFilter)
  const statusOrder: Record<StatusProducao, number> = { produzindo: 0, em_setup: 1, pausado: 2, pendente: 3, finalizado: 4 }
  const sorted = [...filtered].sort((a, b) => statusOrder[a.status] - statusOrder[b.status])

  const TABS = [
    { id: 'fila' as TabView,       label: 'Fila de Produção', icon: ListChecks },
    { id: 'analise' as TabView,    label: 'Análise',          icon: BarChart2   },
    { id: 'relatorios' as TabView, label: 'Relatórios',       icon: FileText    },
  ]

  return (
    <PermissionGate module="corte">
    <div>
      <PageHeader
        title="Corte"
        subtitle="Controle de Produção — Puncionadeira e CNC"
        breadcrumbs={[{ label: 'Esync', href: '/dashboard' }, { label: 'Corte' }]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/8 px-3 py-1.5 text-xs font-semibold text-success">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              {maquinasOperando} em operação
            </div>
          </div>
        }
      />

      {/* ── KPI Cards ── */}
      <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
        {[
          {
            label: 'Máquinas Operando',
            value: maquinasOperando,
            icon: Cpu,
            color: 'text-success',
            bg: 'bg-success/10',
            ring: 'ring-success/20',
            suffix: `/ ${sessions.length} total`,
          },
          {
            label: 'Tempo de Setup',
            value: fmtHM(totalSetupSecs),
            icon: Settings2,
            color: 'text-primary',
            bg: 'bg-primary/10',
            ring: 'ring-primary/20',
            suffix: 'acumulado hoje',
          },
          {
            label: 'Tempo Produtivo',
            value: fmtHM(totalProdSecs),
            icon: Activity,
            color: 'text-accent',
            bg: 'bg-accent/10',
            ring: 'ring-accent/20',
            suffix: 'produção ativa',
          },
          {
            label: 'Finalizados',
            value: finalizados,
            icon: CheckCircle2,
            color: 'text-success',
            bg: 'bg-success/10',
            ring: 'ring-success/20',
            suffix: 'programas hoje',
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
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'fila' && (
          <motion.div
            key="fila"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {/* Status filter */}
            <div className="mb-4 flex flex-wrap gap-2">
              {(['todos', 'produzindo', 'em_setup', 'pausado', 'pendente', 'finalizado'] as const).map((s) => {
                const count = s === 'todos'
                  ? sessions.length
                  : sessions.filter((x) => x.status === s).length
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
                    {s !== 'todos' && cfg && (
                      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                    )}
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

            {/* Production cards grid */}
            {sorted.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {sorted.map((sess, i) => (
                  <ProductionCard
                    key={sess.id}
                    sess={sess}
                    now={now}
                    index={i}
                    onIniciarSetup={iniciarSetup}
                    onIniciarProducao={iniciarProducao}
                    onPausar={abrirPausaModal}
                    onRetomar={retomar}
                    onFinalizar={abrirConfirmacaoModal}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted mb-4">
                  <Scissors size={24} className="text-muted-foreground" />
                </div>
                <p className="text-base font-semibold text-foreground">Nenhum programa encontrado</p>
                <p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros de status para ver outros programas.</p>
              </div>
            )}
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
            <AnalyticsView sessions={sessions} now={now} />
          </motion.div>
        )}

        {activeTab === 'relatorios' && (
          <motion.div
            key="relatorios"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <RelatoriosView sessions={sessions} now={now} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause modal */}
      <PauseModal
        open={pauseModal.open}
        onClose={() => setPauseModal({ open: false, sessionId: null })}
        onConfirm={confirmarPausa}
      />

      {/* Confirmação de produção / estoque modal */}
      <ConfirmacaoProducaoModal
        open={confirmacaoModal.open}
        session={sessions.find((s) => s.id === confirmacaoModal.sessionId) ?? null}
        onClose={() => setConfirmacaoModal({ open: false, sessionId: null })}
        onConfirm={confirmarProducao}
      />
    </div>
    </PermissionGate>
  )
}
