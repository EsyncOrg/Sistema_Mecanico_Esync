'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Search, Code2, Clock, Activity,
  Upload, Download, Trash2, X, FileSpreadsheet,
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
import { mockProgramas } from '@/mocks'
import { relativeTime } from '@/lib/utils'
import { STATUS_LABELS } from '@/lib/constants'
import type { StatusPrograma } from '@/types'

// ─── Export config ────────────────────────────────────────────────────────────

const EXPORT_COLUMNS = [
  { key: 'codigo', label: 'Código' },
  { key: 'nome', label: 'Nome' },
  { key: 'maquina', label: 'Máquina' },
  { key: 'material', label: 'Material' },
  { key: 'versao', label: 'Versão' },
  { key: 'status', label: 'Status' },
  { key: 'tempoEstimado', label: 'Tempo Est. (min)' },
  { key: 'execucoes', label: 'Execuções' },
  { key: 'operador', label: 'Operador' },
  { key: 'ultimaExecucao', label: 'Última Execução' },
]

// ─── Import config ────────────────────────────────────────────────────────────

const IMPORT_SYSTEM_FIELDS = [
  { key: 'codigo', label: 'Código', required: true },
  { key: 'nome', label: 'Nome', required: true },
  { key: 'maquina', label: 'Máquina', required: true },
  { key: 'material', label: 'Material', required: false },
  { key: 'versao', label: 'Versão', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'tempoEstimado', label: 'Tempo Est. (min)', required: false },
  { key: 'operador', label: 'Operador', required: false },
]

const MOCK_FILE_COLUMNS = ['Código', 'Nome', 'Máquina', 'Material', 'Versão', 'Status', 'Tempo Est. (min)', 'Operador']

const MOCK_PREVIEW_DATA = [
  { 'Código': 'CNC-P0200', 'Nome': 'Furação Base Ø12 - Série C', 'Máquina': 'CNC-001', 'Material': 'Aço Inox 304', 'Versão': '1.0', 'Status': 'ativo', 'Tempo Est. (min)': '28', 'Operador': 'Carlos Lima' },
  { 'Código': 'LASER-P0201', 'Nome': 'Corte Flange Série D', 'Máquina': 'LASER-001', 'Material': 'Aço Carbono 1020', 'Versão': '2.1', 'Status': 'em_teste', 'Tempo Est. (min)': '14', 'Operador': 'Ana Ferreira' },
  { 'Código': 'CNC-P0202', 'Nome': 'Fresamento Suporte Angular', 'Máquina': 'CNC-002', 'Material': 'Alumínio 6061', 'Versão': '1.0', 'Status': 'revisao', 'Tempo Est. (min)': '45', 'Operador': 'João Dias' },
  { 'Código': 'PLASMA-P0203', 'Nome': 'Corte Perfil U-200', 'Máquina': 'PLASMA-001', 'Material': 'Aço Carbono 1045', 'Versão': '3.0', 'Status': 'ativo', 'Tempo Est. (min)': '18', 'Operador': 'Roberto Costa' },
  { 'Código': 'LASER-P0204', 'Nome': 'Gravação Identificação', 'Máquina': 'LASER-002', 'Material': '', 'Versão': '1.0', 'Status': 'arquivado', 'Tempo Est. (min)': '5', 'Operador': 'Paulo Santos' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProgramasPage() {
  const { canEdit } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusPrograma | 'todos'>('todos')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [exportOpen, setExportOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const filtered = mockProgramas.filter((p) => {
    const matchSearch =
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.codigo.toLowerCase().includes(search.toLowerCase()) ||
      p.maquina.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const ativos = mockProgramas.filter((p) => p.status === 'ativo').length
  const totalExecucoes = mockProgramas.reduce((acc, p) => acc + p.execucoes, 0)

  const statusOptions: Array<{ value: StatusPrograma | 'todos'; label: string }> = [
    { value: 'todos', label: 'Todos' },
    { value: 'ativo', label: 'Ativo' },
    { value: 'em_teste', label: 'Em Teste' },
    { value: 'revisao', label: 'Revisão' },
    { value: 'arquivado', label: 'Arquivado' },
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
  const toExportRow = (p: (typeof mockProgramas)[0]): Record<string, unknown> => ({
    codigo: p.codigo,
    nome: p.nome,
    maquina: p.maquina,
    material: p.material,
    versao: p.versao,
    status: STATUS_LABELS[p.status] ?? p.status,
    tempoEstimado: p.tempoEstimado,
    execucoes: p.execucoes,
    operador: p.operador,
    ultimaExecucao: p.ultimaExecucao ?? '',
  })

  const allExport = mockProgramas.map(toExportRow)
  const filteredExport = filtered.map(toExportRow)
  const selectedExport = mockProgramas.filter((p) => selected.has(p.id)).map(toExportRow)

  return (
    <PermissionGate module="programas">
    <div>
      <PageHeader
        title="Programas"
        subtitle={`${ativos} programas ativos · ${totalExecucoes.toLocaleString('pt-BR')} execuções no total`}
        breadcrumbs={[{ label: 'Esync', href: '/dashboard' }, { label: 'Programas' }]}
        actions={
          canEdit('programas') ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <Upload size={14} /> Importar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
                <Download size={14} /> Exportar
              </Button>
              <Button variant="accent" size="sm">
                <Plus size={14} /> Novo Programa
              </Button>
            </>
          ) : undefined
        }
      />

      {/* Summary */}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Ativos', value: ativos, color: 'text-success' },
          { label: 'Em Teste', value: mockProgramas.filter((p) => p.status === 'em_teste').length, color: 'text-warning' },
          { label: 'Em Revisão', value: mockProgramas.filter((p) => p.status === 'revisao').length, color: 'text-accent' },
          { label: 'Total de Execuções', value: totalExecucoes.toLocaleString('pt-BR'), color: 'text-primary' },
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
              placeholder="Pesquisar por nome, código ou máquina..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
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
        {someSelected && canEdit('programas') && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/8 px-4 py-2.5"
          >
            <FileSpreadsheet size={15} className="text-primary flex-shrink-0" />
            <span className="text-sm font-semibold text-primary">
              {selected.size} {selected.size === 1 ? 'programa selecionado' : 'programas selecionados'}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setExportOpen(true)}>
                <Download size={12} /> Exportar selecionados
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs text-destructive hover:text-destructive">
                <Trash2 size={12} /> Excluir
              </Button>
              <button onClick={clearSelection} className="ml-1 rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors">
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Code2 size={24} />}
          title="Nenhum programa encontrado"
          action={
            canEdit('programas') ? (
              <Button variant="accent" size="sm">
                <Plus size={14} /> Novo Programa
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((programa, i) => {
            const isSelected = selected.has(programa.id)
            return (
              <motion.div
                key={programa.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => toggleOne(programa.id)}
                className={`group relative rounded-xl border bg-card p-5 shadow-card cursor-pointer transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 ${
                  isSelected ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border'
                }`}
              >
                {/* Checkbox */}
                <div
                  className="absolute right-3 top-3 z-10"
                  onClick={(e) => { e.stopPropagation(); toggleOne(programa.id) }}
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

                <div className="flex items-start justify-between gap-3 pr-8">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Code2 size={16} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-mono text-xs font-bold text-primary">{programa.codigo}</p>
                        <Badge variant="outline" className="text-[10px]">v{programa.versao}</Badge>
                      </div>
                      <p className="mt-0.5 text-sm font-semibold text-foreground leading-snug">
                        {programa.nome}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={programa.status} />
                </div>

                {programa.descricao && (
                  <p className="mt-3 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {programa.descricao}
                  </p>
                )}

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Máquina', value: programa.maquina },
                    { label: 'Tempo Est.', value: `${programa.tempoEstimado}min` },
                    { label: 'Execuções', value: programa.execucoes.toLocaleString('pt-BR') },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg bg-muted/50 p-2.5 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                      <p className="mt-0.5 text-xs font-bold text-foreground">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock size={11} />
                    {programa.ultimaExecucao
                      ? `Última execução ${relativeTime(programa.ultimaExecucao)}`
                      : 'Nunca executado'}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Activity size={11} />
                    <span>{programa.operador}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Modals */}
      <ExportModal
        open={exportOpen}
        onOpenChange={setExportOpen}
        moduleName="programas"
        moduleTitle="Programas"
        pdfSubtitle="Relatório de Programas CNC"
        columns={EXPORT_COLUMNS}
        allData={allExport}
        filteredData={filteredExport}
        selectedData={selectedExport}
      />
      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        moduleName="programas"
        moduleTitle="Programas"
        systemFields={IMPORT_SYSTEM_FIELDS}
        mockFileColumns={MOCK_FILE_COLUMNS}
        mockPreviewData={MOCK_PREVIEW_DATA}
      />
    </div>
    </PermissionGate>
  )
}
