'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Brain,
  MessageSquare,
  Sparkles,
  BarChart3,
  History,
  Settings,
  Shield,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Info,
  Send,
  Activity,
  Zap,
  LayoutDashboard,
  Download,
  Search,
  ChevronDown,
  ChevronRight,
  RotateCcw,
  Cpu,
  Users,
  Lock,
  Sliders,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts'
import { PageHeader } from '@/components/shared/PageHeader'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import {
  mockAIInsights,
  mockAIHistory,
  mockAIActivities,
  mockTempoPorSetor,
  mockEficienciaSemanal,
  mockTopOSTempos,
  mockGargaloDist,
  initialChatMessages,
  DEFAULT_AI_CONFIG,
} from '@/mocks/ai'
import { getMockAIResponse } from '@/lib/ai'
import type {
  ChatMessage,
  AIInsight,
  AIConfig,
  AIActivityItem,
  InsightSeverity,
  AIModel,
} from '@/types/ai'

// ─── Types ────────────────────────────────────────────────────────────────────

type TabView = 'dashboard' | 'assistente' | 'insights' | 'analises' | 'historico' | 'configuracoes'

// ─── Config ───────────────────────────────────────────────────────────────────

const GOLD        = '#d4af37'
const GOLD_LIGHT  = 'rgba(212, 175, 55, 0.15)'
const GOLD_MEDIUM = 'rgba(212, 175, 55, 0.3)'

const TABS: { id: TabView; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'dashboard',     label: 'Dashboard IA',         icon: LayoutDashboard },
  { id: 'assistente',    label: 'Assistente IA',        icon: MessageSquare   },
  { id: 'insights',      label: 'Insights',             icon: Sparkles        },
  { id: 'analises',      label: 'Análises Operacionais', icon: BarChart3      },
  { id: 'historico',     label: 'Histórico IA',         icon: History         },
  { id: 'configuracoes', label: 'Configurações',        icon: Settings        },
]

const INIT_PHASES = [
  'Sincronizando inteligência operacional...',
  'Analisando dados industriais...',
  'Inicializando núcleo estratégico...',
  'Acesso Inteligente Liberado',
]

const SEVERITY_CFG: Record<InsightSeverity, {
  label: string; color: string; bg: string; border: string; icon: React.ComponentType<{ size?: number; className?: string }>
}> = {
  critical: { label: 'Crítico',   color: 'text-destructive', bg: 'bg-destructive/10',  border: 'border-destructive/30', icon: AlertOctagon  },
  warning:  { label: 'Atenção',   color: 'text-warning',     bg: 'bg-warning/10',       border: 'border-warning/30',     icon: AlertTriangle },
  info:     { label: 'Info',      color: 'text-primary',     bg: 'bg-primary/10',       border: 'border-primary/30',     icon: Info          },
  success:  { label: 'Positivo',  color: 'text-success',     bg: 'bg-success/10',       border: 'border-success/30',     icon: CheckCircle2  },
}

const ACTIVITY_CFG: Record<AIActivityItem['type'], { color: string; bg: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  analyzing:  { color: 'text-primary',    bg: 'bg-primary/10',    icon: Activity     },
  detected:   { color: 'text-warning',    bg: 'bg-warning/10',    icon: AlertTriangle},
  suggestion: { color: 'text-accent',     bg: 'bg-accent/10',     icon: Zap          },
  warning:    { color: 'text-destructive',bg: 'bg-destructive/10',icon: AlertTriangle},
  success:    { color: 'text-success',    bg: 'bg-success/10',    icon: CheckCircle2 },
}

const AI_MODELS: { value: AIModel; label: string; badge: string }[] = [
  { value: 'gpt-5-mini', label: 'GPT-5 Mini',  badge: 'Recomendado' },
  { value: 'gpt-5',      label: 'GPT-5',       badge: 'Premium'     },
  { value: 'gpt-4.1',    label: 'GPT-4.1',     badge: 'Legado'      },
  { value: 'claude-3-5', label: 'Claude 3.5',  badge: 'Alternativo' },
  { value: 'gemini-2.0', label: 'Gemini 2.0',  badge: 'Alternativo' },
]

const SUGGESTION_PROMPTS = [
  'Existe algum gargalo na produção?',
  'Como está a eficiência do corte?',
  'Quais OS consumiram mais tempo?',
  'Como reduzir o tempo da dobra?',
  'Existe excesso de estoque?',
  'Como melhorar a eficiência geral?',
]

const KPI_DATA = [
  { label: 'Análises realizadas hoje',  value: '47',    delta: '+12',    trend: 'up'     as const, color: 'text-primary',     bg: 'bg-primary/10'     },
  { label: 'Insights gerados',          value: '8',     delta: '+3',     trend: 'up'     as const, color: 'text-accent',      bg: 'bg-accent/10'      },
  { label: 'Setores analisados',        value: '4',     delta: '—',      trend: 'stable' as const, color: 'text-foreground',  bg: 'bg-muted'          },
  { label: 'Economia estimada',         value: '~6h',   delta: 'esta semana', trend: 'up' as const, color: 'text-success',  bg: 'bg-success/10'     },
  { label: 'Gargalos detectados',       value: '2',     delta: '1 crítico',  trend: 'down' as const, color: 'text-destructive', bg: 'bg-destructive/10' },
  { label: 'Eficiência operacional',    value: '75%',   delta: '+2.3%',  trend: 'up'     as const, color: 'text-warning',     bg: 'bg-warning/10'     },
]

// ─── Module-level initialization flag (persists through SPA navigation) ───────
let _esyncIAInitialized = false

// ─── Access Blocked Screen ────────────────────────────────────────────────────

function AcessoBloqueadoScreen({ cargoNome }: { cargoNome?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="flex flex-col items-center"
      >
        {/* Gold lock icon */}
        <div className="relative mb-8">
          <div
            className="absolute inset-0 rounded-2xl blur-2xl scale-150 opacity-40"
            style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }}
          />
          <div
            className="relative flex h-20 w-20 items-center justify-center rounded-2xl shadow-xl"
            style={{
              background: 'rgba(212, 175, 55, 0.08)',
              border: `1px solid ${GOLD_MEDIUM}`,
            }}
          >
            <Lock size={32} style={{ color: GOLD }} />
          </div>
        </div>

        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold mb-4"
          style={{ background: GOLD_LIGHT, border: `1px solid ${GOLD_MEDIUM}`, color: GOLD }}
        >
          <ShieldAlert size={11} />
          Acesso Restrito
        </span>

        <h2 className="text-2xl font-bold text-foreground mb-3">Módulo Reservado</h2>
        <p className="text-muted-foreground max-w-sm text-sm leading-relaxed mb-2">
          O <strong className="text-foreground">Esync IA</strong> é exclusivo para o cargo <strong className="text-foreground">Mecânica</strong>.
          {cargoNome && ` Seu cargo atual é "${cargoNome}".`}
        </p>
        <p className="text-xs text-muted-foreground/60 max-w-xs">
          Entre em contato com um administrador do sistema para solicitar acesso.
        </p>

        <div className="flex flex-col items-center gap-2 mt-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield size={12} style={{ color: GOLD }} />
            <span>Esync IA · Sistema de Inteligência Industrial</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Neural Loading Screen ────────────────────────────────────────────────────

function NeuralLoadingScreen({ phase }: { phase: number }) {
  const isDone = phase === 3

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <div className="flex flex-col items-center">

        {/* Neural rings animation */}
        <div className="relative flex items-center justify-center mb-10">
          {[80, 110, 140].map((size, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width:  size,
                height: size,
                border: `1px solid rgba(212, 175, 55, ${0.35 - i * 0.08})`,
              }}
              animate={{ scale: [1, 1.06, 1], opacity: [0.3 + i * 0.1, 0.7, 0.3 + i * 0.1] }}
              transition={{ duration: 2 + i * 0.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 }}
            />
          ))}

          {/* Core */}
          <motion.div
            className="relative flex h-16 w-16 items-center justify-center rounded-2xl shadow-2xl"
            style={{
              background: isDone ? 'rgba(16, 185, 129, 0.15)' : 'rgba(212, 175, 55, 0.1)',
              border:     `1px solid ${isDone ? 'rgba(16,185,129,0.4)' : GOLD_MEDIUM}`,
            }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            {isDone ? (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                <CheckCircle2 size={28} className="text-success" />
              </motion.div>
            ) : (
              <Brain size={28} style={{ color: GOLD }} />
            )}
          </motion.div>
        </div>

        {/* Phase text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <p
              className={cn(
                'text-sm font-semibold',
                isDone ? 'text-success' : 'text-foreground/80'
              )}
            >
              {INIT_PHASES[phase]}
            </p>
            {isDone && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs mt-1"
                style={{ color: GOLD }}
              >
                Núcleo Estratégico Operacional · Acesso Verificado
              </motion.p>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mt-6">
          {INIT_PHASES.map((_, i) => (
            <motion.div
              key={i}
              className="h-1.5 rounded-full"
              style={{ background: i <= phase ? GOLD : 'rgba(212,175,55,0.2)' }}
              animate={{ width: i === phase ? 20 : 6 }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground/40 mt-8 uppercase tracking-widest">
          Esync IA · Sistema de Inteligência Industrial
        </p>
      </div>
    </div>
  )
}

// ─── Insight Card ──────────────────────────────────────────────────────────────

function InsightCard({
  insight,
  expanded,
  onToggle,
}: {
  insight: AIInsight
  expanded: boolean
  onToggle: () => void
}) {
  const cfg = SEVERITY_CFG[insight.severity]
  const Icon = cfg.icon

  return (
    <motion.div
      layout
      className={cn('rounded-xl border overflow-hidden transition-all duration-200', cfg.border)}
    >
      <button
        type="button"
        onClick={onToggle}
        className={cn('w-full p-4 text-left flex items-start gap-3', cfg.bg, 'hover:opacity-90 transition-opacity')}
      >
        <div className={cn('flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg mt-0.5', cfg.bg, 'border', cfg.border)}>
          <Icon size={14} className={cfg.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn('text-xs font-bold uppercase tracking-wide', cfg.color)}>
                  {cfg.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {insight.category}
                </span>
                {insight.setor && (
                  <span className="text-xs text-muted-foreground bg-muted rounded px-1.5 py-0.5">
                    {insight.setor}
                  </span>
                )}
              </div>
              <p className="text-sm font-semibold text-foreground mt-0.5">{insight.title}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{insight.description}</p>
            </div>
            <div className="flex-shrink-0 flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                {insight.confidence}% conf.
              </span>
              <ChevronDown size={14} className={cn('text-muted-foreground/60 transition-transform flex-shrink-0', expanded && 'rotate-180')} />
            </div>
          </div>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-3 border-t space-y-3" style={{ borderColor: 'rgba(var(--border), 0.5)' }}>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <Zap size={9} />
                  Recomendação da IA
                </p>
                <p className="text-xs text-foreground leading-relaxed">{insight.recommendation}</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-muted-foreground">Impacto: </span>
                  <span className="font-semibold text-foreground">{insight.impact}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Detectado: </span>
                  <span className="font-semibold text-foreground">
                    {insight.detectedAt.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Chat Message ──────────────────────────────────────────────────────────────

function ChatMsg({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'

  if (msg.isLoading) {
    return (
      <div className="flex items-start gap-3">
        <div
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg shadow-sm"
          style={{ background: GOLD_LIGHT, border: `1px solid ${GOLD_MEDIUM}` }}
        >
          <Brain size={13} style={{ color: GOLD }} />
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-1.5">
            {[0, 0.15, 0.3].map((delay) => (
              <motion.div
                key={delay}
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: GOLD }}
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{ duration: 1.2, repeat: Infinity, delay }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (isUser) {
    return (
      <div className="flex items-start gap-3 flex-row-reverse">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
          <Users size={13} className="text-primary" />
        </div>
        <div className="max-w-[80%] rounded-xl bg-primary/10 border border-primary/20 px-4 py-2.5">
          <p className="text-sm text-foreground">{msg.content}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1 text-right">
            {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    )
  }

  // Assistant message with markdown-like rendering
  const lines = msg.content.split('\n')
  return (
    <div className="flex items-start gap-3">
      <div
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg shadow-sm"
        style={{ background: GOLD_LIGHT, border: `1px solid ${GOLD_MEDIUM}` }}
      >
        <Brain size={13} style={{ color: GOLD }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-1">
          {lines.map((line, i) => {
            if (!line.trim()) return <div key={i} className="h-1" />
            if (line.startsWith('**') && line.endsWith('**') && line.length > 4) {
              return <p key={i} className="text-sm font-bold text-foreground">{line.slice(2, -2)}</p>
            }
            if (line.startsWith('─')) {
              return <hr key={i} className="border-border my-1" />
            }
            if (line.startsWith('| ')) {
              return (
                <div key={i} className="overflow-x-auto">
                  <p className="text-xs font-mono text-muted-foreground whitespace-pre">{line}</p>
                </div>
              )
            }
            if (line.startsWith('🔴') || line.startsWith('🟡') || line.startsWith('🟢') || line.startsWith('🔵') || line.startsWith('✅') || line.startsWith('⚠️') || line.startsWith('🏆') || line.startsWith('1.') || line.startsWith('2.') || line.startsWith('3.') || line.startsWith('4.') || line.startsWith('- ')) {
              return <p key={i} className="text-xs text-foreground leading-relaxed">{line}</p>
            }
            if (line.startsWith('*') && line.endsWith('*')) {
              return <p key={i} className="text-[10px] text-muted-foreground/70 italic">{line.slice(1, -1)}</p>
            }
            return <p key={i} className="text-xs text-foreground leading-relaxed">{line}</p>
          })}
        </div>
        <div className="flex items-center gap-3 mt-1 px-1">
          {msg.analysisType && (
            <span className="text-[10px] text-muted-foreground/60">{msg.analysisType}</span>
          )}
          <span className="text-[10px] text-muted-foreground/40">
            {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Main ERP Page Export ─────────────────────────────────────────────────────

export default function EsyncIAPage() {
  const { canView, currentCargo } = useAuth()
  if (!canView('esync_ia')) {
    return <AcessoBloqueadoScreen cargoNome={currentCargo?.nome} />
  }
  return <EsyncIAMain />
}

// ─── Module Main Content ──────────────────────────────────────────────────────

function EsyncIAMain() {
  // ── Initialization ──────────────────────────────────────────────────────
  const [isInit, setIsInit] = useState(!_esyncIAInitialized)
  const [initPhase, setInitPhase] = useState(0)

  useEffect(() => {
    if (_esyncIAInitialized) return
    const t1 = setTimeout(() => setInitPhase(1), 800)
    const t2 = setTimeout(() => setInitPhase(2), 1650)
    const t3 = setTimeout(() => setInitPhase(3), 2500)
    const t4 = setTimeout(() => {
      _esyncIAInitialized = true
      setIsInit(false)
    }, 3300)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4) }
  }, [])

  // ── Module state ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabView>('dashboard')

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>(initialChatMessages)
  const [chatInput, setChatInput] = useState('')
  const [isAITyping, setIsAITyping] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Insights state
  const [expandedInsight, setExpandedInsight] = useState<string | null>(null)
  const [insightFilter, setInsightFilter] = useState<'all' | InsightSeverity>('all')

  // History state
  const [historySearch, setHistorySearch] = useState('')

  // Config state
  const [config, setConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG)
  const [configSaved, setConfigSaved] = useState(false)

  // Activity feed: cycle through items
  const [activityIdx, setActivityIdx] = useState(0)
  const visibleActivities = useMemo(() => {
    const start = activityIdx % mockAIActivities.length
    const items = []
    for (let i = 0; i < 5; i++) {
      items.push(mockAIActivities[(start + i) % mockAIActivities.length])
    }
    return items
  }, [activityIdx])

  useEffect(() => {
    const id = setInterval(() => setActivityIdx((n) => n + 1), 3500)
    return () => clearInterval(id)
  }, [])

  // ── Chat handlers ───────────────────────────────────────────────────────

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback((text: string) => {
    const input = text.trim()
    if (!input || isAITyping) return

    const userMsg: ChatMessage = {
      id:        `msg-${Date.now()}-u`,
      role:      'user',
      content:   input,
      timestamp: new Date(),
    }
    const loadingMsg: ChatMessage = {
      id:        `msg-${Date.now()}-l`,
      role:      'assistant',
      content:   '',
      timestamp: new Date(),
      isLoading: true,
    }

    setMessages((prev) => [...prev, userMsg, loadingMsg])
    setChatInput('')
    setIsAITyping(true)

    const { response, analysisType, delayMs } = getMockAIResponse(input)

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id:           `msg-${Date.now()}-a`,
        role:         'assistant',
        content:      response,
        timestamp:    new Date(),
        analysisType,
      }
      setMessages((prev) => prev.filter((m) => !m.isLoading).concat(aiMsg))
      setIsAITyping(false)
    }, delayMs)
  }, [isAITyping])

  const handleSend = useCallback(() => sendMessage(chatInput), [chatInput, sendMessage])

  const handleClearChat = useCallback(() => {
    setMessages(initialChatMessages)
    toast('info', 'Conversa reiniciada')
  }, [])

  // ── Config ──────────────────────────────────────────────────────────────

  const handleSaveConfig = useCallback(() => {
    setConfigSaved(true)
    toast('success', 'Configurações de IA salvas com sucesso!')
    setTimeout(() => setConfigSaved(false), 2000)
  }, [])

  // ── Filtered insights ────────────────────────────────────────────────────

  const filteredInsights = useMemo(() => {
    if (insightFilter === 'all') return mockAIInsights
    return mockAIInsights.filter((i) => i.severity === insightFilter)
  }, [insightFilter])

  const filteredHistory = useMemo(() => {
    if (!historySearch) return mockAIHistory
    const q = historySearch.toLowerCase()
    return mockAIHistory.filter(
      (h) => h.pergunta.toLowerCase().includes(q) || h.tipoAnalise.toLowerCase().includes(q)
    )
  }, [historySearch])

  // ── Loading screen ───────────────────────────────────────────────────────

  if (isInit) return <NeuralLoadingScreen phase={initPhase} />

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      <PageHeader
        title="Esync IA"
        subtitle="Sistema Inteligente de Análise Operacional"
        breadcrumbs={[{ label: 'Início', href: '/dashboard' }, { label: 'Esync IA' }]}
        actions={
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: GOLD_LIGHT, border: `1px solid ${GOLD_MEDIUM}`, color: GOLD }}
            >
              <motion.span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: GOLD }}
                animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.1, 0.8] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              IA Online
            </span>
          </div>
        }
      />

      {/* ── Tabs ── */}
      <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-1 overflow-x-auto">
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
            style={activeTab === tab.id ? { borderBottom: `2px solid ${GOLD}` } : undefined}
          >
            <tab.icon size={14} />
            <span className="whitespace-nowrap">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">

        {/* ════════ DASHBOARD IA ════════ */}
        {activeTab === 'dashboard' && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <div className="space-y-6">

              {/* Hero card */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative rounded-2xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--card)) 0%, rgba(212,175,55,0.03) 100%)',
                  border: `1px solid ${GOLD_MEDIUM}`,
                  boxShadow: `0 4px 40px rgba(212,175,55,0.08)`,
                }}
              >
                {/* Subtle diagonal grid */}
                <div
                  className="absolute inset-0 opacity-[0.02] pointer-events-none"
                  style={{ backgroundImage: 'repeating-linear-gradient(45deg, #d4af37, #d4af37 1px, transparent 1px, transparent 16px)' }}
                />
                <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <motion.div
                      animate={{ scale: [1, 1.06, 1] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                      className="relative flex-shrink-0"
                    >
                      <div
                        className="absolute inset-0 rounded-xl blur-lg scale-125 opacity-50"
                        style={{ background: `radial-gradient(circle, ${GOLD} 0%, transparent 70%)` }}
                      />
                      <div
                        className="relative flex h-14 w-14 items-center justify-center rounded-xl shadow-xl"
                        style={{ background: GOLD_LIGHT, border: `1px solid ${GOLD_MEDIUM}` }}
                      >
                        <Brain size={26} style={{ color: GOLD }} />
                      </div>
                    </motion.div>
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Esync IA</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Sistema de Inteligência Industrial · Núcleo Estratégico Operacional</p>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">
                          Última sincronização: <span className="font-semibold text-foreground">agora</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">
                          Registros analisados: <span className="font-semibold text-foreground">1.847</span>
                        </span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-[10px] text-muted-foreground">
                          Modelo: <span className="font-semibold text-foreground">{config.model}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      className="gap-1.5 h-8"
                      onClick={() => setActiveTab('assistente')}
                      style={{ background: GOLD, color: '#1a1a1a', borderColor: GOLD }}
                    >
                      <MessageSquare size={13} />
                      Assistente IA
                    </Button>
                  </div>
                </div>
              </motion.div>

              {/* KPI Cards */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {KPI_DATA.map((kpi, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, type: 'spring', stiffness: 260, damping: 26 }}
                    className="group rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl', kpi.bg)}>
                      {kpi.trend === 'up'     && <TrendingUp   size={16} className={kpi.color} />}
                      {kpi.trend === 'down'   && <TrendingDown size={16} className={kpi.color} />}
                      {kpi.trend === 'stable' && <Minus        size={16} className={kpi.color} />}
                    </div>
                    <p className="text-xl font-bold tracking-tight text-foreground">{kpi.value}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-0.5">{kpi.label}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{kpi.delta}</p>
                  </motion.div>
                ))}
              </div>

              {/* Activity Feed + Quick Insights row */}
              <div className="grid gap-4 lg:grid-cols-3">

                {/* Activity feed */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Activity size={14} className="text-primary" />
                          Atividade IA em Tempo Real
                        </CardTitle>
                        <CardDescription className="text-xs">Operações de análise em andamento</CardDescription>
                      </div>
                      <motion.div
                        className="h-2 w-2 rounded-full"
                        style={{ background: '#10b981' }}
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1.5">
                    <AnimatePresence mode="popLayout">
                      {visibleActivities.map((a) => {
                        const cfg = ACTIVITY_CFG[a.type]
                        const Icon = cfg.icon
                        return (
                          <motion.div
                            key={a.id}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 12 }}
                            transition={{ duration: 0.25 }}
                            className="flex items-center gap-3 rounded-lg p-2.5 bg-muted/30"
                          >
                            <div className={cn('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg', cfg.bg)}>
                              <Icon size={12} className={cfg.color} />
                            </div>
                            <p className="text-xs text-foreground flex-1 leading-snug">{a.message}</p>
                            <span className="text-[10px] text-muted-foreground/50 flex-shrink-0 whitespace-nowrap">
                              {a.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </CardContent>
                </Card>

                {/* Status + quick actions */}
                <div className="flex flex-col gap-3">
                  {/* AI Status */}
                  <div
                    className="rounded-xl p-4"
                    style={{ background: GOLD_LIGHT, border: `1px solid ${GOLD_MEDIUM}` }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <motion.div
                        animate={{ scale: [1, 1.08, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg"
                        style={{ background: 'rgba(212,175,55,0.2)', border: `1px solid ${GOLD_MEDIUM}` }}
                      >
                        <Brain size={15} style={{ color: GOLD }} />
                      </motion.div>
                      <div>
                        <p className="text-sm font-bold text-foreground">IA Online</p>
                        <p className="text-[10px]" style={{ color: GOLD }}>Núcleo estratégico ativo</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs">
                      {[
                        { label: 'Sincronização', value: '100%' },
                        { label: 'Modelos carregados', value: '1/1' },
                        { label: 'Uso diário', value: `47/${config.dailyLimit}` },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center justify-between">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-semibold text-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick actions */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ações Rápidas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {[
                        { label: 'Analisar gargalos',   tab: 'assistente' as TabView, query: 'Existe algum gargalo na produção atual?' },
                        { label: 'Ver insights ativos',  tab: 'insights'   as TabView, query: '' },
                        { label: 'Análise de estoque',  tab: 'assistente' as TabView, query: 'Analise o nível de estoque crítico' },
                      ].map((action) => (
                        <button
                          key={action.label}
                          type="button"
                          onClick={() => {
                            if (action.query) {
                              setActiveTab('assistente')
                              setTimeout(() => sendMessage(action.query), 50)
                            } else {
                              setActiveTab(action.tab)
                            }
                          }}
                          className="w-full flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted hover:border-muted-foreground/30 transition-all"
                        >
                          {action.label}
                          <ChevronRight size={12} className="text-muted-foreground/50" />
                        </button>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* ════════ ASSISTENTE IA ════════ */}
        {activeTab === 'assistente' && (
          <motion.div key="assistente" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <div className="flex flex-col h-[calc(100vh-18rem)] min-h-[500px] max-h-[760px]">

              {/* Header */}
              <div
                className="flex items-center justify-between px-4 py-3 rounded-t-xl border border-b-0 flex-shrink-0"
                style={{ background: GOLD_LIGHT, borderColor: GOLD_MEDIUM }}
              >
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(212,175,55,0.2)', border: `1px solid ${GOLD_MEDIUM}` }}
                  >
                    <Brain size={15} style={{ color: GOLD }} />
                  </motion.div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Esync IA · Assistente Operacional</p>
                    <div className="flex items-center gap-1.5">
                      <motion.div
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: '#10b981' }}
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                      <span className="text-[10px] text-muted-foreground">Online · Modelo: {config.model}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleClearChat}
                  className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <RotateCcw size={11} />
                  Limpar
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 border border-t-0 border-b-0 border-border bg-card/50">
                {messages.map((msg) => <ChatMsg key={msg.id} msg={msg} />)}
                <div ref={chatEndRef} />
              </div>

              {/* Suggestion chips */}
              <div className="px-4 pt-3 pb-2 border border-t-0 border-b-0 border-border bg-card/50 flex-shrink-0">
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {SUGGESTION_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => sendMessage(prompt)}
                      disabled={isAITyping}
                      className="flex-shrink-0 rounded-full border border-border bg-muted px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-muted-foreground/40 hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="flex-shrink-0 flex items-center gap-2 p-3 rounded-b-xl border border-t border-border bg-card">
                <input
                  className="flex-1 h-10 rounded-xl border border-border bg-muted/40 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent transition-colors"
                  placeholder="Pergunte algo sobre a operação industrial..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={isAITyping}
                />
                <Button
                  onClick={handleSend}
                  disabled={isAITyping || !chatInput.trim()}
                  className="h-10 w-10 p-0 flex-shrink-0"
                  style={chatInput.trim() ? { background: GOLD, borderColor: GOLD, color: '#1a1a1a' } : undefined}
                >
                  <Send size={14} />
                </Button>
              </div>

            </div>
          </motion.div>
        )}

        {/* ════════ INSIGHTS ════════ */}
        {activeTab === 'insights' && (
          <motion.div key="insights" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <div className="space-y-4">

              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Sparkles size={15} style={{ color: GOLD }} />
                    Insights Inteligentes
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {mockAIInsights.filter((i) => i.severity === 'critical').length} crítico{mockAIInsights.filter((i) => i.severity === 'critical').length !== 1 ? 's' : ''} ·{' '}
                    {mockAIInsights.length} total detectado{mockAIInsights.length !== 1 ? 's' : ''} · Última varredura: agora
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(['all', 'critical', 'warning', 'info', 'success'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setInsightFilter(f)}
                      className={cn(
                        'rounded-lg border px-2.5 py-1 text-xs font-semibold transition-all',
                        insightFilter === f
                          ? f === 'all'
                            ? 'border-foreground/20 bg-foreground text-background'
                            : cn(SEVERITY_CFG[f].bg, SEVERITY_CFG[f].color, 'border-current')
                          : 'border-border text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {f === 'all' ? 'Todos' : SEVERITY_CFG[f].label}
                      <span className="ml-1 text-[10px] opacity-60">
                        {f === 'all' ? mockAIInsights.length : mockAIInsights.filter((i) => i.severity === f).length}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Insight cards */}
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredInsights.map((insight, i) => (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <InsightCard
                        insight={insight}
                        expanded={expandedInsight === insight.id}
                        onToggle={() => setExpandedInsight(expandedInsight === insight.id ? null : insight.id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
                {filteredInsights.length === 0 && (
                  <div className="rounded-xl border border-border bg-muted/30 p-12 text-center">
                    <Sparkles size={28} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhum insight nesta categoria</p>
                  </div>
                )}
              </div>

            </div>
          </motion.div>
        )}

        {/* ════════ ANÁLISES OPERACIONAIS ════════ */}
        {activeTab === 'analises' && (
          <motion.div key="analises" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <div className="space-y-6">

              {/* Sector status row */}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { setor: 'Corte',          ef: 62, gargalo: true,  tendencia: 'down'   as const, cap: 120, color: 'text-destructive', bg: 'bg-destructive/10' },
                  { setor: 'Dobra',          ef: 71, gargalo: false, tendencia: 'stable' as const, cap: 78,  color: 'text-warning',     bg: 'bg-warning/10'     },
                  { setor: 'Solda',          ef: 88, gargalo: false, tendencia: 'up'     as const, cap: 55,  color: 'text-success',     bg: 'bg-success/10'     },
                  { setor: 'Desenvolvimento',ef: 79, gargalo: false, tendencia: 'up'     as const, cap: 82,  color: 'text-primary',     bg: 'bg-primary/10'     },
                ].map((s, i) => (
                  <motion.div
                    key={s.setor}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="rounded-xl border border-border bg-card p-4 shadow-card"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-sm font-bold text-foreground">{s.setor}</p>
                      <div className="flex items-center gap-1">
                        {s.gargalo && (
                          <span className="text-[10px] font-bold rounded px-1.5 py-0.5 bg-destructive/10 text-destructive border border-destructive/20">
                            Gargalo
                          </span>
                        )}
                        {s.tendencia === 'up'     && <TrendingUp   size={13} className="text-success" />}
                        {s.tendencia === 'down'   && <TrendingDown size={13} className="text-destructive" />}
                        {s.tendencia === 'stable' && <Minus        size={13} className="text-muted-foreground" />}
                      </div>
                    </div>
                    <p className={cn('text-2xl font-black', s.color)}>{s.ef}%</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Eficiência líquida</p>
                    <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(s.ef, 100)}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className={cn('h-full rounded-full', s.bg.replace('/10', '/60'))}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Carga: {s.cap}%</p>
                  </motion.div>
                ))}
              </div>

              {/* Charts grid */}
              <div className="grid gap-4 lg:grid-cols-2">

                {/* Eficiência semanal */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Eficiência Semanal por Setor</CardTitle>
                    <CardDescription className="text-xs">Comparativo de eficiência líquida por dia</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={mockEficienciaSemanal} margin={{ left: 0, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                        <XAxis dataKey="dia" tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} domain={[40, 100]} />
                        <RechartTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v}%`, '']} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="corte" name="Corte"          stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="dobra" name="Dobra"          stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="solda" name="Solda"          stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="dev"   name="Desenvolvimento" stroke="#000080" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Top OS por tempo */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Top OS por Tempo de Desenvolvimento</CardTitle>
                    <CardDescription className="text-xs">Minutos consumidos por ordem de serviço</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={mockTopOSTempos} layout="vertical" margin={{ left: 8, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="os" tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} width={60} />
                        <RechartTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v} min`, 'Tempo']} />
                        <Bar dataKey="minutos" radius={[0, 4, 4, 0]}>
                          {mockTopOSTempos.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Tempo por setor */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Tempo Médio por Setor</CardTitle>
                    <CardDescription className="text-xs">Minutos médios de processamento por peça</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={mockTempoPorSetor} margin={{ left: 0, right: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                        <XAxis dataKey="setor" tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                        <RechartTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v} min`, 'Tempo médio']} />
                        <Bar dataKey="minutos" radius={[4, 4, 0, 0]}>
                          {mockTempoPorSetor.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Distribuição de gargalos */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Distribuição de Gargalos</CardTitle>
                    <CardDescription className="text-xs">Origem percentual dos gargalos identificados</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <ResponsiveContainer width="55%" height={180}>
                        <PieChart>
                          <Pie data={mockGargaloDist} dataKey="value" cx="50%" cy="50%" innerRadius={42} outerRadius={70} paddingAngle={3}>
                            {mockGargaloDist.map((entry, i) => (
                              <Cell key={i} fill={entry.fill} />
                            ))}
                          </Pie>
                          <RechartTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [`${v}%`, '']} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="flex flex-col gap-2 flex-1">
                        {mockGargaloDist.map((g, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: g.fill }} />
                            <span className="text-muted-foreground flex-1 leading-tight">{g.name}</span>
                            <span className="font-bold text-foreground">{g.value}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* AI Intelligent Summary */}
              <div
                className="rounded-xl p-5 space-y-4"
                style={{ background: GOLD_LIGHT, border: `1px solid ${GOLD_MEDIUM}` }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: 'rgba(212,175,55,0.2)', border: `1px solid ${GOLD_MEDIUM}` }}
                  >
                    <Brain size={15} style={{ color: GOLD }} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">Resumo Inteligente da Operação</p>
                    <p className="text-[10px]" style={{ color: GOLD }}>Gerado pelo Esync IA · Baseado nos dados dos últimos 7 dias</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 text-xs">
                  {[
                    { icon: AlertOctagon, label: 'Ponto Crítico',    text: 'Corte operando 20% acima da capacidade. Ação imediata necessária para normalizar fluxo.', color: 'text-destructive' },
                    { icon: Zap,          label: 'Oportunidade',      text: 'Solda com 45% de capacidade livre. Pode absorver sobrecarga e adiantar 3 ordens.', color: 'text-accent' },
                    { icon: TrendingUp,   label: 'Tendência Positiva', text: 'Eficiência global crescendo +2.3% na semana. Desenvolvimento com tendência consistente de melhora.', color: 'text-success' },
                  ].map((item, i) => {
                    const Icon = item.icon
                    return (
                      <div key={i} className="flex items-start gap-2.5">
                        <div className={cn('flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg mt-0.5', 'bg-card/60')}>
                          <Icon size={12} className={item.color} />
                        </div>
                        <div>
                          <p className={cn('font-bold mb-0.5', item.color)}>{item.label}</p>
                          <p className="text-muted-foreground leading-relaxed">{item.text}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

            </div>
          </motion.div>
        )}

        {/* ════════ HISTÓRICO IA ════════ */}
        {activeTab === 'historico' && (
          <motion.div key="historico" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <div className="space-y-4">

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por pergunta ou tipo de análise..."
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 h-9">
                  <Download size={13} />
                  Exportar
                </Button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pergunta</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tipo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Usuário</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Data</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Resp.</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                          Nenhum registro encontrado
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((h, i) => (
                        <motion.tr
                          key={h.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3 text-foreground max-w-[240px]">
                            <span className="truncate block text-xs">{h.pergunta}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center rounded-md bg-primary/8 px-2 py-0.5 text-[10px] font-semibold text-primary">
                              {h.tipoAnalise}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{h.usuario}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                            {h.data.toLocaleDateString('pt-BR')} {h.data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                            {(h.tempoResposta / 1000).toFixed(1)}s
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{h.tokensUsed}</td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{filteredHistory.length} registro{filteredHistory.length !== 1 ? 's' : ''} encontrado{filteredHistory.length !== 1 ? 's' : ''}</span>
                <span>Total de tokens usados: {mockAIHistory.reduce((s, h) => s + h.tokensUsed, 0).toLocaleString('pt-BR')}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* ════════ CONFIGURAÇÕES IA ════════ */}
        {activeTab === 'configuracoes' && (
          <motion.div key="configuracoes" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            <div className="max-w-2xl space-y-6">

              {/* Model selector */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain size={15} style={{ color: GOLD }} />
                    Modelo de Inteligência Artificial
                  </CardTitle>
                  <CardDescription className="text-xs">Selecione o modelo que será usado para análises e respostas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {AI_MODELS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setConfig((c) => ({ ...c, model: m.value }))}
                      className={cn(
                        'w-full flex items-center justify-between rounded-xl border p-3 text-left transition-all',
                        config.model === m.value
                          ? 'shadow-sm'
                          : 'border-border bg-card hover:bg-muted/30'
                      )}
                      style={config.model === m.value ? {
                        background: GOLD_LIGHT,
                        borderColor: GOLD_MEDIUM,
                      } : undefined}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn('flex h-7 w-7 items-center justify-center rounded-lg')}
                          style={config.model === m.value ? { background: 'rgba(212,175,55,0.2)', border: `1px solid ${GOLD_MEDIUM}` } : { background: 'var(--muted)' }}
                        >
                          <Cpu size={13} style={config.model === m.value ? { color: GOLD } : undefined} className={config.model !== m.value ? 'text-muted-foreground' : ''} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{m.label}</p>
                          <p className="text-[10px] text-muted-foreground">{m.badge}</p>
                        </div>
                      </div>
                      {config.model === m.value && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                          <CheckCircle2 size={15} style={{ color: GOLD }} />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </CardContent>
              </Card>

              {/* Parameters */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Sliders size={14} className="text-primary" />
                    Parâmetros de Geração
                  </CardTitle>
                  <CardDescription className="text-xs">Controle o comportamento das respostas da IA</CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  {[
                    {
                      key: 'temperature' as const,
                      label: 'Temperatura',
                      desc: 'Criatividade das respostas (0.0 = determinístico, 2.0 = criativo)',
                      min: 0, max: 2, step: 0.1,
                    },
                    {
                      key: 'maxTokens' as const,
                      label: 'Tokens Máximos por Resposta',
                      desc: 'Limite de tokens por resposta gerada',
                      min: 256, max: 8192, step: 128,
                    },
                    {
                      key: 'dailyLimit' as const,
                      label: 'Limite de Uso Diário',
                      desc: 'Máximo de análises por dia',
                      min: 50, max: 2000, step: 50,
                    },
                  ].map((param) => (
                    <div key={param.key} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold">{param.label}</Label>
                        <span
                          className="text-xs font-bold rounded px-2 py-0.5"
                          style={{ background: GOLD_LIGHT, color: GOLD }}
                        >
                          {config[param.key]}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={param.min}
                        max={param.max}
                        step={param.step}
                        value={config[param.key] as number}
                        onChange={(e) => setConfig((c) => ({ ...c, [param.key]: Number(e.target.value) }))}
                        className="w-full h-1.5 rounded-full bg-muted appearance-none cursor-pointer"
                        style={{ accentColor: GOLD }}
                      />
                      <p className="text-[10px] text-muted-foreground">{param.desc}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Automation toggles */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap size={14} className="text-accent" />
                    Automação Inteligente
                  </CardTitle>
                  <CardDescription className="text-xs">Controle as análises e insights automáticos da IA</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { key: 'autoInsights' as const, label: 'Insights Automáticos', desc: 'A IA gera insights continuamente ao detectar anomalias' },
                    { key: 'autoAnalysis'  as const, label: 'Análises Automáticas', desc: 'Análise periódica de todos os setores sem intervenção manual' },
                  ].map((toggle) => (
                    <div key={toggle.key} className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{toggle.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{toggle.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfig((c) => ({ ...c, [toggle.key]: !c[toggle.key] }))}
                        className={cn(
                          'relative h-6 w-11 rounded-full transition-colors flex-shrink-0 mt-0.5',
                          config[toggle.key] ? 'bg-primary' : 'bg-muted'
                        )}
                        style={config[toggle.key] ? { background: GOLD } : undefined}
                      >
                        <motion.span
                          animate={{ x: config[toggle.key] ? 20 : 2 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm"
                        />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* API info */}
              <div
                className="rounded-xl p-4 space-y-3"
                style={{ background: GOLD_LIGHT, border: `1px solid ${GOLD_MEDIUM}` }}
              >
                <div className="flex items-center gap-2">
                  <Lock size={13} style={{ color: GOLD }} />
                  <p className="text-xs font-bold text-foreground">Configuração de API — Ambiente Seguro</p>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A chave de API OpenAI deve ser configurada via variável de ambiente <code className="font-mono bg-card/60 px-1.5 py-0.5 rounded">OPENAI_API_KEY</code> no servidor.
                  Nunca exponha chaves de API no código do cliente. Consulte o arquivo <code className="font-mono bg-card/60 px-1.5 py-0.5 rounded">.env.example</code> para referência.
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Status da API', value: 'Pendente configuração' },
                    { label: 'Ambiente',       value: 'Desenvolvimento'       },
                    { label: 'Rota do chat',   value: '/api/ai/chat'          },
                    { label: 'Versão',         value: 'Esync IA v1.0'         },
                  ].map((item) => (
                    <div key={item.label} className="flex flex-col">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-semibold text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSaveConfig}
                  className="gap-2"
                  style={{ background: configSaved ? '#10b981' : GOLD, borderColor: configSaved ? '#10b981' : GOLD, color: '#1a1a1a' }}
                >
                  {configSaved ? <CheckCircle2 size={14} /> : <Settings size={14} />}
                  {configSaved ? 'Configurações Salvas!' : 'Salvar Configurações'}
                </Button>
              </div>

            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  )
}
