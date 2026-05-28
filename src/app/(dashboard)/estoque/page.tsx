'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Warehouse,
  Search,
  Download,
  Package,
  AlertTriangle,
  TrendingUp,
  Clock,
  Filter,
  ArrowUpCircle,
  CheckCircle2,
  XCircle,
  BarChart2,
  ListChecks,
  Boxes,
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
import { ExportModal } from '@/components/shared/ExportModal'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { useAuth } from '@/contexts/AuthContext'
import { useEstoque } from '@/contexts/EstoqueContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { relativeTime } from '@/lib/utils'
import type { StatusEstoque } from '@/types/estoque'

// ─── Export config ────────────────────────────────────────────────────────────

const EXPORT_COLUMNS = [
  { key: 'codigoPeca',       label: 'Código'          },
  { key: 'descricao',        label: 'Descrição'       },
  { key: 'material',         label: 'Material'        },
  { key: 'espessura',        label: 'Espessura (mm)'  },
  { key: 'quantidade',       label: 'Quantidade'      },
  { key: 'quantidadeMinima', label: 'Qtd. Mínima'     },
  { key: 'unidade',          label: 'Unidade'         },
  { key: 'localizacao',      label: 'Localização'     },
  { key: 'status',           label: 'Status'          },
  { key: 'origemPrograma',   label: 'Origem'          },
  { key: 'ultimaEntrada',    label: 'Última Entrada'  },
]

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<StatusEstoque, { label: string; color: string; bg: string; border: string; dot: string }> = {
  normal:       { label: 'Normal',        color: 'text-success',          bg: 'bg-success/10',     border: 'border-success/20',     dot: 'bg-success' },
  estoque_baixo:{ label: 'Estoque Baixo', color: 'text-warning',          bg: 'bg-warning/10',     border: 'border-warning/20',     dot: 'bg-warning' },
  critico:      { label: 'Crítico',       color: 'text-destructive',      bg: 'bg-destructive/10', border: 'border-destructive/20', dot: 'bg-destructive' },
}

type TabView = 'inventario' | 'movimentos' | 'analise'

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusEstoque }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold', cfg.bg, cfg.color, 'border', cfg.border)}>
      <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  delay,
  alert,
}: {
  label: string
  value: string | number
  sub?: string
  icon: React.ElementType
  color: string
  delay?: number
  alert?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay ?? 0, duration: 0.35 }}
      className={cn(
        'relative rounded-xl border bg-card p-5 shadow-card overflow-hidden',
        alert ? 'border-warning/30' : 'border-border'
      )}
    >
      {alert && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-warning/60" />
      )}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className={cn('mt-1 text-2xl font-bold tabular-nums', color)}>{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', color.replace('text-', 'bg-') + '/10')}>
          <Icon size={18} className={color} />
        </div>
      </div>
    </motion.div>
  )
}

// ─── Movement Timeline Item ───────────────────────────────────────────────────

function MovimentoItem({
  mov,
  index,
}: {
  mov: {
    id: string
    tipo: 'entrada' | 'saida' | 'ajuste'
    codigoPeca: string
    descricaoPeca: string
    quantidade: number
    programaOrigem: string
    os: string
    timestamp: Date
    operador: string
    observacao?: string
  }
  index: number
}) {
  const isEntrada = mov.tipo === 'entrada'

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04 }}
      className="relative flex gap-4"
    >
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className={cn(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2',
          isEntrada
            ? 'border-success/30 bg-success/10 text-success'
            : 'border-destructive/30 bg-destructive/10 text-destructive'
        )}>
          <ArrowUpCircle size={14} className={isEntrada ? '' : 'rotate-180'} />
        </div>
        <div className="mt-1 w-px flex-1 bg-border/60" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-foreground">{mov.codigoPeca}</span>
              <Badge variant={isEntrada ? 'success' : 'destructive'} className="text-[10px] px-1.5">
                {isEntrada ? '+' : '-'}{mov.quantidade} pç
              </Badge>
              <span className="rounded-md border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {mov.os}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground truncate">{mov.descricaoPeca}</p>
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              Programa <span className="font-mono font-semibold text-foreground/60">{mov.programaOrigem}</span>
              {' · '}
              Operador <span className="font-semibold text-foreground/60">{mov.operador}</span>
            </p>
          </div>
          <span className="flex-shrink-0 text-[10px] text-muted-foreground/60 font-mono">
            {relativeTime(mov.timestamp.toISOString())}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EstoquePage() {
  const { canEdit } = useAuth()
  const { estoque, movimentos } = useEstoque()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusEstoque | 'todos'>('todos')
  const [activeTab, setActiveTab] = useState<TabView>('inventario')
  const [exportOpen, setExportOpen] = useState(false)

  // ── Filters ────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    return estoque.filter((item) => {
      const q = search.toLowerCase()
      const matchSearch =
        item.codigoPeca.toLowerCase().includes(q) ||
        item.descricao.toLowerCase().includes(q) ||
        item.material.toLowerCase().includes(q) ||
        item.localizacao.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'todos' || item.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [estoque, search, statusFilter])

  // ── KPIs ───────────────────────────────────────────────────────────────────

  const totalSkus = estoque.length
  const totalPecas = estoque.reduce((acc, e) => acc + e.quantidade, 0)
  const alertCount = estoque.filter((e) => e.status !== 'normal').length
  const criticoCount = estoque.filter((e) => e.status === 'critico').length

  const today = new Date().toDateString()
  const entradasHoje = movimentos.filter(
    (m) => m.tipo === 'entrada' && m.timestamp.toDateString() === today
  ).length
  const qtdEntradasHoje = movimentos
    .filter((m) => m.tipo === 'entrada' && m.timestamp.toDateString() === today)
    .reduce((acc, m) => acc + m.quantidade, 0)

  // ── Analytics data ─────────────────────────────────────────────────────────

  const materialData = useMemo(() => {
    const map: Record<string, number> = {}
    estoque.forEach((e) => {
      map[e.material] = (map[e.material] ?? 0) + e.quantidade
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name: name.replace('Aço ', 'A. ').replace('Alumínio', 'Al.'), value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [estoque])

  const statusData = useMemo(() => [
    { name: 'Normal',        value: estoque.filter((e) => e.status === 'normal').length,        color: '#10b981' },
    { name: 'Estoque Baixo', value: estoque.filter((e) => e.status === 'estoque_baixo').length, color: '#f59e0b' },
    { name: 'Crítico',       value: estoque.filter((e) => e.status === 'critico').length,       color: '#ef4444' },
  ].filter((d) => d.value > 0), [estoque])

  // ── Export data ────────────────────────────────────────────────────────────

  const toExportRow = (item: typeof estoque[0]): Record<string, unknown> => ({
    codigoPeca:       item.codigoPeca,
    descricao:        item.descricao,
    material:         item.material,
    espessura:        item.espessura,
    quantidade:       item.quantidade,
    quantidadeMinima: item.quantidadeMinima,
    unidade:          item.unidade,
    localizacao:      item.localizacao,
    status:           STATUS_CFG[item.status]?.label ?? item.status,
    origemPrograma:   item.origemPrograma,
    ultimaEntrada:    item.ultimaEntrada instanceof Date
                        ? item.ultimaEntrada.toLocaleDateString('pt-BR')
                        : String(item.ultimaEntrada),
  })

  const allExport      = estoque.map(toExportRow)
  const filteredExport = filtered.map(toExportRow)

  const TABS = [
    { id: 'inventario' as TabView, label: 'Inventário',   icon: ListChecks },
    { id: 'movimentos' as TabView, label: 'Movimentos',   icon: ArrowUpCircle },
    { id: 'analise'    as TabView, label: 'Análise',      icon: BarChart2 },
  ]

  return (
    <PermissionGate module="estoque">
    <div>
      <PageHeader
        title="Estoque"
        subtitle={`${totalSkus} SKUs cadastrados · ${totalPecas.toLocaleString('pt-BR')} peças em inventário`}
        breadcrumbs={[{ label: 'Esync', href: '/dashboard' }, { label: 'Estoque' }]}
        actions={
          canEdit('estoque') ? (
            <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
              <Download size={14} /> Exportar
            </Button>
          ) : undefined
        }
      />

      {/* ── KPI Row ── */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total de SKUs"
          value={totalSkus}
          sub="códigos distintos"
          icon={Boxes}
          color="text-primary"
          delay={0}
        />
        <KpiCard
          label="Total de Peças"
          value={totalPecas.toLocaleString('pt-BR')}
          sub="unidades em estoque"
          icon={Package}
          color="text-success"
          delay={0.05}
        />
        <KpiCard
          label="Alertas"
          value={alertCount}
          sub={criticoCount > 0 ? `${criticoCount} críticos` : 'nenhum crítico'}
          icon={AlertTriangle}
          color={alertCount > 0 ? 'text-warning' : 'text-muted-foreground'}
          delay={0.1}
          alert={alertCount > 0}
        />
        <KpiCard
          label="Entradas Hoje"
          value={entradasHoje}
          sub={`+${qtdEntradasHoje} peças recebidas`}
          icon={TrendingUp}
          color="text-accent"
          delay={0.15}
        />
      </div>

      {/* ── Critical alert banner ── */}
      <AnimatePresence>
        {criticoCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3"
          >
            <AlertTriangle size={15} className="flex-shrink-0 text-destructive" />
            <span className="text-sm font-semibold text-destructive">
              {criticoCount} {criticoCount === 1 ? 'item crítico' : 'itens críticos'} — estoque zerado ou abaixo do mínimo
            </span>
            <div className="ml-auto flex gap-1.5 flex-wrap">
              {estoque.filter((e) => e.status === 'critico').map((e) => (
                <span key={e.id} className="rounded-md border border-destructive/25 bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold font-mono text-destructive">
                  {e.codigoPeca}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Tabs ── */}
      <div className="mb-4 flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150',
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Inventário tab ── */}
      {activeTab === 'inventario' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar por código, descrição, material..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <Filter size={13} className="flex-shrink-0 text-muted-foreground" />
                {(['todos', 'normal', 'estoque_baixo', 'critico'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                      statusFilter === s
                        ? 'bg-primary text-white'
                        : 'border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {s === 'todos' ? 'Todos' : STATUS_CFG[s].label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                    <Warehouse size={32} className="opacity-20" />
                    <p className="text-sm">Nenhum item encontrado</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Código</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descrição</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden md:table-cell">Material</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Esp.</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">Qtd.</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden lg:table-cell">Mín.</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden xl:table-cell">Local.</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden xl:table-cell">Última Entrada</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden xl:table-cell">Origem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((item, i) => {
                        const pct = item.quantidadeMinima > 0
                          ? Math.min(100, Math.round((item.quantidade / (item.quantidadeMinima * 3)) * 100))
                          : 100
                        return (
                          <motion.tr
                            key={item.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.02 }}
                            className={cn(
                              'border-b border-border/60 transition-colors hover:bg-muted/30',
                              item.status === 'critico' && 'bg-destructive/[0.03]',
                              item.status === 'estoque_baixo' && 'bg-warning/[0.03]',
                            )}
                          >
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs font-semibold text-foreground">{item.codigoPeca}</span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium text-foreground leading-snug">{item.descricao}</p>
                              <p className="text-[10px] text-muted-foreground">{item.unidade}</p>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className="text-xs text-muted-foreground">{item.material}</span>
                            </td>
                            <td className="px-4 py-3 text-center hidden lg:table-cell">
                              <span className="text-xs text-muted-foreground">{item.espessura}mm</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={cn(
                                  'text-sm font-bold tabular-nums',
                                  item.status === 'critico' ? 'text-destructive' :
                                  item.status === 'estoque_baixo' ? 'text-warning' : 'text-foreground'
                                )}>
                                  {item.quantidade}
                                </span>
                                <div className="w-12 h-1 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={cn(
                                      'h-full rounded-full transition-all',
                                      item.status === 'critico' ? 'bg-destructive' :
                                      item.status === 'estoque_baixo' ? 'bg-warning' : 'bg-success'
                                    )}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center hidden lg:table-cell">
                              <span className="text-xs text-muted-foreground">{item.quantidadeMinima}</span>
                            </td>
                            <td className="px-4 py-3 hidden xl:table-cell">
                              <span className="font-mono text-xs text-muted-foreground">{item.localizacao}</span>
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={item.status} />
                            </td>
                            <td className="px-4 py-3 hidden xl:table-cell">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock size={11} />
                                {relativeTime(item.ultimaEntrada.toISOString())}
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden xl:table-cell">
                              <span className="font-mono text-[10px] text-muted-foreground/70">{item.origemPrograma}</span>
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* ── Movimentos tab ── */}
      {activeTab === 'movimentos' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          {/* Summary bar */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-3"
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span className="font-semibold text-foreground">{movimentos.filter((m) => m.tipo === 'entrada').length}</span>
              <span className="text-muted-foreground">entradas</span>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock size={13} />
              Última:&nbsp;
              <span className="font-medium text-foreground">
                {movimentos[0] ? relativeTime(movimentos[0].timestamp.toISOString()) : '—'}
              </span>
            </div>
            <div className="ml-auto text-xs text-muted-foreground">
              {movimentos.length} movimentos total
            </div>
          </motion.div>

          {/* Timeline */}
          <Card>
            <CardHeader className="pb-3 pt-4">
              <CardTitle className="text-sm">Histórico de Movimentos</CardTitle>
              <CardDescription className="text-xs">Todas as entradas e saídas de estoque</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {movimentos.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
                  <Clock size={28} className="opacity-20" />
                  <p className="text-sm">Nenhum movimento registrado</p>
                </div>
              ) : (
                <div className="pl-2">
                  {movimentos.map((mov, i) => (
                    <MovimentoItem key={mov.id} mov={mov} index={i} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Análise tab ── */}
      {activeTab === 'analise' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 lg:grid-cols-2">
          {/* Bar chart — quantities by material */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quantidade por Material</CardTitle>
                <CardDescription className="text-xs">Total de peças agrupadas por material</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={materialData} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220 9% 46%)' }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                      formatter={(v) => [`${v} pç`, 'Quantidade']}
                    />
                    <Bar dataKey="value" fill="#0f4c5c" radius={[0, 4, 4, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Pie chart — status distribution */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Distribuição de Status</CardTitle>
                <CardDescription className="text-xs">SKUs por condição de estoque</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={160}>
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" strokeWidth={0}>
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ fontSize: 12, background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2">
                  {statusData.map((d) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: d.color }} />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="ml-auto font-semibold text-foreground tabular-nums">{d.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Low stock table */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-2"
          >
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle size={15} className="text-warning" />
                  Alertas de Estoque
                </CardTitle>
                <CardDescription className="text-xs">Itens com quantidade abaixo do mínimo ou zerados</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {estoque.filter((e) => e.status !== 'normal').length === 0 ? (
                  <div className="flex items-center gap-3 px-5 py-6 text-success">
                    <CheckCircle2 size={18} />
                    <span className="text-sm font-medium">Todos os itens estão dentro do estoque mínimo</span>
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {estoque
                      .filter((e) => e.status !== 'normal')
                      .sort((a, b) => {
                        const order = { critico: 0, estoque_baixo: 1, normal: 2 }
                        return order[a.status] - order[b.status]
                      })
                      .map((item, i) => {
                        const deficit = item.quantidadeMinima - item.quantidade
                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: i * 0.04 }}
                            className="flex items-center gap-4 px-5 py-3"
                          >
                            <div className={cn(
                              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
                              item.status === 'critico' ? 'bg-destructive/10' : 'bg-warning/10'
                            )}>
                              {item.status === 'critico'
                                ? <XCircle size={15} className="text-destructive" />
                                : <AlertTriangle size={15} className="text-warning" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-foreground">{item.codigoPeca}</span>
                                <StatusBadge status={item.status} />
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{item.descricao}</p>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-right">
                              <div>
                                <p className="text-muted-foreground">Atual</p>
                                <p className={cn('font-bold tabular-nums', item.status === 'critico' ? 'text-destructive' : 'text-warning')}>
                                  {item.quantidade}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Mínimo</p>
                                <p className="font-semibold text-foreground tabular-nums">{item.quantidadeMinima}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Déficit</p>
                                <p className="font-bold text-destructive tabular-nums">
                                  {deficit > 0 ? `-${deficit}` : '0'}
                                </p>
                              </div>
                              <div className="hidden sm:block">
                                <p className="text-muted-foreground">Local.</p>
                                <p className="font-mono font-semibold text-foreground">{item.localizacao}</p>
                              </div>
                            </div>
                          </motion.div>
                        )
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </div>

      <ExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        moduleName="estoque"
        moduleTitle="Estoque"
        pdfSubtitle="Relatório de Inventário de Estoque"
        columns={EXPORT_COLUMNS}
        allData={allExport}
        filteredData={filteredExport}
        selectedData={[]}
      />
    </PermissionGate>
  )
}
