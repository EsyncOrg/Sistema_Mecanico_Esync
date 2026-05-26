'use client'

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { BlockedAccess } from '@/components/shared/BlockedAccess'
import type { ModuleId } from '@/types/permissions'
import { ALL_MODULES } from '@/types/permissions'

interface PermissionGateProps {
  module: ModuleId
  children: React.ReactNode
}

export function PermissionGate({ module, children }: PermissionGateProps) {
  const { canView } = useAuth()

  if (!canView(module)) {
    const label = ALL_MODULES.find((m) => m.id === module)?.label
    return <BlockedAccess moduleName={label} />
  }

  return <>{children}</>
}
