'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pencil, Loader2, CheckCircle2, AlertTriangle, Lock, Zap } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogBody, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/lib/toast'
import { logActionAudit } from '@/lib/security/importSecurity'
import { BITOLAS, getBitolaEspessura, getBitolaFromEspessura, formatEspessura } from '@/lib/pecas/bitolaMap'
import { parsePecaCode, generatePartCode } from '@/lib/pecas/codeGenerator'
import type { Peca } from '@/types'
import { useAuth } from '@/contexts/AuthContext'

// ─── Types ────────────────────────────────────────────────────────────────────

interface EditarPecaModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  editingPeca: Peca | null
  existingPecas: Peca[]
  onSave: (updated: Peca) => void
}

interface EditForm {
  bitola:         string
  revisao:        string
  descricao:      string
  grupo:          string
  familia:        string
  cor:            string
  codigoSistema:  string
  areaPeca:       string
  desperdicio:    string
  percFabricacao: string
  percPintura:    string
  peso:           string
}

type EditErrors = Partial<Record<keyof EditForm, string>>

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initForm(peca: Peca): EditForm {
  const parsed = parsePecaCode(peca.codigo)
  // ES.FAB code: bitola is embedded; legacy code: reverse-map espessura → bitola
  const bitola = parsed
    ? parsed.bitola
    : (getBitolaFromEspessura(peca.espessura) ?? '14')
  return {
    bitola,
    revisao:        parsed ? parsed.revisao : 'A',
    descricao:      peca.descricao,
    grupo:          peca.grupo,
    familia:        peca.familia,
    cor:            peca.cor,
    codigoSistema:  peca.codigoSistema,
    areaPeca:       String(peca.areaPeca),
    desperdicio:    String(peca.desperdicio),
    percFabricacao: String(peca.percFabricacao),
    percPintura:    String(peca.percPintura),
    peso:           String(peca.peso),
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="h-px flex-1 bg-border" />
    </div>
  )
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}{required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden text-[11px] text-destructive"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditarPecaModal({
  open, onOpenChange, editingPeca, existingPecas, onSave,
}: EditarPecaModalProps) {
  const { user } = useAuth()
  const [form, setForm]           = useState<EditForm | null>(null)
  const [errors, setErrors]       = useState<EditErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  const parsed  = useMemo(() => editingPeca ? parsePecaCode(editingPeca.codigo) : null, [editingPeca])
  const isEsFab = parsed !== null
  const origSeq = parsed?.seq ?? 0

  useEffect(() => {
    if (open && editingPeca) { setForm(initForm(editingPeca)); setErrors({}); setIsLoading(false) }
  }, [open, editingPeca])

  const generatedCode = useMemo(() => {
    if (!isEsFab || !form) return editingPeca?.codigo ?? ''
    return generatePartCode(origSeq, form.bitola, form.revisao)
  }, [isEsFab, origSeq, form, editingPeca?.codigo])

  const isDuplicate = useMemo(() => {
    if (!isEsFab || !editingPeca) return false
    return existingPecas.some((p) => p.codigo === generatedCode && p.id !== editingPeca.id)
  }, [isEsFab, generatedCode, existingPecas, editingPeca])

  const espessuraAuto = useMemo(
    () => (form ? getBitolaEspessura(form.bitola) : null),
    [form],
  )

  function set(field: keyof EditForm, value: string) {
    setForm((f) => f ? { ...f, [field]: value } : f)
    setErrors((e) => { const n = { ...e }; delete n[field]; return n })
  }

  function validate(): boolean {
    if (!form) return false
    const e: EditErrors = {}
    if (!form.descricao.trim())               e.descricao = 'Descrição é obrigatória'
    if (!form.grupo.trim())                   e.grupo     = 'Grupo é obrigatório'
    if (!form.familia.trim())                 e.familia   = 'Família é obrigatória'
    if (!form.revisao.trim())                 e.revisao   = 'Revisão é obrigatória'
    if (!/^[A-Za-z]{1,2}$/.test(form.revisao)) e.revisao = 'Use 1-2 letras (A, B, AA…)'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!form || !editingPeca || !validate() || isDuplicate || isLoading) return
    setIsLoading(true)

    const initial      = initForm(editingPeca)
    const changedFields = (Object.keys(form) as (keyof EditForm)[]).filter((k) => form[k] !== initial[k])

    await new Promise((r) => setTimeout(r, 500)) // Future: Supabase update

    const updated: Peca = {
      ...editingPeca,
      codigo:         isEsFab ? generatedCode : editingPeca.codigo,
      espessura:      espessuraAuto ?? editingPeca.espessura,
      descricao:      form.descricao.trim().toUpperCase(),
      grupo:          form.grupo.trim(),
      familia:        form.familia.trim(),
      codigoSistema:  form.codigoSistema.trim(),
      areaPeca:       parseFloat(form.areaPeca)        || editingPeca.areaPeca,
      desperdicio:    parseFloat(form.desperdicio)     || editingPeca.desperdicio,
      percFabricacao: parseFloat(form.percFabricacao)  || editingPeca.percFabricacao,
      percPintura:    parseFloat(form.percPintura)     || editingPeca.percPintura,
      peso:           parseFloat(form.peso)            || editingPeca.peso,
      cor:            form.cor.trim() || editingPeca.cor,
      atualizadoEm:   new Date().toISOString(),
    }

    logActionAudit({
      userId:        user?.id      ?? 'anonymous',
      userName:      user?.nome    ?? 'Usuário',
      moduleName:    'pecas',
      actionType:    'edit',
      targetIds:     [editingPeca.id],
      targetSummary: updated.codigo,
      status:        'success',
      changedFields,
    })

    onSave(updated)
    setIsLoading(false)
    onOpenChange(false)
    toast('success', `Peça ${updated.codigo} atualizada`, `${changedFields.length} campo(s) alterado(s)`)
  }

  if (!form || !editingPeca) return null

  const canSave = form.descricao.trim() && form.grupo.trim() && form.familia.trim()
    && form.revisao.trim() && !isDuplicate && !isLoading

  const segments = isEsFab ? [
    { val: 'ES.FAB',                                    lbl: 'Prefixo'   },
    { val: String(origSeq).padStart(5, '0'),             lbl: 'Sequência' },
    { val: form.bitola  || '??',                         lbl: 'Bitola'    },
    { val: form.revisao.toUpperCase().slice(0,2) || '?', lbl: 'Revisão'  },
  ] : null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isLoading) onOpenChange(v) }}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil size={16} className="text-primary" />
            Editar Peça
          </DialogTitle>
          <DialogDescription>
            Altere os dados técnicos. O número de sequência original é sempre preservado.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">

          {/* ── Code preview ── */}
          {isEsFab ? (
            <div
              className="overflow-hidden rounded-2xl border border-primary/20"
              style={{ background: 'linear-gradient(135deg, rgba(0,0,128,0.07) 0%, rgba(15,76,92,0.11) 100%)' }}
            >
              <div className="flex items-center justify-between border-b border-primary/12 px-4 py-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-primary/55">
                  Código — sequência {String(origSeq).padStart(5, '0')} preservada
                </span>
                <span className={`flex items-center gap-1 text-[9px] font-semibold ${isDuplicate ? 'text-destructive' : 'text-success'}`}>
                  {isDuplicate
                    ? <><AlertTriangle size={9} /> Código já existe</>
                    : <><CheckCircle2 size={9} /> Disponível</>}
                </span>
              </div>

              <div className="py-4 text-center">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={generatedCode}
                    initial={{ opacity: 0.3, y: -5 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0.3, y: 5 }} transition={{ duration: 0.18 }}
                    className="font-mono text-2xl font-bold tracking-[0.18em] text-primary"
                  >
                    {generatedCode}
                  </motion.p>
                </AnimatePresence>
              </div>

              <div className="flex items-start justify-center gap-1 border-t border-primary/10 px-4 py-2.5">
                {segments!.map((seg, i) => (
                  <React.Fragment key={seg.lbl}>
                    <div className="flex flex-col items-center gap-1">
                      <span className="rounded border border-border/50 bg-card/70 px-2.5 py-1 font-mono text-xs font-bold text-foreground">
                        {seg.val}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{seg.lbl}</span>
                    </div>
                    {i < segments!.length - 1 && (
                      <span className="mt-0.5 self-start pt-1 text-sm text-muted-foreground/40">·</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
              <Lock size={14} className="flex-shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="font-mono text-sm font-bold text-primary">{editingPeca.codigo}</p>
                <p className="text-[10px] text-muted-foreground">Código legado — não editável pelo padrão ES.FAB</p>
              </div>
            </div>
          )}

          {/* ── Especificação Técnica ── */}
          <SectionLabel label="Especificação Técnica" />

          <div className="grid grid-cols-2 gap-4">

            {/* BITOLA */}
            <Field label="Bitola" required>
              <div className="flex flex-wrap gap-1.5">
                {BITOLAS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => set('bitola', b)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold tabular-nums transition-all duration-150 ${
                      form.bitola === b
                        ? 'bg-primary text-white shadow-sm ring-1 ring-primary/40'
                        : 'bg-muted text-muted-foreground hover:bg-muted/60'
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </Field>

            {/* ESPESSURA — auto-derived, readonly */}
            <Field label="Espessura (automática)">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 h-9">
                <Zap size={12} className="flex-shrink-0 text-primary/50" />
                <AnimatePresence mode="wait">
                  <motion.span
                    key={form.bitola}
                    initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }} transition={{ duration: 0.15 }}
                    className="font-mono text-sm font-bold text-foreground tabular-nums"
                  >
                    {espessuraAuto !== null ? formatEspessura(espessuraAuto) : '—'}
                  </motion.span>
                </AnimatePresence>
                <span className="ml-auto text-[9px] italic text-muted-foreground">automático</span>
              </div>
              <p className="text-[10px] text-muted-foreground">Derivado da bitola selecionada</p>
            </Field>

          </div>

          {/* REVISÃO */}
          <Field label="Revisão" required error={errors.revisao}>
            <div className="flex items-center gap-3">
              <Input
                value={form.revisao}
                onChange={(e) => set('revisao', e.target.value.toUpperCase().slice(0, 2))}
                maxLength={2}
                className={`w-20 text-center font-mono text-base font-bold uppercase tracking-widest ${errors.revisao ? 'border-destructive' : ''}`}
                placeholder="A"
              />
              <p className="text-[11px] text-muted-foreground">
                Letra única (A, B…)<br />
                <span className="text-[10px]">Dupla para revisão maior (AA)</span>
              </p>
            </div>
          </Field>

          {/* ── Descrição ── */}
          <SectionLabel label="Descrição Técnica" />

          <Field label="Descrição" required error={errors.descricao}>
            <textarea
              value={form.descricao}
              onChange={(e) => set('descricao', e.target.value)}
              rows={3}
              placeholder="Ex: SUPORTE DE FIXAÇÃO DO TETO PROTETOR 700MM X 300MM"
              className={`w-full resize-none rounded-lg border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring ${errors.descricao ? 'border-destructive' : 'border-border'}`}
            />
          </Field>

          {/* ── Classificação ── */}
          <SectionLabel label="Classificação" />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Grupo" required error={errors.grupo}>
              <Input value={form.grupo} onChange={(e) => set('grupo', e.target.value)} placeholder="Ex: Fixação, Estrutural" className={errors.grupo ? 'border-destructive' : ''} />
            </Field>
            <Field label="Família" required error={errors.familia}>
              <Input value={form.familia} onChange={(e) => set('familia', e.target.value)} placeholder="Ex: Suportes, Flanges" className={errors.familia ? 'border-destructive' : ''} />
            </Field>
          </div>

          {/* ── Referências ── */}
          <SectionLabel label="Referências" />

          <div className="grid grid-cols-2 gap-4">
            <Field label="Cor">
              <Input value={form.cor} onChange={(e) => set('cor', e.target.value)} placeholder="Ex: Preto, Natural" />
            </Field>
            <Field label="Código do Sistema">
              <Input value={form.codigoSistema} onChange={(e) => set('codigoSistema', e.target.value)} placeholder="Ex: SYS-SP-100" className="font-mono" />
            </Field>
          </div>

          {/* ── Dados Técnicos ── */}
          <SectionLabel label="Dados Técnicos (Calculados)" />

          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {([
              { key: 'areaPeca',       label: 'Área Peça mm²',  step: '0.01'   },
              { key: 'desperdicio',    label: 'Desperdício m²', step: '0.0001' },
              { key: 'percFabricacao', label: '% Fabricação',   step: '0.1'    },
              { key: 'percPintura',    label: '% Pintura',      step: '0.1'    },
              { key: 'peso',           label: 'Peso kg',        step: '0.01'   },
            ] as { key: keyof EditForm; label: string; step: string }[]).map(({ key, label, step }) => (
              <Field key={key} label={label}>
                <Input
                  type="number"
                  min="0"
                  step={step}
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="text-right font-mono tabular-nums"
                />
              </Field>
            ))}
          </div>

        </DialogBody>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button variant="accent" size="sm" onClick={handleSave} disabled={!canSave} className="min-w-[160px]">
            {isLoading ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
                  <Loader2 size={14} />
                </motion.div>
                Salvando…
              </>
            ) : (
              <><Pencil size={14} /> Salvar Alterações</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
