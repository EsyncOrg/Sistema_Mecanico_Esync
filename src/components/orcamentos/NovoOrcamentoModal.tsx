'use client'

import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Plus, Trash2, AlertCircle, BookOpen,
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
import { useOrcamentos }      from '@/contexts/OrcamentosContext'
import { CatalogSelectorModal } from '@/components/orcamentos/CatalogSelectorModal'
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
}

function calcTotal(item: ItemDraft): number {
  return item.quantidade * item.valorUnitario
}

function blankItem(): ItemDraft {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface NovoOrcamentoModalProps {
  open:         boolean
  onOpenChange: (v: boolean) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NovoOrcamentoModal({ open, onOpenChange }: NovoOrcamentoModalProps) {
  const { criarOrcamento, proximoNumero } = useOrcamentos()

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

  // ── Items + catalog ──────────────────────────────────────────────────────────
  const [items,       setItems]       = useState<ItemDraft[]>([blankItem()])
  const [catalogOpen, setCatalogOpen] = useState(false)

  // ── Derived ──────────────────────────────────────────────────────────────────
  const totalGeral = useMemo(
    () => items.reduce((s, i) => s + calcTotal(i), 0),
    [items]
  )

  const errors = useMemo(() => {
    const e: string[] = []
    if (!clienteNome.trim())   e.push('Nome do cliente é obrigatório')
    if (!titulo.trim())        e.push('Título do projeto é obrigatório')
    if (!validade)             e.push('Data de validade é obrigatória')
    if (items.some((i) => !i.descricao.trim())) e.push('Todos os itens precisam de descrição')
    return e
  }, [clienteNome, titulo, validade, items])

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

  // ── Reset ────────────────────────────────────────────────────────────────────
  function reset() {
    setClienteNome(''); setClienteContato(''); setClienteTel(''); setClienteEmail('')
    setTitulo(''); setDescricao(''); setObservacoes('')
    setPrioridade('media'); setValidade('')
    setItems([blankItem()])
  }

  function handleClose() {
    reset()
    onOpenChange(false)
  }

  function handleCatalogSelect(sel: CatalogSelection) {
    setItems((prev) => [...prev, fromCatalog(sel)])
  }

  // ── Submit ───────────────────────────────────────────────────────────────────
  function handleSubmit() {
    if (errors.length > 0) {
      toast('error', errors[0])
      return
    }

    criarOrcamento({
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

    toast('success', 'Orçamento criado', proximoNumero)
    handleClose()
  }

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
                <Input
                  placeholder="Ex: Metalúrgica XYZ Ltda"
                  value={clienteNome}
                  onChange={(e) => setClienteNome(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Contato Principal</Label>
                <Input
                  placeholder="Nome do responsável"
                  value={clienteContato}
                  onChange={(e) => setClienteContato(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Telefone</Label>
                <Input
                  placeholder="(11) 99999-9999"
                  value={clienteTel}
                  onChange={(e) => setClienteTel(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">E-mail</Label>
                <Input
                  type="email"
                  placeholder="email@empresa.com.br"
                  value={clienteEmail}
                  onChange={(e) => setClienteEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Projeto */}
          <div>
            <SectionLabel>Informações do Orçamento</SectionLabel>
            <div className="grid gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Título do Projeto <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Ex: Painéis Elétricos — Lote 02"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {/* Prioridade */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Prioridade</Label>
                  <div className="flex gap-2">
                    {PRIORIDADES.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setPrioridade(p.value)}
                        className={cn(
                          'flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-all',
                          prioridade === p.value
                            ? cn('border-current bg-muted', p.color)
                            : 'border-border text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Validade */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Data de Validade <span className="text-destructive">*</span></Label>
                  <Input
                    type="date"
                    value={validade}
                    onChange={(e) => setValidade(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Descrição</Label>
                <textarea
                  rows={2}
                  placeholder="Descreva o escopo do orçamento..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Observações</Label>
                <textarea
                  rows={2}
                  placeholder="Condições especiais, prazo, etc..."
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
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
                  {items.map((item, idx) => (
                    <motion.div
                      key={item.tempId}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="grid grid-cols-[60px_1fr_80px_80px_110px_110px_36px] gap-1 px-3 py-2 items-center"
                    >
                      {/* Código */}
                      <input
                        value={item.codigo}
                        onChange={(e) => updateItem(item.tempId, 'codigo', e.target.value)}
                        placeholder="Cód."
                        className="h-7 w-full rounded border border-border bg-muted/40 px-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                      />

                      {/* Descrição */}
                      <input
                        value={item.descricao}
                        onChange={(e) => updateItem(item.tempId, 'descricao', e.target.value)}
                        placeholder={`Item ${idx + 1} — descrição obrigatória`}
                        className="h-7 w-full rounded border border-border bg-muted/40 px-2 text-[11px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                      />

                      {/* Qtd */}
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantidade}
                        onChange={(e) => updateItem(item.tempId, 'quantidade', parseFloat(e.target.value) || 0)}
                        className="h-7 w-full rounded border border-border bg-muted/40 px-2 text-center text-[11px] text-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                      />

                      {/* Unidade */}
                      <select
                        value={item.unidade}
                        onChange={(e) => updateItem(item.tempId, 'unidade', e.target.value)}
                        className="h-7 w-full rounded border border-border bg-muted/40 px-1 text-[11px] text-foreground focus:outline-none focus:border-ring"
                      >
                        {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>

                      {/* Valor unitário */}
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.valorUnitario}
                        onChange={(e) => updateItem(item.tempId, 'valorUnitario', parseFloat(e.target.value) || 0)}
                        className="h-7 w-full rounded border border-border bg-muted/40 px-2 text-right text-[11px] text-foreground focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
                      />

                      {/* Total (computed) */}
                      <p className="text-right text-[11px] font-semibold text-foreground tabular-nums">
                        {formatBRL(calcTotal(item))}
                      </p>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => removeItem(item.tempId)}
                        disabled={items.length === 1}
                        className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={12} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Add item + catalog + total */}
              <div className="flex items-center justify-between border-t border-border bg-muted/20 px-3 py-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Plus size={13} />
                    Item manual
                  </button>
                  <span className="text-muted-foreground/40 text-xs">|</span>
                  <button
                    type="button"
                    onClick={() => setCatalogOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
                  >
                    <BookOpen size={13} />
                    Do catálogo
                  </button>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-muted-foreground text-xs">Total geral</span>
                  <span className="font-bold text-foreground tabular-nums">{formatBRL(totalGeral)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Validation errors */}
          <AnimatePresence>
            {errors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2.5"
              >
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
          <Button variant="outline" size="sm" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={errors.length > 0}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <FileText size={13} />
            Criar Orçamento
            {totalGeral > 0 && (
              <span className="ml-1 rounded bg-primary-foreground/20 px-1.5 py-0.5 text-[10px] font-bold tabular-nums">
                {formatBRL(totalGeral)}
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
