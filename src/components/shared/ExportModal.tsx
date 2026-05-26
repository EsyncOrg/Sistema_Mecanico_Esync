'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileSpreadsheet,
  FileText,
  FileDown,
  CheckCircle2,
  Loader2,
  Database,
  Filter,
  MousePointerSquareDashed,
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
import { cn } from '@/lib/utils'
import { toast } from '@/lib/toast'
import {
  exportCSV,
  exportXLSX,
  exportPDF,
  type ExportColumn,
  type ExportFormat,
} from '@/lib/exportUtils'

type ExportScope = 'all' | 'filtered' | 'selected'
type Phase = 'config' | 'processing' | 'done'

interface ExportModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  moduleName: string
  moduleTitle: string
  pdfSubtitle: string
  columns: ExportColumn[]
  allData: Record<string, unknown>[]
  filteredData: Record<string, unknown>[]
  selectedData: Record<string, unknown>[]
}

const FORMAT_OPTIONS: { key: ExportFormat; label: string; ext: string; icon: React.ElementType; desc: string }[] = [
  { key: 'xlsx', label: 'Excel', ext: '.xlsx', icon: FileSpreadsheet, desc: 'Planilha editável' },
  { key: 'csv', label: 'CSV', ext: '.csv', icon: FileText, desc: 'Texto separado por vírgula' },
  { key: 'pdf', label: 'PDF', ext: '.pdf', icon: FileDown, desc: 'Relatório industrial' },
]

export function ExportModal({
  open,
  onOpenChange,
  moduleName,
  moduleTitle,
  pdfSubtitle,
  columns,
  allData,
  filteredData,
  selectedData,
}: ExportModalProps) {
  const [scope, setScope] = useState<ExportScope>('filtered')
  const [format, setFormat] = useState<ExportFormat>('xlsx')
  const [phase, setPhase] = useState<Phase>('config')

  const scopeOptions = [
    { key: 'all' as ExportScope, label: 'Todos os dados', count: allData.length, icon: Database },
    { key: 'filtered' as ExportScope, label: 'Dados filtrados', count: filteredData.length, icon: Filter },
    {
      key: 'selected' as ExportScope,
      label: 'Selecionados',
      count: selectedData.length,
      icon: MousePointerSquareDashed,
      disabled: selectedData.length === 0,
    },
  ]

  const activeData = scope === 'all' ? allData : scope === 'filtered' ? filteredData : selectedData
  const filename = `esync-${moduleName}-${new Date().toISOString().slice(0, 10)}`

  function handleClose() {
    if (phase === 'processing') return
    onOpenChange(false)
    setTimeout(() => setPhase('config'), 300)
  }

  async function handleExport() {
    setPhase('processing')
    await new Promise((r) => setTimeout(r, 1400))

    try {
      if (format === 'csv') {
        exportCSV(filename, columns, activeData)
      } else if (format === 'xlsx') {
        await exportXLSX(filename, columns, activeData)
      } else {
        await exportPDF(filename, moduleTitle, pdfSubtitle, columns, activeData)
      }
      setPhase('done')
      toast('success', 'Exportação concluída', `${activeData.length} registros exportados como ${format.toUpperCase()}`)
    } catch {
      setPhase('config')
      toast('error', 'Erro na exportação', 'Não foi possível gerar o arquivo.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="md" hideClose={phase === 'processing'}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileDown size={17} className="text-accent" />
            Exportar {moduleTitle}
          </DialogTitle>
          <DialogDescription>
            Escolha o escopo e o formato do arquivo a ser gerado.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <AnimatePresence mode="wait">
            {/* ── Config ── */}
            {phase === 'config' && (
              <motion.div
                key="config"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-5"
              >
                {/* Scope */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Dados a exportar
                  </p>
                  <div className="space-y-1.5">
                    {scopeOptions.map((opt) => {
                      const Icon = opt.icon
                      return (
                        <button
                          key={opt.key}
                          disabled={opt.disabled}
                          onClick={() => !opt.disabled && setScope(opt.key)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                            scope === opt.key && !opt.disabled
                              ? 'border-primary/40 bg-primary/8 ring-1 ring-primary/20'
                              : 'border-border bg-muted/30 hover:bg-muted/60',
                            opt.disabled && 'cursor-not-allowed opacity-40'
                          )}
                        >
                          <div
                            className={cn(
                              'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg',
                              scope === opt.key && !opt.disabled
                                ? 'bg-primary/15 text-primary'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            <Icon size={14} />
                          </div>
                          <span className="flex-1 text-sm font-medium text-foreground">
                            {opt.label}
                          </span>
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-xs font-bold tabular-nums',
                              scope === opt.key && !opt.disabled
                                ? 'bg-primary/15 text-primary'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {opt.count}
                          </span>
                          <div
                            className={cn(
                              'h-4 w-4 rounded-full border-2 transition-all',
                              scope === opt.key && !opt.disabled
                                ? 'border-primary bg-primary'
                                : 'border-border'
                            )}
                          >
                            {scope === opt.key && !opt.disabled && (
                              <div className="flex h-full items-center justify-center">
                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Format */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Formato
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {FORMAT_OPTIONS.map((f) => {
                      const Icon = f.icon
                      return (
                        <button
                          key={f.key}
                          onClick={() => setFormat(f.key)}
                          className={cn(
                            'flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-all',
                            format === f.key
                              ? 'border-accent/40 bg-accent/8 ring-1 ring-accent/20'
                              : 'border-border bg-muted/30 hover:bg-muted/60'
                          )}
                        >
                          <Icon
                            size={22}
                            className={format === f.key ? 'text-accent' : 'text-muted-foreground'}
                          />
                          <div>
                            <p
                              className={cn(
                                'text-sm font-semibold',
                                format === f.key ? 'text-accent' : 'text-foreground'
                              )}
                            >
                              {f.label}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Processing ── */}
            {phase === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 py-8"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10"
                >
                  <Loader2 size={26} className="text-primary" />
                </motion.div>
                <div className="text-center">
                  <p className="text-base font-semibold text-foreground">Gerando arquivo...</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Exportando {activeData.length} registros como {format.toUpperCase()}
                  </p>
                </div>
                <div className="w-full max-w-xs overflow-hidden rounded-full bg-muted h-1.5">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1.3, ease: 'easeInOut' }}
                  />
                </div>
              </motion.div>
            )}

            {/* ── Done ── */}
            {phase === 'done' && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-3 py-8"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-success/12"
                >
                  <CheckCircle2 size={30} className="text-success" />
                </motion.div>
                <div className="text-center">
                  <p className="text-base font-semibold text-foreground">Exportação concluída!</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {activeData.length} registros exportados
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground font-mono">
                    {filename}.{format}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogBody>

        <DialogFooter>
          {phase === 'config' && (
            <>
              <Button variant="outline" size="sm" onClick={handleClose}>
                Cancelar
              </Button>
              <Button variant="accent" size="sm" onClick={handleExport}>
                <FileDown size={14} />
                Exportar {activeData.length} registros
              </Button>
            </>
          )}
          {phase === 'done' && (
            <Button variant="default" size="sm" onClick={handleClose}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
