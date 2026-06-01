'use client'

// ─── Tempos Industriais Context ────────────────────────────────────────────────
//
// Manages the time architecture entities:
//   processos (catalog) · templates (reusable defaults) · historico (audit)
//
// Does NOT store Peca state — Peca times live on the Peca entity in PecasPage.
// This context records CHANGES to times (HistoricoTempo) and provides templates
// that modals can apply to pre-fill process times.
//
// Audit pattern: same append-only pattern as OrcamentoHistorico and HistoricoCusto.
// Future Supabase: INSERT-only policy on historico_tempos per empresa_id.

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react'
import {
  mockProcessos,
  mockTemplates,
  mockHistoricoTempos,
} from '@/mocks/tempos'
import type {
  ProcessoIndustrial,
  TemplateTempos,
  HistoricoTempo,
  TemposPecaValues,
  ProcessoNome,
} from '@/types/tempos'
import { calcularTempoTotal } from '@/types/tempos'

// ─── Context interface ────────────────────────────────────────────────────────

interface TemposContextValue {
  // ── Data ──────────────────────────────────────────────────────────────────
  processos: ProcessoIndustrial[]
  templates: TemplateTempos[]
  historico: HistoricoTempo[]

  // ── Template CRUD ─────────────────────────────────────────────────────────
  criarTemplate:    (input: Omit<TemplateTempos, 'id' | 'totalMinutos'>) => TemplateTempos
  atualizarTemplate:(id: string, changes: Partial<Omit<TemplateTempos,'id'|'totalMinutos'>>) => void
  excluirTemplate:  (id: string) => void

  // ── Template utility ──────────────────────────────────────────────────────
  /** Returns the tempos values from a template by ID, or null if not found */
  aplicarTemplate: (templateId: string) => TemposPecaValues | null

  // ── Audit ─────────────────────────────────────────────────────────────────
  /**
   * Appends an immutable HistoricoTempo entry.
   * Called by EditarPecaModal when time fields change on save.
   */
  registrarAlteracaoTempo: (params: {
    pecaId:           string
    pecaCodigo:       string
    processo:         ProcessoNome
    valorAnteriorMin: number
    valorNovoMin:     number
    motivo?:          string
  }) => void
}

// ─── Default context ──────────────────────────────────────────────────────────

const TemposContext = createContext<TemposContextValue>({
  processos:               [],
  templates:               [],
  historico:               [],
  criarTemplate:           () => { throw new Error('TemposContext not mounted') },
  atualizarTemplate:       () => {},
  excluirTemplate:         () => {},
  aplicarTemplate:         () => null,
  registrarAlteracaoTempo: () => {},
})

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TemposProvider({ children }: { children: React.ReactNode }) {
  // Processos catalog is read-only in Phase 5.5; setter reserved for Phase 6
  const [processos] = useState<ProcessoIndustrial[]>(mockProcessos)
  const [templates, setTemplates] = useState<TemplateTempos[]>(mockTemplates)
  const [historico, setHistorico] = useState<HistoricoTempo[]>(mockHistoricoTempos)

  // ── Template CRUD ─────────────────────────────────────────────────────────

  const criarTemplate = useCallback(
    (input: Omit<TemplateTempos, 'id' | 'totalMinutos'>): TemplateTempos => {
      const novo: TemplateTempos = {
        ...input,
        id:           Math.random().toString(36).slice(2, 11),
        totalMinutos: calcularTempoTotal(input.tempos),
      }
      setTemplates((prev) => [...prev, novo])
      return novo
    },
    []
  )

  const atualizarTemplate = useCallback(
    (id: string, changes: Partial<Omit<TemplateTempos, 'id' | 'totalMinutos'>>) => {
      setTemplates((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t
          const merged = { ...t, ...changes }
          return { ...merged, totalMinutos: calcularTempoTotal(merged.tempos) }
        })
      )
    },
    []
  )

  const excluirTemplate = useCallback((id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // ── Template utility ──────────────────────────────────────────────────────

  const aplicarTemplate = useCallback(
    (templateId: string): TemposPecaValues | null => {
      const tmpl = templates.find((t) => t.id === templateId)
      return tmpl ? { ...tmpl.tempos } : null
    },
    [templates]
  )

  // ── Audit ─────────────────────────────────────────────────────────────────

  const registrarAlteracaoTempo = useCallback(
    (params: {
      pecaId:           string
      pecaCodigo:       string
      processo:         ProcessoNome
      valorAnteriorMin: number
      valorNovoMin:     number
      motivo?:          string
    }) => {
      const entry: HistoricoTempo = {
        id:               Math.random().toString(36).slice(2, 11),
        pecaId:           params.pecaId,
        pecaCodigo:       params.pecaCodigo,
        processo:         params.processo,
        valorAnteriorMin: params.valorAnteriorMin,
        valorNovoMin:     params.valorNovoMin,
        usuario:          'Usuário Atual',
        timestamp:        new Date(),
        motivo:           params.motivo,
      }
      // Prepend so [0] is always the most recent entry
      setHistorico((prev) => [entry, ...prev])
    },
    []
  )

  return (
    <TemposContext.Provider value={{
      processos,
      templates,
      historico,
      criarTemplate,
      atualizarTemplate,
      excluirTemplate,
      aplicarTemplate,
      registrarAlteracaoTempo,
    }}>
      {children}
    </TemposContext.Provider>
  )
}

export function useTempos() {
  return useContext(TemposContext)
}
