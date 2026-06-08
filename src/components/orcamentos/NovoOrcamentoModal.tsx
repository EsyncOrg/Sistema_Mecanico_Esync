'use client'

// ─── Novo Orçamento Modal — Phase 7.2 ────────────────────────────────────────
//
// CRITICAL CHANGE (Phase 7.2):
//   Configurations MUST be selected BEFORE the quotation is created.
//   Costs are computed live during creation.
//   "Criar Orçamento" is blocked until all catalog-linked items are configured.
//
// Flow:
//   1. Fill client + project info
//   2. Add items (manual or from catalog)
//   3. For catalog peca/conjunto items: select manufacturing configurations
//   4. Costs update live → summary panel shows cost, price, margin
//   5. Criar Orçamento → selections registered as immutable snapshots

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Plus, Trash2, AlertCircle, BookOpen,
  Settings, ChevronDown, ChevronUp, Check, Calculator,
  TrendingUp, Package, ExternalLink,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { cn }     from '@/lib/utils'
import { toast }  from '@/lib/toast'
import { useOrcamentos }              from '@/contexts/OrcamentosContext'
import { useConjuntos }               from '@/contexts/ConjuntosContext'
import { useConfiguracoesFabricacao } from '@/contexts/ConfiguracoesFabricacaoContext'
import { useCustos }                  from '@/contexts/CustosContext'
import { useOrcamentoConfiguracoes }  from '@/contexts/OrcamentoConfiguracoesContext'
import { CatalogSelectorModal }       from '@/components/orcamentos/CatalogSelectorModal'
import type { Conjunto }              from '@/types/conjuntos'
import type { ConfiguracaoFabricacao } from '@/types/configuracoes-fabricacao'
import type { CustoPecaBreakdown }    from '@/types/custos-pecas'
import type { PrioridadeOrcamento, TipoItemOrcamento, CatalogSelection } from '@/types/orcamentos'

// ─── Constants ────────────────────────────────────────────────────────────────

const UNIDADES = ['un', 'h', 'kg', 'm', 'm²', 'm³', 'serv.', 'conj.', 'vb', 'l', 'pc']

const PRIORIDADES: { value: PrioridadeOrcamento; label: string; color: string }[] = [
  { value: 'alta',  label: 'Alta',  color: 'text-destructive' },
  { value: 'media', label: 'Média', color: 'text-warning'     },
  { value: 'baixa', label: 'Baixa', color: 'text-muted-foreground' },
]

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemDraft {
  tempId:        string
  codigo:        string
  descricao:     string
  quantidade:    number
  unidade:       string
  valorUnitario: number
  tipo:          TipoItemOrcamento
  pecaId?:       string
  conjuntoId?:   string
  // Phase 7.2 — config selection:
  configuracaoFabricacaoId?: string          // for tipo='peca' with pecaId
  conjuntoSelecoes: Record<string, string>   // for tipo='conjunto': pcpId → cfgId
  configExpanded:   boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function r2(n: number) { return Math.round(n * 100) / 100 }

function blankItem(): ItemDraft {
  return {
    tempId:        Math.random().toString(36).slice(2),
    codigo:        '',
    descricao:     '',
    quantidade:    1,
    unidade:       'un',
    valorUnitario: 0,
    tipo:          'outro',
    conjuntoSelecoes: {},
    configExpanded:   false,
  }
}

function fromCatalog(sel: CatalogSelection): ItemDraft {
  return {
    tempId:        Math.random().toString(36).slice(2),
    codigo:        sel.codigo,
    descricao:     sel.descricao,
    quantidade:    1,
    unidade:       sel.unidade,
    valorUnitario: 0,
    tipo:          sel.tipo,
    pecaId:        sel.pecaId,
    conjuntoId:    sel.conjuntoId,
    conjuntoSelecoes: {},
    configExpanded:   !!(sel.pecaId || sel.conjuntoId), // auto-expand on add
  }
}

function processosTags(cfg: ConfiguracaoFabricacao): string[] {
  const t: string[] = ['corte']
  if (cfg.dobra)    t.push('dobra')
  if (cfg.solda)    t.push('solda')
  if (cfg.pintura)  t.push('pintura')
  if (cfg.montagem) t.push('montagem')
  return t
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  )
}

// ─── Peca Config Panel ────────────────────────────────────────────────────────
// Shown inline below a tipo='peca' item that has a pecaId.

function PecaConfigPanel({
  pecaId,
  selectedCfgId,
  onSelect,
}: {
  pecaId:        string
  selectedCfgId: string | undefined
  onSelect:      (cfgId: string, custo: number) => void
}) {
  const { getByPeca, breakdownsComConfig } = useConfiguracoesFabricacao()
  const { materiais }                      = useCustos()
  const configs = getByPeca(pecaId).filter((c) => c.ativo)

  if (configs.length === 0) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/5 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <AlertCircle size={12} className="text-warning flex-shrink-0" />
          <p className="text-xs text-warning">Nenhuma configuração cadastrada para esta peça.</p>
        </div>
        <a
          href="/custos"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0"
        >
          <ExternalLink size={11} />
          Custos → Configurações
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-1.5 rounded-xl border border-border bg-muted/20 p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
        Selecionar Configuração
      </p>
      {configs.map((cfg) => {
        const mat  = materiais.find((m) => m.id === cfg.materialId)
        const bd   = breakdownsComConfig.find((b) => b.configuracaoId === cfg.id)
        const custo = bd?.custoTotal ?? 0
        const isSelected = cfg.id === selectedCfgId
        const tags = processosTags(cfg)
        return (
          <button
            key={cfg.id}
            type="button"
            onClick={() => onSelect(cfg.id, custo)}
            className={cn(
              'w-full flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all',
              isSelected
                ? 'border-primary/40 bg-primary/8 ring-1 ring-primary/20'
                : 'border-border bg-card hover:border-primary/20 hover:bg-muted/30'
            )}
          >
            <div className={cn(
              'h-4 w-4 rounded-full border flex-shrink-0 flex items-center justify-center',
              isSelected ? 'bg-primary border-primary' : 'border-border'
            )}>
              {isSelected && <Check size={9} className="text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] font-bold text-accent">{cfg.codigo}</span>
                <span className="text-xs font-medium text-foreground truncate">
                  {mat?.descricao ?? mat?.material ?? '—'}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">{tags.join(' · ')}</p>
            </div>
            {custo > 0 && (
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-semibold tabular-nums text-foreground">{fmtBRL(custo)}/un</p>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Conjunto Config Panel ────────────────────────────────────────────────────
// Shown inline below a tipo='conjunto' item. Shows BOM with per-piece config.

function ConjuntoConfigPanel({
  conjunto,
  selecoesPorPcp,
  quantidade,
  onPcpSelect,
}: {
  conjunto:       Conjunto
  selecoesPorPcp: Record<string, string>
  quantidade:     number
  onPcpSelect:    (pcpId: string, cfgId: string) => void
}) {
  const { getByPeca, breakdownsComConfig } = useConfiguracoesFabricacao()
  const { materiais }                      = useCustos()

  const pecasComCatalogo = conjunto.pecas.filter((p) => !!p.pecaId)
  const pecasSemCatalogo = conjunto.pecas.filter((p) => !p.pecaId)
  const selecionadas     = pecasComCatalogo.filter((p) => !!selecoesPorPcp[p.id]).length

  // Live assembly total across selected pieces
  const total = useMemo(() => {
    let sum = 0
    for (const peca of conjunto.pecas) {
      const cfgId = selecoesPorPcp[peca.id]
      if (!cfgId) continue
      const bd = breakdownsComConfig.find((b) => b.configuracaoId === cfgId)
      if (bd) sum = r2(sum + bd.custoTotal * peca.quantidade * quantidade)
    }
    return sum
  }, [selecoesPorPcp, breakdownsComConfig, conjunto.pecas, quantidade])

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-1.5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Configurações por Peça
        </p>
        <span className="text-[10px] text-muted-foreground">
          {selecionadas}/{pecasComCatalogo.length} configuradas
        </span>
      </div>

      {conjunto.pecas.map((peca) => {
        if (!peca.pecaId) {
          return (
            <div key={peca.id}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 opacity-60">
              <Package size={11} className="text-muted-foreground flex-shrink-0" />
              <span className="font-mono text-[10px] text-accent">{peca.codigo}</span>
              <span className="text-[10px] text-muted-foreground truncate flex-1">{peca.descricao}</span>
              <span className="text-[10px] text-muted-foreground">×{peca.quantidade}</span>
              <span className="text-[10px] text-muted-foreground italic">sem vínculo</span>
            </div>
          )
        }

        const configs = getByPeca(peca.pecaId).filter((c) => c.ativo)
        const selectedCfgId = selecoesPorPcp[peca.id]
        const selectedBD = selectedCfgId
          ? breakdownsComConfig.find((b) => b.configuracaoId === selectedCfgId)
          : undefined

        return (
          <div key={peca.id} className={cn(
            'rounded-lg border px-3 py-2',
            selectedCfgId ? 'border-primary/20 bg-primary/3' : 'border-border bg-card'
          )}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className={cn(
                'h-3.5 w-3.5 rounded-full border flex-shrink-0 flex items-center justify-center',
                selectedCfgId ? 'bg-success border-success' : 'border-border/50'
              )}>
                {selectedCfgId && <Check size={8} className="text-white" />}
              </div>
              <span className="font-mono text-[10px] font-bold text-accent">{peca.codigo}</span>
              <span className="text-[10px] text-foreground truncate flex-1">{peca.descricao}</span>
              <span className="text-[10px] text-muted-foreground flex-shrink-0">×{peca.quantidade}</span>
              {selectedBD && selectedBD.custoTotal > 0 && (
                <span className="text-[10px] font-semibold tabular-nums text-foreground flex-shrink-0">
                  {fmtBRL(selectedBD.custoTotal * peca.quantidade * quantidade)}
                </span>
              )}
            </div>

            {configs.length === 0 ? (
              <p className="text-[10px] text-warning flex items-center gap-1">
                <AlertCircle size={10} />
                Sem configurações cadastradas
                <a href="/custos" target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline ml-1 flex items-center gap-0.5">
                  <ExternalLink size={9} />Custos
                </a>
              </p>
            ) : (
              <PcpConfigDropdown
                configs={configs}
                breakdowns={breakdownsComConfig}
                materiais={materiais}
                selectedId={selectedCfgId}
                onSelect={(cfgId) => onPcpSelect(peca.id, cfgId)}
              />
            )}
          </div>
        )
      })}

      {pecasSemCatalogo.length > 0 && (
        <p className="text-[10px] text-muted-foreground px-1">
          {pecasSemCatalogo.length} peça(s) sem vínculo ao catálogo não requerem configuração.
        </p>
      )}

      {total > 0 && (
        <div className="flex items-center justify-end gap-2 border-t border-border/50 pt-2 mt-1">
          <Calculator size={11} className="text-primary" />
          <span className="text-xs font-bold text-primary tabular-nums">
            Custo total: {fmtBRL(total)}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Pcp Config Dropdown (compact, for ConjuntoConfigPanel) ──────────────────

function PcpConfigDropdown({
  configs,
  breakdowns,
  materiais,
  selectedId,
  onSelect,
}: {
  configs:    ConfiguracaoFabricacao[]
  breakdowns: CustoPecaBreakdown[]
  materiais:  ReturnType<typeof useCustos>['materiais']
  selectedId: string | undefined
  onSelect:   (cfgId: string, custo: number) => void
}) {
  const [open, setOpen] = useState(false)
  const sel    = configs.find((c) => c.id === selectedId)
  const selMat = sel ? materiais.find((m) => m.id === sel.materialId) : undefined
  const selBD  = sel ? breakdowns.find((b) => b.configuracaoId === sel.id) : undefined

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between rounded-md border px-2.5 py-1.5 text-[11px] transition-colors',
          sel
            ? 'border-primary/30 bg-primary/5 text-foreground'
            : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/30'
        )}
      >
        <span className="truncate">
          {sel ? (
            <><span className="font-mono font-bold text-accent mr-1">{sel.codigo}</span>
              {selMat?.descricao ?? selMat?.material ?? '—'}</>
          ) : 'Selecionar configuração…'}
        </span>
        <span className="ml-2 flex items-center gap-1 flex-shrink-0">
          {selBD && selBD.custoTotal > 0 && (
            <span className="text-[10px] tabular-nums text-primary">{fmtBRL(selBD.custoTotal)}/un</span>
          )}
          {open ? <ChevronUp size={10} className="text-muted-foreground" /> : <ChevronDown size={10} className="text-muted-foreground" />}
        </span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.1 }}
            className="absolute top-full left-0 right-0 z-50 mt-0.5 rounded-xl border border-border bg-card shadow-xl"
          >
            <div className="max-h-40 overflow-y-auto divide-y divide-border/50">
              {configs.map((cfg) => {
                const mat  = materiais.find((m) => m.id === cfg.materialId)
                const bd   = breakdowns.find((b) => b.configuracaoId === cfg.id)
                const isSelected = cfg.id === selectedId
                return (
                  <button key={cfg.id} type="button"
                    onClick={() => { onSelect(cfg.id, bd?.custoTotal ?? 0); setOpen(false) }}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/40 transition-colors',
                      isSelected && 'bg-primary/5'
                    )}>
                    <div className={cn('h-3 w-3 rounded-sm border flex-shrink-0 flex items-center justify-center',
                      isSelected ? 'bg-primary border-primary' : 'border-border')}>
                      {isSelected && <Check size={7} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[9px] font-bold text-accent">{cfg.codigo}</span>
                        <span className="text-[11px] text-foreground truncate">
                          {mat?.descricao ?? mat?.material ?? '—'}
                        </span>
                      </div>
                    </div>
                    {bd && bd.custoTotal > 0 && (
                      <span className="text-[10px] tabular-nums font-semibold text-primary flex-shrink-0">
                        {fmtBRL(bd.custoTotal)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Summary Panel ────────────────────────────────────────────────────────────

function SummaryPanel({
  totalCusto,
  totalOrcado,
}: {
  totalCusto:  number
  totalOrcado: number
}) {
  const margem = totalOrcado > 0 && totalCusto > 0
    ? r2(((totalOrcado - totalCusto) / totalOrcado) * 100)
    : null

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
        Resumo do Orçamento
      </p>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-card px-3 py-2.5 text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">Custo Calculado</p>
          <p className={cn('text-sm font-bold tabular-nums', totalCusto > 0 ? 'text-foreground' : 'text-muted-foreground')}>
            {totalCusto > 0 ? fmtBRL(totalCusto) : '—'}
          </p>
        </div>
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-center">
          <p className="text-[10px] text-muted-foreground mb-0.5">Preço Orçado</p>
          <p className={cn('text-sm font-bold tabular-nums', totalOrcado > 0 ? 'text-primary' : 'text-muted-foreground')}>
            {totalOrcado > 0 ? fmtBRL(totalOrcado) : '—'}
          </p>
        </div>
        <div className={cn(
          'rounded-lg border px-3 py-2.5 text-center',
          margem === null ? 'border-border bg-card' :
          margem >= 20    ? 'border-success/30 bg-success/5' :
          margem >= 0     ? 'border-warning/30 bg-warning/5' :
                            'border-destructive/30 bg-destructive/5'
        )}>
          <p className="text-[10px] text-muted-foreground mb-0.5">Margem</p>
          <p className={cn('text-sm font-bold tabular-nums',
            margem === null ? 'text-muted-foreground' :
            margem >= 20   ? 'text-success' :
            margem >= 0    ? 'text-warning' : 'text-destructive'
          )}>
            {margem !== null ? `${margem.toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>
      {totalCusto > 0 && totalOrcado === 0 && (
        <p className="mt-2 text-[11px] text-warning flex items-center gap-1">
          <TrendingUp size={11} />
          Preencha o Valor Unitário para ver a margem.
        </p>
      )}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface NovoOrcamentoModalProps {
  open:         boolean
  onOpenChange: (v: boolean) => void
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function NovoOrcamentoModal({ open, onOpenChange }: NovoOrcamentoModalProps) {
  const { criarOrcamento, proximoNumero }     = useOrcamentos()
  const { conjuntos }                         = useConjuntos()
  const { calcularCustoRascunhoPeca,
          calcularCustoRascunhoConjunto,
          registrarSelecoesCriacao }           = useOrcamentoConfiguracoes()

  // ── Form fields ─────────────────────────────────────────────────────────────
  const [clienteNome,    setClienteNome]    = useState('')
  const [clienteContato, setClienteContato] = useState('')
  const [clienteTel,     setClienteTel]     = useState('')
  const [clienteEmail,   setClienteEmail]   = useState('')

  const [titulo,      setTitulo]      = useState('')
  const [descricao,   setDescricao]   = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [prioridade,  setPrioridade]  = useState<PrioridadeOrcamento>('media')
  const [validade,    setValidade]    = useState('')

  // ── Items ────────────────────────────────────────────────────────────────────
  const [items,       setItems]       = useState<ItemDraft[]>([blankItem()])
  const [catalogOpen, setCatalogOpen] = useState(false)

  // ── Live cost calculation ────────────────────────────────────────────────────
  const custosPorItem = useMemo<Record<string, number>>(() => {
    const result: Record<string, number> = {}
    for (const item of items) {
      if (item.tipo === 'peca' && item.pecaId && item.configuracaoFabricacaoId) {
        result[item.tempId] = r2(
          calcularCustoRascunhoPeca(item.configuracaoFabricacaoId) * item.quantidade
        )
      } else if (item.tipo === 'conjunto' && item.conjuntoId) {
        const conjunto = conjuntos.find((c) => c.id === item.conjuntoId)
        if (conjunto) {
          const bd = calcularCustoRascunhoConjunto(
            conjunto, item.conjuntoSelecoes, item.quantidade
          )
          result[item.tempId] = bd?.custoTotal ?? 0
        } else {
          result[item.tempId] = 0
        }
      } else {
        result[item.tempId] = 0
      }
    }
    return result
  }, [items, calcularCustoRascunhoPeca, calcularCustoRascunhoConjunto, conjuntos])

  // ── Derived totals ───────────────────────────────────────────────────────────
  const totalCusto  = useMemo(
    () => r2(Object.values(custosPorItem).reduce((s, v) => s + v, 0)),
    [custosPorItem]
  )
  const totalOrcado = useMemo(
    () => r2(items.reduce((s, i) => s + i.quantidade * i.valorUnitario, 0)),
    [items]
  )

  // ── Blocking: items missing required config ──────────────────────────────────
  const bloqueios = useMemo<string[]>(() => {
    const reasons: string[] = []
    for (const item of items) {
      if (item.tipo === 'peca' && item.pecaId && !item.configuracaoFabricacaoId) {
        reasons.push(`${item.codigo || item.descricao || 'Peça'}: configuração obrigatória`)
      }
      if (item.tipo === 'conjunto' && item.conjuntoId) {
        const conjunto = conjuntos.find((c) => c.id === item.conjuntoId)
        if (conjunto) {
          const pecasComCatalogo = conjunto.pecas.filter((p) => !!p.pecaId)
          const semConfig = pecasComCatalogo.filter((p) => !item.conjuntoSelecoes[p.id])
          if (semConfig.length > 0) {
            reasons.push(
              `${item.codigo || conjunto.codigo}: ${semConfig.length} peça(s) sem configuração`
            )
          }
        }
      }
    }
    return reasons
  }, [items, conjuntos])

  // ── Standard validation ──────────────────────────────────────────────────────
  const errors = useMemo(() => {
    const e: string[] = []
    if (!clienteNome.trim())   e.push('Nome do cliente é obrigatório')
    if (!titulo.trim())        e.push('Título do projeto é obrigatório')
    if (!validade)             e.push('Data de validade é obrigatória')
    if (items.some((i) => !i.descricao.trim())) e.push('Todos os itens precisam de descrição')
    return e
  }, [clienteNome, titulo, validade, items])

  const canCreate = errors.length === 0 && bloqueios.length === 0

  // ── Item mutations ───────────────────────────────────────────────────────────

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, blankItem()])
  }, [])

  const removeItem = useCallback((tempId: string) => {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId))
  }, [])

  const updateItem = useCallback(
    <K extends keyof ItemDraft>(tempId: string, key: K, value: ItemDraft[K]) => {
      setItems((prev) => prev.map((i) => i.tempId === tempId ? { ...i, [key]: value } : i))
    },
    []
  )

  const toggleExpand = useCallback((tempId: string) => {
    setItems((prev) => prev.map((i) =>
      i.tempId === tempId ? { ...i, configExpanded: !i.configExpanded } : i
    ))
  }, [])

  // Phase 7.2: peca config selected → auto-fill valorUnitario, close panel
  const handlePecaConfigSelect = useCallback(
    (tempId: string, cfgId: string, custo: number) => {
      setItems((prev) => prev.map((i) =>
        i.tempId === tempId
          ? { ...i, configuracaoFabricacaoId: cfgId,
              valorUnitario: custo > 0 ? custo : i.valorUnitario,
              configExpanded: false }
          : i
      ))
    },
    []
  )

  // Phase 7.2: conjunto piece config selected → update selecoes + recompute cost
  const handleConjuntoPcpSelect = useCallback(
    (tempId: string, pcpId: string, cfgId: string) => {
      setItems((prev) => prev.map((i) => {
        if (i.tempId !== tempId) return i
        const newSelecoes = { ...i.conjuntoSelecoes, [pcpId]: cfgId }
        // Compute new assembly cost
        const conjunto = conjuntos.find((c) => c.id === i.conjuntoId)
        if (!conjunto) return { ...i, conjuntoSelecoes: newSelecoes }
        const bd = calcularCustoRascunhoConjunto(conjunto, newSelecoes, i.quantidade)
        const newCusto = bd?.custoTotal ?? 0
        return {
          ...i,
          conjuntoSelecoes: newSelecoes,
          valorUnitario: newCusto > 0 ? newCusto : i.valorUnitario,
        }
      }))
    },
    [conjuntos, calcularCustoRascunhoConjunto]
  )

  // ── Catalog selection ────────────────────────────────────────────────────────

  const handleCatalogSelect = useCallback((sel: CatalogSelection) => {
    setItems((prev) => [...prev, fromCatalog(sel)])
  }, [])

  // ── Reset ────────────────────────────────────────────────────────────────────

  function reset() {
    setClienteNome(''); setClienteContato(''); setClienteTel(''); setClienteEmail('')
    setTitulo(''); setDescricao(''); setObservacoes('')
    setPrioridade('media'); setValidade('')
    setItems([blankItem()])
  }

  function handleClose() { reset(); onOpenChange(false) }

  // ── Submit ───────────────────────────────────────────────────────────────────

  function handleSubmit() {
    if (!canCreate) {
      if (errors.length > 0)   toast('error', errors[0])
      if (bloqueios.length > 0) toast('error', bloqueios[0])
      return
    }

    const novoOrcamento = criarOrcamento({
      titulo:      titulo.trim(),
      descricao:   descricao.trim(),
      observacoes: observacoes.trim(),
      prioridade,
      moeda:       'BRL',
      validadeAte: new Date(validade + 'T23:59:59'),
      cliente: {
        id:               `cli-${Date.now()}`,
        nome:             clienteNome.trim(),
        contatoPrincipal: clienteContato.trim() || undefined,
        telefone:         clienteTel.trim()     || undefined,
        email:            clienteEmail.trim()   || undefined,
      },
      itens: items.map((i, idx) => ({
        tipo:          i.tipo,
        pecaId:        i.pecaId,
        conjuntoId:    i.conjuntoId,
        codigo:        i.codigo.trim() || undefined,
        descricao:     i.descricao.trim(),
        unidade:       i.unidade,
        quantidade:    i.quantidade,
        valorUnitario: i.valorUnitario,
        posicao:       idx + 1,
      })),
    })

    // Register all config selections as immutable snapshots
    const itensComSelecao = novoOrcamento.itens
      .map((actualItem, idx) => {
        const draft = items[idx]
        if (!draft) return null
        if (draft.tipo === 'peca' && draft.configuracaoFabricacaoId) {
          return {
            orcamentoItem:            actualItem,
            tipo:                     'peca' as const,
            configuracaoFabricacaoId: draft.configuracaoFabricacaoId,
          }
        }
        if (draft.tipo === 'conjunto' && Object.keys(draft.conjuntoSelecoes).length > 0) {
          return {
            orcamentoItem:    actualItem,
            tipo:             'conjunto' as const,
            conjuntoSelecoes: draft.conjuntoSelecoes,
          }
        }
        return null
      })
      .filter((e): e is NonNullable<typeof e> => e !== null)

    if (itensComSelecao.length > 0) {
      registrarSelecoesCriacao(novoOrcamento.id, novoOrcamento.numero, itensComSelecao)
    }

    toast('success', 'Orçamento criado', novoOrcamento.numero)
    handleClose()
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="xl" className="flex flex-col">

        {/* ── Header ── */}
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <FileText size={16} className="text-primary" />
            </div>
            <div>
              <DialogTitle>Novo Orçamento</DialogTitle>
              <DialogDescription className="mt-0.5 flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-accent">{proximoNumero}</span>
                <span>·</span>
                <span>Rev. A</span>
                {bloqueios.length > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-warning flex items-center gap-1">
                      <AlertCircle size={10} />
                      {bloqueios.length} item(s) pendente(s)
                    </span>
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── Body ── */}
        <DialogBody className="space-y-6 py-5">

          {/* Cliente */}
          <div>
            <SectionLabel>Dados do Cliente</SectionLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">Nome do Cliente <span className="text-destructive">*</span></Label>
                <Input placeholder="Ex: Metalúrgica XYZ Ltda" value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contato Principal</Label>
                <Input placeholder="Nome do responsável" value={clienteContato}
                  onChange={(e) => setClienteContato(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input placeholder="(11) 99999-9999" value={clienteTel}
                  onChange={(e) => setClienteTel(e.target.value)} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">E-mail</Label>
                <Input type="email" placeholder="email@empresa.com.br" value={clienteEmail}
                  onChange={(e) => setClienteEmail(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Projeto */}
          <div>
            <SectionLabel>Informações do Orçamento</SectionLabel>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Título do Projeto <span className="text-destructive">*</span></Label>
                <Input placeholder="Ex: Painéis Elétricos — Lote 02" value={titulo}
                  onChange={(e) => setTitulo(e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Prioridade</Label>
                  <div className="flex gap-2">
                    {PRIORIDADES.map((p) => (
                      <button key={p.value} type="button" onClick={() => setPrioridade(p.value)}
                        className={cn(
                          'flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-all',
                          prioridade === p.value
                            ? cn('border-current bg-muted', p.color)
                            : 'border-border text-muted-foreground hover:text-foreground'
                        )}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data de Validade <span className="text-destructive">*</span></Label>
                  <Input type="date" value={validade} onChange={(e) => setValidade(e.target.value)}
                    min={new Date().toISOString().split('T')[0]} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Descrição</Label>
                <textarea rows={2} placeholder="Descreva o escopo do orçamento..."
                  value={descricao} onChange={(e) => setDescricao(e.target.value)}
                  className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Observações</Label>
                <textarea rows={2} placeholder="Condições especiais, prazo, etc..."
                  value={observacoes} onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
            </div>
          </div>

          {/* Items */}
          <div>
            <SectionLabel>Itens do Orçamento ({items.length})</SectionLabel>
            <div className="rounded-xl border border-border overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[60px_1fr_80px_80px_110px_110px_36px] gap-px bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Código</span>
                <span>Descrição</span>
                <span className="text-center">Qtd.</span>
                <span>Unid.</span>
                <span className="text-right">Vlr. Unit.</span>
                <span className="text-right">Total</span>
                <span />
              </div>

              {/* Item rows */}
              <div className="divide-y divide-border bg-card">
                <AnimatePresence initial={false}>
                  {items.map((item, idx) => {
                    const isCatalogPeca    = item.tipo === 'peca' && !!item.pecaId
                    const isCatalogConj    = item.tipo === 'conjunto' && !!item.conjuntoId
                    const isCatalogItem    = isCatalogPeca || isCatalogConj
                    const custo            = custosPorItem[item.tempId] ?? 0
                    const isConfigured     = isCatalogPeca
                      ? !!item.configuracaoFabricacaoId
                      : isCatalogConj
                        ? (() => {
                            const cnj = conjuntos.find((c) => c.id === item.conjuntoId)
                            if (!cnj) return false
                            const withCatalog = cnj.pecas.filter((p) => !!p.pecaId)
                            return withCatalog.length === 0 ||
                              withCatalog.every((p) => !!item.conjuntoSelecoes[p.id])
                          })()
                        : true

                    return (
                      <motion.div
                        key={item.tempId}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        {/* Main row */}
                        <div className="grid grid-cols-[60px_1fr_80px_80px_110px_110px_36px] gap-1 px-3 py-2 items-center">
                          <input value={item.codigo}
                            onChange={(e) => updateItem(item.tempId, 'codigo', e.target.value)}
                            placeholder="Cód."
                            className="h-7 w-full rounded border border-border bg-muted/40 px-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
                          <input value={item.descricao}
                            onChange={(e) => updateItem(item.tempId, 'descricao', e.target.value)}
                            placeholder={`Item ${idx + 1}`}
                            className="h-7 w-full rounded border border-border bg-muted/40 px-2 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
                          <input type="number" min="0.01" step="0.01" value={item.quantidade}
                            onChange={(e) => updateItem(item.tempId, 'quantidade', parseFloat(e.target.value) || 0)}
                            className="h-7 w-full rounded border border-border bg-muted/40 px-2 text-center text-[11px] text-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
                          <select value={item.unidade}
                            onChange={(e) => updateItem(item.tempId, 'unidade', e.target.value)}
                            className="h-7 w-full rounded border border-border bg-muted/40 px-1 text-[11px] text-foreground focus:outline-none focus:border-ring">
                            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <input type="number" min="0" step="0.01" value={item.valorUnitario}
                            onChange={(e) => updateItem(item.tempId, 'valorUnitario', parseFloat(e.target.value) || 0)}
                            className="h-7 w-full rounded border border-border bg-muted/40 px-2 text-right text-[11px] text-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
                          <p className="text-right text-[11px] font-semibold text-foreground tabular-nums">
                            {fmtBRL(item.quantidade * item.valorUnitario)}
                          </p>
                          <button type="button" onClick={() => removeItem(item.tempId)}
                            disabled={items.length === 1}
                            className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed">
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {/* Config strip (catalog items only) */}
                        {isCatalogItem && (
                          <div className={cn(
                            'mx-3 mb-2 flex items-center justify-between rounded-lg border px-3 py-1.5',
                            isConfigured
                              ? 'border-success/20 bg-success/5'
                              : 'border-warning/30 bg-warning/5'
                          )}>
                            <div className="flex items-center gap-2">
                              {isConfigured ? (
                                <>
                                  <Calculator size={11} className="text-success flex-shrink-0" />
                                  <span className="text-[11px] text-success font-semibold tabular-nums">
                                    {custo > 0 ? `Custo: ${fmtBRL(custo)}` : 'Configurado'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <AlertCircle size={11} className="text-warning flex-shrink-0" />
                                  <span className="text-[11px] text-warning font-medium">
                                    {isCatalogPeca ? 'Selecione a configuração de fabricação' : 'Configure as peças do conjunto'}
                                  </span>
                                </>
                              )}
                            </div>
                            <button type="button" onClick={() => toggleExpand(item.tempId)}
                              className={cn(
                                'flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors',
                                isConfigured
                                  ? 'text-muted-foreground hover:bg-muted/40'
                                  : 'text-warning hover:bg-warning/10'
                              )}>
                              <Settings size={11} />
                              {isConfigured ? 'Alterar' : 'Selecionar'}
                              {item.configExpanded
                                ? <ChevronUp size={10} />
                                : <ChevronDown size={10} />}
                            </button>
                          </div>
                        )}

                        {/* Inline config panel */}
                        <AnimatePresence>
                          {isCatalogItem && item.configExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3">
                                {isCatalogPeca && item.pecaId && (
                                  <PecaConfigPanel
                                    pecaId={item.pecaId}
                                    selectedCfgId={item.configuracaoFabricacaoId}
                                    onSelect={(cfgId, custo) => handlePecaConfigSelect(item.tempId, cfgId, custo)}
                                  />
                                )}
                                {isCatalogConj && item.conjuntoId && (() => {
                                  const cnj = conjuntos.find((c) => c.id === item.conjuntoId)
                                  return cnj ? (
                                    <ConjuntoConfigPanel
                                      conjunto={cnj}
                                      selecoesPorPcp={item.conjuntoSelecoes}
                                      quantidade={item.quantidade}
                                      onPcpSelect={(pcpId, cfgId) =>
                                        handleConjuntoPcpSelect(item.tempId, pcpId, cfgId)}
                                    />
                                  ) : null
                                })()}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </div>

              {/* Footer: add + total */}
              <div className="flex items-center justify-between border-t border-border bg-muted/20 px-3 py-2">
                <div className="flex items-center gap-1">
                  <button type="button" onClick={addItem}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
                    <Plus size={13} />Item manual
                  </button>
                  <span className="text-muted-foreground/40 text-xs">|</span>
                  <button type="button" onClick={() => setCatalogOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10 transition-colors">
                    <BookOpen size={13} />Do catálogo
                  </button>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground text-xs">Total orçado</span>
                  <span className="font-bold text-foreground tabular-nums">{fmtBRL(totalOrcado)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          {(totalCusto > 0 || totalOrcado > 0) && (
            <SummaryPanel totalCusto={totalCusto} totalOrcado={totalOrcado} />
          )}

          {/* Blocking warnings */}
          <AnimatePresence>
            {bloqueios.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 px-3 py-2.5">
                <AlertCircle size={13} className="mt-0.5 flex-shrink-0 text-warning" />
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold text-warning mb-1">
                    Configurações obrigatórias pendentes:
                  </p>
                  {bloqueios.map((b) => (
                    <p key={b} className="text-[11px] text-warning">· {b}</p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Validation errors */}
          <AnimatePresence>
            {errors.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5">
                <AlertCircle size={13} className="mt-0.5 flex-shrink-0 text-destructive" />
                <div className="space-y-0.5">
                  {errors.map((e) => (
                    <p key={e} className="text-[11px] text-destructive">{e}</p>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </DialogBody>

        {/* ── Footer ── */}
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={handleClose}>Cancelar</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!canCreate}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 min-w-[160px]">
            <FileText size={13} />
            Criar Orçamento
            {totalOrcado > 0 && (
              <span className="ml-1 rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                {fmtBRL(totalOrcado)}
              </span>
            )}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>

    <CatalogSelectorModal
      open={catalogOpen}
      onOpenChange={setCatalogOpen}
      onSelect={handleCatalogSelect}
    />
    </>
  )
}
