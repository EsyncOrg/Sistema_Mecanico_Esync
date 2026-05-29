'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Scissors, FoldVertical, Flame, Paintbrush, Wrench,
  Package, Clock, User, AlertCircle, CheckCircle2,
  Zap, Layers, TrendingUp, ChevronRight, RotateCcw,
} from 'lucide-react'
import { mockConjuntos } from '@/mocks/conjuntos'
import type { SetorProcesso } from '@/types/conjuntos'
import { formatDate } from '@/lib/utils'

// ─── Config ───────────────────────────────────────────────────────────────────

const SETOR_CFG: Record<string, { label: string; icon: typeof Scissors; color: string; bg: string }> = {
  corte:         { label: 'Corte',         icon: Scissors,    color: '#0f4c5c', bg: 'rgba(15,76,92,0.15)'  },
  dobra:         { label: 'Dobra',         icon: FoldVertical,color: '#000080', bg: 'rgba(0,0,128,0.15)'   },
  solda:         { label: 'Solda',         icon: Flame,       color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
  pintura:       { label: 'Pintura',       icon: Paintbrush,  color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
  usinagem:      { label: 'Usinagem',      icon: Wrench,      color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
  furacao:       { label: 'Furação',       icon: Wrench,      color: '#6b7280', bg: 'rgba(107,114,128,0.15)'},
  fresagem:      { label: 'Fresagem',      icon: Wrench,      color: '#6b7280', bg: 'rgba(107,114,128,0.15)'},
  torneamento:   { label: 'Torneamento',   icon: Wrench,      color: '#6b7280', bg: 'rgba(107,114,128,0.15)'},
  montagem:      { label: 'Montagem',      icon: Package,     color: '#e07319', bg: 'rgba(224,115,25,0.15)' },
  desenvolvimento:{ label: 'Desenvolvimento',icon: Zap,       color: '#10b981', bg: 'rgba(16,185,129,0.15)' },
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string }> = {
  ativo:         { label: 'Ativo',         color: '#10b981', bg: 'rgba(16,185,129,0.12)'  },
  inativo:       { label: 'Inativo',       color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
  em_revisao:    { label: 'Em Revisão',    color: '#f59e0b', bg: 'rgba(245,158,11,0.12)'  },
  descontinuado: { label: 'Descontinuado', color: '#ef4444', bg: 'rgba(239,68,68,0.12)'   },
}

const CATEGORIA_LABELS: Record<string, string> = {
  painel:    'Painel',
  estrutura: 'Estrutura',
  gabinete:  'Gabinete',
  maquina:   'Máquina',
  suporte:   'Suporte',
  montagem:  'Montagem',
  outro:     'Outro',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProcessTag({ processo }: { processo: SetorProcesso }) {
  const cfg = SETOR_CFG[processo] ?? { label: processo, icon: Package, color: '#6b7280', bg: 'rgba(107,114,128,0.12)' }
  const Icon = cfg.icon
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <Icon size={9} />
      {cfg.label}
    </span>
  )
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/4 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}

// ─── Not found ────────────────────────────────────────────────────────────────

function NotFoundPage({ codigo }: { codigo: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#080c12] p-6 text-center">
      <AlertCircle size={48} className="text-warning/60" />
      <h1 className="text-xl font-bold text-white">Produto não encontrado</h1>
      <p className="text-sm text-white/50">O código <span className="font-mono text-white/80">{codigo}</span> não corresponde a nenhum produto cadastrado.</p>
      <p className="text-[11px] text-white/30">ESYNC Sistema Mecânico de Gestão</p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProdutoPage({ params }: { params: { codigo: string } }) {
  const codigo   = decodeURIComponent(params.codigo)
  const conjunto = useMemo(
    () => mockConjuntos.find((c) => c.codigo === codigo),
    [codigo]
  )

  if (!conjunto) return <NotFoundPage codigo={codigo} />

  const statusCfg  = STATUS_CFG[conjunto.status] ?? STATUS_CFG.inativo
  const totalPecas = conjunto.pecas.length
  const totalUnits = conjunto.pecas.reduce((s, p) => s + p.quantidade, 0)
  const totalWeight = conjunto.pecas.reduce((s, p) => s + p.pesoEstimado * p.quantidade, 0)
  const allSetores  = [...new Set(conjunto.pecas.flatMap((p) => p.processos))]

  return (
    <div className="min-h-screen" style={{ background: '#080c12', color: '#fff' }}>

      {/* ── Top bar ── */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{ background: 'rgba(8,12,18,0.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md" style={{ background: 'hsl(240 100% 25%)' }}>
            <Zap size={12} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-xs font-bold tracking-widest text-white/80 uppercase">ESYNC</span>
        </div>
        <span className="text-[10px] text-white/35 uppercase tracking-widest">Ficha Técnica</span>
      </div>

      <div className="mx-auto max-w-lg px-4 py-5 space-y-4">

        {/* ── Hero ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-2xl p-5"
          style={{ background: 'linear-gradient(135deg, rgba(0,0,128,0.25) 0%, rgba(15,76,92,0.2) 100%)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Badges */}
          <div className="mb-3 flex items-center gap-2 flex-wrap">
            <span
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold"
              style={{ color: statusCfg.color, background: statusCfg.bg }}
            >
              {conjunto.status === 'ativo' ? <CheckCircle2 size={9} /> : <AlertCircle size={9} />}
              {statusCfg.label}
            </span>
            <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}>
              {conjunto.revisao}
            </span>
            <span className="rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)' }}>
              {CATEGORIA_LABELS[conjunto.categoria] ?? conjunto.categoria}
            </span>
          </div>

          {/* Product ID + Name */}
          <p className="font-mono text-2xl font-black tracking-wider" style={{ color: '#d4af37' }}>
            {conjunto.codigo}
          </p>
          <p className="mt-1 text-base font-semibold text-white/90">{conjunto.nome}</p>
          <p className="mt-1 text-sm text-white/50">{conjunto.cliente}</p>

          {/* Quick stats */}
          <div className="mt-4 flex items-center gap-4 text-xs text-white/50">
            <span className="flex items-center gap-1">
              <Package size={11} />
              {totalPecas} peça{totalPecas !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Layers size={11} />
              {totalUnits} unidades/conjunto
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp size={11} />
              {totalWeight.toFixed(1)} kg est.
            </span>
          </div>
        </motion.div>

        {/* ── Info grid ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.4 }}
          className="grid grid-cols-2 gap-2"
        >
          <InfoCell label="Responsável"   value={conjunto.responsavel} />
          <InfoCell label="Prioridade"    value={conjunto.prioridade.charAt(0).toUpperCase() + conjunto.prioridade.slice(1)} />
          <InfoCell label="Vezes produzido" value={`${conjunto.vezesProduzido}×`} />
          <InfoCell label="Total produzido" value={`${conjunto.quantidadeTotalProduzida} un.`} />
        </motion.div>

        {/* ── Processes involved ── */}
        {allSetores.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.4 }}
            className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-white/40">
              Setores de Produção
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allSetores.map((s) => <ProcessTag key={s} processo={s} />)}
            </div>
          </motion.div>
        )}

        {/* ── Composição ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16, duration: 0.4 }}
        >
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              Composição — {totalPecas} peça{totalPecas !== 1 ? 's' : ''}
            </p>
            <ChevronRight size={12} className="text-white/20" />
          </div>

          <div className="space-y-2">
            {conjunto.pecas.map((peca, i) => (
              <motion.div
                key={peca.id}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.18 + i * 0.04, duration: 0.3 }}
                className="rounded-xl p-3.5"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="font-mono text-xs font-bold" style={{ color: '#7dd3fc' }}>{peca.codigo}</p>
                    <p className="text-sm font-medium text-white/90 mt-0.5 leading-snug">{peca.descricao}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-lg font-black text-white tabular-nums">{peca.quantidade}</p>
                    <p className="text-[10px] text-white/35">un.</p>
                  </div>
                </div>

                {/* Technical specs */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-white/50">
                  <span>{peca.material}</span>
                  {peca.espessura > 0 && (
                    <>
                      <span>·</span>
                      <span>{peca.espessura} mm</span>
                    </>
                  )}
                  {peca.pesoEstimado > 0 && (
                    <>
                      <span>·</span>
                      <span>{(peca.pesoEstimado * peca.quantidade).toFixed(2)} kg</span>
                    </>
                  )}
                </div>

                {/* Processes */}
                {peca.processos.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {peca.processos.map((p) => <ProcessTag key={p} processo={p} />)}
                  </div>
                )}

                {/* Observations */}
                {peca.observacoes && (
                  <p className="mt-2 text-[11px] text-white/35 italic leading-snug">{peca.observacoes}</p>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Summary ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}
          className="rounded-2xl p-4"
          style={{ background: 'linear-gradient(135deg, rgba(15,76,92,0.15) 0%, rgba(0,0,128,0.1) 100%)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Resumo Técnico</p>
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: 'Peças',     value: String(totalPecas)               },
              { label: 'Unidades',  value: String(totalUnits)               },
              { label: 'Peso Est.', value: `${totalWeight.toFixed(1)} kg`   },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-lg font-black text-white tabular-nums">{item.value}</p>
                <p className="text-[10px] text-white/40">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Technical notes ── */}
        {conjunto.observacoesTecnicas && (
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34, duration: 0.4 }}
            className="rounded-2xl p-4"
            style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}
          >
            <p className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-warning/70">
              <AlertCircle size={11} /> Notas Técnicas
            </p>
            <p className="text-sm text-white/70 leading-relaxed">{conjunto.observacoesTecnicas}</p>
          </motion.div>
        )}

        {/* ── Timestamps ── */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.4 }}
          className="flex items-center gap-4 text-[11px] text-white/30"
        >
          <span className="flex items-center gap-1">
            <Clock size={10} />
            Criado {formatDate(conjunto.criadoEm)}
          </span>
          <span className="flex items-center gap-1">
            <RotateCcw size={10} />
            Atualizado {formatDate(conjunto.atualizadoEm)}
          </span>
        </motion.div>

        {/* ── Footer ── */}
        <div className="pb-8 pt-2 text-center">
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md" style={{ background: 'hsl(240 100% 25%)' }}>
              <Zap size={10} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[11px] font-bold tracking-widest text-white/20 uppercase">ESYNC Sistema Mecânico</span>
          </div>
          <p className="mt-1 text-[10px] text-white/15">Ficha gerada via código QR · Uso interno</p>
        </div>

      </div>
    </div>
  )
}
