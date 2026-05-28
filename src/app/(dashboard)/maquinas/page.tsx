'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Cpu, Activity, Clock, TrendingUp, PauseCircle, Wrench,
  Plus, Search, Filter, X, CheckCircle2, AlertTriangle,
  BarChart2, ListChecks, User, Factory,
  Calendar, ZapOff, Eye, RefreshCw, Settings2,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogBody, DialogFooter,
} from '@/components/ui/dialog'
import { mockMaquinas, mockEventosMaquinas, mockOsTimeData } from '@/mocks'
import { formatDate, formatDateTime, cn } from '@/lib/utils'
import type { Maquina, StatusMaquina, SetorMaquina, TipoEventoMaquina, EventoMaquina } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabView        = 'visao_geral' | 'maquinas' | 'monitoramento' | 'analises' | 'historico'
type AnalysisPeriod = 'hoje' | 'semana' | 'mes'

interface NovaForm {
  nome: string; codigo: string; setor: SetorMaquina | ''
  fabricante: string; modelo: string; ano: string
  capacidade: string; observacoes: string
}

const EMPTY_FORM: NovaForm = {
  nome: '', codigo: '', setor: '', fabricante: '',
  modelo: '', ano: '', capacidade: '', observacoes: '',
}

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<StatusMaquina, {
  label: string; color: string; bg: string; border: string
  dot: string; ring: string; pulse: boolean
}> = {
  operando:   { label: 'Operando',   color: 'text-success',          bg: 'bg-success/10',          border: 'border-success/25',          dot: '#10b981', ring: 'ring-success/20',    pulse: true  },
  setup:      { label: 'Setup',      color: 'text-primary',          bg: 'bg-primary/10',          border: 'border-primary/25',          dot: '#000080', ring: 'ring-primary/20',    pulse: true  },
  pausada:    { label: 'Pausada',    color: 'text-warning',          bg: 'bg-warning/10',          border: 'border-warning/25',          dot: '#f59e0b', ring: 'ring-warning/20',    pulse: false },
  ociosa:     { label: 'Ociosa',     color: 'text-muted-foreground', bg: 'bg-muted',               border: 'border-border',              dot: '#6b7280', ring: 'ring-muted-foreground/20', pulse: false },
  manutencao: { label: 'Manutenção', color: 'text-destructive',      bg: 'bg-destructive/10',      border: 'border-destructive/25',      dot: '#ef4444', ring: 'ring-destructive/20', pulse: false },
}

const SETOR_CFG: Record<SetorMaquina, { label: string; color: string; bg: string }> = {
  corte:         { label: 'Corte',         color: 'text-primary',          bg: 'bg-primary/10'          },
  dobra:         { label: 'Dobra',         color: 'text-success',          bg: 'bg-success/10'          },
  solda:         { label: 'Solda',         color: 'text-warning',          bg: 'bg-warning/10'          },
  pintura:       { label: 'Pintura',       color: 'text-accent',           bg: 'bg-accent/10'           },
  desenvolvimento: { label: 'Desenv.',     color: 'text-purple-400',       bg: 'bg-purple-400/10'       },
  outros:        { label: 'Outros',        color: 'text-muted-foreground', bg: 'bg-muted'               },
}

const TIPO_EVT_CFG: Record<TipoEventoMaquina, { label: string; icon: React.ReactNode; color: string }> = {
  inicio_producao:   { label: 'Produção iniciada',    icon: <Activity size={13} />,    color: 'text-success'          },
  fim_producao:      { label: 'Produção finalizada',  icon: <CheckCircle2 size={13} />, color: 'text-success'          },
  inicio_setup:      { label: 'Setup iniciado',       icon: <Settings2 size={13} />,   color: 'text-primary'          },
  fim_setup:         { label: 'Setup concluído',      icon: <CheckCircle2 size={13} />, color: 'text-primary'          },
  pausa:             { label: 'Máquina pausada',      icon: <PauseCircle size={13} />,  color: 'text-warning'          },
  retomada:          { label: 'Produção retomada',    icon: <RefreshCw size={13} />,   color: 'text-success'          },
  inicio_ociosidade: { label: 'Ficou ociosa',         icon: <ZapOff size={13} />,      color: 'text-muted-foreground' },
  troca_operador:    { label: 'Troca de operador',    icon: <User size={13} />,        color: 'text-primary'          },
  manutencao:        { label: 'Manutenção',           icon: <Wrench size={13} />,      color: 'text-destructive'      },
  falha_tecnica:     { label: 'Falha técnica',        icon: <AlertTriangle size={13} />, color: 'text-destructive'    },
}

const TIMELINE_COLORS: Record<StatusMaquina, string> = {
  operando:   '#10b981',
  setup:      '#000080',
  pausada:    '#f59e0b',
  ociosa:     'rgba(107,114,128,0.25)',
  manutencao: '#ef4444',
}

const CHART_COLORS = ['#0f4c5c', '#10b981', '#f59e0b', '#000080', '#ef4444', '#8b5cf6', '#e07319', '#6b7280']

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const SETORES_ALL: SetorMaquina[] = ['corte', 'dobra', 'solda', 'pintura', 'desenvolvimento', 'outros']
const STATUSES_ALL: StatusMaquina[] = ['operando', 'setup', 'pausada', 'ociosa', 'manutencao']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtHM(secs: number): string {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}min`
}

function computeHourlyUtil(maquina: Maquina): number[] {
  const hours = Array(24).fill(0) as number[]
  for (const seg of maquina.timeline) {
    if (seg.tipo !== 'operando' && seg.tipo !== 'setup') continue
    for (let h = Math.floor(seg.inicio); h < Math.ceil(seg.inicio + seg.duracao) && h < 24; h++) {
      const start = Math.max(seg.inicio, h)
      const end   = Math.min(seg.inicio + seg.duracao, h + 1)
      hours[h] = Math.min(100, hours[h] + Math.round((end - start) * 100))
    }
  }
  return hours
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PulsingDot({ status, size = 10 }: { status: StatusMaquina; size?: number }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className="relative flex" style={{ width: size, height: size }}>
      {cfg.pulse && (
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-50"
          style={{ background: cfg.dot }}
        />
      )}
      <span
        className="relative inline-flex rounded-full"
        style={{ width: size, height: size, background: cfg.dot }}
      />
    </span>
  )
}

function MachineStatusBadge({ status }: { status: StatusMaquina }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[11px] font-semibold border', cfg.color, cfg.bg, cfg.border)}>
      <PulsingDot status={status} size={7} />
      {cfg.label}
    </span>
  )
}

function SetorBadge({ setor }: { setor: SetorMaquina }) {
  const cfg = SETOR_CFG[setor]
  return (
    <span className={cn('inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-medium', cfg.color, cfg.bg)}>
      {cfg.label}
    </span>
  )
}

function TimelineBar({ timeline }: { timeline: Maquina['timeline'] }) {
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full" style={{ background: 'rgba(107,114,128,0.12)' }}>
      {timeline.map((seg, i) => (
        <div
          key={i}
          className="absolute top-0 h-full"
          title={`${seg.label ?? STATUS_CFG[seg.tipo].label} (${seg.duracao.toFixed(1)}h)`}
          style={{
            left:    `${(seg.inicio / 24) * 100}%`,
            width:   `${(seg.duracao / 24) * 100}%`,
            background: TIMELINE_COLORS[seg.tipo],
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const TABS: { key: TabView; label: string; icon: React.ReactNode }[] = [
  { key: 'visao_geral',   label: 'Visão Geral',   icon: <BarChart2 size={14} />  },
  { key: 'maquinas',      label: 'Máquinas',       icon: <Cpu size={14} />        },
  { key: 'monitoramento', label: 'Monitoramento',  icon: <Activity size={14} />   },
  { key: 'analises',      label: 'Análises',       icon: <TrendingUp size={14} /> },
  { key: 'historico',     label: 'Histórico',      icon: <ListChecks size={14} /> },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MaquinasPage() {
  const { canEdit } = useAuth()
  const [activeTab, setActiveTab] = useState<TabView>('visao_geral')
  const [maquinas, setMaquinas]   = useState<Maquina[]>(mockMaquinas)
  const [tick, setTick]           = useState(0)

  // Live timer for monitoring
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  function handleAddMaquina(m: Maquina) {
    setMaquinas((prev) => [...prev, m])
  }

  // ─── Global KPIs ────────────────────────────────────────────────────────────

  const maquinasAtivas   = maquinas.filter((m) => m.status !== 'manutencao').length
  const emOperacao       = maquinas.filter((m) => m.status === 'operando').length
  const ociosas          = maquinas.filter((m) => m.status === 'ociosa').length
  const emPausa          = maquinas.filter((m) => m.status === 'pausada').length
  const eficienciaMedia  = Math.round(maquinas.reduce((s, m) => s + m.eficiencia, 0) / maquinas.length)
  const totalOpHoje      = maquinas.reduce((s, m) => s + m.tempoOperacionalHoje, 0)
  const totalOciosoHoje  = maquinas.reduce((s, m) => s + m.tempoOciosoHoje, 0)
  const totalHoras       = maquinas.reduce((s, m) => s + m.totalHorasTrabalhadas, 0)

  // ─── Chart data ──────────────────────────────────────────────────────────────

  const barChartData = useMemo(() =>
    [...maquinas]
      .sort((a, b) => b.tempoOperacionalHoje - a.tempoOperacionalHoje)
      .map((m) => ({ name: m.codigo, horas: parseFloat((m.tempoOperacionalHoje / 3600).toFixed(1)) })),
  [maquinas])

  const statusDonutData = useMemo(() =>
    STATUSES_ALL
      .map((s) => ({ name: STATUS_CFG[s].label, value: maquinas.filter((m) => m.status === s).length, color: STATUS_CFG[s].dot }))
      .filter((d) => d.value > 0),
  [maquinas])

  const efficiencyData = useMemo(() =>
    [...maquinas].sort((a, b) => b.eficiencia - a.eficiencia).map((m) => ({ name: m.codigo, eficiencia: m.eficiencia })),
  [maquinas])

  const setorData = useMemo(() => {
    const map: Record<string, number> = {}
    for (const m of maquinas) {
      map[m.setor] = (map[m.setor] ?? 0) + m.tempoOperacionalHoje
    }
    return Object.entries(map).map(([setor, secs]) => ({
      name: SETOR_CFG[setor as SetorMaquina].label,
      horas: parseFloat((secs / 3600).toFixed(1)),
    }))
  }, [maquinas])

  // ─── KPI Cards (reusable render) ─────────────────────────────────────────────

  const kpiItems = [
    { label: 'Máquinas Ativas',    value: maquinasAtivas,            sub: `de ${maquinas.length} total`, icon: <Cpu size={16} />,          color: 'text-primary'          },
    { label: 'Em Operação',        value: emOperacao,                sub: 'agora',                         icon: <Activity size={16} />,     color: 'text-success'          },
    { label: 'Ociosas',            value: ociosas,                   sub: 'sem tarefa',                    icon: <ZapOff size={16} />,       color: 'text-muted-foreground' },
    { label: 'Em Pausa',           value: emPausa,                   sub: 'interrompidas',                 icon: <PauseCircle size={16} />,  color: 'text-warning'          },
    { label: 'Eficiência Média',   value: `${eficienciaMedia}%`,     sub: 'hoje',                          icon: <TrendingUp size={16} />,   color: 'text-primary'          },
    { label: 'Op. Hoje',           value: fmtHM(totalOpHoje),        sub: 'total operacional',             icon: <Clock size={16} />,        color: 'text-success'          },
    { label: 'Ocioso Hoje',        value: fmtHM(totalOciosoHoje),    sub: 'tempo desperdiçado',            icon: <AlertTriangle size={16} />,color: 'text-warning'          },
    { label: 'Total Horas',        value: `${totalHoras.toLocaleString('pt-BR')}h`, sub: 'histórico acumulado', icon: <Factory size={16} />, color: 'text-accent' },
  ]

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <PermissionGate module="maquinas">
    <div>
      <PageHeader
        title="Máquinas"
        subtitle={`${maquinas.length} máquinas cadastradas · ${emOperacao} operando · ${eficienciaMedia}% eficiência média`}
        breadcrumbs={[{ label: 'Esync', href: '/dashboard' }, { label: 'Máquinas' }]}
        actions={
          canEdit('maquinas') ? (
            <Button variant="accent" size="sm" onClick={() => setActiveTab('maquinas')}>
              <Plus size={14} /> Nova Máquina
            </Button>
          ) : undefined
        }
      />

      {/* ── Tab bar ── */}
      <div className="mb-6 flex items-center gap-1 rounded-xl border border-border bg-card p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150',
              activeTab === tab.key
                ? 'bg-primary text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Visão Geral ── */}
      <AnimatePresence mode="wait">
        {activeTab === 'visao_geral' && (
          <motion.div key="visao_geral" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="space-y-6">
            {/* KPI grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {kpiItems.map((k, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-md"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                    <span className={cn('opacity-60 transition-opacity group-hover:opacity-100', k.color)}>{k.icon}</span>
                  </div>
                  <p className={cn('text-2xl font-bold tabular-nums', k.color)}>{k.value}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{k.sub}</p>
                  <div className={cn('absolute inset-x-0 bottom-0 h-[2px] opacity-40 transition-opacity group-hover:opacity-80', `bg-${k.color.replace('text-', '')}`)} />
                </motion.div>
              ))}
            </div>

            {/* Charts row 1 */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Tempo Operacional por Máquina</CardTitle>
                  <CardDescription>Horas produtivas hoje</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={barChartData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91% / 0.5)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} unit="h" />
                      <Tooltip
                        contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12 }}
                        formatter={(v) => [`${v}h`, 'Operacional']}
                      />
                      <Bar dataKey="horas" fill="#0f4c5c" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Distribuição de Status</CardTitle>
                  <CardDescription>Situação atual das máquinas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width={150} height={150}>
                      <PieChart>
                        <Pie data={statusDonutData} cx="50%" cy="50%" innerRadius={44} outerRadius={68} paddingAngle={3} dataKey="value">
                          {statusDonutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {statusDonutData.map((d) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: d.color }} />
                          <span className="text-xs text-muted-foreground">{d.name}</span>
                          <span className="ml-auto text-xs font-semibold tabular-nums">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts row 2 */}
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Eficiência por Máquina</CardTitle>
                  <CardDescription>Ranking — melhor → pior</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={efficiencyData} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: -4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91% / 0.5)" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} unit="%" />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} width={68} />
                      <Tooltip
                        contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12 }}
                        formatter={(v) => [`${v}%`, 'Eficiência']}
                      />
                      <Bar dataKey="eficiencia" radius={[0, 4, 4, 0]}>
                        {efficiencyData.map((entry, i) => (
                          <Cell key={i} fill={entry.eficiencia >= 80 ? '#10b981' : entry.eficiencia >= 60 ? '#f59e0b' : '#ef4444'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Utilização por Setor</CardTitle>
                  <CardDescription>Horas operacionais totais hoje</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={setorData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91% / 0.5)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} unit="h" />
                      <Tooltip
                        contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12 }}
                        formatter={(v) => [`${v}h`, 'Operacional']}
                      />
                      <Bar dataKey="horas" radius={[4, 4, 0, 0]}>
                        {setorData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        )}

        {/* ── Máquinas Tab ── */}
        {activeTab === 'maquinas' && (
          <MaquinasTab
            key="maquinas"
            maquinas={maquinas}
            canEdit={canEdit('maquinas')}
            onAdd={handleAddMaquina}
          />
        )}

        {/* ── Monitoramento Tab ── */}
        {activeTab === 'monitoramento' && (
          <MonitoramentoTab key="monitoramento" maquinas={maquinas} tick={tick} />
        )}

        {/* ── Análises Tab ── */}
        {activeTab === 'analises' && (
          <AnalisesTab key="analises" maquinas={maquinas} />
        )}

        {/* ── Histórico Tab ── */}
        {activeTab === 'historico' && (
          <HistoricoTab key="historico" />
        )}
      </AnimatePresence>
    </div>
    </PermissionGate>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Máquinas
// ─────────────────────────────────────────────────────────────────────────────

function MaquinasTab({ maquinas, canEdit, onAdd }: {
  maquinas: Maquina[]
  canEdit: boolean
  onAdd: (m: Maquina) => void
}) {
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusMaquina | 'todos'>('todos')
  const [setorFilter, setSetorFilter]   = useState<SetorMaquina | 'todos'>('todos')
  const [detail, setDetail]         = useState<Maquina | null>(null)
  const [novaOpen, setNovaOpen]     = useState(false)
  const [form, setForm]             = useState<NovaForm>(EMPTY_FORM)
  const [errors, setErrors]         = useState<Partial<Record<keyof NovaForm, string>>>({})

  const filtered = useMemo(() => maquinas.filter((m) => {
    if (statusFilter !== 'todos' && m.status !== statusFilter) return false
    if (setorFilter !== 'todos' && m.setor !== setorFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return m.nome.toLowerCase().includes(q) || m.codigo.toLowerCase().includes(q) ||
             m.fabricante.toLowerCase().includes(q) || (m.operadorAtual?.toLowerCase().includes(q) ?? false)
    }
    return true
  }), [maquinas, search, statusFilter, setorFilter])

  function validate(): boolean {
    const e: Partial<Record<keyof NovaForm, string>> = {}
    if (!form.nome.trim()) e.nome = 'Obrigatório'
    if (!form.codigo.trim()) e.codigo = 'Obrigatório'
    else if (maquinas.some((m) => m.codigo === form.codigo.trim())) e.codigo = 'Código já cadastrado'
    if (!form.setor) e.setor = 'Obrigatório'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleSubmit() {
    if (!validate()) return
    const newM: Maquina = {
      id: `m${Date.now()}`,
      nome: form.nome.trim(),
      codigo: form.codigo.trim().toUpperCase(),
      setor: form.setor as SetorMaquina,
      fabricante: form.fabricante.trim() || '—',
      modelo: form.modelo.trim() || '—',
      ano: parseInt(form.ano) || new Date().getFullYear(),
      capacidade: form.capacidade.trim() || undefined,
      observacoes: form.observacoes.trim() || undefined,
      status: 'ociosa',
      eficiencia: 0,
      tempoOperacionalHoje: 0,
      tempoSetupHoje: 0,
      tempoOciosoHoje: 0,
      tempoPausadoHoje: 0,
      totalHorasTrabalhadas: 0,
      producoesFinalizadas: 0,
      ultimaAtividade: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      timeline: [],
      produtividadeSemanal: [0, 0, 0, 0, 0, 0, 0],
    }
    onAdd(newM)
    setForm(EMPTY_FORM)
    setErrors({})
    setNovaOpen(false)
  }

  const TH = 'px-3 py-2 text-[11px] font-semibold whitespace-nowrap'
  const TD = 'px-3 py-2 text-xs'

  return (
    <motion.div key="maquinas" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por nome, código, fabricante, operador..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter size={13} className="text-muted-foreground" />
            {(['todos', ...STATUSES_ALL] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={cn('rounded-lg px-2.5 py-1 text-xs font-medium transition-colors', statusFilter === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                {s === 'todos' ? 'Todos' : STATUS_CFG[s].label}
              </button>
            ))}
          </div>
          {canEdit && (
            <Button variant="accent" size="sm" className="flex-shrink-0" onClick={() => setNovaOpen(true)}>
              <Plus size={14} /> Nova Máquina
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Setor filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Factory size={13} className="text-muted-foreground" />
        {(['todos', ...SETORES_ALL] as const).map((s) => (
          <button key={s} onClick={() => setSetorFilter(s)}
            className={cn('rounded-lg px-2.5 py-1 text-xs font-medium transition-colors', setorFilter === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
            {s === 'todos' ? 'Todos setores' : SETOR_CFG[s].label}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className={`${TH} text-left`}>Nome da Máquina</th>
                  <th className={`${TH} text-left`}>Código</th>
                  <th className={`${TH} text-left`}>Setor</th>
                  <th className={`${TH} text-left`}>Fabricante</th>
                  <th className={`${TH} text-left`}>Modelo</th>
                  <th className={`${TH} text-left`}>Status</th>
                  <th className={`${TH} text-left`}>Operador</th>
                  <th className={`${TH} text-right`}>Op. Hoje</th>
                  <th className={`${TH} text-right`}>Eficiência</th>
                  <th className={`${TH} text-left`}>Última Ativ.</th>
                  <th className={`${TH} text-right`}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m, i) => (
                  <motion.tr
                    key={m.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => setDetail(m)}
                    className="cursor-pointer border-b border-border transition-colors hover:bg-muted/40"
                  >
                    <td className={TD}>
                      <span className="font-medium text-foreground">{m.nome}</span>
                    </td>
                    <td className={TD}>
                      <span className="font-mono text-[11px] font-semibold text-primary">{m.codigo}</span>
                    </td>
                    <td className={TD}><SetorBadge setor={m.setor} /></td>
                    <td className={`${TD} text-muted-foreground`}>{m.fabricante}</td>
                    <td className={`${TD} text-muted-foreground whitespace-nowrap`}>{m.modelo}</td>
                    <td className={TD}><MachineStatusBadge status={m.status} /></td>
                    <td className={`${TD} text-muted-foreground whitespace-nowrap`}>{m.operadorAtual ?? '—'}</td>
                    <td className={`${TD} text-right tabular-nums`}>{fmtHM(m.tempoOperacionalHoje)}</td>
                    <td className={`${TD} text-right`}>
                      <span className={cn('font-semibold tabular-nums', m.eficiencia >= 80 ? 'text-success' : m.eficiencia >= 60 ? 'text-warning' : 'text-destructive')}>
                        {m.eficiencia}%
                      </span>
                    </td>
                    <td className={`${TD} text-muted-foreground whitespace-nowrap`}>{formatDate(m.ultimaAtividade)}</td>
                    <td className={TD}>
                      <button className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground">
                        <Eye size={13} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-sm text-muted-foreground">Nenhuma máquina encontrada.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Machine Detail Modal ── */}
      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null) }}>
        <DialogContent size="xl">
          {detail && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <DialogTitle className="text-base">{detail.nome}</DialogTitle>
                  <MachineStatusBadge status={detail.status} />
                  <SetorBadge setor={detail.setor} />
                </div>
                <p className="font-mono text-xs text-muted-foreground">{detail.codigo}</p>
              </DialogHeader>
              <DialogBody>
                {/* Metrics strip */}
                <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {[
                    { label: 'Operacional',  value: fmtHM(detail.tempoOperacionalHoje), color: 'text-success' },
                    { label: 'Setup',        value: fmtHM(detail.tempoSetupHoje),       color: 'text-primary' },
                    { label: 'Ocioso',       value: fmtHM(detail.tempoOciosoHoje),      color: 'text-muted-foreground' },
                    { label: 'Pausado',      value: fmtHM(detail.tempoPausadoHoje),     color: 'text-warning' },
                    { label: 'Eficiência',   value: `${detail.eficiencia}%`,             color: detail.eficiencia >= 80 ? 'text-success' : 'text-warning' },
                  ].map((m, i) => (
                    <div key={i} className="rounded-lg border border-border bg-muted/40 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">{m.label}</p>
                      <p className={cn('mt-0.5 text-base font-bold tabular-nums', m.color)}>{m.value}</p>
                    </div>
                  ))}
                </div>

                <Separator className="mb-5" />

                {/* Info grid */}
                <div className="mb-5 grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informações Gerais</h3>
                    {[
                      { label: 'Fabricante',       value: detail.fabricante },
                      { label: 'Modelo',            value: detail.modelo },
                      { label: 'Ano',               value: String(detail.ano) },
                      { label: 'Capacidade',        value: detail.capacidade ?? '—' },
                      { label: 'Setor',             value: SETOR_CFG[detail.setor].label },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center gap-2">
                        <span className="w-24 flex-shrink-0 text-[11px] text-muted-foreground">{row.label}</span>
                        <span className="text-xs font-medium text-foreground">{row.value}</span>
                      </div>
                    ))}
                    {detail.observacoes && (
                      <div className="rounded-lg bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
                        {detail.observacoes}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estatísticas de Produção</h3>
                    {[
                      { label: 'Produções realizadas',    value: detail.producoesFinalizadas.toLocaleString('pt-BR') },
                      { label: 'Total de horas',          value: `${detail.totalHorasTrabalhadas.toLocaleString('pt-BR')}h` },
                      { label: 'OS atual',                value: detail.osAtual ?? '—' },
                      { label: 'Operador atual',          value: detail.operadorAtual ?? '—' },
                      { label: 'Última atividade',        value: formatDateTime(detail.ultimaAtividade) },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center gap-2">
                        <span className="w-36 flex-shrink-0 text-[11px] text-muted-foreground">{row.label}</span>
                        <span className="text-xs font-medium text-foreground">{row.value}</span>
                      </div>
                    ))}
                    {detail.motivoPausa && (
                      <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/8 p-2.5">
                        <AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-warning" />
                        <span className="text-[11px] text-warning">{detail.motivoPausa}</span>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="mb-5" />

                {/* Weekly productivity */}
                <div className="mb-5">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Produtividade Semanal (últimos 7 dias)</h3>
                  <ResponsiveContainer width="100%" height={120}>
                    <BarChart
                      data={detail.produtividadeSemanal.map((h, i) => ({ dia: DIAS_SEMANA[i], horas: h }))}
                      margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91% / 0.5)" vertical={false} />
                      <XAxis dataKey="dia" tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} unit="h" />
                      <Tooltip
                        contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12 }}
                        formatter={(v) => [`${v}h`, 'Operacional']}
                      />
                      <Bar dataKey="horas" fill="#0f4c5c" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline de Hoje</h3>
                  <div className="mb-2 flex justify-between text-[9px] text-muted-foreground">
                    {[0,4,8,12,16,20,24].map((h) => <span key={h}>{h}h</span>)}
                  </div>
                  <TimelineBar timeline={detail.timeline} />
                  <div className="mt-2 flex flex-wrap gap-3">
                    {(Object.entries(TIMELINE_COLORS) as [StatusMaquina, string][]).map(([tipo, color]) => (
                      <div key={tipo} className="flex items-center gap-1.5">
                        <span className="h-2 w-4 rounded-sm" style={{ background: color }} />
                        <span className="text-[10px] text-muted-foreground">{STATUS_CFG[tipo].label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setDetail(null)}>Fechar</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Nova Máquina Modal ── */}
      <Dialog open={novaOpen} onOpenChange={setNovaOpen}>
        <DialogContent size="lg">
          <DialogHeader>
            <DialogTitle>Nova Máquina</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                { key: 'nome',       label: 'Nome da Máquina *', placeholder: 'Ex.: Torno CNC Romi GL 240' },
                { key: 'codigo',     label: 'Código *',           placeholder: 'Ex.: CNC-003' },
                { key: 'fabricante', label: 'Fabricante',         placeholder: 'Ex.: Romi' },
                { key: 'modelo',     label: 'Modelo',             placeholder: 'Ex.: GL 240' },
                { key: 'ano',        label: 'Ano',                placeholder: 'Ex.: 2022', type: 'number' },
                { key: 'capacidade', label: 'Capacidade',         placeholder: 'Ex.: Ø240mm × 600mm' },
              ] as const).map((f) => (
                <div key={f.key} className={f.key === 'nome' ? 'sm:col-span-2' : ''}>
                  <Label className="mb-1.5 text-xs">{f.label}</Label>
                  <Input
                    placeholder={f.placeholder}
                    type={('type' in f) ? f.type : 'text'}
                    value={form[f.key]}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className={errors[f.key] ? 'border-destructive' : ''}
                  />
                  {errors[f.key] && <p className="mt-1 text-[11px] text-destructive">{errors[f.key]}</p>}
                </div>
              ))}

              <div>
                <Label className="mb-1.5 text-xs">Setor *</Label>
                <select
                  value={form.setor}
                  onChange={(e) => setForm((prev) => ({ ...prev, setor: e.target.value as SetorMaquina }))}
                  className={cn('w-full rounded-md border bg-background px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40', errors.setor ? 'border-destructive' : 'border-border')}
                >
                  <option value="">Selecionar setor...</option>
                  {SETORES_ALL.map((s) => <option key={s} value={s}>{SETOR_CFG[s].label}</option>)}
                </select>
                {errors.setor && <p className="mt-1 text-[11px] text-destructive">{errors.setor}</p>}
              </div>

              <div className="sm:col-span-2">
                <Label className="mb-1.5 text-xs">Observações</Label>
                <textarea
                  placeholder="Notas técnicas, datas de manutenção, etc."
                  rows={3}
                  value={form.observacoes}
                  onChange={(e) => setForm((prev) => ({ ...prev, observacoes: e.target.value }))}
                  className="w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm transition-colors placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => { setNovaOpen(false); setForm(EMPTY_FORM); setErrors({}) }}>Cancelar</Button>
            <Button variant="accent" size="sm" onClick={handleSubmit}><Plus size={14} /> Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Monitoramento
// ─────────────────────────────────────────────────────────────────────────────

function MonitoramentoTab({ maquinas, tick }: { maquinas: Maquina[]; tick: number }) {
  const [setorFilter, setSetorFilter] = useState<SetorMaquina | 'todos'>('todos')

  const visible = useMemo(
    () => setorFilter === 'todos' ? maquinas : maquinas.filter((m) => m.setor === setorFilter),
    [maquinas, setorFilter],
  )

  return (
    <motion.div key="monitoramento" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="space-y-4">
      {/* Setor filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Factory size={13} className="text-muted-foreground" />
        {(['todos', ...SETORES_ALL] as const).map((s) => (
          <button key={s} onClick={() => setSetorFilter(s)}
            className={cn('rounded-lg px-2.5 py-1 text-xs font-medium transition-colors', setorFilter === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
            {s === 'todos' ? 'Todos' : SETOR_CFG[s].label}
          </button>
        ))}
      </div>

      {/* Monitor cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map((m, i) => {
          const cfg = STATUS_CFG[m.status]
          const liveOp = m.status === 'operando' ? m.tempoOperacionalHoje + tick : m.tempoOperacionalHoje
          const liveSetup = m.status === 'setup' ? m.tempoSetupHoje + tick : m.tempoSetupHoje
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className={cn('relative overflow-hidden rounded-xl border bg-card p-4 shadow-card transition-shadow hover:shadow-md', cfg.border)}
            >
              {/* Top row */}
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{m.nome}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{m.codigo}</p>
                </div>
                <MachineStatusBadge status={m.status} />
              </div>

              {/* Operator + task */}
              <div className="mb-3 space-y-1">
                <div className="flex items-center gap-2 text-[11px]">
                  <User size={11} className="flex-shrink-0 text-muted-foreground" />
                  <span className="text-muted-foreground">Operador:</span>
                  <span className="font-medium text-foreground truncate">{m.operadorAtual ?? '—'}</span>
                </div>
                {m.tarefaAtual && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <Settings2 size={11} className="flex-shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">Tarefa:</span>
                    <span className="font-medium text-foreground truncate">{m.tarefaAtual}</span>
                  </div>
                )}
                {m.osAtual && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <ListChecks size={11} className="flex-shrink-0 text-muted-foreground" />
                    <span className="text-muted-foreground">OS:</span>
                    <span className="font-mono font-semibold text-primary">{m.osAtual}</span>
                  </div>
                )}
                {m.motivoPausa && (
                  <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/8 px-2 py-1.5 text-[11px]">
                    <AlertTriangle size={11} className="mt-0.5 flex-shrink-0 text-warning" />
                    <span className="text-warning">{m.motivoPausa}</span>
                  </div>
                )}
              </div>

              <Separator className="mb-3" />

              {/* Timers */}
              <div className="mb-3 grid grid-cols-3 gap-2">
                {[
                  { label: 'Operacional', value: fmtHM(liveOp), color: 'text-success' },
                  { label: 'Setup',       value: fmtHM(liveSetup), color: 'text-primary' },
                  { label: 'Ocioso',      value: fmtHM(m.tempoOciosoHoje), color: 'text-muted-foreground' },
                ].map((t) => (
                  <div key={t.label} className="rounded-lg bg-muted/50 p-2 text-center">
                    <p className="text-[9px] text-muted-foreground">{t.label}</p>
                    <p className={cn('text-[11px] font-bold tabular-nums', t.color)}>{t.value}</p>
                  </div>
                ))}
              </div>

              {/* Efficiency bar */}
              <div className="mb-3">
                <div className="mb-1 flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">Eficiência</span>
                  <span className={cn('font-semibold', m.eficiencia >= 80 ? 'text-success' : m.eficiencia >= 60 ? 'text-warning' : 'text-destructive')}>
                    {m.eficiencia}%
                  </span>
                </div>
                <Progress value={m.eficiencia} className="h-1.5" />
              </div>

              {/* Timeline */}
              <div>
                <p className="mb-1 text-[9px] text-muted-foreground">Hoje</p>
                <TimelineBar timeline={m.timeline} />
              </div>

              {/* Setor tag */}
              <div className="mt-3">
                <SetorBadge setor={m.setor} />
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Análises
// ─────────────────────────────────────────────────────────────────────────────

function AnalisesTab({ maquinas }: { maquinas: Maquina[] }) {
  const [period, setPeriod]     = useState<AnalysisPeriod>('hoje')
  const [setorF, setSetorF]     = useState<SetorMaquina | 'todos'>('todos')
  const [maquinaF, setMaquinaF] = useState<string>('todas')

  const filtered = useMemo(
    () => setorF === 'todos' ? maquinas : maquinas.filter((m) => m.setor === setorF),
    [maquinas, setorF],
  )

  const totalOp      = filtered.reduce((s, m) => s + m.tempoOperacionalHoje, 0)
  const totalOcioso  = filtered.reduce((s, m) => s + m.tempoOciosoHoje, 0)
  const totalSetup   = filtered.reduce((s, m) => s + m.tempoSetupHoje, 0)
  const avgEfic      = Math.round(filtered.reduce((s, m) => s + m.eficiencia, 0) / (filtered.length || 1))

  // OS time distribution (computed with participation %)
  const osData = useMemo(() => {
    const filteredOs = maquinaF === 'todas'
      ? mockOsTimeData
      : mockOsTimeData.filter((d) => d.maquinaCodigo === maquinaF)
    const totalSecs = filteredOs.reduce((s, d) => s + d.totalSegundos, 0)
    let accumulated = 0
    return [...filteredOs]
      .sort((a, b) => b.totalSegundos - a.totalSegundos)
      .map((d) => {
        const pct = totalSecs > 0 ? (d.totalSegundos / totalSecs) * 100 : 0
        accumulated += pct
        return { ...d, participacaoPct: pct, acumuladoPct: accumulated }
      })
  }, [maquinaF])

  // Heatmap (8 machines × 24 hours)
  const heatmapData = useMemo(
    () => maquinas.map(computeHourlyUtil),
    [maquinas],
  )

  // Tempo perdido (idle + pause reasons)
  const perdaData = [
    { motivo: 'Falta de material', minutos: 130 },
    { motivo: 'Manutenção',        minutos: 280 },
    { motivo: 'Sem tarefa',        minutos: 210 },
    { motivo: 'Operador ausente',  minutos: 45  },
    { motivo: 'Ajuste técnico',    minutos: 60  },
  ]

  return (
    <motion.div key="analises" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="flex items-center gap-1.5">
            <Calendar size={13} className="text-muted-foreground" />
            {(['hoje', 'semana', 'mes'] as AnalysisPeriod[]).map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn('rounded-lg px-2.5 py-1 text-xs font-medium transition-colors', period === p ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                {p === 'hoje' ? 'Hoje' : p === 'semana' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <Factory size={13} className="text-muted-foreground" />
            {(['todos', ...SETORES_ALL] as const).map((s) => (
              <button key={s} onClick={() => setSetorF(s)}
                className={cn('rounded-lg px-2.5 py-1 text-xs font-medium transition-colors', setorF === s ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80')}>
                {s === 'todos' ? 'Todos' : SETOR_CFG[s].label}
              </button>
            ))}
          </div>
          <select
            value={maquinaF}
            onChange={(e) => setMaquinaF(e.target.value)}
            className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            <option value="todas">Todas as máquinas</option>
            {maquinas.map((m) => <option key={m.id} value={m.codigo}>{m.codigo}</option>)}
          </select>
        </CardContent>
      </Card>

      {/* Analysis KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Tempo Operacional',  value: fmtHM(totalOp),     color: 'text-success',          sub: 'produtivo' },
          { label: 'Tempo Ocioso',       value: fmtHM(totalOcioso),  color: 'text-muted-foreground', sub: 'perdido' },
          { label: 'Tempo de Setup',     value: fmtHM(totalSetup),   color: 'text-primary',          sub: 'preparação' },
          { label: 'Eficiência Média',   value: `${avgEfic}%`,       color: avgEfic >= 80 ? 'text-success' : 'text-warning', sub: 'rendimento' },
        ].map((k, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-card">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={cn('mt-1 text-2xl font-bold tabular-nums', k.color)}>{k.value}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Mapa de Utilização — Hora × Máquina</CardTitle>
          <CardDescription>Intensidade operacional por hora do dia</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              {/* Hour labels */}
              <div className="mb-1 grid" style={{ gridTemplateColumns: '72px repeat(24, 1fr)' }}>
                <div />
                {Array.from({ length: 24 }, (_, h) => (
                  <div key={h} className="text-center text-[9px] text-muted-foreground">{h}</div>
                ))}
              </div>
              {/* Rows */}
              {maquinas.map((m, mi) => (
                <div key={m.id} className="mb-0.5 grid items-center" style={{ gridTemplateColumns: '72px repeat(24, 1fr)' }}>
                  <div className="pr-2 text-right text-[10px] text-muted-foreground truncate">{m.codigo}</div>
                  {heatmapData[mi].map((val, hi) => (
                    <div
                      key={hi}
                      title={`${m.codigo} ${hi}h: ${val}%`}
                      className="mx-px rounded-[2px]"
                      style={{
                        height: 20,
                        background: val > 75 ? 'rgb(15,76,92)' : val > 45 ? 'rgba(15,76,92,0.55)' : val > 15 ? 'rgba(15,76,92,0.25)' : 'rgba(107,114,128,0.08)',
                      }}
                    />
                  ))}
                </div>
              ))}
              {/* Legend */}
              <div className="mt-2 flex items-center gap-3">
                {[
                  { label: 'Alta (>75%)',   color: 'rgb(15,76,92)' },
                  { label: 'Média (>45%)',  color: 'rgba(15,76,92,0.55)' },
                  { label: 'Baixa (>15%)', color: 'rgba(15,76,92,0.25)' },
                  { label: 'Inativo',      color: 'rgba(107,114,128,0.08)' },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className="h-3 w-4 rounded-[2px]" style={{ background: l.color }} />
                    <span className="text-[10px] text-muted-foreground">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Efficiency ranking */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Ranking de Eficiência</CardTitle>
            <CardDescription>Máquinas mais eficientes no período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...maquinas].sort((a, b) => b.eficiencia - a.eficiencia).map((m, i) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="w-5 text-center text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                  <span className="w-20 flex-shrink-0 font-mono text-[11px] text-foreground">{m.codigo}</span>
                  <div className="relative flex-1 h-4 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="absolute left-0 top-0 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${m.eficiencia}%` }}
                      transition={{ delay: i * 0.06, duration: 0.5, ease: 'easeOut' }}
                      style={{ background: m.eficiencia >= 80 ? '#10b981' : m.eficiencia >= 60 ? '#f59e0b' : '#ef4444' }}
                    />
                  </div>
                  <span className={cn('w-10 text-right text-xs font-semibold tabular-nums', m.eficiencia >= 80 ? 'text-success' : m.eficiencia >= 60 ? 'text-warning' : 'text-destructive')}>
                    {m.eficiencia}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Tempo perdido */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Tempo Perdido por Motivo</CardTitle>
            <CardDescription>Principais causas de parada</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={perdaData} layout="vertical" margin={{ top: 4, right: 24, bottom: 0, left: -4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91% / 0.5)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} unit="m" />
                <YAxis type="category" dataKey="motivo" tick={{ fontSize: 9, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} width={90} />
                <Tooltip
                  contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12 }}
                  formatter={(v) => [`${v} min`, 'Tempo perdido']}
                />
                <Bar dataKey="minutos" fill="#ef4444" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* OS Time Distribution — core analysis */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Distribuição de Tempo por OS</CardTitle>
          <CardDescription>
            Tempo de máquina, eficiência e participação por Ordem de Serviço
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-border">
                  {['OS', 'Máquina', 'Tempo Prod.', 'Setup', 'Total', 'Eficiência', 'Participação', 'Acumulado'].map((h) => (
                    <th key={h} className="pb-2 pr-4 text-left text-[11px] font-semibold text-muted-foreground last:pr-0">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {osData.map((d, i) => (
                  <motion.tr
                    key={d.numero}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="py-2 pr-4">
                      <span className="font-mono text-[11px] font-semibold text-primary">{d.numero}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className="font-mono text-[11px] text-muted-foreground">{d.maquinaCodigo}</span>
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      <span className="text-xs text-success">{fmtHM(d.tempoProdSeg)}</span>
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      <span className="text-xs text-primary">{fmtHM(d.tempoSetupSeg)}</span>
                    </td>
                    <td className="py-2 pr-4 tabular-nums">
                      <span className="text-xs font-medium">{fmtHM(d.totalSegundos)}</span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={cn('text-xs font-semibold tabular-nums', d.eficiencia >= 85 ? 'text-success' : 'text-warning')}>
                        {d.eficiencia}%
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                          <motion.div
                            className="absolute left-0 top-0 h-full rounded-full bg-primary"
                            initial={{ width: 0 }}
                            animate={{ width: `${d.participacaoPct}%` }}
                            transition={{ delay: i * 0.06, duration: 0.5 }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground tabular-nums">{d.participacaoPct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-2">
                      <span className="text-[10px] text-muted-foreground tabular-nums">{d.acumuladoPct.toFixed(1)}%</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB: Histórico
// ─────────────────────────────────────────────────────────────────────────────

function HistoricoTab() {
  const [maquinaF, setMaquinaF]   = useState<string>('todas')
  const [tipoF, setTipoF]         = useState<TipoEventoMaquina | 'todos'>('todos')
  const [searchF, setSearchF]     = useState('')

  const tipos: (TipoEventoMaquina | 'todos')[] = [
    'todos', 'inicio_producao', 'fim_producao', 'inicio_setup',
    'pausa', 'retomada', 'inicio_ociosidade', 'manutencao', 'falha_tecnica',
  ]

  const filtered: EventoMaquina[] = useMemo(() =>
    mockEventosMaquinas.filter((e) => {
      if (maquinaF !== 'todas' && e.maquinaId !== maquinaF) return false
      if (tipoF !== 'todos' && e.tipo !== tipoF) return false
      if (searchF) {
        const q = searchF.toLowerCase()
        return e.descricao.toLowerCase().includes(q) || e.operador.toLowerCase().includes(q) ||
               e.maquinaNome.toLowerCase().includes(q) || (e.os?.toLowerCase().includes(q) ?? false)
      }
      return true
    }),
  [maquinaF, tipoF, searchF])

  const machineCodes = [...new Set(mockMaquinas.map((m) => m.id + '|' + m.codigo + '|' + m.nome))]

  return (
    <motion.div key="historico" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }} className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar evento, operador, OS..." value={searchF} onChange={(e) => setSearchF(e.target.value)} className="pl-9" />
          </div>
          <select
            value={maquinaF}
            onChange={(e) => setMaquinaF(e.target.value)}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            <option value="todas">Todas as máquinas</option>
            {machineCodes.map((s) => {
              const [id, code, nome] = s.split('|')
              return <option key={id} value={id}>{code} — {nome}</option>
            })}
          </select>
          <select
            value={tipoF}
            onChange={(e) => setTipoF(e.target.value as TipoEventoMaquina | 'todos')}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            <option value="todos">Todos os eventos</option>
            {tipos.slice(1).map((t) => (
              <option key={t} value={t}>{TIPO_EVT_CFG[t as TipoEventoMaquina].label}</option>
            ))}
          </select>
          {(maquinaF !== 'todas' || tipoF !== 'todos' || searchF) && (
            <button
              onClick={() => { setMaquinaF('todas'); setTipoF('todos'); setSearchF('') }}
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <X size={12} /> Limpar
            </button>
          )}
        </CardContent>
      </Card>

      {/* Event count */}
      <p className="text-xs text-muted-foreground">{filtered.length} evento{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</p>

      {/* Event list */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="flex h-40 items-center justify-center rounded-xl border border-border text-sm text-muted-foreground">
            Nenhum evento encontrado
          </div>
        )}
        {filtered.map((evt, i) => {
          const cfg = TIPO_EVT_CFG[evt.tipo]
          return (
            <motion.div
              key={evt.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex gap-3 rounded-xl border border-border bg-card p-3 shadow-card transition-shadow hover:shadow-md"
            >
              {/* Icon */}
              <div className={cn('mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-muted', cfg.color)}>
                {cfg.icon}
              </div>

              {/* Body */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn('text-xs font-semibold', cfg.color)}>{cfg.label}</span>
                  <span className="font-mono text-[11px] text-primary">{evt.maquinaCodigo}</span>
                  {evt.os && (
                    <span className="font-mono text-[11px] text-muted-foreground">{evt.os}</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-foreground">{evt.descricao}</p>
                {evt.observacoes && (
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{evt.observacoes}</p>
                )}
                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User size={9} /> {evt.operador}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={9} /> {formatDateTime(evt.timestamp)}
                  </span>
                  {evt.duracao && (
                    <span className="flex items-center gap-1">
                      <Activity size={9} /> {fmtHM(evt.duracao)}
                    </span>
                  )}
                </div>
              </div>

              {/* Machine name */}
              <div className="hidden flex-shrink-0 text-right sm:block">
                <p className="text-[11px] text-muted-foreground">{evt.maquinaNome.split(' ').slice(0, 2).join(' ')}</p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  )
}
