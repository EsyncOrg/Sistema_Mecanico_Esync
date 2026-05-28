'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, Search, ChevronDown, Settings, LogOut, User, X, Sun, Moon, ShieldCheck } from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { relativeTime } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { mockCargos } from '@/mocks/cargos'

const mockNotificacoes = [
  {
    id: '1',
    titulo: 'Estoque Baixo',
    mensagem: 'Aço Inox 304 — quantidade crítica',
    tipo: 'aviso',
    tempo: '2026-05-25T13:15:00',
    lida: false,
  },
  {
    id: '2',
    titulo: 'Programa Aprovado',
    mensagem: 'LASER-P0118 v2.3 aprovado pela engenharia',
    tipo: 'sucesso',
    tempo: '2026-05-25T09:30:00',
    lida: false,
  },
  {
    id: '3',
    titulo: 'Manutenção Programada',
    mensagem: 'LASER-001 — manutenção às 18:00',
    tipo: 'info',
    tempo: '2026-05-25T08:00:00',
    lida: true,
  },
]

interface TopbarProps {
  title?: string
}

export function Topbar({ title }: TopbarProps) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const { theme, setTheme } = useTheme()
  const { currentCargo, setCurrentCargoId, logout } = useAuth()

  const unreadCount = mockNotificacoes.filter((n) => !n.lida).length

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-card/80 px-6 backdrop-blur-md">
      {/* Left */}
      <div className="flex items-center gap-3">
        {title && (
          <h1 className="text-base font-semibold text-foreground hidden sm:block">{title}</h1>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <AnimatePresence initial={false} mode="wait">
          {searchOpen ? (
            <motion.div
              key="search-open"
              initial={{ width: 40, opacity: 0 }}
              animate={{ width: 280, opacity: 1 }}
              exit={{ width: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="flex items-center gap-2 rounded-lg border border-border bg-input px-3 py-2 h-9"
            >
              <Search size={14} className="flex-shrink-0 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                placeholder="Pesquisar..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                onClick={() => { setSearchOpen(false); setSearchValue('') }}
                className="flex-shrink-0 text-muted-foreground hover:text-foreground"
              >
                <X size={14} />
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="search-closed"
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Pesquisar"
            >
              <Search size={15} />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Theme toggle */}
        <motion.button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Alternar tema"
        >
          <AnimatePresence mode="wait" initial={false}>
            {theme === 'dark' ? (
              <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.18 }} className="flex">
                <Sun size={15} />
              </motion.span>
            ) : (
              <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.18 }} className="flex">
                <Moon size={15} />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Notificações"
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white"
                >
                  {unreadCount}
                </motion.span>
              )}
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notificações</span>
              {unreadCount > 0 && (
                <Badge variant="accent" className="text-[10px]">{unreadCount} novas</Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {mockNotificacoes.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className={cn('flex flex-col items-start gap-0.5 py-2.5', !n.lida && 'bg-accent/5')}
              >
                <div className="flex w-full items-center justify-between">
                  <span className={cn('text-sm font-medium', !n.lida ? 'text-foreground' : 'text-muted-foreground')}>
                    {n.titulo}
                  </span>
                  {!n.lida && <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-accent" />}
                </div>
                <span className="text-xs text-muted-foreground">{n.mensagem}</span>
                <span className="text-[10px] text-muted-foreground/60">{relativeTime(n.tempo)}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* Role switcher (demo) */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs transition-colors hover:bg-muted"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <ShieldCheck size={12} className="text-muted-foreground" />
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: currentCargo?.cor ?? '#6b7280' }}
              >
                {currentCargo?.nome ?? '—'}
              </span>
              <ChevronDown size={11} className="text-muted-foreground" />
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex items-center gap-2 text-xs">
              <ShieldCheck size={12} />
              Simular Cargo (Demo)
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {mockCargos.map((cargo) => (
              <DropdownMenuItem
                key={cargo.id}
                onClick={() => setCurrentCargoId(cargo.id)}
                className={cn(
                  'flex items-center gap-2',
                  currentCargo?.id === cargo.id && 'bg-accent/8'
                )}
              >
                <span
                  className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: cargo.cor }}
                />
                <span className="flex-1 text-sm">{cargo.nome}</span>
                {currentCargo?.id === cargo.id && (
                  <span className="text-[10px] font-semibold text-accent">Ativo</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-muted"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                <span className="text-[10px] font-bold text-primary">JD</span>
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-foreground leading-none">João Dias</p>
                <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                  {currentCargo?.nome ?? 'Administrador'}
                </p>
              </div>
              <ChevronDown size={13} className="text-muted-foreground" />
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User size={14} />
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings size={14} />
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut size={14} />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
