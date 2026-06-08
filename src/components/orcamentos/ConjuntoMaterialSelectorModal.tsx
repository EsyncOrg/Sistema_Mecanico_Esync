'use client'

// ─── Assembly Configuration Selector Modal — Phase 7.1 ───────────────────────
//
// Phase 7.1 refactor: selection is now by ConfiguracaoFabricacao, NOT raw material.
//
// For each PecaConjunto in the assembly:
//   - If peca.pecaId is set: load ConfiguracaoFabricacao[] via getByPeca(pecaId)
//   - If configs exist: show config dropdown + cost comparison
//   - If no configs: show warning + link to Custos → Configurações de Fabricação
//   - If no pecaId: show info row (no config selection needed)
//
// Selection model:
//   draft: Record<pecaConjuntoId, configuracaoFabricacaoId>
//   On "Aplicar": builds OrcamentoItemConfiguracao[] with configuracaoFabricacaoId
//   set as primary; materialId derived from config.materialId.
//
// Cost display: derived from ConfiguracaoFabricacao breakdown (process-aware).

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calculator, Check, AlertTriangle, ChevronDown, ChevronUp,
  Settings, ExternalLink, Info,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogBody, DialogFooter,
} from '@/components/ui/dialog'
import { Button }   from '@/components/ui/button'
import { cn }       from '@/lib/utils'
import { useCustos }                          from '@/contexts/CustosContext'
import { useCustosPecas }                     from '@/contexts/CustosPecasContext'
import { useConfiguracoesFabricacao }         from '@/contexts/ConfiguracoesFabricacaoContext'
import { useOrcamentoConfiguracoes }          from '@/contexts/OrcamentoConfiguracoesContext'
import { calcularCustoConjunto }              from '@/lib/custos/conjuntoEngine'
import type { Conjunto, PecaConjunto }        from '@/types/conjuntos'
import type { OrcamentoItem }                 from '@/types/orcamentos'
import type { OrcamentoItemConfiguracao }     from '@/types/orcamento-configuracoes'
import type { ConfiguracaoFabricacao }        from '@/types/configuracoes-fabricacao'
import type { CustoPecaBreakdown }            from '@/types/custos-pecas'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConjuntoMaterialSelectorModalProps {
  open:          boolean
  onOpenChange:  (v: boolean) => void
  orcamentoId:   string
  orcamentoItem: OrcamentoItem
  conjunto:      Conjunto
}

/** Draft: pecaConjuntoId → configuracaoFabricacaoId */
type DraftSelecoes = Record<string, string>

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

function getCustoFromBreakdown(
  configuracaoId: string,
  breakdownsComConfig: CustoPecaBreakdown[],
): number {
  return breakdownsComConfig.find((b) => b.configuracaoId === configuracaoId)?.custoTotal ?? 0
}

function buildSelecao(
  orcamentoId: string,
  itemId: string,
  conjunto: Conjunto,
  peca: PecaConjunto,
  cfgId: string,
  materialId: string,
  now: Date,
): OrcamentoItemConfiguracao {
  return {
    id:                      `oic-${itemId}-${peca.id}-${now.getTime()}`,
    orcamentoId,
    orcamentoItemId:         itemId,
    conjuntoId:              conjunto.id,
    pecaConjuntoId:          peca.id,
    pecaConjuntoCodigo:      peca.codigo,
    pecaConjuntoDescricao:   peca.descricao,
    pecaConjuntoQuantidade:  peca.quantidade,
    pecaConjuntoPeso:        peca.pesoEstimado,
    pecaConjuntoEspessura:   peca.espessura,
    configuracaoFabricacaoId:cfgId,
    materialId,              // derived from config
    custoUnitario:           0, // recomputed on save
    criadoEm:                now,
    atualizadoEm:            now,
  }
}

// ─── Config Row Dropdown ──────────────────────────────────────────────────────

function ConfigDropdown({
  selectedId,
  configs,
  breakdowns,
  materiais,
  onSelect,
}: {
  selectedId: string
  configs:    ConfiguracaoFabricacao[]
  breakdowns: CustoPecaBreakdown[]
  materiais:  ReturnType<typeof useCustos>['materiais']
  onSelect:   (id: string) => void
}) {
  const [open, setOpen] = useState(false)

  const sel    = configs.find((c) => c.id === selectedId)
  const selMat = sel ? materiais.find((m) => m.id === sel.materialId) : undefined
  const selBD  = sel ? breakdowns.find((b) => b.configuracaoId === sel.id) : undefined

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className={cn(
          'w-full flex items-center justify-between rounded-lg border px-3 py-2 text-xs transition-colors',
          sel
            ? 'border-primary/30 bg-primary/5 text-foreground'
            : 'border-border bg-card text-muted-foreground hover:border-primary/30'
        )}>
        <div className="flex-1 min-w-0 text-left">
          {sel ? (
            <>
              <span className="font-mono font-semibold text-accent mr-1.5">{sel.codigo}</span>
              <span className="truncate">{selMat?.descricao ?? selMat?.material ?? '—'}</span>
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                {processosTags(sel).join(', ')}
              </span>
            </>
          ) : (
            <span>Selecionar configuração…</span>
          )}
        </div>
        <span className="ml-2 flex items-center gap-1 flex-shrink-0">
          {selBD && selBD.custoTotal > 0 && (
            <span className="tabular-nums font-medium text-primary">{fmtBRL(selBD.custoTotal)}/un</span>
          )}
          {open ? <ChevronUp size={11} className="text-muted-foreground" /> : <ChevronDown size={11} className="text-muted-foreground" />}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.1 }}
            className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-border bg-card shadow-xl"
          >
            <div className="max-h-52 overflow-y-auto divide-y divide-border/50">
              {configs.length === 0 && (
                <p className="px-3 py-3 text-center text-xs text-muted-foreground">Nenhuma configuração</p>
              )}
              {configs.map((cfg) => {
                const mat  = materiais.find((m) => m.id === cfg.materialId)
                const bd   = breakdowns.find((b) => b.configuracaoId === cfg.id)
                const isSelected = cfg.id === selectedId
                const tags = processosTags(cfg)
                return (
                  <button key={cfg.id} type="button"
                    onClick={() => { onSelect(cfg.id); setOpen(false) }}
                    className={cn(
                      'w-full flex items-start gap-2 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors',
                      isSelected && 'bg-primary/5'
                    )}>
                    <div className={cn('mt-0.5 h-3.5 w-3.5 rounded-sm border flex-shrink-0 flex items-center justify-center',
                      isSelected ? 'bg-primary border-primary' : 'border-border')}>
                      {isSelected && <Check size={9} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-accent">{cfg.codigo}</span>
                        <span className="text-xs font-medium text-foreground truncate">
                          {mat?.descricao ?? mat?.material ?? '—'}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {tags.join(' · ')}
                        {cfg.observacoes ? ` · ${cfg.observacoes}` : ''}
                      </p>
                    </div>
                    {bd && bd.custoTotal > 0 && (
                      <span className="text-[11px] tabular-nums font-semibold text-primary flex-shrink-0 mt-0.5">
                        {fmtBRL(bd.custoTotal)}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ConjuntoMaterialSelectorModal({
  open, onOpenChange, orcamentoId, orcamentoItem, conjunto,
}: ConjuntoMaterialSelectorModalProps) {
  const { materiais }                     = useCustos()
  const { config: custoConfig }           = useCustosPecas()
  const { breakdownsComConfig, getByPeca } = useConfiguracoesFabricacao()
  const { getSelecoes, salvarSelecoes }   = useOrcamentoConfiguracoes()

  const [draft,      setDraft]      = useState<DraftSelecoes>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Seed draft from saved selections on open
  useEffect(() => {
    if (!open) return
    const existing = getSelecoes(orcamentoItem.id)
    const init: DraftSelecoes = {}
    for (const s of existing) {
      if (s.configuracaoFabricacaoId) init[s.pecaConjuntoId] = s.configuracaoFabricacaoId
    }
    setDraft(init)
    setExpandedId(null)
  }, [open, orcamentoItem.id, getSelecoes])

  // For each piece: load available configs and derived costs
  const pecaConfigs = useMemo(() => {
    return conjunto.pecas.map((peca) => {
      const configs = peca.pecaId ? getByPeca(peca.pecaId).filter((c) => c.ativo) : []
      const selectedCfgId = draft[peca.id] ?? ''
      const selectedBD    = selectedCfgId
        ? breakdownsComConfig.find((b) => b.configuracaoId === selectedCfgId)
        : undefined
      const custoUn = selectedBD?.custoTotal ?? 0
      return { peca, configs, selectedCfgId, custoUn }
    })
  }, [conjunto.pecas, getByPeca, draft, breakdownsComConfig])

  // Live total breakdown
  const liveBreakdown = useMemo(() => {
    const now = new Date()
    const selecoes = conjunto.pecas.map((peca) => {
      const cfgId = draft[peca.id] ?? ''
      const cfg   = cfgId ? (peca.pecaId ? getByPeca(peca.pecaId).find((c) => c.id === cfgId) : undefined) : undefined
      return buildSelecao(orcamentoId, orcamentoItem.id, conjunto, peca, cfgId, cfg?.materialId ?? '', now)
    })
    return calcularCustoConjunto(orcamentoItem, conjunto, selecoes, materiais, breakdownsComConfig, custoConfig)
  }, [draft, orcamentoItem, conjunto, materiais, breakdownsComConfig, custoConfig, orcamentoId, getByPeca])

  function handleAplicar() {
    const now = new Date()
    const selecoes = conjunto.pecas.map((peca) => {
      const cfgId = draft[peca.id] ?? ''
      const cfg   = cfgId
        ? (peca.pecaId ? getByPeca(peca.pecaId).find((c) => c.id === cfgId) : undefined)
        : undefined
      const bd    = cfgId ? breakdownsComConfig.find((b) => b.configuracaoId === cfgId) : undefined
      const sel   = buildSelecao(orcamentoId, orcamentoItem.id, conjunto, peca, cfgId, cfg?.materialId ?? '', now)
      sel.custoUnitario = bd?.custoTotal ?? 0
      return sel
    })
    salvarSelecoes(orcamentoItem.id, selecoes)
    onOpenChange(false)
  }

  // Count pieces that require selection (have pecaId) and are satisfied
  const pecasComCatalogo    = conjunto.pecas.filter((p) => !!p.pecaId)
  const pecasSemCatalogo    = conjunto.pecas.filter((p) => !p.pecaId)
  const selecionadas        = pecasComCatalogo.filter((p) => !!draft[p.id]).length
  const totalComCatalogo    = pecasComCatalogo.length
  const allSelected         = selecionadas === totalComCatalogo && totalComCatalogo > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings size={16} className="text-primary" />
            Configurações de Fabricação — {conjunto.codigo}
          </DialogTitle>
          <DialogDescription>
            {conjunto.nome} · {orcamentoItem.quantidade} conjunto(s) · {conjunto.pecas.length} peça(s)
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-2">
          {conjunto.pecas.map((peca, i) => {
            const entry      = pecaConfigs[i]
            const { configs, selectedCfgId, custoUn } = entry
            const isExpand   = expandedId === peca.id
            const hasCatalog = !!peca.pecaId
            const hasConfigs = configs.length > 0

            return (
              <motion.div key={peca.id}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn('rounded-xl border transition-colors',
                  !hasCatalog  ? 'border-border/50 bg-muted/20' :
                  !hasConfigs  ? 'border-warning/30 bg-warning/5' :
                  selectedCfgId? 'border-primary/20 bg-primary/3' : 'border-border bg-card'
                )}
              >
                {/* Row header */}
                <div
                  className={cn('flex items-center gap-3 px-4 py-3', hasCatalog && hasConfigs && 'cursor-pointer')}
                  onClick={() => hasCatalog && hasConfigs && setExpandedId(isExpand ? null : peca.id)}
                >
                  <div className={cn(
                    'h-5 w-5 rounded-full border flex-shrink-0 flex items-center justify-center',
                    !hasCatalog  ? 'border-border/50 bg-muted/40' :
                    !hasConfigs  ? 'border-warning bg-warning/20' :
                    selectedCfgId? 'bg-success border-success' : 'border-border bg-muted/40'
                  )}>
                    {selectedCfgId && hasCatalog && hasConfigs && <Check size={10} className="text-white" />}
                    {hasCatalog && !hasConfigs && <AlertTriangle size={10} className="text-warning" />}
                    {!hasCatalog && <Info size={10} className="text-muted-foreground" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-accent">{peca.codigo}</span>
                      <span className="text-xs text-muted-foreground truncate">{peca.descricao}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {peca.espessura}mm · {peca.pesoEstimado}kg/un · ×{peca.quantidade}
                      {!hasCatalog && ' · sem vínculo ao catálogo'}
                      {hasCatalog && !hasConfigs && (
                        <span className="text-warning ml-1 font-medium">
                          · nenhuma configuração disponível
                        </span>
                      )}
                    </p>
                  </div>

                  {custoUn > 0 && (
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-foreground tabular-nums">{fmtBRL(custoUn)}/un</p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        = {fmtBRL(custoUn * peca.quantidade * orcamentoItem.quantidade)} total
                      </p>
                    </div>
                  )}

                  {hasCatalog && hasConfigs && (
                    isExpand
                      ? <ChevronUp size={13} className="text-muted-foreground flex-shrink-0" />
                      : <ChevronDown size={13} className="text-muted-foreground flex-shrink-0" />
                  )}
                </div>

                {/* Warning: no configs */}
                {hasCatalog && !hasConfigs && (
                  <div className="px-4 pb-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-warning">
                      Cadastre configurações de fabricação para esta peça antes de cotar.
                    </p>
                    <a
                      href="/custos"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline flex-shrink-0"
                    >
                      <ExternalLink size={11} />
                      Custos → Configurações
                    </a>
                  </div>
                )}

                {/* Expanded: config selector + comparison */}
                <AnimatePresence>
                  {isExpand && hasCatalog && hasConfigs && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
                      className="overflow-hidden border-t border-border/50">
                      <div className="px-4 pb-4 pt-3 space-y-3">

                        {/* Config dropdown */}
                        <ConfigDropdown
                          selectedId={selectedCfgId}
                          configs={configs}
                          breakdowns={breakdownsComConfig}
                          materiais={materiais}
                          onSelect={(id) => setDraft((d) => ({ ...d, [peca.id]: id }))}
                        />

                        {/* Cost comparison across all configs */}
                        <div>
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                            Comparação — custo total (×{peca.quantidade} ×{orcamentoItem.quantidade})
                          </p>
                          <div className="grid gap-1">
                            {configs.map((cfg) => {
                              const mat    = materiais.find((m) => m.id === cfg.materialId)
                              const custo  = getCustoFromBreakdown(cfg.id, breakdownsComConfig)
                              const cTotal = custo * peca.quantidade * orcamentoItem.quantidade
                              const isSelected = cfg.id === selectedCfgId
                              const tags   = processosTags(cfg)
                              return (
                                <button key={cfg.id} type="button"
                                  onClick={() => setDraft((d) => ({ ...d, [peca.id]: cfg.id }))}
                                  className={cn(
                                    'flex items-center justify-between rounded-lg px-3 py-1.5 text-xs transition-colors',
                                    isSelected
                                      ? 'bg-primary/10 border border-primary/20 font-semibold'
                                      : 'bg-muted/30 hover:bg-muted/60 border border-transparent'
                                  )}>
                                  <div className="min-w-0">
                                    <span className="text-muted-foreground truncate">
                                      {mat?.descricao ?? mat?.material ?? cfg.codigo}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground/60 ml-1.5">
                                      {tags.join(' · ')}
                                    </span>
                                  </div>
                                  <span className={cn('tabular-nums ml-2 flex-shrink-0',
                                    isSelected ? 'text-primary' : 'text-foreground')}>
                                    {custo > 0 ? fmtBRL(cTotal) : '—'}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}

          {/* Info: pieces without catalog link */}
          {pecasSemCatalogo.length > 0 && (
            <p className="rounded-lg bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
              <Info size={11} className="inline mr-1 align-middle" />
              {pecasSemCatalogo.length} peça(s) sem vínculo ao catálogo — custo não calculado por configuração.
            </p>
          )}
        </DialogBody>

        <DialogFooter>
          <div className="flex items-center gap-3 mr-auto">
            <span className="text-[11px] text-muted-foreground">
              {selecionadas}/{totalComCatalogo} configuradas
            </span>
            {liveBreakdown.custoTotal > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg bg-primary/8 px-3 py-1">
                <Calculator size={11} className="text-primary" />
                <span className="text-xs font-bold text-primary tabular-nums">{fmtBRL(liveBreakdown.custoTotal)}</span>
                {!allSelected && totalComCatalogo > 0 && <AlertTriangle size={10} className="text-warning ml-1" />}
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            size="sm"
            onClick={handleAplicar}
            disabled={selecionadas === 0 && totalComCatalogo > 0}
            className="min-w-[160px]"
          >
            <Check size={13} />
            Aplicar {totalComCatalogo > 0 && `(${selecionadas}/${totalComCatalogo})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
