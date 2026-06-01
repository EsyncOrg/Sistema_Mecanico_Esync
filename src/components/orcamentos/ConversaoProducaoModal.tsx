'use client'

// ─── Orçamentos Phase 4 — Conversion Confirmation Modal ───────────────────────
//
// Displays quote summary before converting an approved Orçamento into a
// SolicitacaoProducao in the Desenvolvimento module.
//
// Coordination pattern:
//   1. criarSolicitacao() — DesenvolvimentoContext (creates + returns the entity)
//   2. registrarConversao() — OrcamentosContext  (links IDs + writes history)
//
// Future extension hooks:
//   [HOOK:ENGENHARIA_GATE]  — Phase 5: require engineering approval before conversion
//   [HOOK:ESTRUTURA_AUTO]   — Phase 5: auto-generate component structure from conjuntos
//   [HOOK:CUSTO_CALC]       — Phase 5: calculate production cost from item breakdown
//   [HOOK:MAQUINA_ALLOC]    — Phase 5: allocate machines to production request
//   [HOOK:EMAIL_NOTIFY]     — Phase 5: email PCP on conversion

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Factory, FileCheck2, User, DollarSign, Package, GitBranch,
  ArrowRight, AlertCircle, CheckCircle2,
} from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn }     from '@/lib/utils'
import { toast }  from '@/lib/toast'
import { useAuth }           from '@/contexts/AuthContext'
import { useOrcamentos }     from '@/contexts/OrcamentosContext'
import { useDesenvolvimento } from '@/contexts/DesenvolvimentoContext'
import type { Orcamento }    from '@/types/orcamentos'
import type { PecaSolicitacao } from '@/types/desenvolvimento'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

function revisionLabel(n: number): string {
  const B = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  return n < 26 ? `Rev. ${B[n]}` : `Rev. ${B[Math.floor(n / 26) - 1]}${B[n % 26]}`
}

/** Derives the OS number that will be created from the orçamento number. */
function deriveNumeroOS(orcamento: Orcamento): string {
  return `OS:CONV-${orcamento.numero.replace('ORC-', '')}`
}

/** Converts OrcamentoItem list to PecaSolicitacao list for production. */
function buildPecas(orcamento: Orcamento, numeroOS: string): PecaSolicitacao[] {
  return orcamento.itens
    .slice()
    .sort((a, b) => a.posicao - b.posicao)
    .map((item) => ({
      id:          Math.random().toString(36).slice(2),
      codigo:      item.codigo ?? item.descricao.slice(0, 30).trim(),
      descricao:   item.descricao,
      quantidade:  item.quantidade,
      unidade:     item.unidade,
      // Manufacturing fields left blank — Engineering fills these in
      material:    '',
      espessura:   0,
      observacoes: item.observacoes ?? '',
      // Sectors TBD by Engineering — [HOOK:ESTRUTURA_AUTO]
      processos:   [],
      osDistribuicao: [{
        id:         Math.random().toString(36).slice(2),
        numeroOS,
        quantidade: item.quantidade,
      }],
      // Traceability references preserved from quote
      pecaId:     item.pecaId,
      conjuntoId: item.conjuntoId,
      maquinaId:  item.maquinaId,
    }))
}

// ─── Summary row ─────────────────────────────────────────────────────────────

function SummaryRow({ icon: Icon, label, value, className }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
  className?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-muted/60">
        <Icon size={13} className="text-muted-foreground" />
      </div>
      <span className="min-w-[130px] text-xs font-semibold text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium text-foreground', className)}>{value}</span>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  open:         boolean
  onOpenChange: (v: boolean) => void
  orcamento:    Orcamento | null
}

export function ConversaoProducaoModal({ open, onOpenChange, orcamento }: Props) {
  const { user }               = useAuth()
  const { registrarConversao } = useOrcamentos()
  const { criarSolicitacao }   = useDesenvolvimento()
  const [loading, setLoading]  = useState(false)

  if (!orcamento) return null

  // Guard: only approved non-converted quotes can be converted
  const jaConvertido = orcamento.convertidoParaProducao === true
  const numeroOS     = deriveNumeroOS(orcamento)

  function handleConverter() {
    if (!orcamento || jaConvertido) return
    setLoading(true)

    try {
      const responsavel = user?.nome ?? 'Sistema'

      // 1. Build and create SolicitacaoProducao in Desenvolvimento
      const pecas = buildPecas(orcamento, numeroOS)

      const solicitacao = criarSolicitacao({
        titulo:       orcamento.titulo,
        cliente:      orcamento.cliente.nome,
        numeroOS,
        descricao:    orcamento.descricao,
        prioridade:   orcamento.prioridade,
        observacoes:  orcamento.observacoes,
        responsavel,
        pecas,
        conjuntos:    [],
        // Phase 4 traceability
        origem:       'orcamento',
        origemId:     orcamento.id,
        numeroOrigem: orcamento.numero,
      })

      // 2. Record conversion on the Orcamento (links IDs + writes audit history)
      registrarConversao(orcamento.id, solicitacao.id, responsavel)

      toast('success', `Solicitação criada — ${numeroOS}`)
      onOpenChange(false)
    } catch (err) {
      console.error('[ConversaoProducaoModal]', err)
      toast('error', 'Erro ao criar solicitação de produção')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">

        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Factory size={20} className="text-primary" />
          </div>
          <DialogTitle>Converter para Produção</DialogTitle>
          <DialogDescription>
            {jaConvertido
              ? 'Este orçamento já foi convertido em uma solicitação de produção.'
              : 'Revise os dados antes de confirmar. Uma solicitação de produção será criada no módulo Desenvolvimento.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">

          {/* Already-converted warning */}
          {jaConvertido && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/8 p-3"
            >
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-success" />
              <div>
                <p className="text-xs font-semibold text-success">Já convertido</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Convertido em {orcamento.dataConversao?.toLocaleDateString('pt-BR')} por {orcamento.responsavelConversao}.
                </p>
              </div>
            </motion.div>
          )}

          {/* Quote summary card */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
            <SummaryRow icon={FileCheck2}  label="Orçamento"       value={orcamento.numero} />
            <SummaryRow icon={User}        label="Cliente"         value={orcamento.cliente.nome} />
            <SummaryRow
              icon={DollarSign}
              label="Valor Total"
              value={formatBRL(orcamento.valorTotal)}
              className="text-success font-semibold"
            />
            <SummaryRow
              icon={Package}
              label="Itens"
              value={`${orcamento.itens.length} item${orcamento.itens.length !== 1 ? 's' : ''}`}
            />
            <SummaryRow icon={GitBranch}   label="Revisão"         value={revisionLabel(orcamento.revisaoAtual)} />
          </div>

          {/* What will be created */}
          {!jaConvertido && (
            <motion.div
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2"
            >
              <div className="flex items-center gap-2">
                <ArrowRight size={13} className="text-primary flex-shrink-0" />
                <span className="text-xs font-semibold text-primary">Será criado em Desenvolvimento</span>
              </div>
              <div className="ml-5 space-y-1">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">OS: </span>{numeroOS}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Título: </span>{orcamento.titulo}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Itens transferidos: </span>
                  {orcamento.itens.length} — materiais e processos a preencher pela Engenharia
                </p>
              </div>
            </motion.div>
          )}

          {/* Info note */}
          {!jaConvertido && (
            <div className="flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2">
              <AlertCircle size={12} className="mt-0.5 flex-shrink-0 text-muted-foreground" />
              <p className="text-[11px] text-muted-foreground">
                O orçamento permanece <span className="font-semibold">Aprovado</span>. A conversão é registrada no histórico e pode ser rastreada de ambos os módulos.
              </p>
            </div>
          )}

        </DialogBody>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            {jaConvertido ? 'Fechar' : 'Cancelar'}
          </Button>
          {!jaConvertido && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleConverter}
              disabled={loading}
            >
              <Factory size={13} />
              {loading ? 'Convertendo...' : 'Confirmar Conversão'}
            </Button>
          )}
        </DialogFooter>

      </DialogContent>
    </Dialog>
  )
}
