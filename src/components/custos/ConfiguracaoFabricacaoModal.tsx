'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Settings2, Save, X, Package, Check } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogBody, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label }  from '@/components/ui/label'
import { Input }  from '@/components/ui/input'
import { useCustos } from '@/contexts/CustosContext'
import { useConfiguracoesFabricacao } from '@/contexts/ConfiguracoesFabricacaoContext'
import { cn } from '@/lib/utils'
import { TIPO_MATERIAL_LABELS } from '@/types/custos'
import type { Peca } from '@/types'
import type { ConfiguracaoFabricacao } from '@/types/configuracoes-fabricacao'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfigModalProps {
  open:         boolean
  onOpenChange: (v: boolean) => void
  peca:         Peca
  editing?:     ConfiguracaoFabricacao | null
}

interface CfgForm {
  materialId: string
  dobra:      boolean
  solda:      boolean
  pintura:    boolean
  montagem:   boolean
  observacoes:string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConfiguracaoFabricacaoModal({ open, onOpenChange, peca, editing }: ConfigModalProps) {
  const { materiais }                = useCustos()
  const { criarConfiguracao, atualizarConfiguracao } = useConfiguracoesFabricacao()
  const isEdit = !!editing

  const [form,    setForm]    = useState<CfgForm>({ materialId:'', dobra:true, solda:false, pintura:false, montagem:true, observacoes:'' })
  const [search,  setSearch]  = useState('')
  const [errors,  setErrors]  = useState<{ materialId?: string }>({})
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    if (open) {
      setSearch('')
      setErrors({})
      setSaving(false)
      if (editing) {
        setForm({
          materialId:  editing.materialId,
          dobra:       editing.dobra,
          solda:       editing.solda,
          pintura:     editing.pintura,
          montagem:    editing.montagem,
          observacoes: editing.observacoes ?? '',
        })
      } else {
        setForm({ materialId:'', dobra: !!peca.tempoDobraMin, solda: !!peca.tempoSoldaMin, pintura: !!peca.tempoPinturaMin, montagem: !!peca.tempoMontagemMin, observacoes:'' })
      }
    }
  }, [open, editing, peca])

  const activeMateriais = useMemo(
    () => materiais.filter((m) => m.ativo),
    [materiais]
  )

  const filteredMateriais = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return activeMateriais
    return activeMateriais.filter((m) =>
      (m.descricao ?? m.material).toLowerCase().includes(q) ||
      m.bitola?.toLowerCase().includes(q) ||
      m.fornecedor?.toLowerCase().includes(q)
    )
  }, [activeMateriais, search])

  const selectedMaterial = useMemo(
    () => activeMateriais.find((m) => m.id === form.materialId),
    [activeMateriais, form.materialId]
  )

  function toggle(field: 'dobra' | 'solda' | 'pintura' | 'montagem') {
    setForm((f) => ({ ...f, [field]: !f[field] }))
  }

  async function handleSave() {
    if (!form.materialId) { setErrors({ materialId: 'Selecione um material' }); return }
    if (saving) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 350))

    if (isEdit && editing) {
      atualizarConfiguracao(editing.id, {
        materialId:  form.materialId,
        dobra:       form.dobra,
        solda:       form.solda,
        pintura:     form.pintura,
        montagem:    form.montagem,
        observacoes: form.observacoes.trim() || undefined,
      })
    } else {
      criarConfiguracao({
        pecaId:      peca.id,
        materialId:  form.materialId,
        dobra:       form.dobra,
        solda:       form.solda,
        pintura:     form.pintura,
        montagem:    form.montagem,
        observacoes: form.observacoes.trim() || undefined,
      })
    }

    setSaving(false)
    onOpenChange(false)
  }

  const processFlags = [
    { key: 'dobra'    as const, label: 'Dobra',    alwaysFalse: false, pieca: (peca.tempoDobraMin   ?? 0) > 0 },
    { key: 'solda'    as const, label: 'Solda',    alwaysFalse: false, pieca: (peca.tempoSoldaMin   ?? 0) > 0 },
    { key: 'pintura'  as const, label: 'Pintura',  alwaysFalse: false, pieca: (peca.tempoPinturaMin ?? 0) > 0 },
    { key: 'montagem' as const, label: 'Montagem', alwaysFalse: false, pieca: (peca.tempoMontagemMin?? 0) > 0 },
  ]

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v) }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 size={15} className="text-primary" />
            {isEdit ? 'Editar Configuração' : 'Nova Configuração de Fabricação'}
          </DialogTitle>
          <DialogDescription>
            {peca.codigo} — {peca.descricao}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">

          {/* Material selector */}
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Material <span className="text-destructive">*</span>
            </Label>

            {/* Search */}
            <Input
              placeholder="Pesquisar material…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-xs"
            />

            {/* Material list */}
            <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {filteredMateriais.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">Nenhum material encontrado</div>
              ) : (
                filteredMateriais.map((m) => {
                  const isSelected = form.materialId === m.id
                  return (
                    <button
                      key={m.id} type="button"
                      onClick={() => { setForm((f) => ({ ...f, materialId: m.id })); setErrors({}) }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                        isSelected ? 'bg-primary/8' : 'hover:bg-muted/40'
                      )}
                    >
                      <div className={cn(
                        'h-4 w-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors',
                        isSelected ? 'bg-primary border-primary' : 'border-border'
                      )}>
                        {isSelected && <Check size={10} className="text-white" />}
                      </div>
                      <Package size={12} className="text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {m.descricao ?? m.material}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {m.tipoMaterial ? TIPO_MATERIAL_LABELS[m.tipoMaterial] : m.material}
                          {m.fornecedor ? ` · ${m.fornecedor}` : ''}
                          {' · '}R${m.valorKg.toFixed(2)}/kg
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-accent">{m.codigo}</span>
                    </button>
                  )
                })
              )}
            </div>
            {errors.materialId && <p className="text-[11px] text-destructive">{errors.materialId}</p>}

            {/* Selected summary */}
            {selectedMaterial && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs">
                <span className="font-medium text-primary">{selectedMaterial.codigo}</span>
                {' — '}
                <span className="text-foreground">{selectedMaterial.descricao ?? selectedMaterial.material}</span>
                {' '}
                <span className="text-muted-foreground">· R${selectedMaterial.valorKg.toFixed(2)}/kg</span>
              </div>
            )}
          </div>

          {/* Process flags */}
          <div className="space-y-2">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Processos Incluídos
            </Label>
            <p className="text-[10px] text-muted-foreground">
              Corte, Engenharia e Programação são sempre incluídos. Ative os processos opcionais:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {processFlags.map(({ key, label, pieca }) => (
                <button
                  key={key} type="button"
                  onClick={() => toggle(key)}
                  className={cn(
                    'flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-all',
                    form[key]
                      ? 'border-primary/40 bg-primary/8 text-foreground'
                      : 'border-border bg-muted/20 text-muted-foreground'
                  )}
                >
                  <span className="font-medium">{label}</span>
                  <div className="flex items-center gap-1.5">
                    {!pieca && (
                      <span className="text-[9px] text-muted-foreground/60">sem tempo</span>
                    )}
                    <div className={cn(
                      'h-4 w-4 rounded border flex items-center justify-center transition-colors',
                      form[key] ? 'bg-primary border-primary' : 'border-border'
                    )}>
                      {form[key] && <Check size={10} className="text-white" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Observações
            </Label>
            <textarea
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              rows={2}
              placeholder="ex: Galvanizado Z275 — sem pintura, ambiente corrosivo"
              className="w-full resize-none rounded-lg border border-border bg-input px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

        </DialogBody>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            <X size={13} /> Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="min-w-[160px]">
            {saving ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
                <Save size={13} />
              </motion.div>
            ) : (
              <><Save size={13} /> {isEdit ? 'Salvar' : 'Criar Configuração'}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
