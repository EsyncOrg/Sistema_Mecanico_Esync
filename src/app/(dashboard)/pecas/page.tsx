'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Filter, Upload, Download, Package,
  Trash2, X, FileSpreadsheet, FileBox, FileText, ListFilter, Pencil,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportModal } from '@/components/shared/ExportModal'
import { ImportModal } from '@/components/shared/ImportModal'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { ColumnFilterDropdown } from '@/components/shared/ColumnFilterDropdown'
import { NovaPecaModal } from '@/components/shared/NovaPecaModal'
import { EditarPecaModal } from '@/components/shared/EditarPecaModal'
import { SecurityConfirmModal } from '@/components/shared/SecurityConfirmModal'
import { DeleteConfirmModal } from '@/components/shared/DeleteConfirmModal'
import { logActionAudit } from '@/lib/security/importSecurity'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { mockPecas } from '@/mocks'
import { formatDate } from '@/lib/utils'
import { formatEspessura } from '@/lib/pecas/bitolaMap'
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
const TD = 'px-2 py-1.5 align-middle'

// ─── Column filter helpers ─────────────────────────────────────────────────────

const COLUMN_DEFS: { key: string; label: string; align: 'center' | 'left' }[] = [
  { key: 'codigo',         label: 'Código',       align: 'center' },
  { key: 'espessura',      label: 'Esp. mm',      align: 'center' },
  { key: 'descricao',      label: 'Descrição',    align: 'left'   },
  { key: 'grupo',          label: 'Grupo',        align: 'center' },
  { key: 'familia',        label: 'Família',      align: 'center' },
  { key: 'codigoSistema',  label: 'Cód. Sistema', align: 'center' },
  { key: 'areaPeca',       label: 'Área mm²',     align: 'center' },
  { key: 'desperdicio',    label: 'Desp. m²',     align: 'center' },
  { key: 'percFabricacao', label: '% Fab.',       align: 'center' },
  { key: 'percPintura',    label: '% Pint.',      align: 'center' },
  { key: 'peso',           label: 'Peso kg',      align: 'center' },
  { key: 'cor',            label: 'COR',          align: 'center' },
  { key: 'arquivo3d',      label: '3D',           align: 'center' },
  { key: 'planoDobra',     label: 'Dobra',        align: 'center' },
  { key: 'atualizadoEm',   label: 'Atualizado',   align: 'center' },
]

function colAlign(key: string): string {
  return COLUMN_DEFS.find((c) => c.key === key)?.align === 'left' ? 'text-left' : 'text-center'
}

const NUMERIC_COLS = new Set(['areaPeca', 'desperdicio', 'percFabricacao', 'percPintura', 'peso'])

function getPecaFilterValue(peca: Peca, key: string): string {
  switch (key) {
    case 'codigo':         return peca.codigo
    case 'espessura':      return formatEspessura(peca.espessura)
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
  if (key === 'espessura') {
    // Values are formatted pt-BR strings like "1,9 mm" — parse to float for correct order
    return [...vals].sort((a, b) =>
      parseFloat(a.replace(',', '.')) - parseFloat(b.replace(',', '.'))
    )
  }
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
  const { canEdit, canView } = useAuth()
  const [pecas, setPecas]           = useState<Peca[]>(mockPecas)
  const [search, setSearch]         = useState('')
  const [grupoFilter, setGrupoFilter] = useState<string>('todos')
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [novaPecaOpen, setNovaPecaOpen]     = useState(false)
  const [editingPeca, setEditingPeca]       = useState<Peca | null>(null)
  const [pendingAction, setPendingAction]   = useState<'edit' | 'delete' | null>(null)
  const [securityOpen, setSecurityOpen]     = useState(false)
  const [editOpen, setEditOpen]             = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [columnFilters, setColumnFilters] = useState<FilterState>({})
  const [openFilter, setOpenFilter] = useState<OpenFilter | null>(null)

  const grupos = ['todos', ...Array.from(new Set(pecas.map((p) => p.grupo))).sort()]

  // ─── Filtered rows (text search + grupo chip + column filters) ───────────────

  const filtered = useMemo(() => {
    return pecas.filter((p) => {
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
  }, [pecas, search, grupoFilter, columnFilters])

  // ─── Cascading values for the open column dropdown ───────────────────────────

  const openFilterKey = openFilter?.key ?? null

  const openFilterValues = useMemo(() => {
    if (!openFilterKey) return []
    const cascade = pecas.filter((p) => {
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
  }, [pecas, openFilterKey, search, grupoFilter, columnFilters])

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
    const def      = COLUMN_DEFS.find((c) => c.key === key)!
    const label    = def.label
    const active   = hasFilter(key)
    const centered = def.align !== 'left'
    return (
      <TableHead className={`${TH} ${extraClass} ${centered ? 'text-center' : 'text-left'}`}>
        <button
          onClick={(e) => handleHeaderClick(key, label, e)}
          className={`group relative inline-flex w-full items-center whitespace-nowrap transition-colors ${
            centered ? 'justify-center' : 'justify-start gap-1'
          } ${active ? 'text-primary' : 'hover:text-foreground'}`}
        >
          <span>{label}</span>

          {centered ? (
            // Absolutely positioned — never shifts the label off-center
            <span className="absolute right-0 top-1/2 -translate-y-1/2">
              {active ? (
                <span className="inline-flex items-center rounded bg-primary/15 px-1 py-0.5 text-[9px] font-bold leading-none text-primary">
                  {columnFilters[key]?.size}
                </span>
              ) : (
                <ListFilter size={8} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-40" />
              )}
            </span>
          ) : (
            // Left-aligned: keep indicator in normal flow
            <>
              {active ? (
                <span className="inline-flex items-center rounded bg-primary/15 px-1 py-0.5 text-[9px] font-bold leading-none text-primary">
                  {columnFilters[key]?.size}
                </span>
              ) : (
                <ListFilter size={8} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-40" />
              )}
            </>
          )}
        </button>
      </TableHead>
    )
  }

  // ─── Selection helpers ────────────────────────────────────────────────────────

  const totalPecas    = pecas.length
  const sem3d         = pecas.filter((p) => !p.arquivo3d).length
  const semPlanoDobra = pecas.filter((p) => !p.planoDobra).length

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

  // ─── Edit / Delete security flow ─────────────────────────────────────────────

  function handleEditClick() {
    const peca = pecas.find((p) => selected.has(p.id))
    if (!peca) return
    setEditingPeca(peca)
    setPendingAction('edit')
    setSecurityOpen(true)
  }

  function handleDeleteClick() {
    setPendingAction('delete')
    setSecurityOpen(true)
  }

  function handleSecurityConfirmed() {
    if (pendingAction === 'edit') {
      setEditOpen(true)
    } else if (pendingAction === 'delete') {
      setDeleteConfirmOpen(true)
    }
    setPendingAction(null)
  }

  function handleEditSave(updated: Peca) {
    setPecas((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setSelected(new Set())
  }

  function handleDeleteConfirmed() {
    const deletedIds  = Array.from(selected)
    const deletedCods = pecas.filter((p) => selected.has(p.id)).map((p) => p.codigo)
    logActionAudit({
      userId:        'user-001',
      userName:      'Usuário',
      moduleName:    'pecas',
      actionType:    'delete',
      targetIds:     deletedIds,
      targetSummary: `${deletedIds.length} peça(s): ${deletedCods.slice(0, 3).join(', ')}${deletedIds.length > 3 ? '…' : ''}`,
      status:        'success',
    })
    setPecas((prev) => prev.filter((p) => !selected.has(p.id)))
    setSelected(new Set())
    setDeleteConfirmOpen(false)
  }

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

  const allExport      = pecas.map(toExportRow)
  const filteredExport = filtered.map(toExportRow)
  const selectedExport = pecas.filter((p) => selected.has(p.id)).map(toExportRow)

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <PermissionGate module="pecas">
    <div>
      <PageHeader
        title="Peças"
        subtitle={`${totalPecas} peças cadastradas · ${sem3d} sem modelo 3D · ${semPlanoDobra} sem plano de dobra`}
        breadcrumbs={[{ label: 'Esync', href: '/dashboard' }, { label: 'Peças' }]}
        actions={
          canView('pecas') ? (
            <>
              {canEdit('pecas') && (
                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                  <Upload size={14} /> Importar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
                <Download size={14} /> Exportar
              </Button>
              {canEdit('pecas') && (
                <Button variant="accent" size="sm" onClick={() => setNovaPecaOpen(true)}>
                  <Plus size={14} /> Nova Peça
                </Button>
              )}
            </>
          ) : undefined
        }
      />

      {/* Summary cards */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total de Peças',  value: totalPecas,    color: 'text-primary'     },
          { label: 'Sem Modelo 3D',   value: sem3d,         color: 'text-warning'     },
          { label: 'Sem Plano de Dobra', value: semPlanoDobra, color: 'text-destructive' },
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
        {someSelected && canView('pecas') && (
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
              {canEdit('pecas') && selected.size === 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-primary hover:text-primary"
                  onClick={handleEditClick}
                >
                  <Pencil size={12} /> Editar
                </Button>
              )}
              {canEdit('pecas') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive"
                  onClick={handleDeleteClick}
                >
                  <Trash2 size={12} /> Excluir
                </Button>
              )}
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
                    <Button variant="accent" size="sm" onClick={() => setNovaPecaOpen(true)}>
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

                        <TableCell className={`${TD} ${colAlign('codigo')}`}>
                          <span className="whitespace-nowrap font-mono text-[11px] font-semibold text-primary">
                            {peca.codigo}
                          </span>
                        </TableCell>

                        <TableCell className={`${TD} ${colAlign('espessura')}`}>
                          <span className="whitespace-nowrap text-xs tabular-nums">{formatEspessura(peca.espessura)}</span>
                        </TableCell>

                        <TableCell className={`${TD} align-top min-w-[200px]`}>
                          <span className="text-xs font-medium leading-snug text-foreground">
                            {peca.descricao}
                          </span>
                        </TableCell>

                        <TableCell className={`${TD} ${colAlign('grupo')}`}>
                          <span className="whitespace-nowrap text-xs text-muted-foreground">{peca.grupo}</span>
                        </TableCell>

                        <TableCell className={`${TD} ${colAlign('familia')}`}>
                          <span className="whitespace-nowrap text-xs text-muted-foreground">{peca.familia}</span>
                        </TableCell>

                        <TableCell className={`${TD} ${colAlign('codigoSistema')}`}>
                          <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                            {peca.codigoSistema || '—'}
                          </span>
                        </TableCell>

                        <TableCell className={`${TD} ${colAlign('areaPeca')}`}>
                          <span className="whitespace-nowrap text-xs tabular-nums">
                            {peca.areaPeca.toFixed(2)}
                          </span>
                        </TableCell>

                        <TableCell className={`${TD} ${colAlign('desperdicio')}`}>
                          <span className="whitespace-nowrap text-xs tabular-nums">
                            {peca.desperdicio.toFixed(4)}
                          </span>
                        </TableCell>

                        <TableCell className={`${TD} ${colAlign('percFabricacao')}`}>
                          <span className="whitespace-nowrap text-xs tabular-nums">
                            {peca.percFabricacao.toFixed(1)}%
                          </span>
                        </TableCell>

                        <TableCell className={`${TD} ${colAlign('percPintura')}`}>
                          <span className="whitespace-nowrap text-xs tabular-nums">
                            {peca.percPintura.toFixed(1)}%
                          </span>
                        </TableCell>

                        <TableCell className={`${TD} ${colAlign('peso')}`}>
                          <span className="whitespace-nowrap text-xs tabular-nums">
                            {peca.peso.toFixed(2)}
                          </span>
                        </TableCell>

                        <TableCell className={`${TD} ${colAlign('cor')}`}>
                          <span className="whitespace-nowrap text-xs">{peca.cor}</span>
                        </TableCell>

                        <TableCell className={`${TD} ${colAlign('arquivo3d')}`}>
                          {peca.arquivo3d ? (
                            <span title={peca.arquivo3d} className="inline-flex items-center justify-center">
                              <FileBox size={14} className="text-primary" />
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className={`${TD} ${colAlign('planoDobra')}`}>
                          {peca.planoDobra ? (
                            <span title={peca.planoDobra} className="inline-flex items-center justify-center">
                              <FileText size={14} className="text-accent" />
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </TableCell>

                        <TableCell className={`${TD} ${colAlign('atualizadoEm')}`}>
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
      <NovaPecaModal
        open={novaPecaOpen}
        onOpenChange={setNovaPecaOpen}
        existingPecas={pecas}
        onSave={(peca) => setPecas((prev) => [peca, ...prev])}
      />

      {/* Security password gate — shared by edit and delete flows */}
      <SecurityConfirmModal
        open={securityOpen}
        onOpenChange={setSecurityOpen}
        variant={pendingAction === 'delete' ? 'destructive' : 'warning'}
        title={pendingAction === 'delete' ? 'Confirmação de Segurança — Exclusão' : 'Confirmação de Segurança — Edição'}
        description={
          pendingAction === 'delete'
            ? `Você está prestes a excluir ${selected.size} peça${selected.size !== 1 ? 's' : ''}. Esta operação é irreversível.`
            : 'Edição de dados de engenharia requer confirmação de segurança.'
        }
        confirmLabel={pendingAction === 'delete' ? 'Confirmar Exclusão' : 'Confirmar Edição'}
        contextInfo={
          pendingAction === 'edit' && editingPeca
            ? [{ label: 'Peça', value: editingPeca.codigo }]
            : [{ label: 'Peças selecionadas', value: String(selected.size) }]
        }
        onConfirmed={handleSecurityConfirmed}
      />

      <EditarPecaModal
        open={editOpen}
        onOpenChange={setEditOpen}
        editingPeca={editingPeca}
        existingPecas={pecas}
        onSave={handleEditSave}
      />

      <DeleteConfirmModal
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        targetCodigos={pecas.filter((p) => selected.has(p.id)).map((p) => p.codigo)}
        onConfirmed={handleDeleteConfirmed}
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
