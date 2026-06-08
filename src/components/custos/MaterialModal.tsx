'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Save, X, Zap } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogBody, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Label }  from '@/components/ui/label'
import { useCustos } from '@/contexts/CustosContext'
import { derivarValorKg } from '@/lib/custos/engine'
import { cn } from '@/lib/utils'
import type { CustoMaterial, TipoMaterial } from '@/types/custos'
import { TIPO_MATERIAL_LABELS } from '@/types/custos'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MaterialModalProps {
  open:         boolean
  onOpenChange: (v: boolean) => void
  editingMaterial?: CustoMaterial | null
}

interface MatForm {
  tipoMaterial:   TipoMaterial
  material:       string
  bitola:         string
  espessura:      string
  larguraChapa:   string
  comprimentoChapa:string
  pesoChapa:      string
  valorChapa:     string
  fornecedor:     string
}

const BLANK: MatForm = {
  tipoMaterial:    'aco_carbono',
  material:        '',
  bitola:          '',
  espessura:       '3',
  larguraChapa:    '3000',
  comprimentoChapa:'1500',
  pesoChapa:       '',
  valorChapa:      '',
  fornecedor:      '',
}

function initForm(m: CustoMaterial): MatForm {
  return {
    tipoMaterial:    m.tipoMaterial    ?? 'aco_carbono',
    material:        m.material,
    bitola:          m.bitola          ?? '',
    espessura:       String(m.espessura),
    larguraChapa:    String(m.larguraChapa    ?? 3000),
    comprimentoChapa:String(m.comprimentoChapa?? 1500),
    pesoChapa:       String(m.pesoChapa),
    valorChapa:      String(m.valorChapa),
    fornecedor:      m.fornecedor ?? '',
  }
}

// ─── Next code helper ─────────────────────────────────────────────────────────

function nextMatCode(materiais: CustoMaterial[]): string {
  const nums = materiais
    .map((m) => parseInt(m.codigo?.replace('MAT-', '') ?? '0') || 0)
  return `MAT-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MaterialModal({ open, onOpenChange, editingMaterial }: MaterialModalProps) {
  const { materiais, criarMaterial, atualizarMaterial } = useCustos()
  const isEdit = !!editingMaterial

  const [form,    setForm]    = useState<MatForm>(BLANK)
  const [errors,  setErrors]  = useState<Partial<Record<keyof MatForm, string>>>({})
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    if (open) {
      setForm(editingMaterial ? initForm(editingMaterial) : BLANK)
      setErrors({})
      setSaving(false)
    }
  }, [open, editingMaterial])

  function set(k: keyof MatForm, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => { const n = { ...e }; delete n[k]; return n })
  }

  const valorKgAuto = useMemo(() => {
    const pc = parseFloat(form.pesoChapa)
    const vc = parseFloat(form.valorChapa)
    if (pc > 0 && vc > 0) return derivarValorKg(vc, pc)
    return null
  }, [form.pesoChapa, form.valorChapa])

  function validate(): boolean {
    const e: Partial<Record<keyof MatForm, string>> = {}
    if (!form.material.trim())          e.material    = 'Nome do material é obrigatório'
    if (!form.bitola.trim())            e.bitola      = 'Bitola é obrigatória'
    const esp = parseFloat(form.espessura)
    if (!esp || esp <= 0)               e.espessura   = 'Espessura inválida'
    const pc = parseFloat(form.pesoChapa)
    if (!pc || pc <= 0)                 e.pesoChapa   = 'Peso da chapa é obrigatório'
    const vc = parseFloat(form.valorChapa)
    if (!vc || vc <= 0)                 e.valorChapa  = 'Valor da chapa é obrigatório'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate() || saving) return
    setSaving(true)
    await new Promise((r) => setTimeout(r, 350))

    const pc  = parseFloat(form.pesoChapa)
    const vc  = parseFloat(form.valorChapa)
    const now = new Date()

    if (isEdit && editingMaterial) {
      atualizarMaterial(editingMaterial.id, {
        tipoMaterial:    form.tipoMaterial,
        material:        form.material.trim(),
        bitola:          form.bitola.trim() || undefined,
        espessura:       parseFloat(form.espessura),
        larguraChapa:    parseFloat(form.larguraChapa)    || 3000,
        comprimentoChapa:parseFloat(form.comprimentoChapa)|| 1500,
        pesoChapa:       pc,
        valorChapa:      vc,
        fornecedor:      form.fornecedor.trim() || undefined,
        descricao:       `${form.material.trim()} — Chapa ${form.bitola.trim()}`,
      }, 'Edição via modal')
    } else {
      const codigo = nextMatCode(materiais)
      criarMaterial({
        codigo,
        descricao:       `${form.material.trim()} — Chapa ${form.bitola.trim()}`,
        tipoMaterial:    form.tipoMaterial,
        material:        form.material.trim(),
        bitola:          form.bitola.trim() || undefined,
        espessura:       parseFloat(form.espessura),
        larguraChapa:    parseFloat(form.larguraChapa)    || 3000,
        comprimentoChapa:parseFloat(form.comprimentoChapa)|| 1500,
        pesoChapa:       pc,
        valorChapa:      vc,
        fornecedor:      form.fornecedor.trim() || undefined,
        dataAtualizacao: now,
        ativo:           true,
      })
    }

    setSaving(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!saving) onOpenChange(v) }}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package size={15} className="text-primary" />
            {isEdit ? 'Editar Material' : 'Novo Material'}
          </DialogTitle>
          <DialogDescription>
            {isEdit ? 'Atualize os dados do material no catálogo industrial.' : 'Cadastre um novo material no catálogo industrial.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">

          {/* Código (auto, readonly for new) */}
          {isEdit && editingMaterial?.codigo && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
              <span className="font-mono text-sm font-bold text-primary">{editingMaterial.codigo}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">código imutável</span>
            </div>
          )}

          {/* Tipo de Material */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Tipo de Material <span className="text-destructive">*</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.entries(TIPO_MATERIAL_LABELS) as [TipoMaterial, string][]).map(([k, label]) => (
                <button
                  key={k} type="button"
                  onClick={() => set('tipoMaterial', k)}
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-xs font-medium transition-all',
                    form.tipoMaterial === k
                      ? 'bg-primary text-white shadow-sm ring-1 ring-primary/40'
                      : 'bg-muted text-muted-foreground hover:bg-muted/60'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Material name + Bitola */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Material <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.material}
                onChange={(e) => set('material', e.target.value)}
                placeholder="ex: Aço Carbono 1020"
                className={errors.material ? 'border-destructive' : ''}
              />
              {errors.material && <p className="text-[11px] text-destructive">{errors.material}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Bitola <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.bitola}
                onChange={(e) => set('bitola', e.target.value)}
                placeholder="ex: 3mm"
                className={errors.bitola ? 'border-destructive' : ''}
              />
              {errors.bitola && <p className="text-[11px] text-destructive">{errors.bitola}</p>}
            </div>
          </div>

          {/* Espessura + Dimensions */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Espessura (mm) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number" min="0" step="0.5"
                value={form.espessura}
                onChange={(e) => set('espessura', e.target.value)}
                className={cn('tabular-nums', errors.espessura ? 'border-destructive' : '')}
              />
              {errors.espessura && <p className="text-[11px] text-destructive">{errors.espessura}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Largura Chapa (mm)</Label>
              <Input type="number" min="0" value={form.larguraChapa}
                onChange={(e) => set('larguraChapa', e.target.value)}
                className="tabular-nums" placeholder="3000" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Comprimento (mm)</Label>
              <Input type="number" min="0" value={form.comprimentoChapa}
                onChange={(e) => set('comprimentoChapa', e.target.value)}
                className="tabular-nums" placeholder="1500" />
            </div>
          </div>

          {/* Peso + Valor + Valor/kg auto */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Peso Chapa (kg) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number" min="0" step="0.1"
                value={form.pesoChapa}
                onChange={(e) => set('pesoChapa', e.target.value)}
                className={cn('tabular-nums', errors.pesoChapa ? 'border-destructive' : '')}
                placeholder="106"
              />
              {errors.pesoChapa && <p className="text-[11px] text-destructive">{errors.pesoChapa}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Valor da Chapa (R$) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number" min="0" step="10"
                value={form.valorChapa}
                onChange={(e) => set('valorChapa', e.target.value)}
                className={cn('tabular-nums', errors.valorChapa ? 'border-destructive' : '')}
                placeholder="1060"
              />
              {errors.valorChapa && <p className="text-[11px] text-destructive">{errors.valorChapa}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Valor/kg (auto)</Label>
              <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 h-9">
                <Zap size={11} className="text-primary/50 flex-shrink-0" />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={valorKgAuto ?? 'empty'}
                    initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}
                    className="font-mono text-sm font-bold text-foreground tabular-nums"
                  >
                    {valorKgAuto !== null
                      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorKgAuto)
                      : '—'
                    }
                  </motion.span>
                </AnimatePresence>
                <span className="ml-auto text-[9px] italic text-muted-foreground">automático</span>
              </div>
            </div>
          </div>

          {/* Fornecedor */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Fornecedor</Label>
            <Input
              value={form.fornecedor}
              onChange={(e) => set('fornecedor', e.target.value)}
              placeholder="ex: Aços Villares, Gerdau, Usiminas"
            />
          </div>

        </DialogBody>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={saving}>
            <X size={13} /> Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving} className="min-w-[140px]">
            {saving ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
                <Save size={13} />
              </motion.div>
            ) : (
              <><Save size={13} /> {isEdit ? 'Salvar Alterações' : 'Cadastrar Material'}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
