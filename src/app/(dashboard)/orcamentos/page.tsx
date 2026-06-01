'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  FileText, Plus, Search, Download,
  FileCheck2, Send, ThumbsDown, Clock,
  TrendingUp, DollarSign, SlidersHorizontal, Eye, FileDown,
  Factory, CheckCircle2, AlertTriangle,
} from 'lucide-react'
import { PageHeader }     from '@/components/shared/PageHeader'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { EmptyState }     from '@/components/shared/EmptyState'
import { Button }         from '@/components/ui/button'
import { Input }          from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn }             from '@/lib/utils'
import { useAuth }        from '@/contexts/AuthContext'
import { useOrcamentos }  from '@/contexts/OrcamentosContext'
import { NovoOrcamentoModal }       from '@/components/orcamentos/NovoOrcamentoModal'
import { OrcamentoDetalheModal, revisionLabel } from '@/components/orcamentos/OrcamentoDetalheModal'
import { ConversaoProducaoModal }  from '@/components/orcamentos/ConversaoProducaoModal'
import { gerarPdfOrcamento }       from '@/lib/orcamentos/gerarPdfOrcamento'
import type { Orcamento, StatusOrcamento, PrioridadeOrcamento } from '@/types/orcamentos'

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<StatusOrcamento, { label: string; color: string; bg: string; border: string; dot: string }> = {
  em_elaboracao: { label: 'Em Elaboração', color: 'text-muted-foreground', bg: 'bg-muted/60',       border: 'border-border',         dot: 'bg-muted-foreground'    },
  enviado:       { label: 'Enviado',        color: 'text-primary',          bg: 'bg-primary/10',     border: 'border-primary/30',     dot: 'bg-primary'             },
  aprovado:      { label: 'Aprovado',       color: 'text-success',          bg: 'bg-success/10',     border: 'border-success/30',     dot: 'bg-success'             },
  reprovado:     { label: 'Reprovado',      color: 'text-destructive',      bg: 'bg-destructive/10', border: 'border-destructive/30', dot: 'bg-destructive'         },
  cancelado:     { label: 'Cancelado',      color: 'text-muted-foreground', bg: 'bg-muted/40',       border: 'border-border',         dot: 'bg-muted-foreground/50' },
}

const PRIO_CFG: Record<PrioridadeOrcamento, { label: string; color: string; bg: string }> = {
  alta:  { label: 'Alta',  color: 'text-destructive',      bg: 'bg-destructive/8' },
  media: { label: 'Média', color: 'text-warning',          bg: 'bg-warning/8'     },
  baixa: { label: 'Baixa', color: 'text-muted-foreground', bg: 'bg-muted'         },
}

const STATUS_TABS: { value: StatusOrcamento | 'todos'; label: string }[] = [
  { value: 'todos',         label: 'Todos'         },
  { value: 'em_elaboracao', label: 'Em Elaboração' },
  { value: 'enviado',       label: 'Enviado'       },
  { value: 'aprovado',      label: 'Aprovado'      },
  { value: 'reprovado',     label: 'Reprovado'     },
  { value: 'cancelado',     label: 'Cancelado'     },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function formatDate(d: Date | undefined) {
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function isExpired(d: Date) { return d < new Date() }

// ─── Micro-components ─────────────────────────────────────────────────────────

function StatusPill({ status }: { status: StatusOrcamento }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold border', cfg.bg, cfg.color, cfg.border)}>
      <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

function PrioBadge({ prioridade }: { prioridade: PrioridadeOrcamento }) {
  const cfg = PRIO_CFG[prioridade]
  return (
    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', cfg.bg, cfg.color)}>
      {cfg.label}
    </span>
  )
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, colorClass, bgClass, ringClass, delay = 0 }: {
  label: string; value: string | number
  icon: React.ComponentType<{ size?: number; className?: string }>
  colorClass: string; bgClass: string; ringClass: string; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
      className="group rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5"
    >
      <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl ring-4 transition-transform group-hover:scale-105', bgClass, colorClass, ringClass)}>
        <Icon size={16} />
      </div>
      <p className="text-xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrcamentosPage() {
  const { canEdit } = useAuth()
  const { analytics, orcamentos, filtros, setFiltros } = useOrcamentos()

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [novoOpen,        setNovoOpen]        = useState(false)
  const [detalheOpen,     setDetalheOpen]     = useState(false)
  const [selected,        setSelected]        = useState<Orcamento | null>(null)
  const [conversaoOpen,   setConversaoOpen]   = useState(false)
  const [conversaoTarget, setConversaoTarget] = useState<Orcamento | null>(null)

  // ── Filter state ─────────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState('')
  const [statusTab,    setStatusTab]    = useState<StatusOrcamento | 'todos'>('todos')
  const [showFilters,  setShowFilters]  = useState(false)
  const [filterPrio,   setFilterPrio]   = useState('')
  const [filterResp,   setFilterResp]   = useState('')

  // ── Apply all filters ────────────────────────────────────────────────────────
  const displayed = useMemo(() => {
    let list = orcamentos
    if (statusTab !== 'todos') list = list.filter((o) => o.status === statusTab)
    if (filterPrio)           list = list.filter((o) => o.prioridade === filterPrio)
    if (filterResp.trim())    list = list.filter((o) => o.responsavel.toLowerCase().includes(filterResp.toLowerCase()))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((o) =>
        o.numero.toLowerCase().includes(q)       ||
        o.titulo.toLowerCase().includes(q)       ||
        o.cliente.nome.toLowerCase().includes(q) ||
        o.responsavel.toLowerCase().includes(q)
      )
    }
    return list
  }, [orcamentos, statusTab, filterPrio, filterResp, search])

  function handleStatusTab(s: StatusOrcamento | 'todos') {
    setStatusTab(s)
    setFiltros({ ...filtros, status: s })
  }

  function openDetalhe(orc: Orcamento) {
    setSelected(orc)
    setDetalheOpen(true)
  }

  // Keep `selected` in sync with context mutations (status changes, edits)
  const liveSelected = useMemo(
    () => selected ? orcamentos.find((o) => o.id === selected.id) ?? null : null,
    [orcamentos, selected]
  )

  return (
    <PermissionGate module="orcamentos">
    <div className="space-y-6">

      {/* Header */}
      <PageHeader
        title="Orçamentos"
        subtitle="Gestão de propostas comerciais e controle de revisões"
        breadcrumbs={[{ label: 'Início', href: '/dashboard' }, { label: 'Orçamentos' }]}
        actions={
          canEdit('orcamentos') ? (
            <Button size="sm" className="gap-1.5" onClick={() => setNovoOpen(true)}>
              <Plus size={14} /> Novo Orçamento
            </Button>
          ) : undefined
        }
      />

      {/* KPI Cards — Status */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Total"           value={analytics.totalOrcamentos} icon={FileText}   colorClass="text-foreground"       bgClass="bg-muted"         ringClass="ring-border"         delay={0}    />
        <KpiCard label="Em Elaboração"   value={analytics.emElaboracao}    icon={Clock}      colorClass="text-muted-foreground" bgClass="bg-muted/60"      ringClass="ring-border/50"      delay={0.05} />
        <KpiCard label="Enviados"        value={analytics.enviados}        icon={Send}       colorClass="text-primary"          bgClass="bg-primary/10"    ringClass="ring-primary/20"     delay={0.1}  />
        <KpiCard label="Aprovados"       value={analytics.aprovados}       icon={FileCheck2} colorClass="text-success"          bgClass="bg-success/10"    ringClass="ring-success/20"     delay={0.15} />
        <KpiCard label="Reprovados"      value={analytics.reprovados}      icon={ThumbsDown} colorClass="text-destructive"      bgClass="bg-destructive/10"ringClass="ring-destructive/20" delay={0.2}  />
        <KpiCard label="Taxa Aprovação"  value={`${analytics.taxaAprovacao}%`} icon={TrendingUp} colorClass="text-success"     bgClass="bg-success/10"    ringClass="ring-success/20"     delay={0.25} />
      </div>

      {/* KPI Cards — Phase 4: Production Conversion Pipeline */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Convertidos"         value={analytics.convertidos}       icon={Factory}       colorClass="text-primary"          bgClass="bg-primary/10"    ringClass="ring-primary/20"     delay={0.3}  />
        <KpiCard label="Conversões no Mês"   value={analytics.conversoesNoMes}   icon={CheckCircle2}  colorClass="text-success"          bgClass="bg-success/10"    ringClass="ring-success/20"     delay={0.35} />
        <KpiCard label="Aguardando Conversão" value={analytics.pendenteConversao} icon={AlertTriangle} colorClass="text-warning"          bgClass="bg-warning/10"    ringClass="ring-warning/20"     delay={0.4}  />
      </div>

      {/* Financial strip */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }}
        className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-4 rounded-xl border border-success/20 bg-success/5 px-5 py-3.5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-success/15">
            <DollarSign size={16} className="text-success" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Aprovado</p>
            <p className="text-lg font-bold text-success">{formatBRL(analytics.valorTotalAprovado)}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 px-5 py-3.5">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <Send size={16} className="text-primary" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Em Negociação</p>
            <p className="text-lg font-bold text-primary">{formatBRL(analytics.valorTotalEnviado)}</p>
          </div>
        </div>
      </motion.div>

      {/* Search + Filters */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.3 }} className="space-y-3">

        {/* Search row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por número, título, cliente ou responsável..."
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"
              className={cn('gap-1.5 h-9', showFilters && 'border-primary/50 bg-primary/5 text-primary')}
              onClick={() => setShowFilters((v) => !v)}>
              <SlidersHorizontal size={13} /> Filtros
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 h-9">
              <Download size={13} /> Exportar
            </Button>
          </div>
        </div>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((opt) => (
            <button key={opt.value} onClick={() => handleStatusTab(opt.value)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-medium transition-all duration-150',
                statusTab === opt.value
                  ? 'border-primary/40 bg-primary/10 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              )}>
              {opt.label}
              {opt.value !== 'todos' && (
                <span className={cn('ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  statusTab === opt.value ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground')}>
                  {opt.value === 'em_elaboracao' && analytics.emElaboracao}
                  {opt.value === 'enviado'       && analytics.enviados}
                  {opt.value === 'aprovado'      && analytics.aprovados}
                  {opt.value === 'reprovado'     && analytics.reprovados}
                  {opt.value === 'cancelado'     && analytics.cancelados}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="overflow-hidden">
            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Responsável</label>
                  <Input placeholder="Nome do responsável..." className="h-8 text-xs"
                    value={filterResp} onChange={(e) => setFilterResp(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prioridade</label>
                  <select className="h-8 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:border-accent"
                    value={filterPrio} onChange={(e) => setFilterPrio(e.target.value)}>
                    <option value="">Todas</option>
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={() => { setFilterPrio(''); setFilterResp('') }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Limpar filtros
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.3 }}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Orçamentos</CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {displayed.length} registro{displayed.length !== 1 ? 's' : ''} encontrado{displayed.length !== 1 ? 's' : ''}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {displayed.length === 0 ? (
              <div className="px-6 pb-6">
                <EmptyState
                  icon={<FileText size={36} className="text-muted-foreground/40" />}
                  title={search || statusTab !== 'todos' || filterPrio || filterResp
                    ? 'Nenhum orçamento encontrado'
                    : 'Nenhum orçamento cadastrado'}
                  description={search || statusTab !== 'todos' || filterPrio || filterResp
                    ? 'Tente ajustar os filtros.'
                    : 'Crie o primeiro orçamento clicando em "Novo Orçamento".'}
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {['Número', 'Título', 'Cliente', 'Prioridade', 'Status', 'Valor Total', 'Validade', 'Rev.', 'Responsável', ''].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map((orc, i) => {
                      const expired = (orc.status === 'em_elaboracao' || orc.status === 'enviado') && isExpired(orc.validadeAte)
                      return (
                        <motion.tr key={orc.id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                          className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                          onClick={() => openDetalhe(orc)}
                        >
                          <td className="px-4 py-3 font-mono text-xs font-bold text-accent whitespace-nowrap">{orc.numero}</td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <p className="truncate text-sm font-medium text-foreground">{orc.titulo}</p>
                            {orc.descricao && <p className="truncate text-[11px] text-muted-foreground mt-0.5">{orc.descricao}</p>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="text-sm text-foreground">{orc.cliente.nome}</p>
                            {orc.cliente.contatoPrincipal && <p className="text-[11px] text-muted-foreground">{orc.cliente.contatoPrincipal}</p>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap"><PrioBadge prioridade={orc.prioridade} /></td>
                          <td className="px-4 py-3 whitespace-nowrap"><StatusPill status={orc.status} /></td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className="font-semibold text-foreground tabular-nums">{formatBRL(orc.valorTotal)}</p>
                            <p className="text-[11px] text-muted-foreground">{orc.moeda} · {orc.itens.length} item{orc.itens.length !== 1 ? 's' : ''}</p>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <p className={cn('text-sm tabular-nums', expired && 'text-destructive font-medium')}>{formatDate(orc.validadeAte)}</p>
                            {expired && <p className="text-[10px] font-semibold uppercase tracking-wider text-destructive">Vencido</p>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex h-6 min-w-[32px] items-center justify-center rounded-full bg-muted px-1.5 font-mono text-[11px] font-bold text-muted-foreground">
                              {revisionLabel(orc.revisaoAtual)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">{orc.responsavel}</td>
                          <td className="px-4 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openDetalhe(orc)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
                                title="Ver orçamento"
                              >
                                <Eye size={13} />
                              </button>
                              <button
                                onClick={() => gerarPdfOrcamento(orc)}
                                className="flex h-7 w-7 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-colors"
                                title="Gerar PDF Comercial"
                              >
                                <FileDown size={13} />
                              </button>
                              {/* Phase 4: conversion shortcut — visible only for approved quotes */}
                              {orc.status === 'aprovado' && canEdit('orcamentos') && (
                                <button
                                  onClick={() => { setConversaoTarget(orc); setConversaoOpen(true) }}
                                  className={cn(
                                    'flex h-7 w-7 items-center justify-center rounded-lg border transition-colors',
                                    orc.convertidoParaProducao
                                      ? 'border-success/40 text-success bg-success/5 hover:bg-success/10'
                                      : 'border-border text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5'
                                  )}
                                  title={orc.convertidoParaProducao ? 'Já convertido para produção' : 'Converter para Produção'}
                                >
                                  <Factory size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

    </div>

    {/* Modals */}
    <NovoOrcamentoModal   open={novoOpen}    onOpenChange={setNovoOpen} />
    <OrcamentoDetalheModal
      open={detalheOpen}
      onOpenChange={(v) => { setDetalheOpen(v); if (!v) setSelected(null) }}
      orcamento={liveSelected}
    />
    {/* Phase 4: conversion modal — opened from table row or detail modal */}
    <ConversaoProducaoModal
      open={conversaoOpen}
      onOpenChange={(v) => { setConversaoOpen(v); if (!v) setConversaoTarget(null) }}
      orcamento={conversaoTarget}
    />

    </PermissionGate>
  )
}
