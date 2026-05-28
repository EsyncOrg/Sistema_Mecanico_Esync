'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { mockCargos } from '@/mocks/cargos'
import type { ModuleId, Cargo } from '@/types/permissions'

const SESSION_KEY    = 'forge-erp-session'
const SESSION_COOKIE = 'forge_erp_session'

export interface AuthUser {
  id:        string
  nome:      string
  email:     string
  cargoId:   string
  empresaId: string
}

interface SessionData {
  user:    AuthUser
  loginAt: number
}

export interface LoginCredentials {
  email:    string
  password: string
}

export interface LoginResult {
  success: boolean
  error?:  string
}

interface AuthContextValue {
  // Auth state
  isAuthenticated: boolean
  isLoading:       boolean
  user:            AuthUser | null
  // Auth actions
  login:  (credentials: LoginCredentials) => Promise<LoginResult>
  logout: () => void
  // RBAC (preserved)
  currentCargoId:    string
  setCurrentCargoId: (id: string) => void
  currentCargo:      Cargo | undefined
  canView:  (module: ModuleId) => boolean
  canEdit:  (module: ModuleId) => boolean
  isAdmin:  () => boolean
}

const AuthContext = createContext<AuthContextValue>({
  isAuthenticated:   false,
  isLoading:         true,
  user:              null,
  login:             async () => ({ success: false }),
  logout:            () => {},
  currentCargoId:    'mecanica',
  setCurrentCargoId: () => {},
  currentCargo:      undefined,
  canView:           () => false,
  canEdit:           () => false,
  isAdmin:           () => false,
})

function setSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=1; path=/; SameSite=Lax`
}

function clearSessionCookie() {
  document.cookie = `${SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading]             = useState(true)
  const [user, setUser]                       = useState<AuthUser | null>(null)
  const [currentCargoId, setCurrentCargoId]   = useState('mecanica')

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      if (raw) {
        const session: SessionData = JSON.parse(raw)
        setUser(session.user)
        setCurrentCargoId(session.user.cargoId)
        setIsAuthenticated(true)
        setSessionCookie()
      } else {
        clearSessionCookie()
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY)
      clearSessionCookie()
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (credentials: LoginCredentials): Promise<LoginResult> => {
    if (!credentials.email.trim() || !credentials.password.trim()) {
      return { success: false, error: 'Preencha todos os campos' }
    }

    const authUser: AuthUser = {
      id:        'user-001',
      nome:      'João Dias',
      email:     credentials.email,
      cargoId:   'mecanica',
      empresaId: 'empresa-001',
    }

    const session: SessionData = { user: authUser, loginAt: Date.now() }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    setSessionCookie()

    setUser(authUser)
    setCurrentCargoId(authUser.cargoId)
    setIsAuthenticated(true)

    return { success: true }
  }, [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    clearSessionCookie()
    setUser(null)
    setIsAuthenticated(false)
    router.replace('/login')
  }, [router])

  const currentCargo = mockCargos.find((c) => c.id === currentCargoId)

  const canView = useCallback(
    (module: ModuleId) =>
      (currentCargo?.isAdmin ?? false) || (currentCargo?.permissoes[module]?.visualizacao ?? false),
    [currentCargo]
  )

  const canEdit = useCallback(
    (module: ModuleId) =>
      (currentCargo?.isAdmin ?? false) || (currentCargo?.permissoes[module]?.edicao ?? false),
    [currentCargo]
  )

  const isAdmin = useCallback(() => currentCargo?.isAdmin ?? false, [currentCargo])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
        currentCargoId,
        setCurrentCargoId,
        currentCargo,
        canView,
        canEdit,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
