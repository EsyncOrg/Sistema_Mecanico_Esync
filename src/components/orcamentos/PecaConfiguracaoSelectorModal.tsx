'use client'

// ─── Per-Piece Configuration Selector Modal — Phase 7.1 ──────────────────────
//
// Used when a quotation item has tipo='peca'.
// Requires the user to select ONE ConfiguracaoFabricacao for the piece.
//
// If no configurations exist for this piece:
//   - Shows a warning with a link to Custos → Configurações de Fabricação.
//   - Blocks confirmation.
//
// On "Confirmar":
//   - Calls OrcamentoConfiguracoesContext.salvarPecaItemSelecao()
//   - The context stores configuracaoFabricacaoId + derived custoUnitario.

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Settings, Check, AlertTriangle, ExternalLink, Calculator,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogBody, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn }    from '@/lib/utils'
import { useCustos }                         from '@/contexts/CustosContext'
import { useConfiguracoesFabricacao }        from '@/contexts/ConfiguracoesFabricacaoContext'
import { useOrcamentoConfiguracoes }         from '@/contexts/OrcamentoConfiguracoesContext'
import type { OrcamentoItem }                from '@/types/orcamentos'
import type { Peca }                         from '@/types'
import type { ConfiguracaoFabricacao }       from '@/types/configuracoes-fabricacao'
import type { CustoPecaBreakdown }           from '@/types/custos-pecas'

// ─── Props ────────────────────────────────────────────────────────────────────

interface PecaConfiguracaoSelectorModalProps {
  open:          boolean
  onOpenChange:  (v: boolean) => void
  orcamentoId:   string
  orcamentoItem: OrcamentoItem
  peca:          Peca
  /** Phase 8 Stabilization: called with the new custoUnitario after confirming */
  onConfirmar?:  (custoUnitario: number) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function processosTags(cfg: ConfiguracaoFabricacao): string[] {
  const tags: string[] = ['corte']
  if (cfg.dobra)    tags.push('dobra')
  if (cfg.solda)    tags.push('solda')
  if (cfg.pintura)  tags.push('pintura')
  if (cfg.montagem) tags.push('montagem')
  return tags
}

// ─── Config Card ─────────────────────────────────────────────────────────────

function ConfigCard({
  cfg,
  bd,
  materiais,
  selected,
  quantidade,
  onSelect,
}: {
  cfg:       ConfiguracaoFabricacao
  bd:        CustoPecaBreakdown | undefined
  materiais: ReturnType<typeof useCustos>['materiais']
  selected:  boolean
  quantidade:number
  onSelect:  () => void
}) {
  const mat   = materiais.find((m) => m.id === cfg.materialId)
  const custo = bd?.custoTotal ?? 0
  const tags  = processosTags(cfg)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-xl border px-4 py-3 text-left transition-all',
        selected
          ? 'border-primary/40 bg-primary/8 ring-1 ring-primary/20'
          : 'border-border bg-card hover:border-primary/20 hover:bg-muted/30'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={cn(
            'mt-0.5 h-4 w-4 rounded-full border flex-shrink-0 flex items-center justify-center',
            selected ? 'bg-primary border-primary' : 'border-border'
          )}>
            {selected && <Check size={9} className="text-white" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-accent">{cfg.codigo}</span>
              <span className="text-sm font-semibold text-foreground">
                {mat?.descricao ?? mat?.material ?? '—'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {tags.join(' · ')}
              {cfg.observacoes ? ` · ${cfg.observacoes}` : ''}
            </p>
            {bd && (
              <div className="mt-1.5 grid grid-cols-3 gap-2">
                {bd.custoMaterial > 0 && (
                  <div className="rounded bg-muted/40 px-2 py-1">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Material</p>
                    <p className="text-[11px] font-semibold tabular-nums">{fmtBRL(bd.custoMaterial)}</p>
                  </div>
                )}
                {(bd.custoCorte + bd.custoDobra + bd.custoSolda + bd.custoPintura) > 0 && (
                  <div className="rounded bg-muted/40 px-2 py-1">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Processo</p>
                    <p className="text-[11px] font-semibold tabular-nums">
                      {fmtBRL(bd.custoCorte + bd.custoDobra + bd.custoSolda + bd.custoPintura)}
                    </p>
                  </div>
                )}
                {bd.custoIndiretos > 0 && (
                  <div className="rounded bg-muted/40 px-2 py-1">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">Indiretos</p>
                    <p className="text-[11px] font-semibold tabular-nums">{fmtBRL(bd.custoIndiretos)}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {custo > 0 ? (
            <>
              <p className="text-sm font-bold tabular-nums text-foreground">{fmtBRL(custo)}</p>
              <p className="text-[10px] text-muted-foreground tabular-nums">
                = {fmtBRL(custo * quantidade)} ×{quantidade}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">sem custo</p>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PecaConfiguracaoSelectorModal({
  open, onOpenChange, orcamentoId, orcamentoItem, peca, onConfirmar,
}: PecaConfiguracaoSelectorModalProps) {
  const { materiais }                              = useCustos()
  const { getByPeca, breakdownsComConfig, getById } = useConfiguracoesFabricacao()
  const { getPecaItemSelecao, salvarPecaItemSelecao } = useOrcamentoConfiguracoes()

  const [selectedId, setSelectedId] = useState('')

  // Seed from saved selection on open
  useEffect(() => {
    if (!open) return
    const saved = getPecaItemSelecao(orcamentoItem.id)
    setSelectedId(saved?.configuracaoFabricacaoId ?? '')
  }, [open, orcamentoItem.id, getPecaItemSelecao])

  const configs  = peca.id ? getByPeca(peca.id).filter((c) => c.ativo) : []
  const hasConfigs = configs.length > 0

  const selectedCfg = selectedId ? getById(selectedId) : undefined
  const selectedBD  = selectedId
    ? breakdownsComConfig.find((b) => b.configuracaoId === selectedId)
    : undefined

  function handleConfirmar() {
    if (!selectedId) return
    salvarPecaItemSelecao(orcamentoId, orcamentoItem, selectedId)
    if (selectedBD) onConfirmar?.(selectedBD.custoTotal)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings size={16} className="text-primary" />
            Configuração de Fabricação — {peca.codigo}
          </DialogTitle>
          <DialogDescription>
            {peca.descricao} · {orcamentoItem.quantidade} un. · {peca.peso}kg/un
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-2">
          {!hasConfigs ? (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-4 space-y-3"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-warning flex-shrink-0" />
                <p className="text-sm font-semibold text-foreground">
                  Nenhuma configuração disponível para esta peça.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Cadastre ao menos uma configuração de fabricação para <strong>{peca.codigo}</strong>{' '}
                no módulo de Custos antes de cotar.
              </p>
              <a
                href="/custos"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <ExternalLink size={12} />
                Abrir Custos → Configurações de Fabricação
              </a>
            </motion.div>
          ) : (
            configs.map((cfg, i) => {
              const bd = breakdownsComConfig.find((b) => b.configuracaoId === cfg.id)
              return (
                <motion.div
                  key={cfg.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <ConfigCard
                    cfg={cfg}
                    bd={bd}
                    materiais={materiais}
                    selected={cfg.id === selectedId}
                    quantidade={orcamentoItem.quantidade}
                    onSelect={() => setSelectedId(cfg.id)}
                  />
                </motion.div>
              )
            })
          )}
        </DialogBody>

        <DialogFooter>
          {selectedCfg && selectedBD && (
            <div className="flex items-center gap-1.5 mr-auto rounded-lg bg-primary/8 px-3 py-1.5">
              <Calculator size={11} className="text-primary" />
              <span className="text-xs font-bold text-primary tabular-nums">
                {fmtBRL(selectedBD.custoTotal)} / un
              </span>
              <span className="text-[10px] text-muted-foreground ml-1">
                = {fmtBRL(selectedBD.custoTotal * orcamentoItem.quantidade)} total
              </span>
            </div>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            size="sm"
            onClick={handleConfirmar}
            disabled={!selectedId || !hasConfigs}
            className="min-w-[120px]"
          >
            <Check size={13} />
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
