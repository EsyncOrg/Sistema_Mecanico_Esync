'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Layers, Ruler, Upload, Download, Trash2, X, FileSpreadsheet } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { ExportModal } from '@/components/shared/ExportModal'
import { ImportModal } from '@/components/shared/ImportModal'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { mockRetalhos } from '@/mocks'
import { formatDate } from '@/lib/utils'
import { STATUS_LABELS } from '@/lib/constants'
import type { StatusRetalho } from '@/types'

// ─── Export config ────────────────────────────────────────────────────────────

const EXPORT_COLUMNS = [
  { key: 'codigo', label: 'Código' },
  { key: 'material', label: 'Material' },
  { key: 'largura', label: 'Largura (mm)' },
  { key: 'altura', label: 'Altura (mm)' },
  { key: 'espessura', label: 'Espessura (mm)' },
  { key: 'peso', label: 'Peso (kg)' },
  { key: 'localizacao', label: 'Localização' },
  { key: 'status', label: 'Status' },
  { key: 'pecaOrigem', label: 'Peça de Origem' },
  { key: 'criadoEm', label: 'Criado em' },
]

// ─── Import config ────────────────────────────────────────────────────────────

const IMPORT_SYSTEM_FIELDS = [
  { key: 'codigo', label: 'Código', required: true },
  { key: 'material', label: 'Material', required: true },
  { key: 'largura', label: 'Largura (mm)', required: true },
  { key: 'altura', label: 'Altura (mm)', required: true },
  { key: 'espessura', label: 'Espessura (mm)', required: false },
  { key: 'peso', label: 'Peso (kg)', required: false },
  { key: 'localizacao', label: 'Localização', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'pecaOrigem', label: 'Peça de Origem', required: false },
]

const MOCK_FILE_COLUMNS = ['Código', 'Material', 'Largura (mm)', 'Altura (mm)', 'Espessura (mm)', 'Peso (kg)', 'Localização', 'Status', 'Peça de Origem']

const MOCK_PREVIEW_DATA = [
  { 'Código': 'RET-0080', 'Material': 'Aço Inox 304', 'Largura (mm)': '400', 'Altura (mm)': '300', 'Espessura (mm)': '8', 'Peso (kg)': '7.5', 'Localização': 'EST-A3', 'Status': 'disponivel', 'Peça de Origem': 'PCA-0001' },
  { 'Código': 'RET-0081', 'Material': 'Aço Carbono 1020', 'Largura (mm)': '250', 'Altura (mm)': '180', 'Espessura (mm)': '6', 'Peso (kg)': '2.1', 'Localização': 'EST-B1', 'Status': 'disponivel', 'Peça de Origem': '' },
  { 'Código': 'RET-0082', 'Material': 'Alumínio 6061', 'Largura (mm)': '600', 'Altura (mm)': '450', 'Espessura (mm)': '5', 'Peso (kg)': '3.6', 'Localização': 'EST-C2', 'Status': 'reservado', 'Peça de Origem': 'PCA-0008' },
  { 'Código': 'RET-0083', 'Material': 'Aço Inox 316', 'Largura (mm)': '120', 'Altura (mm)': '90', 'Espessura (mm)': '12', 'Peso (kg)': '1.2', 'Localização': 'EST-D4', 'Status': 'descarte', 'Peça de Origem': '' },
  { 'Código': 'RET-0084', 'Material': 'Aço Carbono 1045', 'Largura (mm)': '320', 'Altura (mm)': '210', 'Espessura (mm)': '10', 'Peso (kg)': '5.3', 'Localização': 'EST-A1', 'Status': 'disponivel', 'Peça de Origem': 'PCA-0003' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RetalhosPage() {
  const { canEdit, canView } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusRetalho | 'todos'>('todos')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const filtered = mockRetalhos.filter((r) => {
    const matchSearch =
      r.codigo.toLowerCase().includes(search.toLowerCase()) ||
      r.material.toLowerCase().includes(search.toLowerCase()) ||
      r.localizacao.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || r.status === statusFilter
    return matchSearch && matchStatus
  })

  const disponiveis = mockRetalhos.filter((r) => r.status === 'disponivel').length
  const reservados = mockRetalhos.filter((r) => r.status === 'reservado').length
  const descarte = mockRetalhos.filter((r) => r.status === 'descarte').length
  const pesoTotal = mockRetalhos.filter((r) => r.status !== 'descarte').reduce((acc, r) => acc + r.peso, 0)

  const statusOptions: Array<{ value: StatusRetalho | 'todos'; label: string }> = [
    { value: 'todos', label: 'Todos' },
    { value: 'disponivel', label: 'Disponível' },
    { value: 'reservado', label: 'Reservado' },
    { value: 'descarte', label: 'Descarte' },
  ]

  function toggleOne(id: string) {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) { n.delete(id) } else { n.add(id) }
      return n
    })
  }
  function clearSelection() { setSelected(new Set()) }
  const someSelected = selected.size > 0

  // Flatten for export
  const toExportRow = (r: (typeof mockRetalhos)[0]): Record<string, unknown> => ({
    codigo: r.codigo,
    material: r.material,
    largura: r.dimensoes.largura,
    altura: r.dimensoes.altura,
    espessura: r.dimensoes.espessura,
    peso: r.peso,
    localizacao: r.localizacao,
    status: STATUS_LABELS[r.status] ?? r.status,
    pecaOrigem: r.pecaOrigem ?? '',
    criadoEm: formatDate(r.criadoEm),
  })

  const allExport = mockRetalhos.map(toExportRow)
  const filteredExport = filtered.map(toExportRow)
  const selectedExport = mockRetalhos.filter((r) => selected.has(r.id)).map(toExportRow)

  return (
    <PermissionGate module="retalhos">
    <div>
      <PageHeader
        title="Retalhos"
        subtitle={`${mockRetalhos.length} retalhos cadastrados · ${pesoTotal.toFixed(1)}kg disponíveis`}
        breadcrumbs={[{ label: 'Esync', href: '/dashboard' }, { label: 'Retalhos' }]}
        actions={
          canView('retalhos') ? (
            <>
              {canEdit('retalhos') && (
                <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                  <Upload size={14} /> Importar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
                <Download size={14} /> Exportar
              </Button>
              {canEdit('retalhos') && (
                <Button variant="accent" size="sm">
                  <Plus size={14} /> Novo Retalho
                </Button>
              )}
            </>
          ) : undefined
        }
      />

      {/* Summary */}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Disponíveis', value: disponiveis, color: 'text-success' },
          { label: 'Reservados', value: reservados, color: 'text-primary' },
          { label: 'Para Descarte', value: descarte, color: 'text-destructive' },
          { label: 'Peso Total', value: `${pesoTotal.toFixed(1)}kg`, color: 'text-foreground' },
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
              placeholder="Pesquisar por código, material ou localização..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  statusFilter === opt.value
                    ? 'bg-primary text-white'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bulk toolbar */}
      <AnimatePresence>
        {someSelected && canView('retalhos') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/8 px-4 py-2.5"
          >
            <FileSpreadsheet size={15} className="text-primary flex-shrink-0" />
            <span className="text-sm font-semibold text-primary">
              {selected.size} {selected.size === 1 ? 'retalho selecionado' : 'retalhos selecionados'}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setExportOpen(true)}>
                <Download size={12} /> Exportar selecionados
              </Button>
              {canEdit('retalhos') && (
                <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">
                  <Trash2 size={12} /> Excluir
                </Button>
              )}
              <button onClick={clearSelection} className="ml-1 rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Layers size={24} />}
          title="Nenhum retalho encontrado"
          description="Ajuste os filtros ou registre um novo retalho."
          action={
            canEdit('retalhos') ? (
              <Button variant="accent" size="sm">
                <Plus size={14} /> Novo Retalho
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((retalho, i) => {
            const isSelected = selected.has(retalho.id)
            return (
              <motion.div
                key={retalho.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => toggleOne(retalho.id)}
                className={`group relative rounded-xl border bg-card p-5 shadow-card cursor-pointer transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 ${
                  isSelected
                    ? 'border-primary/40 ring-1 ring-primary/20'
                    : 'border-border'
                }`}
              >
                {/* Checkbox */}
                <div
                  className="absolute right-3 top-3"
                  onClick={(e) => { e.stopPropagation(); toggleOne(retalho.id) }}
                >
                  <div
                    className={`flex h-5 w-5 items-center justify-center rounded border-2 transition-all ${
                      isSelected ? 'border-primary bg-primary' : 'border-border bg-card group-hover:border-primary/50'
                    }`}
                  >
                    {isSelected && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </div>

                <div className="flex items-start justify-between pr-8">
                  <div>
                    <p className="font-mono text-xs font-semibold text-primary">{retalho.codigo}</p>
                    <p className="mt-0.5 text-base font-semibold text-foreground">{retalho.material}</p>
                  </div>
                  <StatusBadge status={retalho.status} />
                </div>

                {/* Dimensions */}
                <div className="my-4 flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-4">
                  <div className="flex items-center gap-4 text-sm">
                    {[
                      { val: retalho.dimensoes.largura, label: 'Largura (mm)' },
                      { val: retalho.dimensoes.altura, label: 'Altura (mm)' },
                      { val: retalho.dimensoes.espessura, label: 'Esp. (mm)' },
                    ].map((d, i, arr) => (
                      <React.Fragment key={d.label}>
                        <div className="text-center">
                          <p className="text-lg font-bold text-foreground">{d.val}</p>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{d.label}</p>
                        </div>
                        {i < arr.length - 1 && <div className="text-muted-foreground">×</div>}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Ruler size={11} />
                    <span>{retalho.peso}kg</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">{retalho.localizacao}</Badge>
                  <span>{formatDate(retalho.criadoEm)}</span>
                </div>

                {retalho.pecaOrigem && (
                  <div className="mt-3 border-t border-border pt-3">
                    <p className="text-[10px] text-muted-foreground">
                      Originado de:{' '}
                      <span className="font-mono font-semibold text-primary">{retalho.pecaOrigem}</span>
                    </p>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <ExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        moduleName="retalhos"
        moduleTitle="Retalhos"
        pdfSubtitle="Relatório de Estoque de Retalhos"
        columns={EXPORT_COLUMNS}
        allData={allExport}
        filteredData={filteredExport}
        selectedData={selectedExport}
      />
      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        moduleName="retalhos"
        moduleTitle="Retalhos"
        systemFields={IMPORT_SYSTEM_FIELDS}
        mockFileColumns={MOCK_FILE_COLUMNS}
        mockPreviewData={MOCK_PREVIEW_DATA}
      />
    </div>
    </PermissionGate>
  )
}
