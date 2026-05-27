'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'

// Unique ID — crypto.randomUUID() when available, stable fallback otherwise
function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
import { motion, AnimatePresence } from 'framer-motion'
import {
  Workflow,
  LayoutDashboard,
  Clock,
  CheckCircle2,
  AlertTriangle,

  Activity,
  Search,
  Plus,
  ChevronDown,
  ChevronRight,
  Trash2,
  Play,
  XCircle,
  Eye,
  Send,
  History,
  BarChart3,
  Download,

  RefreshCw,
  FileText,
  Layers,
  Scissors,
  Package,

  X,

  TrendingUp,

  Cpu,
  Zap,
  Hash,
  Calendar,
  User,
  ChevronUp,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RchTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAuth } from '@/contexts/AuthContext'
import { useProgramacao } from '@/contexts/ProgramacaoContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import {
  mockEficienciaSemanalProg,
  mockTempoMedioSemanal,
  mockProgramasPorOS,
  mockAproveitamentoRetalho,
  mockEficienciaProgramadores,
} from '@/mocks/programacao'
import type {
  ProgramaCNC,
  PrioridadeProg,
  RetalhoUtilizado,
  RetalhoGerado,
  PecaPrograma,
} from '@/types/programacao'

// ─── Local Types ──────────────────────────────────────────────────────────────

type TabProg = 'dashboard' | 'pendentes' | 'em_programacao' | 'finalizados' | 'cadastro' | 'historico' | 'analises'

interface EditForm {
  nome: string
  codigo: string
  observacoes: string
  osGerais: string[]
  novaOsInput: string
  pecas: PecaPrograma[]
  retalhoUtilizado: RetalhoUtilizado
  retalhoGerado: RetalhoGerado
  tempoEstimadoMin: number
}

const emptyEdit: EditForm = {
  nome: '', codigo: '', observacoes: '', osGerais: [], novaOsInput: '',
  pecas: [], retalhoUtilizado: { tipo: 'chapa_inteira' },
  retalhoGerado: { gerou: false }, tempoEstimadoMin: 0,
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PRIO_CFG: Record<PrioridadeProg, { label: string; color: string; bg: string; border: string }> = {
  urgente: { label: 'Urgente', color: 'text-destructive',      bg: 'bg-destructive/8',   border: 'border-destructive/30' },
  alta:    { label: 'Alta',    color: 'text-warning',          bg: 'bg-warning/8',       border: 'border-warning/30'     },
  normal:  { label: 'Normal',  color: 'text-primary',          bg: 'bg-primary/8',       border: 'border-primary/30'     },
  baixa:   { label: 'Baixa',   color: 'text-muted-foreground', bg: 'bg-muted',           border: 'border-border'         },
}


const SETOR_ICON: Record<string, React.ElementType> = {
  corte: Scissors, dobra: Layers, solda: Zap, pintura: Package, montagem: Cpu,
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtElapsed(startMs: number, nowMs: number): string {
  const s = Math.floor((nowMs - startMs) / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  if (h > 0) { return `${h}h ${m}m ${ss}s` }
  return `${m}m ${ss}s`
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function fmtDateTime(d: Date): string {
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function totalPecas(pecas: PecaPrograma[]): number {
  return pecas.reduce((s, p) => s + p.quantidade, 0)
}

// ─── Small shared atoms ───────────────────────────────────────────────────────

function PrioChip({ p }: { p: PrioridadeProg }) {
  const c = PRIO_CFG[p]
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold border', c.color, c.bg, c.border)}>
      {c.label}
    </span>
  )
}

function SetorTag({ s }: { s: string }) {
  const Icon = SETOR_ICON[s] ?? Package
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
      <Icon size={9} />
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  )
}

function OSChip({ os }: { os: string }) {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-primary/8 text-primary border border-primary/20">
      {os}
    </span>
  )
}

function KpiCard({ label, value, sub, icon: Icon, accent }: { label: string; value: string | number; sub?: string; icon: React.ElementType; accent?: string }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground truncate">{label}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight" style={accent ? { color: accent } : undefined}>{value}</p>
            {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
          </div>
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: accent ? `${accent}18` : 'var(--muted)' }}>
            <Icon size={17} style={accent ? { color: accent } : undefined} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProgramacaoPage() {
  const { canEdit, currentCargo } = useAuth()
  const {
    solicitacoes, programas, atividades, historico,
    iniciarProgramacao, concluirProgramacao, reutilizarPrograma, cancelarSolicitacao,
  } = useProgramacao()

  // ── Tab + search state ────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabProg>('dashboard')
  const [now, setNow] = useState(Date.now())
  const [pendSearch, setPendSearch] = useState('')
  const [pendPrio, setPendPrio] = useState<PrioridadeProg | 'todos'>('todos')
  const [progSearch, setProgSearch] = useState('')
  const [histSearch, setHistSearch] = useState('')
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())

  // ── Em Programação editor state ──────────────────────────────────────────
  const [activeProgramaId, setActiveProgramaId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>(emptyEdit)
  const [expandedPecas, setExpandedPecas] = useState<Set<string>>(new Set())
  const [confirmConcluir, setConfirmConcluir] = useState(false)

  // ── Reutilizar modal ──────────────────────────────────────────────────────
  const [reutilizarModal, setReutilizarModal] = useState<{ open: boolean; programaId: string | null }>({ open: false, programaId: null })
  const [reutilizarOs, setReutilizarOs] = useState('')

  // ── Live ticker ───────────────────────────────────────────────────────────
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // ── Derived ───────────────────────────────────────────────────────────────
  const pendentes  = useMemo(() => solicitacoes.filter((s) => s.status === 'pendente'), [solicitacoes])
  const emAndamento = useMemo(() => programas.filter((p) => p.status === 'em_programacao'), [programas])
  const finalizados = useMemo(() => programas.filter((p) => p.status === 'finalizado'), [programas])

  const filtPendentes = useMemo(() => {
    return pendentes.filter((s) => {
      const textOk = pendSearch === '' ||
        s.titulo.toLowerCase().includes(pendSearch.toLowerCase()) ||
        s.numeroOS.toLowerCase().includes(pendSearch.toLowerCase()) ||
        s.cliente.toLowerCase().includes(pendSearch.toLowerCase())
      const prioOk = pendPrio === 'todos' || s.prioridade === pendPrio
      return textOk && prioOk
    })
  }, [pendentes, pendSearch, pendPrio])

  const filtProgramas = useMemo(() => {
    if (!progSearch.trim()) { return finalizados }
    const q = progSearch.toLowerCase()
    return finalizados.filter((p) =>
      p.nome.toLowerCase().includes(q) ||
      p.codigo.toLowerCase().includes(q) ||
      p.osGerais.some((os) => os.toLowerCase().includes(q)) ||
      p.pecas.some((pc) => pc.codigo.toLowerCase().includes(q))
    )
  }, [finalizados, progSearch])

  const filtHistorico = useMemo(() => {
    if (!histSearch.trim()) { return historico }
    const q = histSearch.toLowerCase()
    return historico.filter((h) =>
      (h.programaNome ?? '').toLowerCase().includes(q) ||
      (h.programaCodigo ?? '').toLowerCase().includes(q) ||
      h.operador.toLowerCase().includes(q) ||
      h.descricao.toLowerCase().includes(q)
    )
  }, [historico, histSearch])

  const activePrograma = useMemo(() => programas.find((p) => p.id === activeProgramaId), [programas, activeProgramaId])

  const kpis = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const conclHoje = finalizados.filter((p) => p.dataConclusao && p.dataConclusao >= today).length
    const tempoList = finalizados.filter((p) => p.tempoRealMin).map((p) => p.tempoRealMin!)
    const tempoMedio = tempoList.length ? Math.round(tempoList.reduce((s, v) => s + v, 0) / tempoList.length) : 0
    const retalhosAprov = programas.filter((p) => p.retalhoUtilizado.tipo === 'retalho').length
    const reutilizados = programas.filter((p) => p.numeroExecucoes > 1).length
    const eficiencia = tempoList.length
      ? Math.round(finalizados.filter((p) => p.tempoRealMin && p.tempoEstimadoMin && p.tempoRealMin <= p.tempoEstimadoMin).length / finalizados.length * 100)
      : 0
    return { pendentes: pendentes.length, conclHoje, tempoMedio, retalhosAprov, reutilizados, eficiencia }
  }, [pendentes, programas, finalizados])

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleIniciarProgramacao = useCallback((solId: string) => {
    const id = iniciarProgramacao(solId, currentCargo?.nome ?? 'Programador')
    if (!id) { return }
    const prog = programas.find((p) => p.id === id) ??
      { id, nome: '', codigo: '', observacoes: '', osGerais: [], pecas: [], retalhoUtilizado: { tipo: 'chapa_inteira' as const }, retalhoGerado: { gerou: false }, tempoEstimadoMin: 0 }
    setEditForm({
      nome:     prog.nome,
      codigo:   prog.codigo,
      observacoes: prog.observacoes,
      osGerais: [...(prog.osGerais ?? [])],
      novaOsInput: '',
      pecas:    (prog.pecas ?? []).map((p) => ({ ...p, osDistribuicao: p.osDistribuicao.map((o) => ({ ...o })) })),
      retalhoUtilizado: { ...(prog.retalhoUtilizado ?? { tipo: 'chapa_inteira' }) },
      retalhoGerado:    { ...(prog.retalhoGerado ?? { gerou: false }) },
      tempoEstimadoMin: (prog as ProgramaCNC).tempoEstimadoMin ?? 0,
    })
    setActiveProgramaId(id)
    setActiveTab('em_programacao')
    toast('success', 'Programação iniciada!')
  }, [iniciarProgramacao, programas, currentCargo])

  const handleSelectPrograma = useCallback((prog: ProgramaCNC) => {
    setActiveProgramaId(prog.id)
    setEditForm({
      nome:    prog.nome,
      codigo:  prog.codigo,
      observacoes: prog.observacoes,
      osGerais: [...prog.osGerais],
      novaOsInput: '',
      pecas:   prog.pecas.map((p) => ({ ...p, osDistribuicao: p.osDistribuicao.map((o) => ({ ...o })) })),
      retalhoUtilizado: { ...prog.retalhoUtilizado },
      retalhoGerado:    { ...prog.retalhoGerado },
      tempoEstimadoMin: prog.tempoEstimadoMin ?? 0,
    })
    setExpandedPecas(new Set())
    setConfirmConcluir(false)
  }, [])

  const handleConcluir = useCallback(() => {
    if (!activeProgramaId) { return }
    if (!editForm.nome.trim() || !editForm.codigo.trim()) {
      toast('error', 'Nome e código do programa são obrigatórios')
      return
    }
    const prog = programas.find((p) => p.id === activeProgramaId)
    const tempoReal = prog?.dataInicio ? Math.round((now - prog.dataInicio.getTime()) / 60_000) : undefined
    concluirProgramacao(activeProgramaId, {
      nome:    editForm.nome,
      codigo:  editForm.codigo,
      observacoes: editForm.observacoes,
      osGerais: editForm.osGerais,
      pecas:   editForm.pecas,
      retalhoUtilizado: editForm.retalhoUtilizado,
      retalhoGerado:    editForm.retalhoGerado,
      tempoRealMin: tempoReal,
    })
    setActiveProgramaId(null)
    setEditForm(emptyEdit)
    setConfirmConcluir(false)
    setActiveTab('finalizados')
    toast('success', 'Programa concluído e disponível para Corte!')
  }, [activeProgramaId, editForm, programas, now, concluirProgramacao])

  // ── Edit form helpers ─────────────────────────────────────────────────────

  const addOsGeral = useCallback(() => {
    const os = editForm.novaOsInput.trim()
    if (!os || editForm.osGerais.includes(os)) { return }
    setEditForm((f) => ({ ...f, osGerais: [...f.osGerais, os], novaOsInput: '' }))
  }, [editForm.novaOsInput, editForm.osGerais])

  const removeOsGeral = useCallback((os: string) => {
    setEditForm((f) => ({ ...f, osGerais: f.osGerais.filter((o) => o !== os) }))
  }, [])

  const addOsToPeca = useCallback((pecaId: string) => {
    setEditForm((f) => ({
      ...f,
      pecas: f.pecas.map((p) =>
        p.id !== pecaId ? p : {
          ...p,
          osDistribuicao: [...p.osDistribuicao, { id: uid(), os: '', quantidade: 0 }],
        }
      ),
    }))
  }, [])

  const removeOsFromPeca = useCallback((pecaId: string, osId: string) => {
    setEditForm((f) => ({
      ...f,
      pecas: f.pecas.map((p) =>
        p.id !== pecaId ? p : {
          ...p,
          osDistribuicao: p.osDistribuicao.filter((o) => o.id !== osId),
        }
      ),
    }))
  }, [])

  const updateOsInPeca = useCallback((pecaId: string, osId: string, field: 'os' | 'quantidade', value: string | number) => {
    setEditForm((f) => ({
      ...f,
      pecas: f.pecas.map((p) =>
        p.id !== pecaId ? p : {
          ...p,
          osDistribuicao: p.osDistribuicao.map((o) =>
            o.id !== osId ? o : { ...o, [field]: field === 'quantidade' ? Number(value) || 0 : value }
          ),
        }
      ),
    }))
  }, [])

  const toggleExpandCard = useCallback((id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }, [])

  const toggleExpandPeca = useCallback((id: string) => {
    setExpandedPecas((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) } else { next.add(id) }
      return next
    })
  }, [])

  // ─── Tab items ───────────────────────────────────────────────────────────

  const TABS: { id: TabProg; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'dashboard',      label: 'Dashboard',       icon: LayoutDashboard },
    { id: 'pendentes',      label: 'Pendentes',        icon: Clock,           badge: pendentes.length || undefined },
    { id: 'em_programacao', label: 'Em Programação',   icon: Cpu,             badge: emAndamento.length || undefined },
    { id: 'finalizados',    label: 'Finalizados',      icon: CheckCircle2 },
    { id: 'cadastro',       label: 'Cadastro',         icon: FileText },
    { id: 'historico',      label: 'Histórico',        icon: History },
    { id: 'analises',       label: 'Análises',         icon: BarChart3 },
  ]

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen">

      <PageHeader
        title="Programação"
        subtitle="Centro de programação CNC — da solicitação ao corte."
      />

      {/* ── Tab Navigation ── */}
      <div className="flex gap-1 flex-wrap rounded-xl border border-border bg-muted/40 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            <tab.icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge !== undefined && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white leading-none">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18 }}
          className="flex-1"
        >

          {/* ═══════════════════════════════ DASHBOARD ═══════════════════════ */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                <KpiCard label="Pendentes"          value={kpis.pendentes}     icon={Clock}       accent="#f59e0b" sub="aguardando programação" />
                <KpiCard label="Concluídos Hoje"    value={kpis.conclHoje}     icon={CheckCircle2} accent="#10b981" sub="programas finalizados" />
                <KpiCard label="Tempo Médio"        value={`${kpis.tempoMedio}m`} icon={Activity}  accent="#0f4c5c" sub="por programa" />
                <KpiCard label="Retalhos Aprov."    value={kpis.retalhosAprov} icon={Layers}       accent="#000080" sub="programas c/ retalho" />
                <KpiCard label="Prog. Reutilizados" value={kpis.reutilizados}  icon={RefreshCw}    accent="#8b5cf6" sub="múltiplas execuções" />
                <KpiCard label="Eficiência"         value={`${kpis.eficiencia}%`} icon={TrendingUp} accent="#10b981" sub="dentro do estimado" />
              </div>

              {/* Activity + Quick overview */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Activity Feed */}
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Activity size={14} className="text-primary" />
                        Atividade Recente
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 max-h-72 overflow-y-auto">
                      {atividades.slice(0, 10).map((a) => {
                        const colors: Record<string, string> = {
                          novo_pendente: '#f59e0b', finalizado: '#10b981', retalho: '#000080',
                          reutilizacao: '#8b5cf6', inicio_programacao: '#0f4c5c', cancelamento: '#ef4444',
                        }
                        const c = colors[a.tipo] ?? '#6b7280'
                        return (
                          <div key={a.id} className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2">
                            <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full" style={{ background: c }} />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs leading-snug">{a.mensagem}</p>
                              <p className="mt-0.5 text-[10px] text-muted-foreground">{fmtDateTime(a.timestamp)}</p>
                            </div>
                          </div>
                        )
                      })}
                    </CardContent>
                  </Card>
                </div>

                {/* Status overview */}
                <div className="space-y-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs text-muted-foreground uppercase tracking-widest">Status Atual</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { label: 'Pendentes',      count: pendentes.length,    color: '#f59e0b', action: () => setActiveTab('pendentes') },
                        { label: 'Em Programação', count: emAndamento.length,  color: '#0f4c5c', action: () => setActiveTab('em_programacao') },
                        { label: 'Finalizados',    count: finalizados.length,  color: '#10b981', action: () => setActiveTab('finalizados') },
                      ].map((row) => (
                        <button key={row.label} onClick={row.action} className="flex w-full items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 hover:bg-muted/60 transition-colors">
                          <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
                            <span className="text-sm">{row.label}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold" style={{ color: row.color }}>{row.count}</span>
                            <ChevronRight size={12} className="text-muted-foreground" />
                          </div>
                        </button>
                      ))}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4 space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Em Andamento Agora</p>
                      {emAndamento.length === 0 && (
                        <p className="text-xs text-muted-foreground py-2">Nenhum programa em andamento.</p>
                      )}
                      {emAndamento.map((p) => (
                        <div key={p.id} className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{p.codigo}</p>
                            <p className="text-[10px] text-muted-foreground">{p.programador}</p>
                          </div>
                          <span className="text-[10px] font-mono text-primary">
                            {p.dataInicio ? fmtElapsed(p.dataInicio.getTime(), now) : '—'}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Mini chart row */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Eficiência Semanal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={140}>
                      <LineChart data={mockEficienciaSemanalProg}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} domain={[60, 100]} />
                        <RchTooltip contentStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="eficiencia" stroke="#0f4c5c" strokeWidth={2} dot={{ r: 3 }} name="Eficiência %" />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Aproveitamento de Retalho</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={mockAproveitamentoRetalho} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} label={({ name, value }) => `${name}: ${value}%`} labelLine={false}>
                          {mockAproveitamentoRetalho.map((e) => <Cell key={e.name} fill={e.fill} />)}
                        </Pie>
                        <RchTooltip contentStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════ PENDENTES ═══════════════════════ */}
          {activeTab === 'pendentes' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-48">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-8 h-9 text-sm" placeholder="Buscar por título, OS, cliente…" value={pendSearch} onChange={(e) => setPendSearch(e.target.value)} />
                </div>
                <div className="flex gap-1">
                  {(['todos', 'urgente', 'alta', 'normal', 'baixa'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPendPrio(p)}
                      className={cn(
                        'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all',
                        pendPrio === p
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      {p === 'todos' ? 'Todos' : PRIO_CFG[p].label}
                    </button>
                  ))}
                </div>
              </div>

              {filtPendentes.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
                  <CheckCircle2 size={32} className="text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhuma solicitação pendente</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">As solicitações de Desenvolvimento aparecerão aqui.</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-2">
                {filtPendentes.map((sol) => {
                  const expanded = expandedCards.has(sol.id)
                  return (
                    <motion.div key={sol.id} layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className={cn('overflow-hidden border-l-4', {
                        'border-l-destructive': sol.prioridade === 'urgente',
                        'border-l-warning':     sol.prioridade === 'alta',
                        'border-l-primary':     sol.prioridade === 'normal',
                        'border-l-border':      sol.prioridade === 'baixa',
                      })}>
                        <CardContent className="p-4 space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-sm leading-tight truncate">{sol.titulo}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{sol.cliente}</p>
                            </div>
                            <PrioChip p={sol.prioridade} />
                          </div>

                          {/* Meta */}
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Hash size={11} />
                              <span className="font-mono font-medium text-foreground">{sol.numeroOS}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <User size={11} />
                              <span>{sol.solicitante}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Package size={11} />
                              <span>{sol.pecas.length} peça(s) · {totalPecas(sol.pecas)} und.</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <Calendar size={11} />
                              <span>{fmtDate(sol.dataCriacao)}</span>
                            </div>
                          </div>

                          {/* OS envolvidas */}
                          <div className="flex flex-wrap gap-1">
                            {sol.osEnvolvidas.map((os) => <OSChip key={os} os={os} />)}
                            {sol.setores.map((s) => <SetorTag key={s} s={s} />)}
                          </div>

                          {/* Expandable pieces */}
                          {expanded && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
                              <div className="rounded-xl border border-border overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-border bg-muted/40">
                                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Código</th>
                                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Descrição</th>
                                      <th className="px-3 py-2 text-right font-semibold text-muted-foreground">Qtd</th>
                                      <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Material</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sol.pecas.map((p) => (
                                      <tr key={p.id} className="border-b border-border last:border-0">
                                        <td className="px-3 py-2 font-mono">{p.codigo}</td>
                                        <td className="px-3 py-2">{p.descricao}</td>
                                        <td className="px-3 py-2 text-right font-semibold">{p.quantidade}</td>
                                        <td className="px-3 py-2 text-muted-foreground">{p.material ?? '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </motion.div>
                          )}

                          {sol.observacoes && (
                            <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 border border-border">{sol.observacoes}</p>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 pt-1">
                            {canEdit('programacao') && (
                              <Button size="sm" className="h-8 gap-1.5 flex-1 sm:flex-none" onClick={() => handleIniciarProgramacao(sol.id)}>
                                <Play size={12} />
                                Iniciar Programação
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => toggleExpandCard(sol.id)}>
                              <Eye size={12} />
                              {expanded ? 'Ocultar' : 'Ver Peças'}
                            </Button>
                            {canEdit('programacao') && (
                              <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-destructive hover:text-destructive" onClick={() => { cancelarSolicitacao(sol.id); toast('warning', 'Solicitação cancelada') }}>
                                <XCircle size={12} />
                                Cancelar
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ════════════════════════════ EM PROGRAMAÇÃO ═════════════════════ */}
          {activeTab === 'em_programacao' && (
            <div className="flex flex-col gap-4 lg:flex-row">
              {/* Left: list */}
              <div className="w-full lg:w-72 xl:w-80 flex-shrink-0 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">
                  Em andamento ({emAndamento.length})
                </p>
                {emAndamento.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center">
                    <Cpu size={24} className="mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-xs text-muted-foreground">Nenhum programa em andamento.</p>
                    <Button size="sm" variant="outline" className="mt-3 gap-1.5" onClick={() => setActiveTab('pendentes')}>
                      <Clock size={12} />
                      Ver Pendentes
                    </Button>
                  </div>
                )}
                {emAndamento.map((prog) => (
                  <button
                    key={prog.id}
                    onClick={() => handleSelectPrograma(prog)}
                    className={cn(
                      'w-full text-left rounded-xl border p-3 transition-all',
                      activeProgramaId === prog.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:bg-muted/40'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-mono font-bold text-primary">{prog.codigo}</p>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {prog.dataInicio ? fmtElapsed(prog.dataInicio.getTime(), now) : '—'}
                      </span>
                    </div>
                    <p className="text-xs font-medium mt-0.5 truncate">{prog.nome}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{prog.programador}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {prog.osGerais.slice(0, 3).map((os) => <OSChip key={os} os={os} />)}
                    </div>
                  </button>
                ))}
              </div>

              {/* Right: editor */}
              <div className="flex-1 min-w-0">
                {!activeProgramaId || !activePrograma ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border h-80 text-center p-8">
                    <Workflow size={32} className="text-muted-foreground/30 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">Selecione um programa para editar</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Ou inicie a programação de uma solicitação pendente.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Editor header */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="text-sm font-bold">{activePrograma.codigo} — editando</p>
                        <p className="text-xs text-muted-foreground">
                          Iniciado: {activePrograma.dataInicio ? fmtDateTime(activePrograma.dataInicio) : '—'} · Decorrido: {activePrograma.dataInicio ? fmtElapsed(activePrograma.dataInicio.getTime(), now) : '—'}
                        </p>
                      </div>
                      {!confirmConcluir ? (
                        <Button onClick={() => setConfirmConcluir(true)} className="gap-1.5 bg-success hover:bg-success/90 text-white">
                          <CheckCircle2 size={14} />
                          Concluir Programação
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-warning font-medium">Confirmar conclusão?</p>
                          <Button size="sm" onClick={handleConcluir} className="h-8 gap-1 bg-success hover:bg-success/90 text-white">
                            <CheckCircle2 size={12} /> Confirmar
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8" onClick={() => setConfirmConcluir(false)}>
                            Cancelar
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Program info */}
                    <Card>
                      <CardContent className="p-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <Label className="text-xs">Nome do Programa *</Label>
                          <Input className="mt-1 h-9 text-sm" value={editForm.nome} onChange={(e) => setEditForm((f) => ({ ...f, nome: e.target.value }))} placeholder="ex: Painel Lateral PNL-001" />
                        </div>
                        <div>
                          <Label className="text-xs">Código do Programa *</Label>
                          <Input className="mt-1 h-9 text-sm font-mono" value={editForm.codigo} onChange={(e) => setEditForm((f) => ({ ...f, codigo: e.target.value }))} placeholder="ex: PRG-205" />
                        </div>
                        <div>
                          <Label className="text-xs">Tempo Estimado (min)</Label>
                          <Input type="number" className="mt-1 h-9 text-sm" value={editForm.tempoEstimadoMin || ''} onChange={(e) => setEditForm((f) => ({ ...f, tempoEstimadoMin: Number(e.target.value) || 0 }))} placeholder="0" />
                        </div>
                        <div>
                          <Label className="text-xs">Observações</Label>
                          <Input className="mt-1 h-9 text-sm" value={editForm.observacoes} onChange={(e) => setEditForm((f) => ({ ...f, observacoes: e.target.value }))} placeholder="Notas técnicas…" />
                        </div>
                      </CardContent>
                    </Card>

                    {/* OS Geral */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Hash size={13} className="text-primary" />
                          OS Geral
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {editForm.osGerais.map((os) => (
                            <span key={os} className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/8 px-2 py-1 text-xs font-mono font-semibold text-primary">
                              {os}
                              <button onClick={() => removeOsGeral(os)} className="ml-0.5 hover:text-destructive">
                                <X size={10} />
                              </button>
                            </span>
                          ))}
                          {editForm.osGerais.length === 0 && (
                            <p className="text-xs text-muted-foreground">Nenhuma OS adicionada.</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            className="h-8 text-sm font-mono flex-1"
                            placeholder="OS:1508"
                            value={editForm.novaOsInput}
                            onChange={(e) => setEditForm((f) => ({ ...f, novaOsInput: e.target.value }))}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOsGeral() } }}
                          />
                          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={addOsGeral}>
                            <Plus size={12} /> Adicionar OS
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Pieces with per-piece OS distribution */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Package size={13} className="text-primary" />
                          Peças ({editForm.pecas.length}) — Distribuição por OS
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {editForm.pecas.length === 0 && (
                          <p className="text-xs text-muted-foreground py-2">Nenhuma peça neste programa.</p>
                        )}
                        {editForm.pecas.map((peca) => {
                          const expanded = expandedPecas.has(peca.id)
                          const osSum = peca.osDistribuicao.reduce((s, o) => s + o.quantidade, 0)
                          const osOk = peca.osDistribuicao.length === 0 || osSum === peca.quantidade
                          return (
                            <div key={peca.id} className={cn('rounded-xl border overflow-hidden', osOk ? 'border-border' : 'border-warning')}>
                              {/* Piece header */}
                              <button
                                className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-muted/30 transition-colors"
                                onClick={() => toggleExpandPeca(peca.id)}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                                  <span className="text-xs font-mono font-semibold text-primary">{peca.codigo}</span>
                                  <span className="text-xs text-muted-foreground truncate">{peca.descricao}</span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                  <span className="text-xs font-bold">{peca.quantidade} und.</span>
                                  {!osOk && <AlertTriangle size={12} className="text-warning" />}
                                  {osOk && peca.osDistribuicao.length > 0 && <CheckCircle2 size={12} className="text-success" />}
                                </div>
                              </button>

                              {/* OS distribution rows */}
                              {expanded && (
                                <div className="border-t border-border bg-muted/20 p-3 space-y-2">
                                  {peca.material && (
                                    <p className="text-[11px] text-muted-foreground">
                                      Material: <span className="text-foreground font-medium">{peca.material}</span>
                                      {peca.espessura ? ` · e=${peca.espessura}mm` : ''}
                                    </p>
                                  )}

                                  {peca.osDistribuicao.map((osRow) => (
                                    <div key={osRow.id} className="flex items-center gap-2">
                                      <Input
                                        className="h-8 text-xs font-mono w-32 flex-shrink-0"
                                        placeholder="OS:1508"
                                        value={osRow.os}
                                        onChange={(e) => updateOsInPeca(peca.id, osRow.id, 'os', e.target.value)}
                                      />
                                      <Input
                                        type="number"
                                        className="h-8 text-xs w-20 flex-shrink-0"
                                        placeholder="Qtd"
                                        min={0}
                                        value={osRow.quantidade || ''}
                                        onChange={(e) => updateOsInPeca(peca.id, osRow.id, 'quantidade', e.target.value)}
                                      />
                                      <button onClick={() => removeOsFromPeca(peca.id, osRow.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                                        <Trash2 size={13} />
                                      </button>
                                    </div>
                                  ))}

                                  <div className="flex items-center justify-between pt-1">
                                    <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => addOsToPeca(peca.id)}>
                                      <Plus size={11} /> Adicionar OS
                                    </Button>
                                    <p className={cn('text-[11px] font-medium', osOk ? 'text-success' : 'text-warning')}>
                                      {osSum} / {peca.quantidade} distribuídas
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </CardContent>
                    </Card>

                    {/* Retalho Utilizado */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Layers size={13} className="text-primary" />
                          Retalho Utilizado
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex gap-2">
                          {(['chapa_inteira', 'retalho'] as const).map((tipo) => (
                            <button
                              key={tipo}
                              onClick={() => setEditForm((f) => ({ ...f, retalhoUtilizado: { ...f.retalhoUtilizado, tipo } }))}
                              className={cn(
                                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                                editForm.retalhoUtilizado.tipo === tipo
                                  ? 'border-primary bg-primary/8 text-primary'
                                  : 'border-border text-muted-foreground hover:bg-muted/40'
                              )}
                            >
                              {tipo === 'chapa_inteira' ? 'Chapa Inteira' : 'Retalho'}
                            </button>
                          ))}
                        </div>

                        {editForm.retalhoUtilizado.tipo === 'retalho' && (
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <div>
                              <Label className="text-[11px]">Código do Retalho</Label>
                              <Input className="mt-1 h-8 text-xs font-mono" placeholder="RT-089"
                                value={editForm.retalhoUtilizado.codigo ?? ''}
                                onChange={(e) => setEditForm((f) => ({ ...f, retalhoUtilizado: { ...f.retalhoUtilizado, codigo: e.target.value } }))}
                              />
                            </div>
                            <div>
                              <Label className="text-[11px]">Largura (mm)</Label>
                              <Input type="number" className="mt-1 h-8 text-xs"
                                value={editForm.retalhoUtilizado.largura ?? ''}
                                onChange={(e) => setEditForm((f) => ({ ...f, retalhoUtilizado: { ...f.retalhoUtilizado, largura: Number(e.target.value) || undefined } }))}
                              />
                            </div>
                            <div>
                              <Label className="text-[11px]">Comprimento (mm)</Label>
                              <Input type="number" className="mt-1 h-8 text-xs"
                                value={editForm.retalhoUtilizado.comprimento ?? ''}
                                onChange={(e) => setEditForm((f) => ({ ...f, retalhoUtilizado: { ...f.retalhoUtilizado, comprimento: Number(e.target.value) || undefined } }))}
                              />
                            </div>
                            <div>
                              <Label className="text-[11px]">Espessura (mm)</Label>
                              <Input type="number" className="mt-1 h-8 text-xs"
                                value={editForm.retalhoUtilizado.espessura ?? ''}
                                onChange={(e) => setEditForm((f) => ({ ...f, retalhoUtilizado: { ...f.retalhoUtilizado, espessura: Number(e.target.value) || undefined } }))}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Retalho Gerado */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Layers size={13} className="text-accent" />
                          Retalho Gerado
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex gap-2">
                          {([true, false] as const).map((v) => (
                            <button
                              key={String(v)}
                              onClick={() => setEditForm((f) => ({ ...f, retalhoGerado: { ...f.retalhoGerado, gerou: v } }))}
                              className={cn(
                                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                                editForm.retalhoGerado.gerou === v
                                  ? 'border-accent bg-accent/8 text-accent'
                                  : 'border-border text-muted-foreground hover:bg-muted/40'
                              )}
                            >
                              {v ? 'Gerou Retalho' : 'Nenhum'}
                            </button>
                          ))}
                        </div>
                        {editForm.retalhoGerado.gerou && (
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <div>
                              <Label className="text-[11px]">Código do Retalho</Label>
                              <Input className="mt-1 h-8 text-xs font-mono" placeholder="RT-091"
                                value={editForm.retalhoGerado.codigo ?? ''}
                                onChange={(e) => setEditForm((f) => ({ ...f, retalhoGerado: { ...f.retalhoGerado, codigo: e.target.value } }))}
                              />
                            </div>
                            <div>
                              <Label className="text-[11px]">Largura (mm)</Label>
                              <Input type="number" className="mt-1 h-8 text-xs"
                                value={editForm.retalhoGerado.largura ?? ''}
                                onChange={(e) => setEditForm((f) => ({ ...f, retalhoGerado: { ...f.retalhoGerado, largura: Number(e.target.value) || undefined } }))}
                              />
                            </div>
                            <div>
                              <Label className="text-[11px]">Comprimento (mm)</Label>
                              <Input type="number" className="mt-1 h-8 text-xs"
                                value={editForm.retalhoGerado.comprimento ?? ''}
                                onChange={(e) => setEditForm((f) => ({ ...f, retalhoGerado: { ...f.retalhoGerado, comprimento: Number(e.target.value) || undefined } }))}
                              />
                            </div>
                            <div>
                              <Label className="text-[11px]">Espessura (mm)</Label>
                              <Input type="number" className="mt-1 h-8 text-xs"
                                value={editForm.retalhoGerado.espessura ?? ''}
                                onChange={(e) => setEditForm((f) => ({ ...f, retalhoGerado: { ...f.retalhoGerado, espessura: Number(e.target.value) || undefined } }))}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════════ FINALIZADOS ════════════════════════ */}
          {activeTab === 'finalizados' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-48">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-8 h-9 text-sm" placeholder="Buscar por nome, código, OS, peça…" value={progSearch} onChange={(e) => setProgSearch(e.target.value)} />
                </div>
                <Button variant="outline" size="sm" className="h-9 gap-1.5">
                  <Download size={13} />
                  Exportar
                </Button>
              </div>

              {finalizados.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16">
                  <CheckCircle2 size={32} className="text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhum programa finalizado</p>
                </div>
              )}

              <div className="rounded-xl border border-border overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Código</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Nome</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">OS</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Programador</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Peças</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Tempo</th>
                      <th className="px-4 py-3 text-right font-semibold text-muted-foreground">Execuções</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Retalho</th>
                      <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Concluído</th>
                      <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtProgramas.map((p) => (
                      <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-primary">{p.codigo}</td>
                        <td className="px-4 py-3 font-medium max-w-48 truncate">{p.nome}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {p.osGerais.slice(0, 2).map((os) => <OSChip key={os} os={os} />)}
                            {p.osGerais.length > 2 && <span className="text-muted-foreground">+{p.osGerais.length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{p.programador}</td>
                        <td className="px-4 py-3 text-right font-medium">{p.pecas.length}</td>
                        <td className="px-4 py-3 text-right font-mono">{p.tempoRealMin ? `${p.tempoRealMin}m` : '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={cn('font-bold', p.numeroExecucoes > 1 ? 'text-accent' : 'text-muted-foreground')}>
                            {p.numeroExecucoes}×
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {p.retalhoUtilizado.tipo === 'retalho'
                            ? <span className="text-primary font-medium">{p.retalhoUtilizado.codigo ?? 'Retalho'}</span>
                            : <span className="text-muted-foreground">Chapa</span>}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{p.dataConclusao ? fmtDate(p.dataConclusao) : '—'}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" title="Ver Histórico" onClick={() => { setHistSearch(p.codigo); setActiveTab('historico') }}>
                              <History size={12} />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" title="Reutilizar Programa" onClick={() => setReutilizarModal({ open: true, programaId: p.id })}>
                              <RefreshCw size={12} />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" title="Enviar para Corte">
                              <Send size={12} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═════════════════════════════ CADASTRO ══════════════════════════ */}
          {activeTab === 'cadastro' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-48">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input className="pl-8 h-9 text-sm" placeholder="Código, peça, OS, programador, retalho…" value={progSearch} onChange={(e) => setProgSearch(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-9 gap-1.5">
                    <Download size={13} />
                    Exportar PDF
                  </Button>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5">
                    <FileText size={13} />
                    Exportar Excel
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filtProgramas.map((prog) => {
                  const expanded = expandedCards.has(`cad-${prog.id}`)
                  return (
                    <motion.div key={prog.id} layout>
                      <Card className="overflow-hidden">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-mono font-bold text-primary">{prog.codigo}</p>
                              <p className="text-sm font-semibold mt-0.5 leading-snug">{prog.nome}</p>
                            </div>
                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', prog.numeroExecucoes > 1 ? 'text-accent bg-accent/8 border-accent/30' : 'text-muted-foreground bg-muted border-border')}>
                              {prog.numeroExecucoes}× execuções
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-xs">
                            <div className="text-muted-foreground">Programador: <span className="text-foreground">{prog.programador}</span></div>
                            <div className="text-muted-foreground">Criado: <span className="text-foreground">{fmtDate(prog.dataCriacao)}</span></div>
                            <div className="text-muted-foreground">Peças: <span className="text-foreground font-medium">{prog.pecas.length}</span></div>
                            <div className="text-muted-foreground">Tempo: <span className="text-foreground font-mono">{prog.tempoRealMin ? `${prog.tempoRealMin}m` : '—'}</span></div>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {prog.osGerais.map((os) => <OSChip key={os} os={os} />)}
                          </div>

                          <div className="flex items-center gap-2 text-xs">
                            <Layers size={11} className="text-muted-foreground flex-shrink-0" />
                            {prog.retalhoUtilizado.tipo === 'retalho'
                              ? <span>Retalho <span className="font-mono font-medium text-primary">{prog.retalhoUtilizado.codigo}</span> utilizado</span>
                              : <span className="text-muted-foreground">Chapa inteira utilizada</span>}
                            {prog.retalhoGerado.gerou && prog.retalhoGerado.codigo && (
                              <span className="ml-auto text-accent font-medium">→ Gerou {prog.retalhoGerado.codigo}</span>
                            )}
                          </div>

                          {expanded && (
                            <div className="rounded-xl border border-border overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="border-b border-border bg-muted/30">
                                    <th className="px-2 py-1.5 text-left text-muted-foreground">Código</th>
                                    <th className="px-2 py-1.5 text-left text-muted-foreground">Descrição</th>
                                    <th className="px-2 py-1.5 text-right text-muted-foreground">Qtd</th>
                                    <th className="px-2 py-1.5 text-left text-muted-foreground">OS</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {prog.pecas.map((p) => (
                                    <tr key={p.id} className="border-b border-border last:border-0">
                                      <td className="px-2 py-1.5 font-mono">{p.codigo}</td>
                                      <td className="px-2 py-1.5 truncate max-w-24">{p.descricao}</td>
                                      <td className="px-2 py-1.5 text-right">{p.quantidade}</td>
                                      <td className="px-2 py-1.5">
                                        <div className="flex flex-wrap gap-0.5">
                                          {p.osDistribuicao.map((o) => <OSChip key={o.id} os={`${o.os}×${o.quantidade}`} />)}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          <div className="flex gap-1 pt-1 flex-wrap">
                            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => toggleExpandCard(`cad-${prog.id}`)}>
                              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                              {expanded ? 'Ocultar' : 'Ver Peças'}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setReutilizarModal({ open: true, programaId: prog.id })}>
                              <RefreshCw size={11} /> Reutilizar
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                              <Download size={11} /> Exportar
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                              <Send size={11} /> Corte
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ══════════════════════════════ HISTÓRICO ════════════════════════ */}
          {activeTab === 'historico' && (
            <div className="space-y-4">
              <div className="relative max-w-sm">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8 h-9 text-sm" placeholder="Buscar por programa, operador…" value={histSearch} onChange={(e) => setHistSearch(e.target.value)} />
              </div>

              <div className="relative space-y-1">
                {filtHistorico.map((entry, i) => {
                  const typeConfig: Record<string, { color: string; icon: React.ElementType; label: string }> = {
                    criacao:     { color: '#000080', icon: Plus,      label: 'Criação'      },
                    inicio:      { color: '#0f4c5c', icon: Play,      label: 'Início'       },
                    conclusao:   { color: '#10b981', icon: CheckCircle2, label: 'Conclusão' },
                    reutilizacao:{ color: '#8b5cf6', icon: RefreshCw, label: 'Reutilização' },
                    alteracao:   { color: '#f59e0b', icon: Activity,  label: 'Alteração'    },
                    cancelamento:{ color: '#ef4444', icon: XCircle,   label: 'Cancelamento' },
                  }
                  const cfg = typeConfig[entry.tipo] ?? typeConfig.alteracao
                  const Icon = cfg.icon
                  return (
                    <div key={entry.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-background shadow-sm" style={{ background: cfg.color }}>
                          <Icon size={11} className="text-white" />
                        </div>
                        {i < filtHistorico.length - 1 && <div className="w-px flex-1 bg-border mt-1" style={{ minHeight: 16 }} />}
                      </div>
                      <div className="flex-1 min-w-0 pb-3">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: cfg.color }}>{cfg.label}</span>
                            {entry.programaCodigo && (
                              <span className="ml-2 text-[10px] font-mono text-muted-foreground">{entry.programaCodigo}</span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">{fmtDateTime(entry.timestamp)}</span>
                        </div>
                        <p className="text-xs mt-0.5">{entry.descricao}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Operador: {entry.operador}
                          {entry.programaNome && ` · ${entry.programaNome}`}
                        </p>
                      </div>
                    </div>
                  )
                })}
                {filtHistorico.length === 0 && (
                  <div className="flex flex-col items-center py-16">
                    <History size={28} className="text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum registro encontrado</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════ ANÁLISES ═════════════════════════ */}
          {activeTab === 'analises' && (
            <div className="space-y-4">
              {/* Row 1 */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Tempo Médio de Programação (min)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={mockTempoMedioSemanal}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis dataKey="semana" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <RchTooltip contentStyle={{ fontSize: 11 }} />
                        <Bar dataKey="tempoMedio" fill="#0f4c5c" radius={[4, 4, 0, 0]} name="Tempo Médio (min)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Eficiência Semanal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={mockEficienciaSemanalProg}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} domain={[60, 100]} />
                        <RchTooltip contentStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="eficiencia" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Eficiência %" />
                        <Line type="monotone" dataKey="programas" stroke="#000080" strokeWidth={2} dot={{ r: 3 }} name="Programas" />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Programas por OS</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={mockProgramasPorOS} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="os" tick={{ fontSize: 10 }} width={60} />
                        <RchTooltip contentStyle={{ fontSize: 11 }} />
                        <Bar dataKey="programas" radius={[0, 4, 4, 0]} name="Programas">
                          {mockProgramasPorOS.map((e) => <Cell key={e.os} fill={e.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Aproveitamento de Material</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={mockAproveitamentoRetalho} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ value }) => `${value}%`}>
                          {mockAproveitamentoRetalho.map((e) => <Cell key={e.name} fill={e.fill} />)}
                        </Pie>
                        <RchTooltip contentStyle={{ fontSize: 11 }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Row 3: Programador stats */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User size={13} className="text-primary" />
                    Eficiência por Programador
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 mb-4">
                    {mockEficienciaProgramadores.map((prog) => (
                      <div key={prog.nome} className="rounded-xl border border-border p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold">{prog.nome}</p>
                          <span className="text-xs font-bold text-success">{prog.eficiencia}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${prog.eficiencia}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{prog.programas} programas</span>
                          <span>Média: {prog.tempoMedio}m</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={mockEficienciaProgramadores}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                      <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RchTooltip contentStyle={{ fontSize: 11 }} />
                      <Bar dataKey="eficiencia" name="Eficiência %" radius={[4, 4, 0, 0]}>
                        {mockEficienciaProgramadores.map((e) => <Cell key={e.nome} fill={e.fill} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Tempo por OS — prep for future IA integration */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock size={13} className="text-primary" />
                    Distribuição de Tempo por OS
                    <span className="ml-auto text-[10px] font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Preparado para análise IA</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground mb-3">
                    Tempo de programação distribuído proporcionalmente por OS com base na quantidade de peças. Usado para cálculo de custo/tempo por ordem de serviço.
                  </p>
                  <div className="rounded-xl border border-border overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="px-4 py-2 text-left font-semibold text-muted-foreground">OS</th>
                          <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Programas</th>
                          <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Tempo Total (min)</th>
                          <th className="px-4 py-2 text-right font-semibold text-muted-foreground">Tempo Médio (min)</th>
                          <th className="px-4 py-2 text-right font-semibold text-muted-foreground">% do Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockProgramasPorOS.map((row, i) => {
                          const tempoTotal = (row.programas * 80) + i * 12
                          const tempoMedio = Math.round(tempoTotal / row.programas)
                          const pct = Math.round(tempoTotal / mockProgramasPorOS.reduce((s, r, j) => s + (r.programas * 80) + j * 12, 0) * 100)
                          return (
                            <tr key={row.os} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-2">
                                <span className="font-mono font-semibold text-primary">{row.os}</span>
                              </td>
                              <td className="px-4 py-2 text-right">{row.programas}</td>
                              <td className="px-4 py-2 text-right font-mono">{tempoTotal}</td>
                              <td className="px-4 py-2 text-right font-mono">{tempoMedio}</td>
                              <td className="px-4 py-2 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%`, background: row.fill }} />
                                  </div>
                                  <span className="font-medium w-8 text-right">{pct}%</span>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── Reutilizar Programa Modal ── */}
      <AnimatePresence>
        {reutilizarModal.open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setReutilizarModal({ open: false, programaId: null }) } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card rounded-2xl border border-border p-6 w-full max-w-sm shadow-xl"
            >
              <h3 className="font-bold text-sm mb-1">Reutilizar Programa</h3>
              <p className="text-xs text-muted-foreground mb-4">Informe as novas OS para esta execução. O contador de execuções será incrementado.</p>
              <Label className="text-xs">OS para esta execução</Label>
              <Input
                className="mt-1 h-9 text-sm font-mono"
                placeholder="OS:1560, OS:1561"
                value={reutilizarOs}
                onChange={(e) => setReutilizarOs(e.target.value)}
              />
              <div className="flex gap-2 mt-4">
                <Button
                  className="flex-1 gap-1.5"
                  onClick={() => {
                    if (!reutilizarModal.programaId || !reutilizarOs.trim()) { toast('error', 'Informe ao menos uma OS'); return }
                    const novasOs = reutilizarOs.split(',').map((s) => s.trim()).filter(Boolean)
                    reutilizarPrograma(reutilizarModal.programaId, novasOs, currentCargo?.nome ?? 'Programador')
                    setReutilizarModal({ open: false, programaId: null })
                    setReutilizarOs('')
                    toast('success', `Programa reutilizado — ${novasOs.join(', ')}`)
                  }}
                >
                  <RefreshCw size={13} />
                  Confirmar Reutilização
                </Button>
                <Button variant="outline" onClick={() => { setReutilizarModal({ open: false, programaId: null }); setReutilizarOs('') }}>
                  Cancelar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
