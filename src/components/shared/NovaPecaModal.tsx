'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Loader2, CheckCircle2, AlertTriangle, Zap } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogBody, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/lib/toast'
import { BITOLAS, getBitolaEspessura, formatEspessura } from '@/lib/pecas/bitolaMap'
import { nextPartSequence, generatePartCode, isCodeDuplicate } from '@/lib/pecas/codeGenerator'
import type { Peca } from '@/types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface NovaPecaModalProps {
  open: boolean
  onOpenChange: (v: boolean) => void
  existingPecas: Peca[]
  onSave: (peca: Peca) => void
}

interface FormState {
  bitola: string
  revisao: string
  descricao: string
  grupo: string
  familia: string
  cor: string
  codigoSistema: string
}

type FormErrors = Partial<Record<keyof FormState, string>>

const EMPTY_FORM: FormState = {
  bitola: '14', revisao: 'A',
  descricao: '', grupo: '', familia: '', cor: '', codigoSistema: '',
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

export function NovaPecaModal({ open, onOpenChange, existingPecas, onSave }: NovaPecaModalProps) {
  const [form, setForm]           = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors]       = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)

  const nextSeq       = useMemo(() => nextPartSequence(existingPecas), [existingPecas])
  const generatedCode = useMemo(
    () => generatePartCode(nextSeq, form.bitola, form.revisao),
    [nextSeq, form.bitola, form.revisao],
  )
  const isDuplicate = useMemo(
    () => isCodeDuplicate(generatedCode, existingPecas),
    [generatedCode, existingPecas],
  )
  const espessuraAuto = useMemo(() => getBitolaEspessura(form.bitola), [form.bitola])

  useEffect(() => {
    if (open) { setForm(EMPTY_FORM); setErrors({}); setIsLoading(false) }
  }, [open])

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setErrors((e) => { const n = { ...e }; delete n[field]; return n })
  }

  function validate(): boolean {
    const e: FormErrors = {}
    if (!form.descricao.trim())               e.descricao = 'Descrição é obrigatória'
    if (!form.grupo.trim())                   e.grupo     = 'Grupo é obrigatório'
    if (!form.familia.trim())                 e.familia   = 'Família é obrigatória'
    if (!form.revisao.trim())                 e.revisao   = 'Revisão é obrigatória'
    if (!/^[A-Za-z]{1,2}$/.test(form.revisao)) e.revisao = 'Use 1-2 letras (A, B, AA…)'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate() || isDuplicate || isLoading) return
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 550)) // Future: Supabase insert

    const newPeca: Peca = {
      id:             `peca-${Date.now()}`,
      codigo:         generatedCode,
      espessura:      espessuraAuto ?? 0,
      descricao:      form.descricao.trim().toUpperCase(),
      grupo:          form.grupo.trim(),
      familia:        form.familia.trim(),
      codigoSistema:  form.codigoSistema.trim(),
      areaPeca:       0,
      desperdicio:    0,
      percFabricacao: 0,
      percPintura:    0,
      peso:           0,
      cor:            form.cor.trim() || 'Natural',
      arquivo3d:      '',
      planoDobra:     '',
      atualizadoEm:   new Date().toISOString(),
    }

    onSave(newPeca)
    setIsLoading(false)
    onOpenChange(false)
    toast('success', `Peça ${generatedCode} registrada`, `${newPeca.descricao.slice(0, 48)}…`)
  }

  const canSave = form.descricao.trim() && form.grupo.trim() && form.familia.trim()
    && form.revisao.trim() && !isDuplicate && !isLoading

  const segments = [
    { val: 'ES.FAB',                                    lbl: 'Prefixo'   },
    { val: String(nextSeq).padStart(5, '0'),             lbl: 'Sequência' },
    { val: form.bitola  || '??',                         lbl: 'Bitola'    },
    { val: form.revisao.toUpperCase().slice(0,2) || '?', lbl: 'Revisão'  },
  ]

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isLoading) onOpenChange(v) }}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package size={17} className="text-primary" />
            Nova Peça
          </DialogTitle>
          <DialogDescription>
            Preencha os dados técnicos. O código é gerado automaticamente conforme o padrão ES.FAB.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5">

          {/* ── Code preview ── */}
          <div
            className="overflow-hidden rounded-2xl border border-primary/20"
            style={{ background: 'linear-gradient(135deg, rgba(0,0,128,0.07) 0%, rgba(15,76,92,0.11) 100%)' }}
          >
            <div className="flex items-center justify-between border-b border-primary/12 px-4 py-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-primary/55">
                Código gerado automaticamente
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
              {segments.map((seg, i) => (
                <React.Fragment key={seg.lbl}>
                  <div className="flex flex-col items-center gap-1">
                    <span className="rounded border border-border/50 bg-card/70 px-2.5 py-1 font-mono text-xs font-bold text-foreground">
                      {seg.val}
                    </span>
                    <span className="text-[9px] text-muted-foreground">{seg.lbl}</span>
                  </div>
                  {i < segments.length - 1 && (
                    <span className="mt-0.5 self-start pt-1 text-sm text-muted-foreground/40">·</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

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
              <p className="text-[10px] text-muted-foreground">
                Derivado da bitola selecionada
              </p>
            </Field>

          </div>

          {/* REVISÃO — below the bitola/espessura row */}
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
              placeholder="Ex: SUPORTE DE FIXAÇÃO DO TETO PROTETOR 700MM X 300MM P/ QUADRO 700(L)X300(P)"
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
              <Input value={form.cor} onChange={(e) => set('cor', e.target.value)} placeholder="Ex: Preto, Natural, Grafite" />
            </Field>
            <Field label="Código do Sistema">
              <Input value={form.codigoSistema} onChange={(e) => set('codigoSistema', e.target.value)} placeholder="Ex: SYS-SP-100" className="font-mono" />
            </Field>
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
                Registrando…
              </>
            ) : (
              <><Package size={14} /> Registrar Peça</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
