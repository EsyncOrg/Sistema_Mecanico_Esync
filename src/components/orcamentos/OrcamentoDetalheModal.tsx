'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Send, ThumbsUp, ThumbsDown, XCircle, RotateCcw,
  Plus, Trash2, CheckCircle2, AlertCircle, Pencil,
  Package, History, GitBranch, Save, X, FileDown, BookOpen, Factory,
  Layers, Calculator, Settings,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'

import { cn }     from '@/lib/utils'
import { toast }  from '@/lib/toast'
import { useAuth }               from '@/contexts/AuthContext'
import { useOrcamentos }         from '@/contexts/OrcamentosContext'
import { useConjuntos }          from '@/contexts/ConjuntosContext'
import { useOrcamentoConfiguracoes } from '@/contexts/OrcamentoConfiguracoesContext'
import { CatalogSelectorModal }          from '@/components/orcamentos/CatalogSelectorModal'
import { ConversaoProducaoModal }        from '@/components/orcamentos/ConversaoProducaoModal'
import { ConjuntoMaterialSelectorModal } from '@/components/orcamentos/ConjuntoMaterialSelectorModal'
import { PecaConfiguracaoSelectorModal } from '@/components/orcamentos/PecaConfiguracaoSelectorModal'
import { mockPecas }                     from '@/mocks/pecas'
import { gerarPdfOrcamento }         from '@/lib/orcamentos/gerarPdfOrcamento'
import type {
  Orcamento,
  OrcamentoItem,
  StatusOrcamento,
  TipoItemOrcamento,
  CatalogSelection,
} from '@/types/orcamentos'

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function revisionLabel(n: number): string {
  const base = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (n < 26) return `Rev. ${base[n]}`
  return `Rev. ${base[Math.floor(n / 26) - 1]}${base[n % 26]}`
}

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function formatDateTime(d: Date) {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDate(d: Date | undefined) {
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const UNIDADES = ['un', 'h', 'kg', 'm', 'm²', 'm³', 'serv.', 'conj.', 'vb', 'l', 'pc']

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<StatusOrcamento, {
  label: string; color: string; bg: string; border: string; dot: string
}> = {
  em_elaboracao: { label: 'Em Elaboração', color: 'text-muted-foreground', bg: 'bg-muted/60',       border: 'border-border',         dot: 'bg-muted-foreground'     },
  enviado:       { label: 'Enviado',        color: 'text-primary',          bg: 'bg-primary/10',     border: 'border-primary/30',     dot: 'bg-primary'              },
  aprovado:      { label: 'Aprovado',       color: 'text-success',          bg: 'bg-success/10',     border: 'border-success/30',     dot: 'bg-success'              },
  reprovado:     { label: 'Reprovado',      color: 'text-destructive',      bg: 'bg-destructive/10', border: 'border-destructive/30', dot: 'bg-destructive'          },
  cancelado:     { label: 'Cancelado',      color: 'text-muted-foreground', bg: 'bg-muted/40',       border: 'border-border',         dot: 'bg-muted-foreground/50'  },
}

const HIST_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  criacao:      FileText,
  edicao:       Pencil,
  envio:        Send,
  aprovacao:    ThumbsUp,
  reprovacao:   ThumbsDown,
  cancelamento: XCircle,
  revisao:      GitBranch,
  comentario:   AlertCircle,
  conversao:    Factory,
}

const HIST_COLOR: Record<string, string> = {
  criacao:      'text-muted-foreground',
  edicao:       'text-accent',
  envio:        'text-primary',
  aprovacao:    'text-success',
  reprovacao:   'text-destructive',
  cancelamento: 'text-muted-foreground',
  revisao:      'text-warning',
  comentario:   'text-accent',
  conversao:    'text-primary',
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type TabId = 'itens' | 'historico' | 'revisoes'

// ─── Item draft (for editing) ─────────────────────────────────────────────────

interface ItemDraft {
  tempId:        string
  originalId?:   string
  codigo:        string
  descricao:     string
  quantidade:    number
  unidade:       string
  valorUnitario: number
  tipo:          TipoItemOrcamento
  pecaId?:       string
  conjuntoId?:   string
}

function itemToOrcamentoItem(d: ItemDraft, posicao: number): Omit<OrcamentoItem, 'id' | 'orcamentoId' | 'valorTotal'> & { id?: string } {
  return {
    id:            d.originalId,
    tipo:          d.tipo,
    pecaId:        d.pecaId,
    conjuntoId:    d.conjuntoId,
    codigo:        d.codigo.trim() || undefined,
    descricao:     d.descricao.trim(),
    unidade:       d.unidade,
    quantidade:    d.quantidade,
    valorUnitario: d.valorUnitario,
    posicao,
    observacoes:   undefined,
  }
}

function orcamentoItemToDraft(item: OrcamentoItem): ItemDraft {
  return {
    tempId:        item.id,
    originalId:    item.id,
    codigo:        item.codigo ?? '',
    descricao:     item.descricao,
    quantidade:    item.quantidade,
    unidade:       item.unidade,
    valorUnitario: item.valorUnitario,
    tipo:          item.tipo,
    pecaId:        item.pecaId,
    conjuntoId:    item.conjuntoId,
  }
}

function blankDraft(): ItemDraft {
  return {
    tempId:        Math.random().toString(36).slice(2),
    codigo:        '',
    descricao:     '',
    quantidade:    1,
    unidade:       'un',
    valorUnitario: 0,
    tipo:          'outro',
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
  }
}

// ─── Status Pill ─────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: StatusOrcamento }) {
  const cfg = STATUS_CFG[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold border', cfg.bg, cfg.color, cfg.border)}>
      <span className={cn('h-1.5 w-1.5 flex-shrink-0 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

// ─── Items Tab ────────────────────────────────────────────────────────────────

interface ItemsTabProps {
  orcamento:   Orcamento
  editMode:    boolean
  drafts:      ItemDraft[]
  onDraftChange: (drafts: ItemDraft[]) => void
}

function ItemsTab({ orcamento, editMode, drafts, onDraftChange }: ItemsTabProps) {
  const [catalogOpen,       setCatalogOpen]       = useState(false)
  const [selectorOpen,      setSelectorOpen]      = useState(false)
  const [selectorItem,      setSelectorItem]      = useState<OrcamentoItem | null>(null)
  const [pecaSelectorOpen,  setPecaSelectorOpen]  = useState(false)
  const [pecaSelectorItem,  setPecaSelectorItem]  = useState<OrcamentoItem | null>(null)

  const { conjuntos }                            = useConjuntos()
  const { getBreakdown, getPecaItemSelecao }     = useOrcamentoConfiguracoes()

  const total = useMemo(
    () => editMode
      ? drafts.reduce((s, d) => s + d.quantidade * d.valorUnitario, 0)
      : orcamento.valorTotal,
    [editMode, drafts, orcamento.valorTotal]
  )

  const addDraft = () => onDraftChange([...drafts, blankDraft()])
  const removeDraft = (tempId: string) => onDraftChange(drafts.filter((d) => d.tempId !== tempId))
  const updateDraft = <K extends keyof ItemDraft>(tempId: string, key: K, val: ItemDraft[K]) =>
    onDraftChange(drafts.map((d) => d.tempId === tempId ? { ...d, [key]: val } : d))
  const handleCatalogSelect = (sel: CatalogSelection) =>
    onDraftChange([...drafts, fromCatalog(sel)])

  const items = editMode ? drafts : orcamento.itens

  return (
    <div className="space-y-3">
      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="grid grid-cols-[60px_1fr_72px_72px_100px_100px_32px] gap-px bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          <span>Código</span>
          <span>Descrição</span>
          <span className="text-center">Qtd.</span>
          <span>Unid.</span>
          <span className="text-right">Vlr. Unit.</span>
          <span className="text-right">Total</span>
          <span />
        </div>
        <div className="divide-y divide-border bg-card">
          {editMode ? (
            <AnimatePresence initial={false}>
              {drafts.map((d, idx) => (
                <motion.div
                  key={d.tempId}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-[60px_1fr_72px_72px_100px_100px_32px] gap-1 px-3 py-2 items-center"
                >
                  <input value={d.codigo} onChange={(e) => updateDraft(d.tempId, 'codigo', e.target.value)}
                    placeholder="Cód." className="h-7 w-full rounded border border-border bg-muted/40 px-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
                  <input value={d.descricao} onChange={(e) => updateDraft(d.tempId, 'descricao', e.target.value)}
                    placeholder={`Item ${idx + 1}`} className="h-7 w-full rounded border border-border bg-muted/40 px-2 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
                  <input type="number" min="0.01" step="0.01" value={d.quantidade} onChange={(e) => updateDraft(d.tempId, 'quantidade', parseFloat(e.target.value) || 0)}
                    className="h-7 w-full rounded border border-border bg-muted/40 px-2 text-center text-[11px] text-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
                  <select value={d.unidade} onChange={(e) => updateDraft(d.tempId, 'unidade', e.target.value)}
                    className="h-7 w-full rounded border border-border bg-muted/40 px-1 text-[11px] text-foreground focus:outline-none focus:border-ring">
                    {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                  <input type="number" min="0" step="0.01" value={d.valorUnitario} onChange={(e) => updateDraft(d.tempId, 'valorUnitario', parseFloat(e.target.value) || 0)}
                    className="h-7 w-full rounded border border-border bg-muted/40 px-2 text-right text-[11px] text-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
                  <p className="text-right text-[11px] font-semibold tabular-nums text-foreground">{formatBRL(d.quantidade * d.valorUnitario)}</p>
                  <button type="button" onClick={() => removeDraft(d.tempId)} disabled={drafts.length === 1}
                    className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <Trash2 size={12} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          ) : (
            items.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">Nenhum item cadastrado.</p>
            ) : (
              (items as OrcamentoItem[]).map((item) => {
                const breakdown     = item.tipo === 'conjunto' ? getBreakdown(item.id) : undefined
                const pecaSelecao   = item.tipo === 'peca' && item.pecaId
                  ? getPecaItemSelecao(item.id)
                  : undefined
                const catalogPeca   = item.tipo === 'peca' && item.pecaId
                  ? mockPecas.find((p) => p.id === item.pecaId)
                  : undefined

                return (
                  <div key={item.id}>
                    <div className="grid grid-cols-[60px_1fr_72px_72px_100px_100px_32px] gap-1 px-3 py-2.5 items-center text-sm">
                      <span className="font-mono text-[11px] text-muted-foreground">{item.codigo || '—'}</span>
                      <div className="min-w-0">
                        <span className="text-[12px] text-foreground">{item.descricao}</span>
                        {item.tipo === 'conjunto' && (
                          <span className="ml-1.5 inline-flex h-4 items-center rounded px-1.5 text-[9px] font-semibold bg-accent/10 text-accent">
                            conjunto
                          </span>
                        )}
                        {item.tipo === 'peca' && item.pecaId && (
                          <span className="ml-1.5 inline-flex h-4 items-center rounded px-1.5 text-[9px] font-semibold bg-primary/10 text-primary">
                            peça
                          </span>
                        )}
                      </div>
                      <span className="text-center text-[12px] tabular-nums text-foreground">{item.quantidade}</span>
                      <span className="text-[11px] text-muted-foreground">{item.unidade}</span>
                      <span className="text-right text-[11px] tabular-nums text-muted-foreground">{formatBRL(item.valorUnitario)}</span>
                      <span className="text-right text-[12px] font-semibold tabular-nums text-foreground">{formatBRL(item.valorTotal)}</span>
                      <span />
                    </div>

                    {/* Phase 7: assembly config row */}
                    {item.tipo === 'conjunto' && (
                      <div className="mx-3 mb-2 flex items-center justify-between rounded-lg bg-muted/30 border border-border/60 px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          {breakdown && breakdown.custoTotal > 0 ? (
                            <>
                              <Calculator size={11} className="text-success flex-shrink-0" />
                              <span className="text-[11px] text-success font-semibold tabular-nums">
                                Custo calculado: {formatBRL(breakdown.custoTotal)}
                              </span>
                              {!breakdown.calculadoComSucesso && (
                                <span className="text-[10px] text-warning">
                                  ({breakdown.pecasSemSelecao} peça(s) sem configuração)
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <Layers size={11} className="text-muted-foreground flex-shrink-0" />
                              <span className="text-[11px] text-muted-foreground">
                                Selecione configurações para calcular custo
                              </span>
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSelectorItem(item); setSelectorOpen(true) }}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Layers size={11} />
                          {breakdown?.custoTotal ? 'Alterar Configurações' : 'Selecionar Configurações'}
                        </button>
                      </div>
                    )}

                    {/* Phase 7.1: peca config row */}
                    {item.tipo === 'peca' && catalogPeca && (
                      <div className="mx-3 mb-2 flex items-center justify-between rounded-lg bg-muted/30 border border-border/60 px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          {pecaSelecao ? (
                            <>
                              <Calculator size={11} className="text-success flex-shrink-0" />
                              <span className="text-[11px] text-success font-semibold">
                                {pecaSelecao.configuracaoFabricacaoId}
                              </span>
                              {pecaSelecao.custoUnitario > 0 && (
                                <span className="text-[11px] text-muted-foreground tabular-nums">
                                  · {formatBRL(pecaSelecao.custoUnitario)}/un
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <AlertCircle size={11} className="text-warning flex-shrink-0" />
                              <span className="text-[11px] text-warning">
                                Configuração de fabricação obrigatória
                              </span>
                            </>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => { setPecaSelectorItem(item); setPecaSelectorOpen(true) }}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Settings size={11} />
                          {pecaSelecao ? 'Alterar' : 'Selecionar'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border bg-muted/20 px-3 py-2">
          {editMode ? (
            <div className="flex items-center gap-1">
              <button type="button" onClick={addDraft}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors">
                <Plus size={13} />Item manual
              </button>
              <span className="text-muted-foreground/40 text-xs">|</span>
              <button type="button" onClick={() => setCatalogOpen(true)}
                className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10 transition-colors">
                <BookOpen size={13} />Do catálogo
              </button>
            </div>
          ) : <span />}
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Total geral</span>
            <span className="font-bold text-foreground tabular-nums">{formatBRL(total)}</span>
          </div>
        </div>
      </div>
      <CatalogSelectorModal
        open={catalogOpen}
        onOpenChange={setCatalogOpen}
        onSelect={handleCatalogSelect}
      />

      {/* Phase 7: Assembly material selector */}
      {selectorItem && selectorItem.conjuntoId && (() => {
        const cnj = conjuntos.find((c) => c.id === selectorItem.conjuntoId)
        return cnj ? (
          <ConjuntoMaterialSelectorModal
            open={selectorOpen}
            onOpenChange={(v) => { setSelectorOpen(v); if (!v) setSelectorItem(null) }}
            orcamentoId={orcamento.id}
            orcamentoItem={selectorItem}
            conjunto={cnj}
          />
        ) : null
      })()}

      {/* Phase 7.1: per-peca configuration selector */}
      {pecaSelectorItem && pecaSelectorItem.pecaId && (() => {
        const p = mockPecas.find((pc) => pc.id === pecaSelectorItem.pecaId)
        return p ? (
          <PecaConfiguracaoSelectorModal
            open={pecaSelectorOpen}
            onOpenChange={(v) => { setPecaSelectorOpen(v); if (!v) setPecaSelectorItem(null) }}
            orcamentoId={orcamento.id}
            orcamentoItem={pecaSelectorItem}
            peca={p}
          />
        ) : null
      })()}
    </div>
  )
}

// ─── History Tab ──────────────────────────────────────────────────────────────

function HistoryTab({ orcamento }: { orcamento: Orcamento }) {
  const sorted = useMemo(
    () => [...orcamento.historico].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    [orcamento.historico]
  )
  return (
    <div className="space-y-1">
      {sorted.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">Nenhum evento registrado.</p>
      )}
      {sorted.map((h, i) => {
        const Icon  = HIST_ICON[h.tipo]  ?? FileText
        const color = HIST_COLOR[h.tipo] ?? 'text-muted-foreground'
        return (
          <motion.div
            key={h.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/30 transition-colors"
          >
            <div className={cn('mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted', color)}>
              <Icon size={12} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground leading-snug">{h.descricao}</p>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                <span>{h.usuario}</span>
                <span>·</span>
                <span>{formatDateTime(h.timestamp)}</span>
              </div>
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── Revisoes Tab ─────────────────────────────────────────────────────────────

function RevisoesTab({ orcamento }: { orcamento: Orcamento }) {
  return (
    <div className="space-y-2">
      {/* Current */}
      <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 font-mono text-sm font-bold text-primary">
          {revisionLabel(orcamento.revisaoAtual).replace('Rev. ', '')}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{revisionLabel(orcamento.revisaoAtual)} — Atual</p>
          <p className="text-[11px] text-muted-foreground">{formatDate(orcamento.atualizadoEm)} · {orcamento.responsavel}</p>
        </div>
      </div>

      {/* Past revisions */}
      {[...orcamento.revisoes].reverse().map((rev) => (
        <div key={rev.id} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-muted font-mono text-sm font-bold text-muted-foreground">
            {String.fromCharCode(64 + rev.numero)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">Rev. {String.fromCharCode(64 + rev.numero)}</p>
              <p className="text-[11px] text-muted-foreground whitespace-nowrap">{formatDate(rev.criadoEm)}</p>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{rev.motivo}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {rev.snapshot.itens.length} item{rev.snapshot.itens.length !== 1 ? 's' : ''} · {formatBRL(rev.snapshot.valorTotal)}
            </p>
          </div>
        </div>
      ))}

      {orcamento.revisoes.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-muted/20 py-6 text-center text-xs text-muted-foreground">
          Nenhuma revisão registrada. Revisões são criadas ao editar um orçamento enviado ou aprovado.
        </p>
      )}
    </div>
  )
}

// ─── Status Action Bar ────────────────────────────────────────────────────────

interface ActionBarProps {
  orcamento:        Orcamento
  canEdit:          boolean
  /** Phase 7.1: number of items missing required configuration selection */
  itensPendentes:   number
  onEnviar:         () => void
  onAprovar:        () => void
  onReprovar:       (motivo: string) => void
  onCancelar:       (motivo: string) => void
  onReabrir:        () => void
}

function ActionBar({ orcamento, canEdit, itensPendentes, onEnviar, onAprovar, onReprovar, onCancelar, onReabrir }: ActionBarProps) {
  const [confirming, setConfirming] = useState<'reprovar' | 'cancelar' | null>(null)
  const [motivo, setMotivo]         = useState('')

  function handleConfirm() {
    if (!motivo.trim()) { toast('error', 'Informe o motivo'); return }
    if (confirming === 'reprovar') onReprovar(motivo)
    if (confirming === 'cancelar') onCancelar(motivo)
    setConfirming(null)
    setMotivo('')
  }

  if (!canEdit) return null

  const { status } = orcamento

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ações do Orçamento</p>

      <div className="flex flex-wrap gap-2">
        {itensPendentes > 0 && (status === 'em_elaboracao' || status === 'enviado') && (
          <div className="flex items-center gap-2 w-full rounded-lg border border-warning/30 bg-warning/8 px-3 py-2 text-xs text-warning">
            <AlertCircle size={13} className="flex-shrink-0" />
            <span>
              {itensPendentes} item{itensPendentes > 1 ? 's' : ''} sem configuração de fabricação — selecione antes de enviar ou aprovar.
            </span>
          </div>
        )}

        {status === 'em_elaboracao' && (
          <>
            <Button size="sm" className="gap-1.5 h-8 text-xs" disabled={itensPendentes > 0} onClick={onEnviar}>
              <Send size={12} /> Enviar ao Cliente
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive"
              onClick={() => { setConfirming('cancelar'); setMotivo('') }}>
              <XCircle size={12} /> Cancelar
            </Button>
          </>
        )}
        {status === 'enviado' && (
          <>
            <Button size="sm" className="gap-1.5 h-8 text-xs bg-success hover:bg-success/90 text-white" disabled={itensPendentes > 0} onClick={onAprovar}>
              <ThumbsUp size={12} /> Aprovar
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
              onClick={() => { setConfirming('reprovar'); setMotivo('') }}>
              <ThumbsDown size={12} /> Reprovar
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs text-destructive hover:text-destructive"
              onClick={() => { setConfirming('cancelar'); setMotivo('') }}>
              <XCircle size={12} /> Cancelar
            </Button>
          </>
        )}
        {(status === 'aprovado' || status === 'reprovado' || status === 'cancelado') && (
          <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={onReabrir}>
            <RotateCcw size={12} /> Reabrir
          </Button>
        )}
      </div>

      {/* Inline confirm */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-xs font-semibold text-destructive">
                Motivo {confirming === 'reprovar' ? 'da reprovação' : 'do cancelamento'} <span className="text-destructive">*</span>
              </p>
              <div className="flex gap-2">
                <Input
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Descreva o motivo..."
                  className="h-8 text-xs flex-1"
                  autoFocus
                />
                <Button size="sm" variant="destructive" className="h-8 text-xs gap-1" onClick={handleConfirm}>
                  <CheckCircle2 size={12} /> Confirmar
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setConfirming(null)}>
                  <X size={12} />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Revision Modal (inline confirm) ──────────────────────────────────────────

interface RevisionBarProps {
  orcamento: Orcamento
  canEdit:   boolean
  onCriar:   (motivo: string) => void
}

function RevisionBar({ orcamento, canEdit, onCriar }: RevisionBarProps) {
  const [open, setOpen]   = useState(false)
  const [motivo, setMotivo] = useState('')

  const canCreate = canEdit && (orcamento.status === 'enviado' || orcamento.status === 'aprovado')
  if (!canCreate) return null

  function handle() {
    if (!motivo.trim()) { toast('error', 'Informe o motivo da revisão'); return }
    onCriar(motivo)
    setOpen(false)
    setMotivo('')
  }

  return (
    <div className="rounded-xl border border-dashed border-warning/40 bg-warning/5 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch size={13} className="text-warning" />
          <p className="text-xs font-semibold text-foreground">
            Criar Revisão — {revisionLabel(orcamento.revisaoAtual + 1)}
          </p>
        </div>
        {!open && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setOpen(true)}>
            <Plus size={11} /> Nova Revisão
          </Button>
        )}
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex gap-2">
              <Input value={motivo} onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo da revisão..." className="h-8 text-xs flex-1" autoFocus />
              <Button size="sm" className="h-8 text-xs gap-1" onClick={handle}>
                <Save size={12} /> Criar
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setOpen(false)}>
                <X size={12} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface OrcamentoDetalheModalProps {
  open:         boolean
  onOpenChange: (v: boolean) => void
  orcamento:    Orcamento | null
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OrcamentoDetalheModal({ open, onOpenChange, orcamento }: OrcamentoDetalheModalProps) {
  const { canEdit }                                 = useAuth()
  const { atualizarOrcamento, enviarOrcamento, aprovarOrcamento,
          reprovarOrcamento, cancelarOrcamento, reabrirOrcamento,
          criarRevisao }                            = useOrcamentos()
  const { itensSemConfiguracao }                   = useOrcamentoConfiguracoes()

  const userCanEdit    = canEdit('orcamentos')

  const [activeTab,      setActiveTab]      = useState<TabId>('itens')
  const [editMode,       setEditMode]       = useState(false)
  const [drafts,         setDrafts]         = useState<ItemDraft[]>([])
  const [conversaoOpen,  setConversaoOpen]  = useState(false)

  // Sync drafts when orcamento changes or edit mode opens
  const startEdit = useCallback(() => {
    if (!orcamento) return
    setDrafts(orcamento.itens.map(orcamentoItemToDraft))
    setEditMode(true)
  }, [orcamento])

  const cancelEdit = useCallback(() => {
    setEditMode(false)
    setDrafts([])
  }, [])

  const saveEdit = useCallback(() => {
    if (!orcamento) return
    if (drafts.some((d) => !d.descricao.trim())) {
      toast('error', 'Todos os itens precisam de descrição')
      return
    }
    const newItens = drafts.map((d, idx) => {
      const base = itemToOrcamentoItem(d, idx + 1)
      return {
        id:            d.originalId ?? Math.random().toString(36).slice(2),
        orcamentoId:   orcamento.id,
        tipo:          base.tipo,
        codigo:        base.codigo,
        descricao:     base.descricao,
        unidade:       base.unidade,
        quantidade:    base.quantidade,
        valorUnitario: base.valorUnitario,
        valorTotal:    base.quantidade * base.valorUnitario,
        posicao:       base.posicao,
      }
    })
    atualizarOrcamento(orcamento.id, { itens: newItens })
    toast('success', 'Itens atualizados')
    setEditMode(false)
    setDrafts([])
  }, [orcamento, drafts, atualizarOrcamento])

  // Status handlers
  const handleEnviar  = () => { if (!orcamento) return; enviarOrcamento(orcamento.id);  toast('success', 'Orçamento enviado ao cliente') }
  const handleAprovar = () => { if (!orcamento) return; aprovarOrcamento(orcamento.id); toast('success', 'Orçamento aprovado') }
  const handleReprovar = (motivo: string) => { if (!orcamento) return; reprovarOrcamento(orcamento.id, motivo); toast('warning', 'Orçamento reprovado') }
  const handleCancelar = (motivo: string) => { if (!orcamento) return; cancelarOrcamento(orcamento.id, motivo); toast('warning', 'Orçamento cancelado') }
  const handleReabrir  = () => { if (!orcamento) return; reabrirOrcamento(orcamento.id); toast('success', 'Orçamento reaberto para elaboração') }
  const handleCriarRevisao = (motivo: string) => { if (!orcamento) return; criarRevisao(orcamento.id, motivo); toast('success', `Revisão criada: ${motivo}`) }

  if (!orcamento) return null

  const TABS: { id: TabId; label: string; icon: React.ComponentType<{size?:number}> }[] = [
    { id: 'itens',    label: `Itens (${orcamento.itens.length})`, icon: Package  },
    { id: 'historico',label: `Histórico (${orcamento.historico.length})`, icon: History },
    { id: 'revisoes', label: `Revisões (${orcamento.revisoes.length})`,   icon: GitBranch },
  ]

  return (
    <>
    <Dialog open={open} onOpenChange={(v) => { if (!v) cancelEdit(); onOpenChange(v) }}>
      <DialogContent size="xl">

        {/* ── Header ── */}
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-base font-bold text-accent">{orcamento.numero}</span>
                <StatusPill status={orcamento.status} />
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-bold text-muted-foreground">
                  {revisionLabel(orcamento.revisaoAtual)}
                </span>
              </div>
              <DialogTitle className="mt-1 text-base">{orcamento.titulo}</DialogTitle>
              <DialogDescription className="mt-0.5 flex flex-wrap items-center gap-2 text-xs">
                <span>{orcamento.cliente.nome}</span>
                {orcamento.cliente.contatoPrincipal && <><span>·</span><span>{orcamento.cliente.contatoPrincipal}</span></>}
                <span>·</span>
                <span>Validade: {formatDate(orcamento.validadeAte)}</span>
                <span>·</span>
                <span>Responsável: {orcamento.responsavel}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* ── Body ── */}
        <DialogBody className="space-y-4 py-4">

          {/* Status action bar */}
          <ActionBar
            orcamento={orcamento}
            canEdit={userCanEdit}
            itensPendentes={itensSemConfiguracao(orcamento.itens).length}
            onEnviar={handleEnviar}
            onAprovar={handleAprovar}
            onReprovar={handleReprovar}
            onCancelar={handleCancelar}
            onReabrir={handleReabrir}
          />

          {/* Revision bar */}
          <RevisionBar orcamento={orcamento} canEdit={userCanEdit} onCriar={handleCriarRevisao} />

          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-1">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150',
                  activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}>
                <tab.icon size={13} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab === 'itens'     && <ItemsTab orcamento={orcamento} editMode={editMode} drafts={drafts} onDraftChange={setDrafts} />}
              {activeTab === 'historico' && <HistoryTab orcamento={orcamento} />}
              {activeTab === 'revisoes'  && <RevisoesTab orcamento={orcamento} />}
            </motion.div>
          </AnimatePresence>

        </DialogBody>

        {/* ── Footer ── */}
        <DialogFooter>
          {activeTab === 'itens' && userCanEdit && orcamento.status === 'em_elaboracao' && (
            editMode ? (
              <>
                <Button variant="outline" size="sm" onClick={cancelEdit} className="gap-1.5">
                  <X size={13} /> Cancelar
                </Button>
                <Button size="sm" onClick={saveEdit} className="gap-1.5">
                  <Save size={13} /> Salvar Itens
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={startEdit} className="gap-1.5">
                <Pencil size={13} /> Editar Itens
              </Button>
            )
          )}
          {/* Phase 4: Converter para Produção — visible only for approved quotes */}
          {orcamento.status === 'aprovado' && userCanEdit && (
            <Button
              size="sm"
              variant={orcamento.convertidoParaProducao ? 'outline' : 'default'}
              className={cn(
                'gap-1.5',
                orcamento.convertidoParaProducao
                  ? 'border-success/40 text-success hover:bg-success/5'
                  : ''
              )}
              onClick={() => setConversaoOpen(true)}
            >
              <Factory size={13} />
              {orcamento.convertidoParaProducao ? 'Ver Conversão' : 'Converter para Produção'}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-primary border-primary/30 hover:bg-primary/5"
            onClick={() => gerarPdfOrcamento(orcamento)}
          >
            <FileDown size={13} /> Gerar PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>

    {/* Phase 4: Conversion confirmation modal */}
    <ConversaoProducaoModal
      open={conversaoOpen}
      onOpenChange={setConversaoOpen}
      orcamento={orcamento}
    />
    </>
  )
}
