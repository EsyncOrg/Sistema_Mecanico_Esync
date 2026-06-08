// ─── Conjuntos Module Types ────────────────────────────────────────────────────
// Represents complete industrial assemblies: panels, structures, cabinets,
// machine sections, etc. — each composed of multiple pieces with defined routes.
//
// Core value proposition:
//   Instead of creating production tasks piece-by-piece, the user selects a
//   Conjunto + quantity. The ERP automatically:
//     1. Loads all pieces with multiplied quantities
//     2. Checks stock for each piece
//     3. Sends ONLY missing quantities to production
//
// Integration chain (future):
//   Conjuntos ──► Desenvolvimento ──► Programação ──► Corte ──► Dobra ──► Solda

import type { SetorProcesso } from '@/types/desenvolvimento'

export type { SetorProcesso }

// ─── Enums ────────────────────────────────────────────────────────────────────

export type StatusConjunto = 'ativo' | 'inativo' | 'em_revisao' | 'descontinuado'

export type CategoriaConjunto =
  | 'painel'
  | 'estrutura'
  | 'gabinete'
  | 'maquina'
  | 'suporte'
  | 'montagem'
  | 'outro'

export type PrioridadeConjunto = 'alta' | 'media' | 'baixa'

// ─── Piece inside an assembly ─────────────────────────────────────────────────

// ─── Phase 7.3 — Catalog-Driven BOM ──────────────────────────────────────────
// Business rule: pieces MUST be selected from the Peca catalog.
// `pecaId` is required for all pieces created through the standard UI.
// Legacy mock data (without pecaId) remains compatible — fields fall back
// to the locally stored copies (codigo, descricao, material, espessura, peso).
//
// Ownership:
//   pecaId → codigo, descricao, espessura, pesoEstimado — owned by Peca catalog
//   quantidade, processos, observacoes — owned by this BOM entry
//   material → resolved at quotation time via ConfiguracaoFabricacao (not stored here)
//
// Future Supabase: produto_pecas table
//   FK: peca_id → pecas.id  (required, NOT NULL)
//   FK: produto_id → produtos.id
//   Fields: quantidade, processos[], observacoes, id, created_at

export interface PecaConjunto {
  id: string
  /**
   * FK → Peca.id (catalog piece).
   * Required for all pieces created via the UI (Phase 7.3+).
   * Optional only for backward compatibility with legacy mock data.
   * When set: codigo, descricao, espessura, pesoEstimado are resolved from catalog.
   * When missing: local copies are used (deprecated pattern).
   */
  pecaId?: string
  /** Derived from Peca.codigo when pecaId is set. Local copy for legacy/display. */
  codigo: string
  /** Derived from Peca.descricao when pecaId is set. Local copy for legacy/display. */
  descricao: string
  /** Units of this piece required to build ONE complete assembly */
  quantidade: number
  /**
   * Nominal material for display/simulation purposes.
   * For new catalog-linked pieces: empty string — actual material is determined at
   * quotation time via ConfiguracaoFabricacao selection (Phase 7.1+).
   * For legacy pieces: local copy from original BOM data.
   */
  material: string
  /** Derived from Peca.espessura when pecaId is set. Local copy for legacy/display. */
  espessura: number
  /** Derived from Peca.peso when pecaId is set. Local copy for legacy/display. */
  pesoEstimado: number
  observacoes: string
  /** Which production sectors this piece must pass through */
  processos: SetorProcesso[]
}

// ─── Assembly (Conjunto) ──────────────────────────────────────────────────────

export interface Conjunto {
  id: string
  /** e.g. "PAINEL-800", "EST-L04" */
  codigo: string
  nome: string
  cliente: string
  categoria: CategoriaConjunto
  /** Engineering revision identifier, e.g. "Rev. 03" */
  revisao: string
  prioridade: PrioridadeConjunto
  observacoesTecnicas: string
  responsavel: string
  status: StatusConjunto
  pecas: PecaConjunto[]
  criadoEm: Date
  atualizadoEm: Date
  /** How many distinct production runs have used this assembly */
  vezesProduzido: number
  /** Total units produced across all runs */
  quantidadeTotalProduzida: number
}

// ─── Input for creating a new assembly ───────────────────────────────────────

export interface NovoConjuntoInput {
  codigo: string
  nome: string
  cliente: string
  categoria: CategoriaConjunto
  revisao: string
  prioridade: PrioridadeConjunto
  observacoesTecnicas: string
  responsavel: string
  pecas: Omit<PecaConjunto, 'id'>[]
}

// ─── Production Simulation ────────────────────────────────────────────────────
// Given a Conjunto + quantity, this computes what to pull from stock vs. produce.
//
// Invariants:
//   quantidadeDisponivel = min(quantidadeNecessaria, quantidadeEstoque)
//   quantidadeProduzir   = max(0, quantidadeNecessaria - quantidadeEstoque)
//   quantidadeDisponivel + quantidadeProduzir === quantidadeNecessaria

export interface SimulacaoItemEstoque {
  pecaId: string
  codigo: string
  descricao: string
  material: string
  processos: SetorProcesso[]
  espessura: number
  pesoEstimado: number
  /** peca.quantidade × numberOfConjuntos */
  quantidadeNecessaria: number
  /** Mock stock level at time of simulation */
  quantidadeEstoque: number
  /** Amount sourced from stock (no production needed) */
  quantidadeDisponivel: number
  /** Amount that must be manufactured */
  quantidadeProduzir: number
  /** (disponivel / necessaria) × 100, 0–100 */
  percentualEstoque: number
}

export interface ResultadoSimulacao {
  conjuntoId: string
  conjuntoCodigo: string
  conjuntoNome: string
  quantidadeConjuntos: number
  itens: SimulacaoItemEstoque[]
  // ── Aggregated totals ──
  totalPecasDistintas: number
  totalUnidadesNecessarias: number
  /** Total units satisfied from stock */
  totalUnidadesEstoque: number
  /** Total units that need to be manufactured */
  totalUnidadesProduzir: number
  /** (totalUnidadesEstoque / totalUnidadesNecessarias) × 100 */
  percentualAproveitamento: number
  /** Deduplicated list of all sectors involved in production items */
  setoresEnvolvidos: SetorProcesso[]
  /** Rough estimate: 15 min per unit that needs production */
  tempoEstimadoMinutos: number
  /** kg: sum of (pesoEstimado × quantidadeProduzir) for each item */
  pesoEstimadoTotal: number
  criadoEm: Date
}

// ─── Production History ───────────────────────────────────────────────────────

export interface HistoricoConjunto {
  id: string
  conjuntoId: string
  codigo: string
  nome: string
  cliente: string
  revisao: string
  quantidadeProduzida: number
  /** Units that came from stock and did not require manufacturing */
  quantidadeEconomizadaEstoque: number
  responsavel: string
  status: 'concluido' | 'em_producao' | 'cancelado'
  data: Date
  observacoes: string
}

// ─── Integration bridge: Conjuntos → Desenvolvimento ─────────────────────────
// Used in Desenvolvimento > Nova Solicitação > "Produção por Conjunto" flow.
//
// Future behaviour (not yet implemented in Desenvolvimento):
//   - Selecting a ConjuntoParaProducao auto-fills solicitacao.pecas
//   - All quantities are multiplied by ConjuntoParaProducao.quantidade
//   - Stock is checked; only missing quantities appear in production routing
//
// The ConjuntoRef type in desenvolvimento.ts holds the minimal reference;
// this type carries the full simulation payload once expanded.

export interface ConjuntoParaProducao {
  conjuntoId: string
  codigo: string
  nome: string
  /** How many complete assemblies are requested */
  quantidade: number
  /** Populated after simulation is run; drives production routing */
  simulacao?: ResultadoSimulacao
}

// ─── Analytics mock shape ─────────────────────────────────────────────────────

export interface AnalyticsConjuntos {
  usoPorConjunto: { nome: string; usos: number; fill?: string }[]
  pecasMaisUsadas: { codigo: string; descricao: string; usos: number }[]
  economiaEstoqueMensal: { mes: string; economizadas: number; produzidas: number }[]
  distribuicaoCategoria: { categoria: string; count: number; fill: string }[]
  setoresMaisUsados: { setor: string; count: number; fill: string }[]
}
