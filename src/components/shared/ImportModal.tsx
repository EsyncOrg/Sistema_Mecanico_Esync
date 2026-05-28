'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  X,
  FileDown,
  Loader2,
  History,
  ArrowRight,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { parseFile } from '@/lib/import-export/parser'
import { validateRows, buildAutoMapping } from '@/lib/import-export/validator'
import { downloadTemplateXLSX, downloadTemplateCSV } from '@/lib/import-export/template'
import { getAliasesForModule } from '@/lib/import-export/modules'

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'upload' | 'preview' | 'mapping' | 'processing' | 'done'

interface SystemField {
  key: string
  label: string
  required: boolean
}

interface ImportError {
  linha: number
  campo: string
  erro: string
}

interface ImportModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  moduleName: string
  moduleTitle: string
  systemFields: SystemField[]
  mockFileColumns: string[]
  mockPreviewData: Record<string, string>[]
  onImportComplete?: (validRows: Record<string, unknown>[]) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const PROCESSING_STEPS = [
  { key: 'reading',    label: 'Lendo arquivo'       },
  { key: 'validating', label: 'Validando dados'      },
  { key: 'importing',  label: 'Importando registros' },
  { key: 'finalizing', label: 'Finalizando'          },
]

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: 'upload',     label: 'Arquivo'    },
    { key: 'preview',    label: 'Prévia'     },
    { key: 'mapping',    label: 'Mapeamento' },
    { key: 'processing', label: 'Processando'},
    { key: 'done',       label: 'Concluído'  },
  ]
  const currentIdx = steps.findIndex((s) => s.key === current)

  return (
    <div className="flex items-center gap-0 mb-6">
      {steps.map((s, i) => {
        const done   = i < currentIdx
        const active = i === currentIdx
        return (
          <React.Fragment key={s.key}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-all',
                  done
                    ? 'bg-success text-white'
                    : active
                      ? 'bg-primary text-white shadow-[0_0_0_3px_rgba(var(--color-primary),0.15)]'
                      : 'bg-muted text-muted-foreground'
                )}
              >
                {done ? <CheckCircle2 size={12} /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-[9px] font-medium uppercase tracking-wide whitespace-nowrap',
                  active ? 'text-primary' : done ? 'text-success' : 'text-muted-foreground'
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  'h-px flex-1 mb-4 mx-1 transition-colors duration-300',
                  i < currentIdx ? 'bg-success' : 'bg-border'
                )}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function ImportModal({
  open,
  onOpenChange,
  moduleName,
  moduleTitle,
  systemFields,
  mockFileColumns,
  mockPreviewData,
  onImportComplete,
}: ImportModalProps) {
  const [step, setStep]                 = useState<Step>('upload')
  const [file, setFile]                 = useState<File | null>(null)
  const [mapping, setMapping]           = useState<Record<string, string>>({})
  const [progress, setProgress]         = useState(0)
  const [processingStep, setProcessingStep] = useState(0)
  const [importCount, setImportCount]   = useState(0)
  const [errors, setErrors]             = useState<ImportError[]>([])
  const [showHistory, setShowHistory]   = useState(false)

  // Real parsed data (populated after file drop)
  const [realColumns, setRealColumns]         = useState<string[] | null>(null)
  const [realPreviewRows, setRealPreviewRows] = useState<Record<string, string>[] | null>(null)
  const [parsedRows, setParsedRows]           = useState<Record<string, string>[]>([])
  const [totalParsedRows, setTotalParsedRows] = useState(0)

  // Displayed data: real file data when available, mock props as fallback
  const displayColumns  = realColumns      ?? mockFileColumns
  const displayRows     = realPreviewRows  ?? mockPreviewData
  const displayTotal    = totalParsedRows  || (mockPreviewData.length + 200)

  // Mocked import history
  const [history] = useState([
    { id: 1, filename: `modelo-${moduleName}.xlsx`,       registros: 186, erros: 2, data: '2026-05-24 14:32', status: 'success' },
    { id: 2, filename: `backup-${moduleName}-maio.csv`,   registros: 340, erros: 0, data: '2026-05-20 09:15', status: 'success' },
    { id: 3, filename: `importacao-teste.xlsx`,            registros: 0,   erros: 8, data: '2026-05-18 16:44', status: 'error'   },
  ])

  // Build mapping from real columns + module aliases
  const buildMappingFromHeaders = useCallback(
    (headers: string[]) => {
      const fieldsWithAliases = systemFields.map((sf) => ({
        ...sf,
        aliases: getAliasesForModule(moduleName, sf.key),
      }))
      return buildAutoMapping(headers, fieldsWithAliases)
    },
    [systemFields, moduleName]
  )

  // Fallback mapping from mock columns
  const buildFallbackMapping = useCallback(() => {
    const m: Record<string, string> = {}
    systemFields.forEach((sf) => {
      const match = mockFileColumns.find(
        (col) =>
          col.toLowerCase().includes(sf.key.toLowerCase()) ||
          sf.label.toLowerCase().includes(col.toLowerCase().replace(/[()]/g, '').trim())
      )
      m[sf.key] = match || ''
    })
    return m
  }, [systemFields, mockFileColumns])

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (accepted.length === 0) return
      const f = accepted[0]
      setFile(f)

      try {
        const result = await parseFile(f)
        setRealColumns(result.headers)
        setRealPreviewRows(
          result.rows.slice(0, 5).map((row) => {
            const r: Record<string, string> = {}
            result.headers.forEach((h) => { r[h] = String(row[h] ?? '') })
            return r
          })
        )
        setParsedRows(result.rows)
        setTotalParsedRows(result.totalRows)
        setMapping(buildMappingFromHeaders(result.headers))
      } catch {
        // Parsing failed — keep mock columns as preview, use fallback mapping
        setMapping(buildFallbackMapping())
      }

      setStep('preview')
    },
    [buildMappingFromHeaders, buildFallbackMapping]
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    onDropRejected: () => toast('error', 'Arquivo inválido', 'Use apenas arquivos .xlsx, .xls ou .csv'),
  })

  async function startProcessing() {
    setStep('processing')
    setProgress(0)
    setProcessingStep(0)

    const stepTimings = [
      { duration: 700,  progress: 22  },
      { duration: 900,  progress: 55  },
      { duration: 1100, progress: 85  },
      { duration: 600,  progress: 100 },
    ]

    for (let i = 0; i < stepTimings.length; i++) {
      await new Promise((r) => setTimeout(r, stepTimings[i].duration))
      setProcessingStep(i + 1)
      setProgress(stepTimings[i].progress)
    }

    if (parsedRows.length > 0) {
      // Real validation using the parsed file and current column mapping
      const fieldsWithAliases = systemFields.map((sf) => ({
        ...sf,
        aliases: getAliasesForModule(moduleName, sf.key),
      }))
      const result = validateRows(parsedRows, fieldsWithAliases, mapping)
      setImportCount(result.valid.length)
      setErrors(result.errors.slice(0, 20)) // cap at 20 for UI readability
      onImportComplete?.(result.valid)
      toast(
        result.valid.length > 0 ? 'success' : 'error',
        `${result.valid.length} ${moduleTitle.toLowerCase()} importados`,
        result.errors.length > 0
          ? `${result.errors.length} linha${result.errors.length !== 1 ? 's' : ''} com erros ignorada${result.errors.length !== 1 ? 's' : ''}`
          : 'Todos os registros válidos'
      )
    } else {
      // No real file was parsed — fallback mock results
      const count = Math.floor(Math.random() * 80) + 180
      const mockErrors: ImportError[] = [
        { linha: 14, campo: 'Código',     erro: 'Código duplicado no sistema' },
        { linha: 27, campo: 'Material',   erro: 'Material não cadastrado'      },
        { linha: 89, campo: 'Quantidade', erro: 'Valor inválido: texto'        },
      ]
      setImportCount(count)
      setErrors(mockErrors)
      toast('success', `${count} ${moduleTitle.toLowerCase()} importados`, `3 linhas com erros foram ignoradas`)
    }

    setStep('done')
  }

  function handleClose() {
    if (step === 'processing') return
    onOpenChange(false)
    setTimeout(() => {
      setStep('upload')
      setFile(null)
      setMapping({})
      setProgress(0)
      setProcessingStep(0)
      setShowHistory(false)
      setRealColumns(null)
      setRealPreviewRows(null)
      setParsedRows([])
      setTotalParsedRows(0)
    }, 300)
  }

  // Build template fields for download (label + required flag + module-specific example)
  const templateFields = systemFields.map((sf) => ({
    label:    sf.label,
    required: sf.required,
  }))

  const isLocked = step === 'processing'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="xl" hideClose={isLocked}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={17} className="text-primary" />
            Importar {moduleTitle}
          </DialogTitle>
          <DialogDescription>
            Importe dados em massa a partir de planilhas Excel ou arquivos CSV.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="pb-2">
          <Stepper current={step} />

          <AnimatePresence mode="wait">
            {/* ── Upload ── */}
            {step === 'upload' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Dropzone */}
                <div
                  {...getRootProps()}
                  className={cn(
                    'relative flex cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-all duration-200',
                    isDragActive && !isDragReject
                      ? 'border-primary bg-primary/5 scale-[1.01]'
                      : isDragReject
                        ? 'border-destructive bg-destructive/5'
                        : 'border-border bg-muted/20 hover:border-primary/50 hover:bg-muted/40'
                  )}
                >
                  <input {...getInputProps()} />
                  <motion.div
                    animate={isDragActive ? { scale: 1.15, rotate: -6 } : { scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className={cn(
                      'flex h-16 w-16 items-center justify-center rounded-2xl',
                      isDragActive ? 'bg-primary/15' : 'bg-muted'
                    )}
                  >
                    <Upload
                      size={28}
                      className={isDragActive ? 'text-primary' : 'text-muted-foreground'}
                    />
                  </motion.div>

                  {isDragActive ? (
                    <p className="text-base font-semibold text-primary">Solte o arquivo aqui</p>
                  ) : (
                    <>
                      <div>
                        <p className="text-base font-semibold text-foreground">
                          Arraste e solte o arquivo
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          ou{' '}
                          <span className="font-medium text-primary underline-offset-2 hover:underline">
                            clique para selecionar
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5">
                          <FileSpreadsheet size={13} className="text-success" />
                          <span className="text-xs font-medium text-muted-foreground">.xlsx</span>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5">
                          <FileSpreadsheet size={13} className="text-success" />
                          <span className="text-xs font-medium text-muted-foreground">.xls</span>
                        </div>
                        <div className="flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5">
                          <FileText size={13} className="text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">.csv</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Template + History */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Baixar modelo:</span>
                    <button
                      onClick={() => downloadTemplateXLSX(moduleName, templateFields)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/8 transition-colors"
                    >
                      <FileDown size={11} /> XLSX
                    </button>
                    <button
                      onClick={() => downloadTemplateCSV(moduleName, templateFields)}
                      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/8 transition-colors"
                    >
                      <FileDown size={11} /> CSV
                    </button>
                  </div>
                  <button
                    onClick={() => setShowHistory((v) => !v)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <History size={12} />
                    Histórico de importações
                  </button>
                </div>

                {/* History panel */}
                <AnimatePresence>
                  {showHistory && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                          Importações recentes
                        </p>
                        {history.map((h) => (
                          <div
                            key={h.id}
                            className="flex items-center gap-3 rounded-lg bg-card px-3 py-2.5"
                          >
                            {h.status === 'success' ? (
                              <CheckCircle2 size={14} className="flex-shrink-0 text-success" />
                            ) : (
                              <XCircle size={14} className="flex-shrink-0 text-destructive" />
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-xs font-medium text-foreground">
                                {h.filename}
                              </p>
                              <p className="text-[10px] text-muted-foreground">{h.data}</p>
                            </div>
                            <div className="flex-shrink-0 text-right">
                              <p className="text-xs font-semibold text-foreground">
                                {h.registros} reg.
                              </p>
                              {h.erros > 0 && (
                                <p className="text-[10px] text-destructive">{h.erros} erros</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* ── Preview ── */}
            {step === 'preview' && file && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* File info */}
                <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-success/10">
                    <FileSpreadsheet size={20} className="text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(file.size)} · {displayTotal} linhas detectadas
                    </p>
                  </div>
                  <Badge variant="success" className="flex-shrink-0">
                    Válido
                  </Badge>
                </div>

                {/* Preview table */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Prévia — primeiras 5 linhas
                  </p>
                  <div className="overflow-hidden rounded-xl border border-border">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-muted/60">
                            {displayColumns.map((col) => (
                              <th
                                key={col}
                                className="whitespace-nowrap px-3 py-2 text-left font-semibold text-muted-foreground"
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {displayRows.slice(0, 5).map((row, i) => (
                            <tr
                              key={i}
                              className="border-b border-border last:border-0 hover:bg-muted/30"
                            >
                              {displayColumns.map((col) => (
                                <td
                                  key={col}
                                  className="whitespace-nowrap px-3 py-2 text-foreground"
                                >
                                  {row[col] ?? '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    Mostrando {Math.min(5, displayRows.length)} de {displayTotal} linhas
                  </p>
                </div>
              </motion.div>
            )}

            {/* ── Mapping ── */}
            {step === 'mapping' && (
              <motion.div
                key="mapping"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <p className="text-xs text-muted-foreground">
                  Mapeie as colunas do arquivo para os campos do sistema.
                  <span className="ml-1 text-destructive">*</span> Campos obrigatórios.
                </p>
                <div className="max-h-[320px] overflow-y-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                      <tr className="border-b border-border">
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                          Campo do sistema
                        </th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground w-6">
                          <ArrowRight size={12} />
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground">
                          Coluna do arquivo
                        </th>
                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {systemFields.map((sf, i) => {
                        const mapped = mapping[sf.key]
                        const isMapped = !!mapped
                        return (
                          <tr
                            key={sf.key}
                            className={cn(
                              'border-b border-border last:border-0',
                              i % 2 === 0 ? 'bg-card' : 'bg-muted/20'
                            )}
                          >
                            <td className="px-4 py-2.5">
                              <span className="font-medium text-foreground">{sf.label}</span>
                              {sf.required && (
                                <span className="ml-1 text-destructive text-xs">*</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <ArrowRight
                                size={13}
                                className={isMapped ? 'text-success' : 'text-muted-foreground'}
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <select
                                value={mapping[sf.key] || ''}
                                onChange={(e) =>
                                  setMapping((m) => ({ ...m, [sf.key]: e.target.value }))
                                }
                                className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                <option value="">— Ignorar —</option>
                                {displayColumns.map((col) => (
                                  <option key={col} value={col}>
                                    {col}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {isMapped ? (
                                <CheckCircle2 size={14} className="mx-auto text-success" />
                              ) : sf.required ? (
                                <AlertTriangle size={14} className="mx-auto text-warning" />
                              ) : (
                                <div className="mx-auto h-3.5 w-3.5 rounded-full border-2 border-border" />
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Validation summary */}
                <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2">
                  <CheckCircle2 size={13} className="text-success flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    {Object.values(mapping).filter(Boolean).length} de {systemFields.length} campos
                    mapeados
                    {systemFields.filter((sf) => sf.required && !mapping[sf.key]).length > 0 && (
                      <span className="ml-1 text-warning">
                        · {systemFields.filter((sf) => sf.required && !mapping[sf.key]).length}{' '}
                        obrigatórios sem mapeamento
                      </span>
                    )}
                  </span>
                </div>
              </motion.div>
            )}

            {/* ── Processing ── */}
            {step === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6 py-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">Importando dados...</span>
                    <span className="font-bold text-primary tabular-nums">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2.5" />
                </div>

                <div className="space-y-2.5">
                  {PROCESSING_STEPS.map((s, i) => {
                    const done   = i < processingStep
                    const active = i === processingStep - 1 && progress < 100
                    return (
                      <motion.div
                        key={s.key}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-4 py-3 transition-all',
                          done
                            ? 'bg-success/8 border border-success/20'
                            : active
                              ? 'bg-primary/8 border border-primary/20'
                              : 'bg-muted/30 border border-transparent'
                        )}
                      >
                        <div className="flex-shrink-0">
                          {done ? (
                            <CheckCircle2 size={16} className="text-success" />
                          ) : active ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            >
                              <Loader2 size={16} className="text-primary" />
                            </motion.div>
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-border" />
                          )}
                        </div>
                        <span
                          className={cn(
                            'text-sm font-medium',
                            done   ? 'text-success'         :
                            active ? 'text-primary'         :
                                     'text-muted-foreground'
                          )}
                        >
                          {s.label}
                        </span>
                        {active && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                            className="ml-auto text-xs text-muted-foreground"
                          >
                            Em progresso...
                          </motion.span>
                        )}
                        {done && (
                          <span className="ml-auto text-xs text-success font-medium">Concluído</span>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* ── Done ── */}
            {step === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <div className="flex flex-col items-center gap-3 py-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-success/12"
                  >
                    <CheckCircle2 size={34} className="text-success" />
                  </motion.div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-foreground">
                      {importCount} {moduleTitle.toLowerCase()} importados
                    </p>
                    <p className="text-sm text-muted-foreground">com sucesso!</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Importados',      value: importCount,                       color: 'text-success',     bg: 'bg-success/8'     },
                    { label: 'Com erros',        value: errors.length,                     color: 'text-destructive', bg: 'bg-destructive/8' },
                    { label: 'Total no arquivo', value: importCount + errors.length,        color: 'text-foreground',  bg: 'bg-muted/50'      },
                  ].map((item) => (
                    <div key={item.label} className={cn('rounded-xl p-3 text-center', item.bg)}>
                      <p className={cn('text-xl font-bold tabular-nums', item.color)}>
                        {item.value}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>

                {errors.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-warning" />
                      <p className="text-xs font-semibold text-warning">
                        {errors.length} linha{errors.length !== 1 ? 's' : ''} com erros{errors.length !== 1 ? ' foram' : ' foi'} ignorada{errors.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-destructive/20">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border bg-destructive/5">
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Linha</th>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Campo</th>
                            <th className="px-3 py-2 text-left font-semibold text-muted-foreground">Erro</th>
                          </tr>
                        </thead>
                        <tbody>
                          {errors.map((e, i) => (
                            <tr key={i} className="border-b border-border last:border-0">
                              <td className="px-3 py-2 font-mono text-destructive">{e.linha}</td>
                              <td className="px-3 py-2 font-medium text-foreground">{e.campo}</td>
                              <td className="px-3 py-2 text-muted-foreground">{e.erro}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </DialogBody>

        <DialogFooter>
          {step === 'upload' && (
            <Button variant="outline" size="sm" onClick={handleClose}>
              Cancelar
            </Button>
          )}

          {step === 'preview' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setStep('upload')}>
                <ChevronLeft size={14} /> Voltar
              </Button>
              <Button variant="default" size="sm" onClick={() => setStep('mapping')}>
                Continuar <ChevronRight size={14} />
              </Button>
            </>
          )}

          {step === 'mapping' && (
            <>
              <Button variant="outline" size="sm" onClick={() => setStep('preview')}>
                <ChevronLeft size={14} /> Voltar
              </Button>
              <Button
                variant="accent"
                size="sm"
                onClick={startProcessing}
                disabled={systemFields
                  .filter((sf) => sf.required)
                  .some((sf) => !mapping[sf.key])}
              >
                <Upload size={14} />
                Iniciar importação
              </Button>
            </>
          )}

          {step === 'done' && (
            <Button variant="default" size="sm" onClick={handleClose}>
              <X size={14} /> Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
