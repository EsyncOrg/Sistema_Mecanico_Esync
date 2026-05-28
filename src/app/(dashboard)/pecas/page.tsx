'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Filter, Upload, Download, Package,
  Trash2, X, FileSpreadsheet, FileBox, FileText, ListFilter,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportModal } from '@/components/shared/ExportModal'
import { ImportModal } from '@/components/shared/ImportModal'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { ColumnFilterDropdown } from '@/components/shared/ColumnFilterDropdown'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { mockPecas } from '@/mocks'
import { formatDate } from '@/lib/utils'
import type { Peca } from '@/types'

// ─── Export config ────────────────────────────────────────────────────────────

const EXPORT_COLUMNS = [
  { key: 'codigo',          label: 'Código'             },
  { key: 'espessura',       label: 'Espessura (mm)'     },
  { key: 'descricao',       label: 'Descrição'          },
  { key: 'grupo',           label: 'Grupo'              },
  { key: 'familia',         label: 'Família'            },
  { key: 'codigoSistema',   label: 'Código do Sistema'  },
  { key: 'areaPeca',        label: 'Área Peça (mm²)'    },
  { key: 'desperdicio',     label: 'Desperdício (m²)'   },
  { key: 'percFabricacao',  label: '% Da Fabricação'    },
  { key: 'percPintura',     label: '% Da Pintura'       },
  { key: 'peso',            label: 'Peso (kg)'          },
  { key: 'cor',             label: 'COR'                },
  { key: 'arquivo3d',       label: '3D'                 },
  { key: 'planoDobra',      label: 'Plano Dobra'        },
  { key: 'atualizadoEm',    label: 'Atualizado'         },
]

// ─── Import config ────────────────────────────────────────────────────────────

const IMPORT_SYSTEM_FIELDS = [
  { key: 'codigo',          label: 'Código',            required: true  },
  { key: 'espessura',       label: 'Espessura (mm)',     required: false },
  { key: 'descricao',       label: 'Descrição',          required: false },
  { key: 'grupo',           label: 'Grupo',             required: false },
  { key: 'familia',         label: 'Família',           required: false },
  { key: 'codigoSistema',   label: 'Código do Sistema', required: false },
  { key: 'areaPeca',        label: 'Área Peça (mm²)',   required: false },
  { key: 'desperdicio',     label: 'Desperdício (m²)',  required: false },
  { key: 'percFabricacao',  label: '% Da Fabricação',   required: false },
  { key: 'percPintura',     label: '% Da Pintura',      required: false },
  { key: 'peso',            label: 'Peso (kg)',         required: false },
  { key: 'cor',             label: 'COR',               required: false },
  { key: 'arquivo3d',       label: '3D',                required: false },
  { key: 'planoDobra',      label: 'Plano Dobra',       required: false },
]

const MOCK_FILE_COLUMNS = [
  'Código', 'Espessura (mm)', 'Descrição', 'Grupo', 'Família',
  'Código do Sistema', 'Área Peça (mm²)', 'Desperdício (m²)',
  '% Da Fabricação', '% Da Pintura', 'Peso (kg)', 'COR', '3D', 'Plano Dobra',
]

const MOCK_PREVIEW_DATA = [
  {
    'Código': 'PCA-0100', 'Espessura (mm)': '12.0',
    'Descrição': 'Suporte de Fixação do Teto Protetor 700mm x 300mm p/ Quadro 700(L)x300(P)',
    'Grupo': 'Fixação', 'Família': 'Suportes', 'Código do Sistema': 'SYS-SP-100',
    'Área Peça (mm²)': '16000.00', 'Desperdício (m²)': '0.0082',
    '% Da Fabricação': '22.0', '% Da Pintura': '8.0', 'Peso (kg)': '0.80',
    'COR': 'Preto', '3D': '/models/pca0100.ipt', 'Plano Dobra': '/docs/pca0100.pdf',
  },
  {
    'Código': 'PCA-0101', 'Espessura (mm)': '3.0',
    'Descrição': 'Chapa Cortada 500x300mm',
    'Grupo': 'Conformado', 'Família': 'Chapas', 'Código do Sistema': 'SYS-CH-100',
    'Área Peça (mm²)': '150000.00', 'Desperdício (m²)': '0.0320',
    '% Da Fabricação': '6.0', '% Da Pintura': '0.0', 'Peso (kg)': '3.50',
    'COR': 'Natural', '3D': '', 'Plano Dobra': '',
  },
  {
    'Código': 'PCA-0102', 'Espessura (mm)': '8.0',
    'Descrição': 'Tampa de Proteção Fresada',
    'Grupo': 'Proteção', 'Família': 'Tampas', 'Código do Sistema': 'SYS-CV-100',
    'Área Peça (mm²)': '14400.00', 'Desperdício (m²)': '0.0048',
    '% Da Fabricação': '15.5', '% Da Pintura': '10.0', 'Peso (kg)': '0.90',
    'COR': 'Grafite', '3D': '/models/pca0102.ipt', 'Plano Dobra': '',
  },
  {
    'Código': 'PCA-0103', 'Espessura (mm)': '4.0',
    'Descrição': 'Perfil Dobrado U 80x40mm',
    'Grupo': 'Conformado', 'Família': 'Perfis', 'Código do Sistema': 'SYS-PF-100',
    'Área Peça (mm²)': '160000.00', 'Desperdício (m²)': '0.0280',
    '% Da Fabricação': '12.0', '% Da Pintura': '12.0', 'Peso (kg)': '5.20',
    'COR': 'Branco', '3D': '', 'Plano Dobra': '/docs/pca0103.pdf',
  },
  {
    'Código': 'PCA-0104', 'Espessura (mm)': '50.0',
    'Descrição': 'Eixo Torneado Ø50x300mm',
    'Grupo': 'Usinado', 'Família': 'Eixos', 'Código do Sistema': 'SYS-EX-100',
    'Área Peça (mm²)': '1963.50', 'Desperdício (m²)': '0.0015',
    '% Da Fabricação': '45.0', '% Da Pintura': '0.0', 'Peso (kg)': '4.60',
    'COR': 'Natural', '3D': '/models/pca0104.ipt', 'Plano Dobra': '',
  },
]

// Shared compact classes for the dense table
const TH = 'px-2 py-2 text-[11px] font-semibold whitespace-nowrap'
const TD = 'px-2 py-1.5 align-top'

// ─── Column filter helpers ─────────────────────────────────────────────────────

const COLUMN_DEFS = [
  { key: 'codigo',         label: 'Código'       },
  { key: 'espessura',      label: 'Esp. mm'      },
  { key: 'descricao',      label: 'Descrição'    },
  { key: 'grupo',          label: 'Grupo'        },
  { key: 'familia',        label: 'Família'      },
  { key: 'codigoSistema',  label: 'Cód. Sistema' },
  { key: 'areaPeca',       label: 'Área mm²'     },
  { key: 'desperdicio',    label: 'Desp. m²'     },
  { key: 'percFabricacao', label: '% Fab.'       },
  { key: 'percPintura',    label: '% Pint.'      },
  { key: 'peso',           label: 'Peso kg'      },
  { key: 'cor',            label: 'COR'          },
  { key: 'arquivo3d',      label: '3D'           },
  { key: 'planoDobra',     label: 'Plano'        },
  { key: 'atualizadoEm',   label: 'Atualizado'   },
]

const NUMERIC_COLS = new Set(['espessura', 'areaPeca', 'desperdicio', 'percFabricacao', 'percPintura', 'peso'])

function getPecaFilterValue(peca: Peca, key: string): string {
  switch (key) {
    case 'codigo':         return peca.codigo
    case 'espessura':      return String(peca.espessura)
    case 'descricao':      return peca.descricao
    case 'grupo':          return peca.grupo
    case 'familia':        return peca.familia
    case 'codigoSistema':  return peca.codigoSistema || '—'
    case 'areaPeca':       return peca.areaPeca.toFixed(2)
    case 'desperdicio':    return peca.desperdicio.toFixed(4)
    case 'percFabricacao': return `${peca.percFabricacao.toFixed(1)}%`
    case 'percPintura':    return `${peca.percPintura.toFixed(1)}%`
    case 'peso':           return peca.peso.toFixed(2)
    case 'cor':            return peca.cor
    case 'arquivo3d':      return peca.arquivo3d ? 'Sim' : '—'
    case 'planoDobra':     return peca.planoDobra ? 'Sim' : '—'
    case 'atualizadoEm':   return formatDate(peca.atualizadoEm)
    default:               return ''
  }
}

function sortFilterValues(vals: string[], key: string): string[] {
  if (NUMERIC_COLS.has(key)) {
    return [...vals].sort((a, b) => parseFloat(a) - parseFloat(b))
  }
  return [...vals].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterState = Record<string, Set<string>>
type OpenFilter  = { key: string; label: string; rect: DOMRect }

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PecasPage() {
  const { canEdit } = useAuth()
  const [search, setSearch] = useState('')
  const [grupoFilter, setGrupoFilter] = useState<string>('todos')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [columnFilters, setColumnFilters] = useState<FilterState>({})
  const [openFilter, setOpenFilter] = useState<OpenFilter | null>(null)

  const grupos = ['todos', ...Array.from(new Set(mockPecas.map((p) => p.grupo))).sort()]

  // ─── Filtered rows (text search + grupo chip + column filters) ───────────────

  const filtered = useMemo(() => {
    return mockPecas.filter((p) => {
      const q = search.toLowerCase()
      const matchSearch =
        p.codigo.toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q) ||
        p.grupo.toLowerCase().includes(q) ||
        p.familia.toLowerCase().includes(q) ||
        p.cor.toLowerCase().includes(q) ||
        p.codigoSistema.toLowerCase().includes(q)
      if (!matchSearch) return false
      if (grupoFilter !== 'todos' && p.grupo !== grupoFilter) return false
      for (const [key, vals] of Object.entries(columnFilters)) {
        if (vals.size === 0) continue
        if (!vals.has(getPecaFilterValue(p, key))) return false
      }
      return true
    })
  }, [search, grupoFilter, columnFilters])

  // ─── Cascading values for the open column dropdown ───────────────────────────

  const openFilterKey = openFilter?.key ?? null

  const openFilterValues = useMemo(() => {
    if (!openFilterKey) return []
    const cascade = mockPecas.filter((p) => {
      const q = search.toLowerCase()
      const matchSearch =
        p.codigo.toLowerCase().includes(q) ||
        p.descricao.toLowerCase().includes(q) ||
        p.grupo.toLowerCase().includes(q) ||
        p.familia.toLowerCase().includes(q) ||
        p.cor.toLowerCase().includes(q) ||
        p.codigoSistema.toLowerCase().includes(q)
      if (!matchSearch) return false
      if (grupoFilter !== 'todos' && p.grupo !== grupoFilter) return false
      for (const [k, vals] of Object.entries(columnFilters)) {
        if (k === openFilterKey || vals.size === 0) continue
        if (!vals.has(getPecaFilterValue(p, k))) return false
      }
      return true
    })
    const uniq = new Set(cascade.map((p) => getPecaFilterValue(p, openFilterKey)))
    return sortFilterValues(Array.from(uniq), openFilterKey)
  }, [openFilterKey, search, grupoFilter, columnFilters])

  const activeColFilterCount = useMemo(
    () => Object.values(columnFilters).filter((v) => v.size > 0).length,
    [columnFilters],
  )

  // ─── Column filter handlers ──────────────────────────────────────────────────

  function handleHeaderClick(key: string, label: string, e: React.MouseEvent<HTMLButtonElement>) {
    if (openFilter?.key === key) { setOpenFilter(null); return }
    setOpenFilter({ key, label, rect: e.currentTarget.getBoundingClientRect() })
  }

  function hasFilter(key: string) {
    return (columnFilters[key]?.size ?? 0) > 0
  }

  function handleFilterChange(key: string, vals: Set<string>) {
    setColumnFilters((prev) => ({ ...prev, [key]: vals }))
  }

  function handleClearFilter(key: string) {
    setColumnFilters((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  // ─── renderHeader ─────────────────────────────────────────────────────────────

  function renderHeader(key: string, extraClass = '') {
    const def    = COLUMN_DEFS.find((c) => c.key === key)!
    const label  = def.label
    const active = hasFilter(key)
    return (
      <TableHead className={`${TH} ${extraClass}`}>
        <button
          onClick={(e) => handleHeaderClick(key, label, e)}
          className={`group inline-flex items-center gap-1 whitespace-nowrap transition-colors ${
            active ? 'text-primary' : 'hover:text-foreground'
          }`}
        >
          {label}
          {active ? (
            <span className="inline-flex items-center rounded bg-primary/15 px-1 py-0.5 text-[9px] font-bold leading-none text-primary">
              {columnFilters[key]?.size}
            </span>
          ) : (
            <ListFilter size={8} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-40" />
          )}
        </button>
      </TableHead>
    )
  }

  // ─── Selection helpers ────────────────────────────────────────────────────────

  const totalPecas    = mockPecas.length
  const com3d         = mockPecas.filter((p) => p.arquivo3d !== '').length
  const comPlanoDobra = mockPecas.filter((p) => p.planoDobra !== '').length

  const allFilteredIds = filtered.map((p) => p.id)
  const allSelected    = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id))
  const someSelected   = allFilteredIds.some((id) => selected.has(id))

  function toggleAll() {
    if (allSelected) {
      setSelected((s) => { const n = new Set(s); allFilteredIds.forEach((id) => n.delete(id)); return n })
    } else {
      setSelected((s) => new Set([...s, ...allFilteredIds]))
    }
  }

  function toggleOne(id: string) {
    setSelected((s) => { const n = new Set(s); if (n.has(id)) { n.delete(id) } else { n.add(id) }; return n })
  }

  function clearSelection() { setSelected(new Set()) }

  // ─── Export helpers ───────────────────────────────────────────────────────────

  const toExportRow = (p: Peca): Record<string, unknown> => ({
    codigo:         p.codigo,
    espessura:      p.espessura,
    descricao:      p.descricao,
    grupo:          p.grupo,
    familia:        p.familia,
    codigoSistema:  p.codigoSistema,
    areaPeca:       p.areaPeca.toFixed(2),
    desperdicio:    p.desperdicio.toFixed(4),
    percFabricacao: `${p.percFabricacao}%`,
    percPintura:    `${p.percPintura}%`,
    peso:           p.peso,
    cor:            p.cor,
    arquivo3d:      p.arquivo3d,
    planoDobra:     p.planoDobra,
    atualizadoEm:   formatDate(p.atualizadoEm),
  })

  const allExport      = mockPecas.map(toExportRow)
  const filteredExport = filtered.map(toExportRow)
  const selectedExport = mockPecas.filter((p) => selected.has(p.id)).map(toExportRow)

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <PermissionGate module="pecas">
    <div>
      <PageHeader
        title="Peças"
        subtitle={`${totalPecas} peças cadastradas · ${com3d} com modelo 3D · ${comPlanoDobra} com plano de dobra`}
        breadcrumbs={[{ label: 'Esync', href: '/dashboard' }, { label: 'Peças' }]}
        actions={
          canEdit('pecas') ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload size={14} /> Importar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
                <Download size={14} /> Exportar
              </Button>
              <Button variant="accent" size="sm">
                <Plus size={14} /> Nova Peça
              </Button>
            </>
          ) : undefined
        }
      />

      {/* Summary cards */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total de Peças',  value: totalPecas,    color: 'text-primary'     },
          { label: 'Com Modelo 3D',   value: com3d,         color: 'text-warning'     },
          { label: 'Com Plano Dobra', value: comPlanoDobra, color: 'text-destructive' },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border bg-card p-4 shadow-card"
          >
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className={`mt-1 text-2xl font-bold ${item.color}`}>{item.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Pesquisar por código, descrição, grupo, família, cor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter size={13} className="text-muted-foreground" />
            {grupos.map((g) => (
              <button
                key={g}
                onClick={() => setGrupoFilter(g)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  grupoFilter === g
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {g === 'todos' ? 'Todos' : g}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Active column filter pills */}
      <AnimatePresence>
        {activeColFilterCount > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="mb-3 flex flex-wrap items-center gap-1.5 overflow-hidden"
          >
            <span className="text-[11px] text-muted-foreground">Filtros ativos:</span>
            {Object.entries(columnFilters).map(([key, vals]) => {
              if (vals.size === 0) return null
              const lbl = COLUMN_DEFS.find((c) => c.key === key)?.label ?? key
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary"
                >
                  {lbl}:{' '}
                  {vals.size === 1 ? Array.from(vals)[0] : `${vals.size} val.`}
                  <button
                    onClick={() => handleClearFilter(key)}
                    className="ml-0.5 rounded-sm text-primary/60 transition-colors hover:text-primary"
                  >
                    <X size={10} />
                  </button>
                </span>
              )
            })}
            {activeColFilterCount > 1 && (
              <button
                onClick={() => setColumnFilters({})}
                className="text-[11px] text-muted-foreground underline transition-colors hover:text-foreground"
              >
                Limpar todos
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk action toolbar */}
      <AnimatePresence>
        {someSelected && canEdit('pecas') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-3 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/8 px-4 py-2.5"
          >
            <FileSpreadsheet size={15} className="flex-shrink-0 text-primary" />
            <span className="text-sm font-semibold text-primary">
              {selected.size} {selected.size === 1 ? 'peça selecionada' : 'peças selecionadas'}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setExportOpen(true)}
              >
                <Download size={12} /> Exportar selecionadas
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">
                <Trash2 size={12} /> Excluir
              </Button>
              <button
                onClick={clearSelection}
                className="ml-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <EmptyState
                icon={<Package size={24} />}
                title="Nenhuma peça encontrada"
                description="Tente ajustar os filtros ou adicione uma nova peça."
                className="m-6"
                action={
                  canEdit('pecas') ? (
                    <Button variant="accent" size="sm">
                      <Plus size={14} /> Adicionar Peça
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className={`${TH} w-8`}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                        onChange={toggleAll}
                        className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                      />
                    </TableHead>
                    {renderHeader('codigo')}
                    {renderHeader('espessura')}
                    {renderHeader('descricao', 'min-w-[200px]')}
                    {renderHeader('grupo')}
                    {renderHeader('familia')}
                    {renderHeader('codigoSistema')}
                    {renderHeader('areaPeca')}
                    {renderHeader('desperdicio')}
                    {renderHeader('percFabricacao')}
                    {renderHeader('percPintura')}
                    {renderHeader('peso')}
                    {renderHeader('cor')}
                    {renderHeader('arquivo3d')}
                    {renderHeader('planoDobra')}
                    {renderHeader('atualizadoEm')}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((peca, i) => {
                    const isSelected = selected.has(peca.id)
                    return (
                      <motion.tr
                        key={peca.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => toggleOne(peca.id)}
                        className={`cursor-pointer border-b border-border transition-colors ${
                          isSelected ? 'bg-primary/5 hover:bg-primary/8' : 'hover:bg-muted/40'
                        }`}
                      >
                        <TableCell className={TD} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(peca.id)}
                            className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
                          />
                        </TableCell>

                        <TableCell className={TD}>
                          <span className="whitespace-nowrap font-mono text-[11px] font-semibold text-primary">
                            {peca.codigo}
                          </span>
                        </TableCell>

                        <TableCell className={`${TD} text-right`}>
                          <span className="whitespace-nowrap text-xs tabular-nums">{peca.espessura}</span>
                        </TableCell>

                        <TableCell className={`${TD} min-w-[200px]`}>
                          <span className="text-xs font-medium leading-snug text-foreground">
                            {peca.descricao}
                          </span>
                        </TableCell>

                        <TableCell className={TD}>
                          <span className="whitespace-nowrap text-xs text-muted-foreground">{peca.grupo}</span>
                        </TableCell>

                        <TableCell className={TD}>
                          <span className="whitespace-nowrap text-xs text-muted-foreground">{peca.familia}</span>
                        </TableCell>

                        <TableCell className={TD}>
                          <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                            {peca.codigoSistema || '—'}
                          </span>
                        </TableCell>

                        <TableCell className={`${TD} text-right`}>
                          <span className="whitespace-nowrap text-xs tabular-nums">
                            {peca.areaPeca.toFixed(2)}
                          </span>
                        </TableCell>

                        <TableCell className={`${TD} text-right`}>
                          <span className="whitespace-nowrap text-xs tabular-nums">
                            {peca.desperdicio.toFixed(4)}
                          </span>
                        </TableCell>

                        <TableCell className={`${TD} text-right`}>
                          <span className="whitespace-nowrap text-xs tabular-nums">
                            {peca.percFabricacao.toFixed(1)}%
                          </span>
                        </TableCell>

                        <TableCell className={`${TD} text-right`}>
                          <span className="whitespace-nowrap text-xs tabular-nums">
                            {peca.percPintura.toFixed(1)}%
                          </span>
                        </TableCell>

                        <TableCell className={`${TD} text-right`}>
                          <span className="whitespace-nowrap text-xs tabular-nums">
                            {peca.peso.toFixed(2)}
                          </span>
                        </TableCell>

                        <TableCell className={TD}>
                          <span className="whitespace-nowrap text-xs">{peca.cor}</span>
                        </TableCell>

                        <TableCell className={`${TD} text-center`}>
                          {peca.arquivo3d ? (
                            <span title={peca.arquivo3d} className="inline-flex items-center justify-center">
                              <FileBox size={14} className="text-primary" />
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className={`${TD} text-center`}>
                          {peca.planoDobra ? (
                            <span title={peca.planoDobra} className="inline-flex items-center justify-center">
                              <FileText size={14} className="text-accent" />
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className={TD}>
                          <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                            {formatDate(peca.atualizadoEm)}
                          </span>
                        </TableCell>
                      </motion.tr>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Modals */}
      <ExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        moduleName="pecas"
        moduleTitle="Peças"
        pdfSubtitle="Relatório de Peças"
        columns={EXPORT_COLUMNS}
        allData={allExport}
        filteredData={filteredExport}
        selectedData={selectedExport}
      />
      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        moduleName="pecas"
        moduleTitle="Peças"
        systemFields={IMPORT_SYSTEM_FIELDS}
        mockFileColumns={MOCK_FILE_COLUMNS}
        mockPreviewData={MOCK_PREVIEW_DATA}
      />

      {/* Column filter dropdown — fixed position, outside table stacking context */}
      <AnimatePresence>
        {openFilter && (
          <ColumnFilterDropdown
            key={openFilter.key}
            columnKey={openFilter.key}
            columnLabel={openFilter.label}
            values={openFilterValues}
            selected={columnFilters[openFilter.key] ?? new Set()}
            onChange={handleFilterChange}
            onClose={() => setOpenFilter(null)}
            anchorRect={openFilter.rect}
          />
        )}
      </AnimatePresence>
    </div>
    </PermissionGate>
  )
}
