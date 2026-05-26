'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { mockTarefasDobra } from '@/mocks/dobra'
import type { TarefaDobra, NovaTarefaDobraInput } from '@/types/dobra'

interface DobraContextValue {
  tarefas: TarefaDobra[]
  adicionarTarefas: (inputs: NovaTarefaDobraInput[]) => void
  atualizarTarefa: (id: string, updater: (t: TarefaDobra) => TarefaDobra) => void
}

const DobraContext = createContext<DobraContextValue>({
  tarefas: [],
  adicionarTarefas: () => {},
  atualizarTarefa: () => {},
})

export function DobraProvider({ children }: { children: React.ReactNode }) {
  const [tarefas, setTarefas] = useState<TarefaDobra[]>(mockTarefasDobra)

  const adicionarTarefas = useCallback((inputs: NovaTarefaDobraInput[]) => {
    const ts = Date.now()
    const novas: TarefaDobra[] = inputs.map((input, i) => ({
      ...input,
      id: `dob-${ts}-${i}`,
      status: 'pendente',
      operador: null,
      maquina: null,
      setupInicio: null,
      setupFim: null,
      producaoInicio: null,
      producaoFim: null,
      pausas: [],
    }))
    setTarefas((prev) => [...novas, ...prev])
  }, [])

  const atualizarTarefa = useCallback((id: string, updater: (t: TarefaDobra) => TarefaDobra) => {
    setTarefas((prev) => prev.map((t) => (t.id === id ? updater(t) : t)))
  }, [])

  return (
    <DobraContext.Provider value={{ tarefas, adicionarTarefas, atualizarTarefa }}>
      {children}
    </DobraContext.Provider>
  )
}

export function useDobra() {
  return useContext(DobraContext)
}
