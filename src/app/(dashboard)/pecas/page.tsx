'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Filter, Upload, Download, Package,
  Trash2, X, FileSpreadsheet,
} from 'lucide-react'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { mockPecas } from '@/mocks'
import { formatDate, formatNumber } from '@/lib/utils'
import { STATUS_LABELS } from '@/lib/constants'
import type { StatusPeca } from '@/types'

// ─── Export config ────────────────────────────────────────────────────────────

const EXPORT_COLUMNS = [
  { key: 'codigo', label: 'Código' },
  { key: 'nome', label: 'Nome' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'material', label: 'Material' },
  { key: 'espessura', label: 'Espessura (mm)' },
  { key: 'quantidade', label: 'Quantidade' },
  { key: 'unidade', label: 'Unidade' },
  { key: 'localizacao', label: 'Localização' },
  { key: 'status', label: 'Status' },
  { key: 'fornecedor', label: 'Fornecedor' },
  { key: 'peso', label: 'Peso (kg)' },
  { key: 'atualizadoEm', label: 'Atualizado em' },
]

// ─── Import config ────────────────────────────────────────────────────────────

const IMPORT_SYSTEM_FIELDS = [
  { key: 'codigo', label: 'Código', required: true },
  { key: 'nome', label: 'Nome', required: true },
  { key: 'material', label: 'Material', required: true },
  { key: 'espessura', label: 'Espessura (mm)', required: false },
  { key: 'quantidade', label: 'Quantidade', required: false },
  { key: 'quantidadeMinima', label: 'Qtd. Mínima', required: false },
  { key: 'localizacao', label: 'Localização', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'categoria', label: 'Categoria', required: false },
  { key: 'fornecedor', label: 'Fornecedor', required: false },
]

const MOCK_FILE_COLUMNS = ['Código', 'Nome', 'Material', 'Espessura (mm)', 'Quantidade', 'Qtd. Mínima', 'Localização', 'Status', 'Categoria', 'Fornecedor']

const MOCK_PREVIEW_DATA = [
  { 'Código': 'PCA-0100', 'Nome': 'Flange Cônica Ø80mm', 'Material': 'Aço Inox 304', 'Espessura (mm)': '8', 'Quantidade': '24', 'Qtd. Mínima': '10', 'Localização': 'C3-P1', 'Status': 'disponivel', 'Categoria': 'Flanges', 'Fornecedor': 'AçoTech' },
  { 'Código': 'PCA-0101', 'Nome': 'Placa de Base 200x200', 'Material': 'Aço Carbono 1020', 'Espessura (mm)': '10', 'Quantidade': '6', 'Qtd. Mínima': '15', 'Localização': 'A2-P4', 'Status': 'estoque_baixo', 'Categoria': 'Placas', 'Fornecedor': 'MetalSul' },
  { 'Código': 'PCA-0102', 'Nome': 'Anel de Vedação 120mm', 'Material': 'Alumínio 6061', 'Espessura (mm)': '5', 'Quantidade': '80', 'Qtd. Mínima': '30', 'Localização': 'B1-P2', 'Status': 'disponivel', 'Categoria': 'Anéis', 'Fornecedor': 'AlumPro' },
  { 'Código': 'PCA-0103', 'Nome': 'Tampa de Inspeção', 'Material': 'Aço Inox 316', 'Espessura (mm)': '6', 'Quantidade': '0', 'Qtd. Mínima': '5', 'Localização': 'D4-P1', 'Status': 'indisponivel', 'Categoria': 'Tampas', 'Fornecedor': 'AçoTech' },
  { 'Código': 'PCA-0104', 'Nome': 'Suporte Angular 90°', 'Material': 'Aço Carbono 1045', 'Espessura (mm)': '12', 'Quantidade': '33', 'Qtd. Mínima': '20', 'Localização': 'C1-P3', 'Status': 'disponivel', 'Categoria': 'Suportes', 'Fornecedor': 'FerroMais' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PecasPage() {
  const { canEdit } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusPeca | 'todos'>('todos')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const filtered = mockPecas.filter((p) => {
    const matchSearch =
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.codigo.toLowerCase().includes(search.toLowerCase()) ||
      p.material.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const totalItens = mockPecas.reduce((acc, p) => acc + p.quantidade, 0)
  const itensEstoqueBaixo = mockPecas.filter((p) => p.status === 'estoque_baixo').length
  const itensIndisponiveis = mockPecas.filter((p) => p.status === 'indisponivel').length

  const statusOptions: Array<{ value: StatusPeca | 'todos'; label: string }> = [
    { value: 'todos', label: 'Todos' },
    { value: 'disponivel', label: 'Disponível' },
    { value: 'estoque_baixo', label: 'Estoque Baixo' },
    { value: 'em_producao', label: 'Em Produção' },
    { value: 'reservado', label: 'Reservado' },
    { value: 'indisponivel', label: 'Indisponível' },
  ]

  const allFilteredIds = filtered.map((p) => p.id)
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selected.has(id))
  const someSelected = allFilteredIds.some((id) => selected.has(id))

  function toggleAll() {
    if (allSelected) {
      setSelected((s) => { const n = new Set(s); allFilteredIds.forEach((id) => n.delete(id)); return n })
    } else {
      setSelected((s) => new Set([...s, ...allFilteredIds]))
    }
  }

  function toggleOne(id: string) {
    setSelected((s) => {
      const n = new Set(s)
      if (n.has(id)) { n.delete(id) } else { n.add(id) }
      return n
    })
  }

  function clearSelection() { setSelected(new Set()) }

  // Flatten for export
  const toExportRow = (p: (typeof mockPecas)[0]): Record<string, unknown> => ({
    codigo: p.codigo,
    nome: p.nome,
    categoria: p.categoria,
    material: p.material,
    espessura: p.espessura,
    quantidade: p.quantidade,
    unidade: p.unidade,
    localizacao: p.localizacao,
    status: STATUS_LABELS[p.status] ?? p.status,
    fornecedor: p.fornecedor ?? '',
    peso: p.peso ?? '',
    atualizadoEm: formatDate(p.atualizadoEm),
  })

  const allExport = mockPecas.map(toExportRow)
  const filteredExport = filtered.map(toExportRow)
  const selectedExport = mockPecas.filter((p) => selected.has(p.id)).map(toExportRow)

  return (
    <PermissionGate module="pecas">
    <div>
      <PageHeader
        title="Peças"
        subtitle={`${mockPecas.length} itens cadastrados · ${formatNumber(totalItens)} unidades em estoque`}
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
          { label: 'Total de Itens', value: mockPecas.length, color: 'text-primary' },
          { label: 'Estoque Baixo', value: itensEstoqueBaixo, color: 'text-warning' },
          { label: 'Indisponíveis', value: itensIndisponiveis, color: 'text-destructive' },
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
              placeholder="Pesquisar por nome, código ou material..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter size={13} className="text-muted-foreground" />
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

      {/* Bulk action toolbar */}
      <AnimatePresence>
        {someSelected && canEdit('pecas') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-3 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/8 px-4 py-2.5"
          >
            <FileSpreadsheet size={15} className="text-primary flex-shrink-0" />
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
                className="ml-1 rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors"
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                        onChange={toggleAll}
                        className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                      />
                    </TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Material</TableHead>
                    <TableHead className="text-right">Espessura</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Atualizado</TableHead>
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
                        className={`border-b border-border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-primary/5 hover:bg-primary/8'
                            : 'hover:bg-muted/40'
                        }`}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(peca.id)}
                            className="h-4 w-4 rounded border-border accent-primary cursor-pointer"
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs font-semibold text-primary">
                            {peca.codigo}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-foreground">{peca.nome}</p>
                            <p className="text-xs text-muted-foreground">{peca.categoria}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{peca.material}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-sm">{peca.espessura}mm</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={`text-sm font-semibold ${
                              peca.quantidade < peca.quantidadeMinima
                                ? 'text-destructive'
                                : 'text-foreground'
                            }`}
                          >
                            {formatNumber(peca.quantidade)}
                          </span>
                          <span className="text-xs text-muted-foreground">/{peca.unidade}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[11px]">
                            {peca.localizacao}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={peca.status} />
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
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
        pdfSubtitle="Relatório de Estoque de Peças"
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
    </div>
    </PermissionGate>
  )
}
