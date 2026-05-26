'use client'

import { useState, useCallback } from 'react'

export function useSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const toggle = useCallback(() => setIsCollapsed((v) => !v), [])
  const openMobile = useCallback(() => setIsMobileOpen(true), [])
  const closeMobile = useCallback(() => setIsMobileOpen(false), [])
  const toggleMobile = useCallback(() => setIsMobileOpen((v) => !v), [])

  return {
    isCollapsed,
    isMobileOpen,
    toggle,
    openMobile,
    closeMobile,
    toggleMobile,
  }
}
