'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import { mockCargos } from '@/mocks/cargos'
import type { ModuleId, Cargo } from '@/types/permissions'

interface AuthContextValue {
  currentCargoId: string
  setCurrentCargoId: (id: string) => void
  currentCargo: Cargo | undefined
  canView: (module: ModuleId) => boolean
  canEdit: (module: ModuleId) => boolean
  isAdmin: () => boolean
}

const AuthContext = createContext<AuthContextValue>({
  currentCargoId: 'mecanica',
  setCurrentCargoId: () => {},
  currentCargo: undefined,
  canView: () => false,
  canEdit: () => false,
  isAdmin: () => false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentCargoId, setCurrentCargoId] = useState('mecanica')

  const currentCargo = mockCargos.find((c) => c.id === currentCargoId)

  const canView = useCallback(
    (module: ModuleId) => currentCargo?.permissoes[module]?.visualizacao ?? false,
    [currentCargo]
  )

  const canEdit = useCallback(
    (module: ModuleId) => currentCargo?.permissoes[module]?.edicao ?? false,
    [currentCargo]
  )

  const isAdmin = useCallback(() => currentCargo?.isAdmin ?? false, [currentCargo])

  return (
    <AuthContext.Provider
      value={{ currentCargoId, setCurrentCargoId, currentCargo, canView, canEdit, isAdmin }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
