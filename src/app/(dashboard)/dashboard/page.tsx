'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Package, Code2, Layers, Activity,
  AlertTriangle, Clock, ArrowRight, TrendingUp,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as ReTooltip, ResponsiveContainer,
} from 'recharts'
import { StatCard } from '@/components/shared/StatCard'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mockAtividades } from '@/mocks'
import { relativeTime, cn } from '@/lib/utils'
import { computeDashboardData } from '@/lib/dashboard/metrics'
import { DashboardAlertsModal }     from '@/components/dashboard/DashboardAlertsModal'
import { DashboardMaquinasModal }   from '@/components/dashboard/DashboardMaquinasModal'
import { DashboardAtividadesModal } from '@/components/dashboard/DashboardAtividadesModal'

// ─── Static maps (unchanged) ──────────────────────────────────────────────────

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Package, Code2, Layers, Activity,
}

const tipoIconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  peca: Package, retalho: Layers, programa: Code2, usuario: Activity, sistema: Activity,
}

const tipoColors: Record<string, string> = {
  peca:    'bg-primary/10 text-primary',
  retalho: 'bg-accent/10 text-accent',
  programa: 'bg-success/10 text-success',
  usuario: 'bg-secondary/10 text-secondary-foreground',
  sistema: 'bg-muted text-muted-foreground',
}

// ─── Machine status style map ─────────────────────────────────────────────────

const MAQUINA_STATUS_CFG: Record<string, { dot: string; label: string; pulse: boolean }> = {
  operando:   { dot: '#10b981', label: 'Operando',   pulse: true  },
  setup:      { dot: '#000080', label: 'Setup',      pulse: true  },
  pausada:    { dot: '#f59e0b', label: 'Pausada',    pulse: false },
  ociosa:     { dot: '#6b7280', label: 'Ociosa',     pulse: false },
  manutencao: { dot: '#ef4444', label: 'Manutenção', pulse: false },
}

const ALERT_ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  AlertTriangle, Clock, Package,
}

const ALERT_COLOR: Record<string, { color: string; bg: string }> = {
  warning:     { color: 'text-warning',     bg: 'bg-warning/8'     },
  destructive: { color: 'text-destructive', bg: 'bg-destructive/8' },
  info:        { color: 'text-primary',     bg: 'bg-primary/8'     },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const hoje = new Date()
  const saudacao =
    hoje.getHours() < 12 ? 'Bom dia' : hoje.getHours() < 18 ? 'Boa tarde' : 'Boa noite'
  const dataCapitalizada = (() => {
    const s = hoje.toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    return s.charAt(0).toUpperCase() + s.slice(1)
  })()

  // All metrics derived from real module data — single call, no duplicated state
  const { kpiCards, maquinas, alertas, chartData, agg } = computeDashboardData()

  const [alertsOpen,     setAlertsOpen]     = useState(false)
  const [maquinasOpen,   setMaquinasOpen]   = useState(false)
  const [atividadesOpen, setAtividadesOpen] = useState(false)

  return (
    <PermissionGate module="dashboard">
    <div className="space-y-6">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex items-start justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {saudacao}, <span className="text-primary">João</span> 👋
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">{dataCapitalizada}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
            Sistema Operacional
          </div>
        </div>
      </motion.div>

      {/* ── KPI Cards — real data from modules ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((stat, i) => {
          const Icon = iconMap[stat.icone]
          return (
            <StatCard
              key={stat.id}
              stat={stat}
              index={i}
              icon={Icon ? <Icon size={18} /> : null}
            />
          )
        })}
      </div>

      {/* ── Production Chart + Alerts ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Chart — derived from mockMaquinas.produtividadeSemanal */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Eficiência de Produção</CardTitle>
                  <CardDescription>
                    Utilização das máquinas — últimos 7 dias vs. meta de 85%
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp size={13} className="text-success" />
                  <span className="text-success font-medium">
                    {agg.eficienciaMedia}% eficiência média
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="colorProducao" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#0f4c5c" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0f4c5c" stopOpacity={0}    />
                    </linearGradient>
                    <linearGradient id="colorMeta" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#000080" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#000080" stopOpacity={0}    />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                  <XAxis
                    dataKey="dia"
                    tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }}
                    axisLine={false} tickLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <ReTooltip
                    contentStyle={{
                      background: 'white',
                      border: '1px solid hsl(220 13% 91%)',
                      borderRadius: '10px',
                      fontSize: 12,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                    }}
                    formatter={(v, name) => [`${v}%`, name === 'producao' ? 'Produção' : 'Meta']}
                  />
                  <Area
                    type="monotone" dataKey="meta"
                    stroke="#000080" strokeWidth={1.5} strokeDasharray="4 4"
                    fill="url(#colorMeta)" dot={false}
                  />
                  <Area
                    type="monotone" dataKey="producao"
                    stroke="#0f4c5c" strokeWidth={2}
                    fill="url(#colorProducao)"
                    dot={{ fill: '#0f4c5c', strokeWidth: 2, r: 3 }}
                    activeDot={{ r: 5, fill: '#0f4c5c' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="h-0.5 w-4 rounded-full bg-primary" />
                  <span>Produção Real</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-0.5 w-4 rounded-full bg-accent"
                    style={{ backgroundImage: 'repeating-linear-gradient(90deg,#000080 0,#000080 4px,transparent 4px,transparent 8px)' }}
                  />
                  <span>Meta</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Alerts — derived from real module data */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Alertas</CardTitle>
              <CardDescription>Itens que precisam de atenção</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {alertas.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                    <Activity size={18} className="text-success" />
                  </div>
                  <p className="text-xs font-medium text-success">Tudo em ordem</p>
                  <p className="text-[11px] text-muted-foreground">Nenhum alerta no momento</p>
                </div>
              ) : (
                alertas.map((alert, i) => {
                  const Icon  = ALERT_ICON_MAP[alert.iconKey]
                  const style = ALERT_COLOR[alert.tipo]
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.05 }}
                      className={cn(
                        'flex items-start gap-3 rounded-lg p-3 cursor-pointer transition-colors hover:opacity-80',
                        style.bg
                      )}
                    >
                      <Icon size={15} className={cn('flex-shrink-0 mt-0.5', style.color)} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-none">{alert.titulo}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{alert.descricao}</p>
                      </div>
                    </motion.div>
                  )
                })
              )}
              <Button variant="ghost" size="sm" className="w-full mt-1 text-xs" onClick={() => setAlertsOpen(true)}>
                Ver todos os alertas <ArrowRight size={12} />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Machine Status + Activity ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Machine Status — from real mockMaquinas */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Status das Máquinas</CardTitle>
                  <CardDescription>
                    {agg.maquinasOperando} de {agg.maquinasTotal} em operação
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setMaquinasOpen(true)}>
                  Ver todas <ArrowRight size={12} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {maquinas.map((m, i) => {
                  const cfg = MAQUINA_STATUS_CFG[m.status] ?? MAQUINA_STATUS_CFG.ociosa
                  return (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + i * 0.04 }}
                      className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
                    >
                      {/* Status dot */}
                      <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                        {cfg.pulse && (
                          <span
                            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                            style={{ background: cfg.dot }}
                          />
                        )}
                        <span
                          className="relative inline-flex h-2.5 w-2.5 rounded-full"
                          style={{ background: cfg.dot }}
                        />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-foreground leading-none">{m.codigo}</p>
                          <span
                            className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                            style={{
                              color: cfg.dot,
                              background: `${cfg.dot}18`,
                            }}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        {m.operador !== '—' && (
                          <p className="mt-0.5 text-xs text-muted-foreground truncate">
                            {m.operador}{m.referencia !== '—' ? ` — ${m.referencia}` : ''}
                          </p>
                        )}
                      </div>

                      {m.tempoOp !== '—' && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                          <Clock size={11} />
                          {m.tempoOp}
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity — kept from dashboard mock (future: derive from events) */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Atividade Recente</CardTitle>
                  <CardDescription>Últimas ações no sistema</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setAtividadesOpen(true)}>
                  Ver todas <ArrowRight size={12} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-0">
                {mockAtividades.slice(0, 5).map((a, i) => {
                  const Icon       = tipoIconMap[a.tipo] ?? Activity
                  const colorClass = tipoColors[a.tipo]  ?? tipoColors.sistema
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.05 }}
                      className="flex gap-3 py-2.5"
                    >
                      <div className="relative flex flex-col items-center">
                        <div className={cn('flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg', colorClass)}>
                          <Icon size={13} />
                        </div>
                        {i < mockAtividades.length - 2 && (
                          <div className="mt-1 w-px flex-1 bg-border" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 pb-2.5">
                        <p className="text-sm font-medium text-foreground leading-snug">{a.titulo}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{a.descricao}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground/60">
                          {relativeTime(a.tempo)} · {a.usuario}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>

    <DashboardAlertsModal     open={alertsOpen}     onOpenChange={setAlertsOpen}     />
    <DashboardMaquinasModal   open={maquinasOpen}   onOpenChange={setMaquinasOpen}   />
    <DashboardAtividadesModal open={atividadesOpen} onOpenChange={setAtividadesOpen} />
    </PermissionGate>
  )
}
