'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Search, Package, Boxes, Check, ChevronRight,
  SlidersHorizontal,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogBody,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { cn }     from '@/lib/utils'
import { mockPecas }     from '@/mocks/pecas'
import { mockConjuntos } from '@/mocks/conjuntos'
import type { CatalogSelection } from '@/types/orcamentos'

// ─── Types ────────────────────────────────────────────────────────────────────

type CatalogTab = 'pecas' | 'conjuntos'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function highlight(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-primary/20 text-primary not-italic">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CatalogSelectorModalProps {
  open:         boolean
  onOpenChange: (v: boolean) => void
  onSelect:     (item: CatalogSelection) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CatalogSelectorModal({ open, onOpenChange, onSelect }: CatalogSelectorModalProps) {
  const [tab,         setTab]         = useState<CatalogTab>('pecas')
  const [search,      setSearch]      = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [selected,    setSelected]    = useState<string | null>(null)

  function handleClose() {
    setSearch('')
    setGroupFilter('')
    setSelected(null)
    onOpenChange(false)
  }

  // ── Peças data ───────────────────────────────────────────────────────────────

  const pecaGroups = useMemo(() => [...new Set(mockPecas.map((p) => p.grupo))].sort(), [])

  const filteredPecas = useMemo(() => {
    const q = search.toLowerCase()
    return mockPecas.filter((p) => {
      if (groupFilter && p.grupo !== groupFilter) return false
      if (!q) return true
      return (
        p.codigo.toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q) ||
        p.grupo.toLowerCase().includes(q) ||
        p.familia.toLowerCase().includes(q)
      )
    })
  }, [search, groupFilter])

  // ── Conjuntos data ───────────────────────────────────────────────────────────

  const conjuntoCategories = useMemo(
    () => [...new Set(mockConjuntos.map((c) => c.categoria))].sort(),
    []
  )

  const filteredConjuntos = useMemo(() => {
    const q = search.toLowerCase()
    return mockConjuntos.filter((c) => {
      if (groupFilter && c.categoria !== groupFilter) return false
      if (!q) return true
      return (
        c.codigo.toLowerCase().includes(q) ||
        c.nome.toLowerCase().includes(q) ||
        c.categoria.toLowerCase().includes(q) ||
        c.cliente.toLowerCase().includes(q)
      )
    })
  }, [search, groupFilter])

  // ── Selection handlers ───────────────────────────────────────────────────────

  function selectPeca(id: string) {
    const peca = mockPecas.find((p) => p.id === id)
    if (!peca) return
    onSelect({
      tipo:      'peca',
      pecaId:    peca.id,
      codigo:    peca.codigo,
      descricao: peca.descricao,
      unidade:   'un',
      peso:      peca.peso,
      grupo:     peca.grupo,
      familia:   peca.familia,
    })
    handleClose()
  }

  function selectConjunto(id: string) {
    const conj = mockConjuntos.find((c) => c.id === id)
    if (!conj) return
    const pesoTotal = conj.pecas.reduce((s, p) => s + p.pesoEstimado * p.quantidade, 0)
    onSelect({
      tipo:       'conjunto',
      conjuntoId: conj.id,
      codigo:     conj.codigo,
      descricao:  conj.nome,
      unidade:    'conj.',
      peso:       pesoTotal > 0 ? pesoTotal : undefined,
      categoria:  conj.categoria,
    })
    handleClose()
  }

  // ── Reset group filter when switching tabs ────────────────────────────────────

  function switchTab(t: CatalogTab) {
    setTab(t)
    setGroupFilter('')
    setSelected(null)
  }

  const TABS = [
    { id: 'pecas'    as CatalogTab, label: 'Peças',    icon: Package, count: filteredPecas.length    },
    { id: 'conjuntos'as CatalogTab, label: 'Conjuntos', icon: Boxes,   count: filteredConjuntos.length },
  ]

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="xl">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-accent/10">
              <Boxes size={16} className="text-accent" />
            </div>
            <div>
              <DialogTitle>Selecionar do Catálogo</DialogTitle>
              <DialogDescription>
                Escolha uma peça ou conjunto do ERP para adicionar ao orçamento.
                O preço unitário deverá ser preenchido manualmente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="pb-4 space-y-3">

          {/* Search + filter row */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por código, descrição ou categoria..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={13} className="text-muted-foreground flex-shrink-0" />
              <select
                className="h-9 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:border-ring min-w-[140px]"
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
              >
                <option value="">
                  {tab === 'pecas' ? 'Todos os grupos' : 'Todas as categorias'}
                </option>
                {(tab === 'pecas' ? pecaGroups : conjuntoCategories).map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-150',
                  tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <t.icon size={13} />
                {t.label}
                <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                  tab === t.id ? 'bg-primary/10 text-primary' : 'bg-muted/60 text-muted-foreground')}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Results */}
          <div className="rounded-xl border border-border overflow-hidden">

            {/* ── Peças table ── */}
            {tab === 'pecas' && (
              <>
                <div className="grid grid-cols-[100px_1fr_100px_80px_56px_56px_80px] gap-px bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Código</span>
                  <span>Descrição</span>
                  <span>Grupo</span>
                  <span>Família</span>
                  <span className="text-right">Esp.</span>
                  <span className="text-right">Peso</span>
                  <span />
                </div>
                <div className="divide-y divide-border bg-card max-h-[360px] overflow-y-auto">
                  {filteredPecas.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Nenhuma peça encontrada com os filtros atuais.
                    </p>
                  ) : filteredPecas.map((peca, i) => (
                    <motion.div
                      key={peca.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02 }}
                      className={cn(
                        'grid grid-cols-[100px_1fr_100px_80px_56px_56px_80px] gap-1 px-3 py-2.5 items-center cursor-pointer transition-colors',
                        selected === peca.id
                          ? 'bg-primary/5 border-l-2 border-l-primary'
                          : 'hover:bg-muted/30'
                      )}
                      onClick={() => setSelected(peca.id)}
                    >
                      <span className="font-mono text-[11px] font-bold text-accent truncate">{peca.codigo}</span>
                      <span className="text-[12px] text-foreground leading-snug truncate pr-2">
                        {highlight(peca.descricao, search)}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate">{peca.grupo}</span>
                      <span className="text-[11px] text-muted-foreground truncate">{peca.familia}</span>
                      <span className="text-right text-[11px] tabular-nums text-muted-foreground">{peca.espessura}mm</span>
                      <span className="text-right text-[11px] tabular-nums text-muted-foreground">{peca.peso}kg</span>
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant={selected === peca.id ? 'default' : 'outline'}
                          className="h-7 text-[11px] gap-1 px-2"
                          onClick={(e) => { e.stopPropagation(); selectPeca(peca.id) }}
                        >
                          {selected === peca.id ? <Check size={11} /> : <ChevronRight size={11} />}
                          {selected === peca.id ? 'Selecionar' : 'Usar'}
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {/* ── Conjuntos table ── */}
            {tab === 'conjuntos' && (
              <>
                <div className="grid grid-cols-[110px_1fr_90px_72px_72px_80px] gap-px bg-muted/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span>Código</span>
                  <span>Nome</span>
                  <span>Categoria</span>
                  <span className="text-center">Peças</span>
                  <span className="text-right">Peso Est.</span>
                  <span />
                </div>
                <div className="divide-y divide-border bg-card max-h-[360px] overflow-y-auto">
                  {filteredConjuntos.length === 0 ? (
                    <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Nenhum conjunto encontrado com os filtros atuais.
                    </p>
                  ) : filteredConjuntos.map((conj, i) => {
                    const pesoTotal = conj.pecas.reduce((s, p) => s + p.pesoEstimado * p.quantidade, 0)
                    return (
                      <motion.div
                        key={conj.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className={cn(
                          'grid grid-cols-[110px_1fr_90px_72px_72px_80px] gap-1 px-3 py-2.5 items-center cursor-pointer transition-colors',
                          selected === conj.id
                            ? 'bg-primary/5 border-l-2 border-l-primary'
                            : 'hover:bg-muted/30'
                        )}
                        onClick={() => setSelected(conj.id)}
                      >
                        <span className="font-mono text-[11px] font-bold text-accent truncate">{conj.codigo}</span>
                        <div className="min-w-0 pr-2">
                          <p className="text-[12px] text-foreground truncate">{highlight(conj.nome, search)}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{conj.cliente} · {conj.revisao}</p>
                        </div>
                        <span className="text-[11px] text-muted-foreground capitalize truncate">{conj.categoria}</span>
                        <span className="text-center text-[11px] tabular-nums text-muted-foreground">{conj.pecas.length}</span>
                        <span className="text-right text-[11px] tabular-nums text-muted-foreground">
                          {pesoTotal > 0 ? `${pesoTotal.toFixed(1)}kg` : '—'}
                        </span>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant={selected === conj.id ? 'default' : 'outline'}
                            className="h-7 text-[11px] gap-1 px-2"
                            onClick={(e) => { e.stopPropagation(); selectConjunto(conj.id) }}
                          >
                            {selected === conj.id ? <Check size={11} /> : <ChevronRight size={11} />}
                            {selected === conj.id ? 'Selecionar' : 'Usar'}
                          </Button>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* Info strip */}
          <p className="text-[11px] text-muted-foreground text-center">
            O preço unitário não é importado do catálogo — deverá ser preenchido manualmente após a seleção.
          </p>

        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}
