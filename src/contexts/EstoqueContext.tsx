'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import type { EstoqueItem, MovimentoEstoque, EntradaEstoqueInput, StatusEstoque } from '@/types/estoque'
import { mockEstoque, mockMovimentos } from '@/mocks/estoque'

interface EstoqueContextValue {
  estoque: EstoqueItem[]
  movimentos: MovimentoEstoque[]
  addEntrada: (entries: EntradaEstoqueInput[]) => void
}

const EstoqueContext = createContext<EstoqueContextValue>({
  estoque: [],
  movimentos: [],
  addEntrada: () => {},
})

const LOCATIONS = [
  'EST-A1', 'EST-A2', 'EST-A3', 'EST-A4',
  'EST-B1', 'EST-B2', 'EST-B3',
  'EST-C1', 'EST-C2', 'EST-C3',
  'EST-D1', 'EST-D2',
]

function computeStatus(qty: number, min: number): StatusEstoque {
  if (qty === 0) return 'critico'
  if (qty <= min) return 'estoque_baixo'
  return 'normal'
}

export function EstoqueProvider({ children }: { children: React.ReactNode }) {
  const [estoque, setEstoque] = useState<EstoqueItem[]>(mockEstoque)
  const [movimentos, setMovimentos] = useState<MovimentoEstoque[]>(mockMovimentos)

  const addEntrada = useCallback((entries: EntradaEstoqueInput[]) => {
    const now = new Date()

    setEstoque((prev) => {
      const next = [...prev]
      entries.forEach((entry) => {
        const idx = next.findIndex((e) => e.codigoPeca === entry.codigoPeca)
        if (idx >= 0) {
          const updated = { ...next[idx] }
          updated.quantidade += entry.quantidade
          updated.ultimaEntrada = now
          updated.origemPrograma = entry.programaOrigem
          updated.status = computeStatus(updated.quantidade, updated.quantidadeMinima)
          next[idx] = updated
        } else {
          const quantidadeMinima = Math.max(5, Math.floor(entry.quantidade * 0.3))
          next.push({
            id: `est-${Date.now()}-${next.length}`,
            codigoPeca: entry.codigoPeca,
            descricao: entry.descricaoPeca,
            material: entry.material,
            espessura: entry.espessura,
            quantidade: entry.quantidade,
            quantidadeMinima,
            localizacao: LOCATIONS[next.length % LOCATIONS.length],
            status: computeStatus(entry.quantidade, quantidadeMinima),
            ultimaEntrada: now,
            origemPrograma: entry.programaOrigem,
            unidade: 'pç',
          })
        }
      })
      return next
    })

    setMovimentos((prev) => [
      ...entries.map((entry, i) => ({
        id: `mov-${Date.now()}-${i}`,
        tipo: 'entrada' as const,
        codigoPeca: entry.codigoPeca,
        descricaoPeca: entry.descricaoPeca,
        quantidade: entry.quantidade,
        programaOrigem: entry.programaOrigem,
        os: entry.os,
        timestamp: now,
        operador: entry.operador,
        observacao: entry.observacao,
        tarefaDobraId: entry.tarefaDobraId,
        programaCorteId: entry.programaCorteId,
      })),
      ...prev,
    ])
  }, [])

  return (
    <EstoqueContext.Provider value={{ estoque, movimentos, addEntrada }}>
      {children}
    </EstoqueContext.Provider>
  )
}

export function useEstoque() {
  return useContext(EstoqueContext)
}
