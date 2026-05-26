'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Package,
  Code2,
  Layers,
  Activity,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  ResponsiveContainer,
} from 'recharts'
import { StatCard } from '@/components/shared/StatCard'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { mockStats, mockAtividades, mockProducaoSemanal, mockStatusMaquinas } from '@/mocks'
import { relativeTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Package,
  Code2,
  Layers,
  Activity,
}

const tipoIconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  peca: Package,
  retalho: Layers,
  programa: Code2,
  usuario: Activity,
  sistema: Activity,
}

const tipoColors: Record<string, string> = {
  peca: 'bg-primary/10 text-primary',
  retalho: 'bg-accent/10 text-accent',
  programa: 'bg-success/10 text-success',
  usuario: 'bg-secondary/10 text-secondary-foreground',
  sistema: 'bg-muted text-muted-foreground',
}

export default function DashboardPage() {
  const hoje = new Date()
  const saudacao =
    hoje.getHours() < 12 ? 'Bom dia' : hoje.getHours() < 18 ? 'Boa tarde' : 'Boa noite'

  const dataFormatada = hoje.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const dataCapitalizada = dataFormatada.charAt(0).toUpperCase() + dataFormatada.slice(1)

  return (
    <PermissionGate module="dashboard">
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
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

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {mockStats.map((stat, i) => {
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

      {/* ── Production Chart + Machine Status ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Eficiência de Produção</CardTitle>
                  <CardDescription>Últimos 7 dias vs. meta</CardDescription>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <TrendingUp size={13} className="text-success" />
                  <span className="text-success font-medium">+2.8% esta semana</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart
                  data={mockProducaoSemanal}
                  margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
                >
                  <defs>
                    <linearGradient id="colorProducao" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f4c5c" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#0f4c5c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorMeta" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#000080" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#000080" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" vertical={false} />
                  <XAxis
                    dataKey="dia"
                    tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }}
                    axisLine={false}
                    tickLine={false}
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
                    formatter={(v, name) => [
                      `${v}%`,
                      name === 'producao' ? 'Produção' : 'Meta',
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="meta"
                    stroke="#000080"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="url(#colorMeta)"
                    dot={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="producao"
                    stroke="#0f4c5c"
                    strokeWidth={2}
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

        {/* Alerts */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Alertas</CardTitle>
              <CardDescription>Itens que precisam de atenção</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {[
                {
                  icon: AlertTriangle,
                  title: 'Estoque Baixo',
                  desc: '2 materiais abaixo do mínimo',
                  color: 'text-warning',
                  bg: 'bg-warning/8',
                },
                {
                  icon: Clock,
                  title: 'Manutenção Pendente',
                  desc: 'LASER-001 — agendada hoje às 18h',
                  color: 'text-destructive',
                  bg: 'bg-destructive/8',
                },
                {
                  icon: Code2,
                  title: 'Programa em Revisão',
                  desc: 'CNC-P0445 aguarda aprovação',
                  color: 'text-accent',
                  bg: 'bg-accent/8',
                },
              ].map((alert, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className={cn(
                    'flex items-start gap-3 rounded-lg p-3 cursor-pointer transition-colors hover:opacity-80',
                    alert.bg
                  )}
                >
                  <alert.icon size={15} className={cn('flex-shrink-0 mt-0.5', alert.color)} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground leading-none">
                      {alert.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                      {alert.desc}
                    </p>
                  </div>
                </motion.div>
              ))}

              <Button variant="ghost" size="sm" className="w-full mt-1 text-xs">
                Ver todos os alertas
                <ArrowRight size={12} />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Machine Status + Activity ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Machine Status */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Status das Máquinas</CardTitle>
                  <CardDescription>Visão geral em tempo real</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-xs">
                  Ver todas <ArrowRight size={12} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockStatusMaquinas.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + i * 0.04 }}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors"
                  >
                    <StatusBadge
                      status={m.status as 'operando' | 'parado' | 'manutencao'}
                      pulse={m.status === 'operando'}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground leading-none">
                        {m.nome}
                      </p>
                      {m.programa !== '—' && (
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          {m.programa} — {m.operador}
                        </p>
                      )}
                    </div>
                    {m.tempo !== '—' && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                        <Clock size={11} />
                        {m.tempo}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Atividade Recente</CardTitle>
                  <CardDescription>Últimas ações no sistema</CardDescription>
                </div>
                <Button variant="ghost" size="sm" className="text-xs">
                  Ver todas <ArrowRight size={12} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative space-y-0">
                {mockAtividades.slice(0, 5).map((a, i) => {
                  const Icon = tipoIconMap[a.tipo] ?? Activity
                  const colorClass = tipoColors[a.tipo] ?? tipoColors.sistema
                  return (
                    <motion.div
                      key={a.id}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.05 }}
                      className="flex gap-3 py-2.5"
                    >
                      {/* Timeline dot */}
                      <div className="relative flex flex-col items-center">
                        <div
                          className={cn(
                            'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg',
                            colorClass
                          )}
                        >
                          <Icon size={13} />
                        </div>
                        {i < mockAtividades.length - 2 && (
                          <div className="mt-1 w-px flex-1 bg-border" />
                        )}
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1 pb-2.5">
                        <p className="text-sm font-medium text-foreground leading-snug">
                          {a.titulo}
                        </p>
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
    </PermissionGate>
  )
}
