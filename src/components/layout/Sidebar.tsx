'use client'

import React, { createContext, useContext, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Package,
  Layers,
  Code2,
  BarChart3,
  Users,
  Settings,
  Scissors,
  FoldVertical,
  Warehouse,
  Lightbulb,
  Boxes,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Zap,
  Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV_ITEMS, APP_NAME } from '@/lib/constants'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { useAuth } from '@/contexts/AuthContext'
import type { ModuleId } from '@/types/permissions'

const iconMap: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard,
  Package,
  Layers,
  Code2,
  BarChart3,
  Users,
  Settings,
  Scissors,
  FoldVertical,
  Warehouse,
  Lightbulb,
  Boxes,
}

const hrefToModule: Record<string, ModuleId> = {
  '/dashboard':      'dashboard',
  '/desenvolvimento':'desenvolvimento',
  '/conjuntos':      'conjuntos',
  '/corte':          'corte',
  '/dobra':          'dobra',
  '/pecas':          'pecas',
  '/retalhos':       'retalhos',
  '/programas':      'programas',
  '/estoque':        'estoque',
  '/relatorios':     'relatorios',
  '/usuarios':       'usuarios',
  '/configuracoes':  'configuracoes',
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface SidebarContextValue {
  isCollapsed: boolean
  toggle: () => void
}
const SidebarContext = createContext<SidebarContextValue>({ isCollapsed: false, toggle: () => {} })
export function useSidebarContext() { return useContext(SidebarContext) }

// ─── Nav Item ────────────────────────────────────────────────────────────────

interface NavItemProps {
  item: { label: string; href: string; icon: string; badge?: number }
  isCollapsed: boolean
  isActive: boolean
  isLocked: boolean
}

function NavItem({ item, isCollapsed, isActive, isLocked }: NavItemProps) {
  const Icon = iconMap[item.icon]

  const inner = (
    <Link href={item.href} tabIndex={-1}>
      <motion.div
        className={cn(
          'relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer select-none',
          'transition-colors duration-150',
          isLocked && 'opacity-45'
        )}
        style={{
          background: isActive ? 'var(--sidebar-item-active-bg)' : undefined,
          color: isActive
            ? 'var(--sidebar-item-text-active)'
            : 'var(--sidebar-item-text)',
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-item-hover-bg)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            (e.currentTarget as HTMLElement).style.background = ''
          }
        }}
        whileHover={{ x: isCollapsed ? 0 : 2 }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        {/* Active pill */}
        {isActive && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full"
            style={{ background: 'var(--sidebar-indicator)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          />
        )}

        {/* Icon */}
        <span
          className="flex-shrink-0 transition-colors"
          style={{ color: isActive ? 'var(--sidebar-indicator)' : 'var(--sidebar-item-text)' }}
        >
          {Icon && <Icon size={17} />}
        </span>

        {/* Label */}
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18 }}
              className="text-sm font-medium whitespace-nowrap overflow-hidden leading-none flex-1"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Badge or Lock */}
        <AnimatePresence>
          {isLocked && !isCollapsed && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <Lock size={10} style={{ color: 'var(--sidebar-subtext)' }} />
            </motion.span>
          )}
          {item.badge && !isCollapsed && !isLocked && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white leading-none"
              style={{ background: 'var(--sidebar-badge-bg)' }}
            >
              {item.badge}
            </motion.span>
          )}
        </AnimatePresence>

        {/* Collapsed badge dot */}
        {item.badge && isCollapsed && !isLocked && (
          <span
            className="absolute top-1.5 right-2 h-2 w-2 rounded-full"
            style={{ background: 'var(--sidebar-badge-bg)' }}
          />
        )}
        {/* Collapsed lock dot */}
        {isLocked && isCollapsed && (
          <span className="absolute top-1.5 right-1.5">
            <Lock size={9} style={{ color: 'var(--sidebar-subtext)' }} />
          </span>
        )}
      </motion.div>
    </Link>
  )

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="right">
          {item.label}{isLocked ? ' (Bloqueado)' : ''}
        </TooltipContent>
      </Tooltip>
    )
  }
  return inner
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

const SIDEBAR_W = 260
const SIDEBAR_COLLAPSED_W = 72

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const toggle = useCallback(() => setIsCollapsed((v) => !v), [])
  const { canView, currentCargo } = useAuth()

  return (
    <SidebarContext.Provider value={{ isCollapsed, toggle }}>
      <TooltipProvider>
        <motion.aside
          initial={false}
          animate={{ width: isCollapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          className="relative flex h-screen flex-col flex-shrink-0 overflow-hidden"
          style={{
            background: 'var(--sidebar-gradient)',
            boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
          }}
        >
          {/* Subtle grid overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                'repeating-linear-gradient(0deg,transparent,transparent 24px,rgba(255,255,255,1) 24px,rgba(255,255,255,1) 25px),repeating-linear-gradient(90deg,transparent,transparent 24px,rgba(255,255,255,1) 24px,rgba(255,255,255,1) 25px)',
            }}
          />

          {/* ── Logo ── */}
          <div
            className="relative flex h-16 items-center px-4"
            style={{ borderBottom: '1px solid var(--sidebar-border-color)' }}
          >
            <motion.div
              animate={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}
              className="flex w-full items-center gap-3"
            >
              <motion.div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg shadow-md"
                style={{ background: 'hsl(240 100% 25%)' }}
                whileHover={{ scale: 1.05 }}
              >
                <Zap size={16} className="text-white" strokeWidth={2.5} />
              </motion.div>

              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <p
                      className="text-base font-bold tracking-wide leading-none"
                      style={{ color: 'var(--sidebar-logo-text)' }}
                    >
                      {APP_NAME}
                    </p>
                    <p
                      className="text-[10px] leading-none mt-0.5 tracking-widest uppercase"
                      style={{ color: 'var(--sidebar-subtext)' }}
                    >
                      Sistema Mecânico
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* ── Navigation ── */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-0.5">
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--sidebar-section-label)' }}
                >
                  Menu Principal
                </motion.p>
              )}
            </AnimatePresence>

            {NAV_ITEMS.map((item) => {
              const moduleId = hrefToModule[item.href]
              const locked = moduleId ? !canView(moduleId) : false
              return (
                <NavItem
                  key={item.href}
                  item={item}
                  isCollapsed={isCollapsed}
                  isActive={
                    item.href === '/dashboard'
                      ? pathname === '/dashboard'
                      : pathname.startsWith(item.href)
                  }
                  isLocked={locked}
                />
              )
            })}
          </nav>

          {/* ── User ── */}
          <div
            className="px-3 py-3"
            style={{ borderTop: '1px solid var(--sidebar-border-color)' }}
          >
            <motion.div
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl p-2',
                isCollapsed && 'justify-center'
              )}
              style={{ transition: 'background 150ms ease' }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-item-hover-bg)'
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = ''
              }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="relative flex-shrink-0">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{
                    background: 'rgba(0,0,128,0.22)',
                    border: '1px solid rgba(0,0,128,0.38)',
                  }}
                >
                  <span className="text-xs font-bold" style={{ color: '#ffffff' }}>
                    JD
                  </span>
                </div>
                <span
                  className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2"
                  style={{ background: '#4ade80', borderColor: 'transparent' }}
                />
              </div>

              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="flex flex-1 min-w-0 flex-col"
                  >
                    <p
                      className="truncate text-sm font-medium leading-none"
                      style={{ color: 'var(--sidebar-user-text)' }}
                    >
                      João Dias
                    </p>
                    {/* Role badge */}
                    <span
                      className="mt-1 inline-flex w-fit items-center rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: currentCargo?.cor ?? '#6b7280' }}
                    >
                      {currentCargo?.nome ?? '—'}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {!isCollapsed && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <LogOut
                      size={14}
                      className="flex-shrink-0 transition-opacity hover:opacity-60"
                      style={{ color: 'var(--sidebar-subtext)' }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* ── Collapse button ── */}
          <motion.button
            onClick={toggle}
            className="absolute -right-3 top-[72px] z-10 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:bg-muted hover:text-foreground"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {isCollapsed ? <ChevronRight size={11} /> : <ChevronLeft size={11} />}
          </motion.button>
        </motion.aside>
      </TooltipProvider>
    </SidebarContext.Provider>
  )
}
