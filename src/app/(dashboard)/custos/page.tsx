'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calculator, TrendingUp, AlertTriangle, Clock,
  Plus, Pencil, Trash2, Check, X, Save,
  History, Package, Cpu, Users, BarChart3, Zap,
  RefreshCw, ChevronDown, ChevronUp, CheckCircle2, Package2,
  Settings,
} from 'lucide-react'
import { PageHeader }     from '@/components/shared/PageHeader'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { Button }         from '@/components/ui/button'
import { Input }          from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn }             from '@/lib/utils'
import { toast }          from '@/lib/toast'
import { useAuth }        from '@/contexts/AuthContext'
import { useCustos }      from '@/contexts/CustosContext'
import { useCustosPecas } from '@/contexts/CustosPecasContext'
import { derivarValorKg } from '@/lib/custos/engine'
import { mockPecas }      from '@/mocks/pecas'
import type {
  CentroCusto, CustoMaterial, CustoMaoDeObra,
  MaquinaCustos, PerfilPrecificacao,
} from '@/types/custos'
import type { CustoPecaBreakdown } from '@/types/custos-pecas'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function isOutdated(d: Date): boolean {
  return d < new Date(Date.now() - 30 * 86_400_000)
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon, sub, colorClass, bgClass, ringClass, delay = 0 }: {
  label: string; value: string | number; sub?: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  colorClass: string; bgClass: string; ringClass: string; delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
      className="group rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl ring-4 group-hover:scale-105 transition-transform', bgClass, colorClass, ringClass)}>
        <Icon size={16} />
      </div>
      <p className="text-xl font-bold tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-xs font-medium text-muted-foreground">{label}</p>
      {sub && <p className="mt-1 text-[11px] text-muted-foreground/70">{sub}</p>}
    </motion.div>
  )
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type TabId = 'centros' | 'materiais' | 'mao_obra' | 'maquinas' | 'precificacao' | 'custos_pecas' | 'historico'

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'centros',       label: 'Centros de Custo', icon: BarChart3   },
  { id: 'materiais',     label: 'Materiais',         icon: Package    },
  { id: 'mao_obra',      label: 'Mão de Obra',       icon: Users      },
  { id: 'maquinas',      label: 'Máquinas',           icon: Cpu        },
  { id: 'precificacao',  label: 'Precificação',       icon: TrendingUp },
  { id: 'custos_pecas',  label: 'Custos das Peças',  icon: Package2   },
  { id: 'historico',     label: 'Histórico',          icon: History    },
]

// ─── Inline edit row state ────────────────────────────────────────────────────

interface EditState {
  id: string
  field: string
  value: string
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, description, action }: {
  title: string; description?: string; action?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  )
}

// ─── Custo Breakdown Panel ────────────────────────────────────────────────────

interface BreakdownRow {
  label:  string
  valor:  number
  pct:    number
  color:  string
}

function CustoBreakdownPanel({
  bd, onSnapshot, canEdit,
}: { bd: CustoPecaBreakdown; onSnapshot: () => void; canEdit: boolean }) {
  const rows: BreakdownRow[] = [
    { label: 'Material',     valor: bd.custoMaterial,    pct: bd.percentuais.material,    color: 'bg-primary' },
    { label: 'Engenharia',   valor: bd.custoEngenharia,  pct: bd.percentuais.engenharia,  color: 'bg-accent/80' },
    { label: 'Programação',  valor: bd.custoProgramacao, pct: bd.percentuais.programacao, color: 'bg-accent/70' },
    { label: 'Corte',        valor: bd.custoCorte,       pct: 0, color: 'bg-warning/80' },
    { label: 'Dobra',        valor: bd.custoDobra,       pct: 0, color: 'bg-warning/70' },
    { label: 'Solda',        valor: bd.custoSolda,       pct: 0, color: 'bg-warning/60' },
    { label: 'Pintura',      valor: bd.custoPintura,     pct: 0, color: 'bg-warning/50' },
    { label: 'Montagem',     valor: bd.custoMontagem,    pct: 0, color: 'bg-warning/40' },
    { label: 'Máquinas',     valor: bd.custoMaquinas,    pct: bd.percentuais.maquinas,    color: 'bg-success/70' },
    { label: 'Indiretos',    valor: bd.custoIndiretos,   pct: bd.percentuais.indiretos,   color: 'bg-muted-foreground/50' },
  ].filter((r) => r.valor > 0)

  // For production sub-rows, compute individual pcts
  const prodRows = rows.filter((r) => ['Corte','Dobra','Solda','Pintura','Montagem'].includes(r.label))
  prodRows.forEach((r) => {
    r.pct = bd.custoTotal > 0 ? Math.round((r.valor / bd.custoTotal) * 1000) / 10 : 0
  })

  return (
    <div className="mt-2 rounded-xl border border-primary/15 bg-card p-4">
      <div className="grid gap-6 sm:grid-cols-2">

        {/* ── Breakdown bars ── */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Distribuição de Custos</p>
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.label}>
                <div className="flex items-center justify-between text-xs mb-0.5">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="tabular-nums font-medium text-foreground">{fmtBRL(r.valor)} <span className="text-muted-foreground font-normal">({r.pct}%)</span></span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className={cn('h-full rounded-full', r.color)}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(r.pct, 100)}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Summary + meta ── */}
        <div className="space-y-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Resumo</p>
            <div className="space-y-1 text-xs">
              {[
                { lbl: 'Material usado',      val: bd.materialNome },
                { lbl: 'Valor/kg',            val: bd.valorKgUsado > 0 ? `${fmtBRL(bd.valorKgUsado)}/kg` : '—' },
                { lbl: 'Taxa de indiretos',   val: `${bd.taxaIndiretosUsada}%` },
                { lbl: 'Fator desperdício',   val: `×${bd.fatorWasteUsado}` },
                { lbl: 'Calculado em',        val: bd.calculadoEm.toLocaleString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) },
              ].map(({ lbl, val }) => (
                <div key={lbl} className="flex items-baseline justify-between gap-2">
                  <span className="text-muted-foreground">{lbl}</span>
                  <span className="font-medium text-foreground text-right">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Total pill */}
          <div className="rounded-xl bg-primary px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-bold text-primary-foreground/80 uppercase tracking-wide">Custo Total</span>
            <span className="text-base font-bold text-primary-foreground tabular-nums">{fmtBRL(bd.custoTotal)}</span>
          </div>

          {/* Warnings */}
          {bd.avisos.length > 0 && (
            <div className="space-y-1">
              {bd.avisos.map((a, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-warning">
                  <AlertTriangle size={11} className="mt-0.5 flex-shrink-0" />
                  <span>{a}</span>
                </div>
              ))}
            </div>
          )}

          {canEdit && (
            <button
              onClick={onSnapshot}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <Settings size={10} /> Forçar snapshot imutável
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustosPage() {
  const { canEdit }  = useAuth()
  const {
    centros, materiais, maoDeObra, maquinasCustos, perfis, historico,
    analytics,
    atualizarCentro,
    criarMaterial, atualizarMaterial, excluirMaterial,
    atualizarMaoDeObra,
    atualizarCustoMaquina,
    criarPerfil, atualizarPerfil, excluirPerfil,
    simularPreco,
  } = useCustos()

  const {
    breakdowns,
    config: custoConfig,
    analytics: pecasAnalytics,
    recalcularTodas,
    forcarSnapshot,
    atualizarConfig,
  } = useCustosPecas()

  const userCanEdit = canEdit('custos')

  const [activeTab, setActiveTab] = useState<TabId>('centros')

  // ── Inline editing ───────────────────────────────────────────────────────────
  const [editing, setEditing] = useState<EditState | null>(null)

  function startEdit(id: string, field: string, current: unknown) {
    setEditing({ id, field, value: String(current) })
  }

  function cancelEdit() { setEditing(null) }

  function commitEdit(
    entityType: 'centro' | 'material' | 'mao_obra' | 'maquina' | 'perfil',
    id: string,
    field: string,
    raw: string,
    motivo?: string,
  ) {
    const num = parseFloat(raw)
    if (isNaN(num) || num < 0) {
      toast('error', 'Valor inválido')
      return
    }
    switch (entityType) {
      case 'centro':
        atualizarCentro(id, { [field]: num } as Partial<CentroCusto>, motivo)
        break
      case 'material':
        atualizarMaterial(id, { [field]: num } as Partial<CustoMaterial>, motivo)
        break
      case 'mao_obra':
        atualizarMaoDeObra(id, { [field]: num } as Partial<CustoMaoDeObra>, motivo)
        break
      case 'maquina':
        atualizarCustoMaquina(id, { [field]: num } as Partial<MaquinaCustos>, motivo)
        break
      case 'perfil':
        atualizarPerfil(id, { [field]: num } as Partial<PerfilPrecificacao>, motivo)
        break
    }
    toast('success', 'Custo atualizado')
    setEditing(null)
  }

  // ── New material / perfil form ────────────────────────────────────────────────
  const [showNewMaterial, setShowNewMaterial] = useState(false)
  const [showNewPerfil,   setShowNewPerfil]   = useState(false)

  // New material fields
  const [newMat, setNewMat] = useState({
    material: '', bitola: '', espessura: 0, pesoChapa: 0,
    valorChapa: 0, fornecedor: '',
  })
  // New perfil fields
  const [newPerf, setNewPerf] = useState({
    nome: '', descricao: '', margemLucroPercentual: 25,
    comissaoPercentual: 5, impostosPercentual: 12,
  })

  function handleSaveMaterial() {
    if (!newMat.material.trim() || newMat.pesoChapa <= 0 || newMat.valorChapa <= 0) {
      toast('error', 'Preencha material, peso e valor da chapa')
      return
    }
    criarMaterial({ ...newMat, ativo: true, dataAtualizacao: new Date() })
    setNewMat({ material: '', bitola: '', espessura: 0, pesoChapa: 0, valorChapa: 0, fornecedor: '' })
    setShowNewMaterial(false)
    toast('success', 'Material cadastrado')
  }

  function handleSavePerfil() {
    if (!newPerf.nome.trim()) { toast('error', 'Informe o nome do perfil'); return }
    criarPerfil({ ...newPerf, ativo: true })
    setNewPerf({ nome: '', descricao: '', margemLucroPercentual: 25, comissaoPercentual: 5, impostosPercentual: 12 })
    setShowNewPerfil(false)
    toast('success', 'Perfil criado')
  }

  // ── Custos das Peças ─────────────────────────────────────────────────────────
  const [expandedPecaId, setExpandedPecaId] = useState<string | null>(null)
  const [editingTaxa,    setEditingTaxa]    = useState(false)
  const [editingWaste,   setEditingWaste]   = useState(false)
  const [taxaVal,        setTaxaVal]        = useState(String(custoConfig.taxaIndiretos))
  const [wasteVal,       setWasteVal]       = useState(String(custoConfig.fatorWasteDefault))

  function commitTaxa() {
    const v = parseFloat(taxaVal)
    if (isNaN(v) || v < 0 || v > 100) { toast('error', 'Taxa inválida (0–100%)'); return }
    atualizarConfig({ taxaIndiretos: v })
    setEditingTaxa(false)
    toast('success', 'Taxa de indiretos atualizada — peças recalculadas')
  }

  function commitWaste() {
    const v = parseFloat(wasteVal)
    if (isNaN(v) || v < 1 || v > 3) { toast('error', 'Fator inválido (1.0–3.0)'); return }
    atualizarConfig({ fatorWasteDefault: v })
    setEditingWaste(false)
    toast('success', 'Fator de desperdício atualizado — peças recalculadas')
  }

  // ── Price simulator ───────────────────────────────────────────────────────────
  const [simCusto,    setSimCusto]    = useState('')
  const [simPerfilId, setSimPerfilId] = useState(perfis[1]?.id ?? '')

  const simResultado = useMemo(() => {
    const v = parseFloat(simCusto)
    if (isNaN(v) || v <= 0 || !simPerfilId) return null
    return simularPreco({ custoTotal: v, perfilId: simPerfilId })
  }, [simCusto, simPerfilId, simularPreco])

  // ── Editable cell component ───────────────────────────────────────────────────
  function EditableCell({
    rowId, field, value, format, entityType,
  }: {
    rowId: string; field: string; value: number
    format?: (v: number) => string
    entityType: 'centro' | 'material' | 'mao_obra' | 'maquina' | 'perfil'
  }) {
    const isEditing = editing?.id === rowId && editing?.field === field
    if (!userCanEdit) {
      return <span className="tabular-nums">{format ? format(value) : value}</span>
    }
    if (isEditing) {
      return (
        <span className="inline-flex items-center gap-1">
          <Input
            autoFocus
            className="h-6 w-24 px-2 text-xs tabular-nums"
            value={editing.value}
            onChange={(e) => setEditing((prev) => prev ? { ...prev, value: e.target.value } : null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit(entityType, rowId, field, editing.value)
              if (e.key === 'Escape') cancelEdit()
            }}
          />
          <button onClick={() => commitEdit(entityType, rowId, field, editing.value)}
            className="text-success hover:text-success/80"><Check size={12} /></button>
          <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground"><X size={12} /></button>
        </span>
      )
    }
    return (
      <button
        onClick={() => startEdit(rowId, field, value)}
        className="group/cell inline-flex items-center gap-1 rounded px-1 hover:bg-muted/50 tabular-nums transition-colors"
        title="Clique para editar"
      >
        {format ? format(value) : value}
        <Pencil size={10} className="text-muted-foreground opacity-0 group-hover/cell:opacity-100 transition-opacity" />
      </button>
    )
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <PermissionGate module="custos">
    <div className="space-y-6">

      {/* Header */}
      <PageHeader
        title="Custos"
        subtitle="Gestão de custos industriais, materiais e precificação"
        breadcrumbs={[{ label: 'Início', href: '/dashboard' }, { label: 'Custos' }]}
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Custo Médio / Hora"
          value={fmtBRL(analytics.custoMedioProjetado)}
          sub={`${analytics.totalCentros} centros ativos`}
          icon={Calculator}
          colorClass="text-primary"    bgClass="bg-primary/10"    ringClass="ring-primary/20"    delay={0}
        />
        <KpiCard
          label="Margem Média"
          value={`${analytics.margemMedia}%`}
          sub={`${analytics.totalPerfisPrecificacao} perfis de preço`}
          icon={TrendingUp}
          colorClass="text-success"    bgClass="bg-success/10"    ringClass="ring-success/20"    delay={0.05}
        />
        <KpiCard
          label="Materiais Desatualizados"
          value={analytics.materiaisDesatualizados}
          sub="> 30 dias sem atualização"
          icon={AlertTriangle}
          colorClass={analytics.materiaisDesatualizados > 0 ? 'text-warning' : 'text-muted-foreground'}
          bgClass={analytics.materiaisDesatualizados > 0 ? 'bg-warning/10' : 'bg-muted/60'}
          ringClass={analytics.materiaisDesatualizados > 0 ? 'ring-warning/20' : 'ring-border/50'}
          delay={0.1}
        />
        <KpiCard
          label="Última Atualização"
          value={analytics.ultimaAtualizacaoCustos ? fmtDate(analytics.ultimaAtualizacaoCustos) : '—'}
          sub={`${analytics.totalMateriais} materiais · ${analytics.totalMaoDeObra} cargos`}
          icon={Clock}
          colorClass="text-muted-foreground" bgClass="bg-muted/60" ringClass="ring-border/50"   delay={0.15}
        />
      </div>

      {/* Tab navigation */}
      <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-1 flex-wrap">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150',
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}>
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
        >

          {/* ── Centros de Custo ─────────────────────────────────────────────── */}
          {activeTab === 'centros' && (
            <Card>
              <CardHeader className="pb-3">
                <SectionHeader
                  title="Centros de Custo"
                  description="Custo hora por setor — base de todos os cálculos de processo"
                />
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        {['Setor', 'Descrição', 'Custo / Hora', 'Ativo', 'Última Atualização'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {centros.map((c, i) => (
                        <motion.tr key={c.id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                          className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors"
                        >
                          <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{c.nome}</td>
                          <td className="px-4 py-3 text-muted-foreground max-w-[220px] truncate">{c.descricao}</td>
                          <td className="px-4 py-3 whitespace-nowrap font-mono">
                            <EditableCell rowId={c.id} field="custoHora" value={c.custoHora} format={fmtBRL} entityType="centro" />
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn('inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold',
                              c.ativo ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground')}>
                              {c.ativo ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(c.ultimaAtualizacao)}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Materiais ────────────────────────────────────────────────────── */}
          {activeTab === 'materiais' && (
            <Card>
              <CardHeader className="pb-3">
                <SectionHeader
                  title="Custos de Materiais"
                  description="Custo por kg calculado automaticamente a partir do preço da chapa"
                  action={
                    userCanEdit && (
                      <Button size="sm" className="gap-1.5" onClick={() => setShowNewMaterial((v) => !v)}>
                        <Plus size={13} /> Novo Material
                      </Button>
                    )
                  }
                />
                {/* New material form */}
                <AnimatePresence>
                  {showNewMaterial && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden">
                      <div className="mt-2 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                        <p className="text-xs font-semibold text-primary">Novo material</p>
                        <div className="grid gap-3 sm:grid-cols-3">
                          <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">Material *</label>
                            <Input className="mt-1 h-8 text-xs" placeholder="ex: Aço Carbono 1020"
                              value={newMat.material} onChange={(e) => setNewMat((p) => ({ ...p, material: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">Bitola</label>
                            <Input className="mt-1 h-8 text-xs" placeholder="ex: 3mm"
                              value={newMat.bitola} onChange={(e) => setNewMat((p) => ({ ...p, bitola: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">Espessura (mm) *</label>
                            <Input type="number" className="mt-1 h-8 text-xs" placeholder="3"
                              value={newMat.espessura || ''} onChange={(e) => setNewMat((p) => ({ ...p, espessura: parseFloat(e.target.value) || 0 }))} />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">Peso Chapa (kg) *</label>
                            <Input type="number" className="mt-1 h-8 text-xs" placeholder="106"
                              value={newMat.pesoChapa || ''} onChange={(e) => setNewMat((p) => ({ ...p, pesoChapa: parseFloat(e.target.value) || 0 }))} />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">Valor da Chapa (R$) *</label>
                            <Input type="number" className="mt-1 h-8 text-xs" placeholder="1060"
                              value={newMat.valorChapa || ''} onChange={(e) => setNewMat((p) => ({ ...p, valorChapa: parseFloat(e.target.value) || 0 }))} />
                          </div>
                          <div>
                            <label className="text-[11px] font-semibold text-muted-foreground">Fornecedor</label>
                            <Input className="mt-1 h-8 text-xs" placeholder="ex: Aços Villares"
                              value={newMat.fornecedor} onChange={(e) => setNewMat((p) => ({ ...p, fornecedor: e.target.value }))} />
                          </div>
                        </div>
                        {newMat.pesoChapa > 0 && newMat.valorChapa > 0 && (
                          <p className="text-xs text-success font-semibold">
                            Valor/kg calculado: {fmtBRL(derivarValorKg(newMat.valorChapa, newMat.pesoChapa))}/kg
                          </p>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" className="gap-1.5" onClick={handleSaveMaterial}><Save size={12} /> Salvar</Button>
                          <Button size="sm" variant="outline" onClick={() => setShowNewMaterial(false)}>Cancelar</Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        {['Material', 'Bitola', 'Peso Chapa', 'Valor Chapa', 'Valor/kg (auto)', 'Fornecedor', 'Atualizado', ''].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {materiais.filter((m) => m.ativo).map((m, i) => (
                        <motion.tr key={m.id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                          className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-foreground">{m.material}</td>
                          <td className="px-4 py-3 text-muted-foreground">{m.bitola ?? `${m.espessura}mm`}</td>
                          <td className="px-4 py-3 text-muted-foreground tabular-nums">{m.pesoChapa} kg</td>
                          <td className="px-4 py-3 tabular-nums font-mono">
                            <EditableCell rowId={m.id} field="valorChapa" value={m.valorChapa} format={fmtBRL} entityType="material" />
                          </td>
                          <td className="px-4 py-3 font-semibold tabular-nums text-primary">
                            {fmtBRL(m.valorKg)}/kg
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{m.fornecedor ?? '—'}</td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            <span className={cn(isOutdated(m.dataAtualizacao) ? 'text-warning font-semibold' : 'text-muted-foreground')}>
                              {isOutdated(m.dataAtualizacao) && <AlertTriangle size={11} className="inline mr-1" />}
                              {fmtDate(m.dataAtualizacao)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {userCanEdit && (
                              <button onClick={() => excluirMaterial(m.id)}
                                className="text-muted-foreground hover:text-destructive transition-colors p-1" title="Remover">
                                <Trash2 size={13} />
                              </button>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Mão de Obra ──────────────────────────────────────────────────── */}
          {activeTab === 'mao_obra' && (
            <Card>
              <CardHeader className="pb-3">
                <SectionHeader
                  title="Custos de Mão de Obra"
                  description="Custo total = custo hora × (1 + encargos%)"
                />
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        {['Cargo', 'Custo/h Base', 'Encargos %', 'Custo/h Total', 'Ativo', 'Atualizado'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {maoDeObra.filter((m) => m.ativo).map((m, i) => (
                        <motion.tr key={m.id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                          className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-foreground">{m.cargo}</td>
                          <td className="px-4 py-3 tabular-nums font-mono">
                            <EditableCell rowId={m.id} field="custoHora" value={m.custoHora} format={fmtBRL} entityType="mao_obra" />
                          </td>
                          <td className="px-4 py-3 tabular-nums font-mono">
                            <EditableCell rowId={m.id} field="encargosPercentual" value={m.encargosPercentual}
                              format={(v) => `${v}%`} entityType="mao_obra" />
                          </td>
                          <td className="px-4 py-3 font-bold tabular-nums text-primary font-mono">
                            {fmtBRL(m.custoHoraTotal)}/h
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold bg-success/10 text-success">Ativo</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(m.ultimaAtualizacao)}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Máquinas ─────────────────────────────────────────────────────── */}
          {activeTab === 'maquinas' && (
            <Card>
              <CardHeader className="pb-3">
                <SectionHeader
                  title="Custos de Máquinas"
                  description="Custo total/hora = energia + manutenção + operador"
                />
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        {['Máquina', 'Código', 'Energia/h', 'Manutenção/h', 'Operador/h', 'Total/h', 'Atualizado'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {maquinasCustos.map((m, i) => (
                        <motion.tr key={m.id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                          className={cn(
                            'border-b border-border last:border-0 hover:bg-muted/10 transition-colors',
                            isOutdated(m.ultimaAtualizacao) && 'bg-warning/3'
                          )}
                        >
                          <td className="px-4 py-3 font-medium text-foreground">{m.maquinaNome}</td>
                          <td className="px-4 py-3 font-mono text-xs text-accent">{m.maquinaCodigo}</td>
                          <td className="px-4 py-3 tabular-nums font-mono">
                            <EditableCell rowId={m.id} field="energiaHora" value={m.energiaHora} format={fmtBRL} entityType="maquina" />
                          </td>
                          <td className="px-4 py-3 tabular-nums font-mono">
                            <EditableCell rowId={m.id} field="custoManutencaoHora" value={m.custoManutencaoHora} format={fmtBRL} entityType="maquina" />
                          </td>
                          <td className="px-4 py-3 tabular-nums font-mono">
                            <EditableCell rowId={m.id} field="custoHora" value={m.custoHora} format={fmtBRL} entityType="maquina" />
                          </td>
                          <td className="px-4 py-3 font-bold text-primary tabular-nums font-mono">
                            {fmtBRL(m.custoTotalHora)}/h
                          </td>
                          <td className="px-4 py-3 text-xs whitespace-nowrap">
                            <span className={cn(isOutdated(m.ultimaAtualizacao) ? 'text-warning font-semibold' : 'text-muted-foreground')}>
                              {isOutdated(m.ultimaAtualizacao) && <AlertTriangle size={11} className="inline mr-1" />}
                              {fmtDate(m.ultimaAtualizacao)}
                            </span>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Precificação ─────────────────────────────────────────────────── */}
          {activeTab === 'precificacao' && (
            <div className="space-y-6">
              {/* Pricing profiles */}
              <Card>
                <CardHeader className="pb-3">
                  <SectionHeader
                    title="Perfis de Precificação"
                    description="Definem margem, impostos e comissão aplicados sobre o custo total"
                    action={
                      userCanEdit && (
                        <Button size="sm" className="gap-1.5" onClick={() => setShowNewPerfil((v) => !v)}>
                          <Plus size={13} /> Novo Perfil
                        </Button>
                      )
                    }
                  />
                  <AnimatePresence>
                    {showNewPerfil && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden mt-2">
                        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                          <p className="text-xs font-semibold text-primary">Novo perfil</p>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div className="sm:col-span-3">
                              <label className="text-[11px] font-semibold text-muted-foreground">Nome *</label>
                              <Input className="mt-1 h-8 text-xs" placeholder="ex: Premium"
                                value={newPerf.nome} onChange={(e) => setNewPerf((p) => ({ ...p, nome: e.target.value }))} />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-muted-foreground">Margem (%)</label>
                              <Input type="number" className="mt-1 h-8 text-xs"
                                value={newPerf.margemLucroPercentual}
                                onChange={(e) => setNewPerf((p) => ({ ...p, margemLucroPercentual: parseFloat(e.target.value) || 0 }))} />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-muted-foreground">Impostos (%)</label>
                              <Input type="number" className="mt-1 h-8 text-xs"
                                value={newPerf.impostosPercentual}
                                onChange={(e) => setNewPerf((p) => ({ ...p, impostosPercentual: parseFloat(e.target.value) || 0 }))} />
                            </div>
                            <div>
                              <label className="text-[11px] font-semibold text-muted-foreground">Comissão (%)</label>
                              <Input type="number" className="mt-1 h-8 text-xs"
                                value={newPerf.comissaoPercentual}
                                onChange={(e) => setNewPerf((p) => ({ ...p, comissaoPercentual: parseFloat(e.target.value) || 0 }))} />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" className="gap-1.5" onClick={handleSavePerfil}><Save size={12} /> Salvar</Button>
                            <Button size="sm" variant="outline" onClick={() => setShowNewPerfil(false)}>Cancelar</Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          {['Perfil', 'Margem %', 'Impostos %', 'Comissão %', 'Markup Total', ''].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {perfis.filter((p) => p.ativo).map((p, i) => {
                          const markupTotal = p.margemLucroPercentual + p.impostosPercentual + p.comissaoPercentual
                          return (
                            <motion.tr key={p.id}
                              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                              className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors"
                            >
                              <td className="px-4 py-3 font-semibold text-foreground">{p.nome}</td>
                              <td className="px-4 py-3 tabular-nums font-mono">
                                <EditableCell rowId={p.id} field="margemLucroPercentual" value={p.margemLucroPercentual}
                                  format={(v) => `${v}%`} entityType="perfil" />
                              </td>
                              <td className="px-4 py-3 tabular-nums font-mono">
                                <EditableCell rowId={p.id} field="impostosPercentual" value={p.impostosPercentual}
                                  format={(v) => `${v}%`} entityType="perfil" />
                              </td>
                              <td className="px-4 py-3 tabular-nums font-mono">
                                <EditableCell rowId={p.id} field="comissaoPercentual" value={p.comissaoPercentual}
                                  format={(v) => `${v}%`} entityType="perfil" />
                              </td>
                              <td className="px-4 py-3 font-bold text-primary tabular-nums">{markupTotal}%</td>
                              <td className="px-4 py-3">
                                {userCanEdit && (
                                  <button onClick={() => excluirPerfil(p.id)}
                                    className="text-muted-foreground hover:text-destructive p-1 transition-colors" title="Remover">
                                    <Trash2 size={13} />
                                  </button>
                                )}
                              </td>
                            </motion.tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Price Simulator */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Zap size={14} className="text-warning" /> Simulador de Preço
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Informe o custo total e selecione um perfil para calcular o preço de venda sugerido
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Inputs */}
                    <div className="space-y-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Custo Total (R$)</label>
                        <Input
                          type="number"
                          className="mt-1 h-9 tabular-nums"
                          placeholder="ex: 1500,00"
                          value={simCusto}
                          onChange={(e) => setSimCusto(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Perfil de Precificação</label>
                        <select
                          className="mt-1 h-9 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:border-primary"
                          value={simPerfilId}
                          onChange={(e) => setSimPerfilId(e.target.value)}
                        >
                          {perfis.filter((p) => p.ativo).map((p) => (
                            <option key={p.id} value={p.id}>{p.nome}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Results */}
                    <AnimatePresence>
                      {simResultado ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="rounded-xl border border-border bg-muted/30 p-4 space-y-2"
                        >
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Custo:</span>
                            <span className="tabular-nums font-medium">{fmtBRL(simResultado.custo)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Margem:</span>
                            <span className="tabular-nums text-success font-medium">+ {fmtBRL(simResultado.margem)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Impostos:</span>
                            <span className="tabular-nums font-medium">+ {fmtBRL(simResultado.impostos)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Comissão:</span>
                            <span className="tabular-nums font-medium">+ {fmtBRL(simResultado.comissao)}</span>
                          </div>
                          <div className="border-t border-border pt-2 flex justify-between items-center">
                            <span className="text-xs font-semibold text-foreground">Preço Sugerido</span>
                            <span className="text-lg font-bold text-primary tabular-nums">{fmtBRL(simResultado.precoSugerido)}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Margem efetiva: {simResultado.margemEfetivaPercent}% sobre o preço final
                          </p>
                        </motion.div>
                      ) : (
                        <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-6">
                          <p className="text-xs text-muted-foreground text-center">
                            Informe o custo e<br />selecione um perfil para simular
                          </p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Custos das Peças ─────────────────────────────────────────────── */}
          {activeTab === 'custos_pecas' && (
            <div className="space-y-5">

              {/* Config + Recalculate */}
              <Card>
                <CardHeader className="pb-3">
                  <SectionHeader
                    title="Parâmetros de Cálculo"
                    description="Aplicados a todas as peças — alterar recalcula automaticamente"
                    action={
                      <Button
                        size="sm" variant="outline" className="gap-1.5"
                        onClick={() => {
                          recalcularTodas(mockPecas)
                          toast('success', `${mockPecas.length} peças recalculadas`)
                        }}
                      >
                        <RefreshCw size={12} /> Recalcular Todos
                      </Button>
                    }
                  />
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 max-w-lg">
                    {/* Taxa Indiretos */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Taxa de Indiretos (%)</p>
                      {editingTaxa ? (
                        <span className="inline-flex items-center gap-1">
                          <Input autoFocus className="h-8 w-24 px-2 text-xs tabular-nums"
                            value={taxaVal}
                            onChange={(e) => setTaxaVal(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitTaxa(); if (e.key === 'Escape') setEditingTaxa(false) }}
                          />
                          <button onClick={commitTaxa} className="text-success"><Check size={13} /></button>
                          <button onClick={() => setEditingTaxa(false)} className="text-muted-foreground"><X size={13} /></button>
                        </span>
                      ) : (
                        <button
                          onClick={() => { setEditingTaxa(true); setTaxaVal(String(custoConfig.taxaIndiretos)) }}
                          disabled={!userCanEdit}
                          className={cn('inline-flex items-center gap-1 rounded px-2 py-1 tabular-nums text-sm font-bold text-foreground hover:bg-muted/50', !userCanEdit && 'cursor-default')}
                        >
                          {custoConfig.taxaIndiretos}%
                          {userCanEdit && <Pencil size={10} className="text-muted-foreground" />}
                        </button>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">Aplicado sobre custo direto total</p>
                    </div>

                    {/* Fator Waste */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Fator de Desperdício</p>
                      {editingWaste ? (
                        <span className="inline-flex items-center gap-1">
                          <Input autoFocus className="h-8 w-24 px-2 text-xs tabular-nums"
                            value={wasteVal}
                            onChange={(e) => setWasteVal(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') commitWaste(); if (e.key === 'Escape') setEditingWaste(false) }}
                          />
                          <button onClick={commitWaste} className="text-success"><Check size={13} /></button>
                          <button onClick={() => setEditingWaste(false)} className="text-muted-foreground"><X size={13} /></button>
                        </span>
                      ) : (
                        <button
                          onClick={() => { setEditingWaste(true); setWasteVal(String(custoConfig.fatorWasteDefault)) }}
                          disabled={!userCanEdit}
                          className={cn('inline-flex items-center gap-1 rounded px-2 py-1 tabular-nums text-sm font-bold text-foreground hover:bg-muted/50', !userCanEdit && 'cursor-default')}
                        >
                          ×{custoConfig.fatorWasteDefault}
                          {userCanEdit && <Pencil size={10} className="text-muted-foreground" />}
                        </button>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-0.5">Multiplicador de nesting/corte</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Analytics KPIs */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    label: 'Custo Médio / Peça',
                    value: fmtBRL(pecasAnalytics.custoMedioPecas),
                    icon: Calculator,
                    colorClass: 'text-primary', bgClass: 'bg-primary/10', ringClass: 'ring-primary/20',
                    sub: `${pecasAnalytics.pecasComCusto} peças calculadas`,
                  },
                  {
                    label: 'Peça Mais Cara',
                    value: pecasAnalytics.pecaMaisCara ? fmtBRL(pecasAnalytics.pecaMaisCara.custo) : '—',
                    icon: TrendingUp,
                    colorClass: 'text-accent', bgClass: 'bg-accent/10', ringClass: 'ring-accent/20',
                    sub: pecasAnalytics.pecaMaisCara?.codigo ?? '—',
                  },
                  {
                    label: 'Peças sem Custo',
                    value: pecasAnalytics.pecasSemCusto,
                    icon: AlertTriangle,
                    colorClass: pecasAnalytics.pecasSemCusto > 0 ? 'text-warning' : 'text-muted-foreground',
                    bgClass:    pecasAnalytics.pecasSemCusto > 0 ? 'bg-warning/10' : 'bg-muted/60',
                    ringClass:  pecasAnalytics.pecasSemCusto > 0 ? 'ring-warning/20' : 'ring-border/50',
                    sub: 'Sem tempos ou material',
                  },
                  {
                    label: 'Custo Total Catálogo',
                    value: fmtBRL(pecasAnalytics.custoTotalCatalogo),
                    icon: Package2,
                    colorClass: 'text-success', bgClass: 'bg-success/10', ringClass: 'ring-success/20',
                    sub: `maior componente: ${pecasAnalytics.maiorComponente}`,
                  },
                ].map((card, i) => (
                  <KpiCard key={card.label} {...card} delay={i * 0.05} />
                ))}
              </div>

              {/* Breakdown Table */}
              <Card>
                <CardHeader className="pb-3">
                  <SectionHeader
                    title="Custo por Peça"
                    description="Clique em uma linha para ver o detalhamento completo"
                  />
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          {['Código', 'Descrição', 'Esp.', 'Peso', 'Material', 'Custo Total', 'Status', ''].map((h) => (
                            <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {breakdowns.map((bd, i) => {
                          const peca      = mockPecas.find((p) => p.id === bd.pecaId)
                          const isExpanded = expandedPecaId === bd.pecaId
                          return (
                            <React.Fragment key={bd.pecaId}>
                              <motion.tr
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.025 }}
                                onClick={() => setExpandedPecaId(isExpanded ? null : bd.pecaId)}
                                className={cn(
                                  'border-b border-border cursor-pointer transition-colors',
                                  isExpanded
                                    ? 'bg-primary/5 hover:bg-primary/8'
                                    : 'hover:bg-muted/10 last:border-0',
                                )}
                              >
                                <td className="px-4 py-3 font-mono text-xs font-bold text-primary whitespace-nowrap">{bd.pecaCodigo}</td>
                                <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate text-xs">
                                  {peca?.descricao ?? '—'}
                                </td>
                                <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{peca ? `${peca.espessura}mm` : '—'}</td>
                                <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">{peca ? `${peca.peso}kg` : '—'}</td>
                                <td className="px-4 py-3 text-xs text-muted-foreground max-w-[120px] truncate">
                                  {bd.materialNome === '—'
                                    ? <span className="text-destructive/70">Sem material</span>
                                    : <span title={bd.materialNome}>{bd.materialNome}</span>
                                  }
                                </td>
                                <td className="px-4 py-3 font-bold tabular-nums text-foreground whitespace-nowrap">
                                  {bd.custoTotal > 0
                                    ? fmtBRL(bd.custoTotal)
                                    : <span className="text-muted-foreground font-normal">—</span>
                                  }
                                </td>
                                <td className="px-4 py-3">
                                  {bd.calculadoComSucesso ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
                                      <CheckCircle2 size={9} /> Calculado
                                    </span>
                                  ) : bd.avisos.length > 0 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-warning bg-warning/10 px-2 py-0.5 rounded-full" title={bd.avisos[0]}>
                                      <AlertTriangle size={9} /> Aviso
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                      Sem dados
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-muted-foreground">
                                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </td>
                              </motion.tr>

                              {/* ── Expanded breakdown row ── */}
                              <AnimatePresence>
                                {isExpanded && (
                                  <motion.tr
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.15 }}
                                  >
                                    <td colSpan={8} className="px-4 pb-5 pt-0 bg-primary/3">
                                      <CustoBreakdownPanel bd={bd} onSnapshot={() => forcarSnapshot(bd.pecaId)} canEdit={userCanEdit} />
                                    </td>
                                  </motion.tr>
                                )}
                              </AnimatePresence>
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Histórico ────────────────────────────────────────────────────── */}
          {activeTab === 'historico' && (
            <Card>
              <CardHeader className="pb-3">
                <SectionHeader
                  title="Histórico de Alterações"
                  description="Registro imutável de todas as atualizações de custos"
                />
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        {['Data/Hora', 'Entidade', 'Campo', 'Anterior', 'Novo', 'Usuário', 'Motivo'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {historico.map((h, i) => (
                        <motion.tr key={h.id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                          className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors"
                        >
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap tabular-nums">
                            {h.timestamp.toLocaleString('pt-BR', { day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit' })}
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <span className="inline-flex h-5 items-center rounded px-1.5 text-[10px] font-semibold uppercase bg-muted text-muted-foreground">
                                {h.entidade.replace('_', ' ')}
                              </span>
                              <p className="text-xs text-foreground mt-0.5">{h.entidadeNome}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{h.campo}</td>
                          <td className="px-4 py-3 text-xs text-destructive tabular-nums font-mono">{h.valorAnterior}</td>
                          <td className="px-4 py-3 text-xs text-success tabular-nums font-mono font-semibold">{h.valorNovo}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{h.usuario}</td>
                          <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px] truncate">{h.motivo ?? '—'}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

        </motion.div>
      </AnimatePresence>

    </div>
    </PermissionGate>
  )
}
