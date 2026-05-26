'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import {
  Building2,
  Bell,
  Shield,
  Palette,
  Database,
  Users,
  ChevronRight,
  Check,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const secoes = [
  { id: 'empresa', label: 'Empresa', icon: Building2 },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'seguranca', label: 'Segurança', icon: Shield },
  { id: 'aparencia', label: 'Aparência', icon: Palette },
  { id: 'dados', label: 'Dados & Backup', icon: Database },
  { id: 'permissoes', label: 'Permissões', icon: Users },
]

// ─── Mini UI Mockup ───────────────────────────────────────────────────────────

function ThemePreviewCard({
  themeKey,
  label,
  icon: Icon,
  description,
  selected,
  onClick,
}: {
  themeKey: string
  label: string
  icon: React.ElementType
  description: string
  selected: boolean
  onClick: () => void
}) {
  const isDark = themeKey === 'dark'

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn(
        'relative flex flex-col gap-3 rounded-xl border-2 p-4 text-left transition-all',
        selected
          ? 'border-accent shadow-[0_0_0_1px_hsl(240_100%_25%/0.3),0_4px_24px_hsl(240_100%_25%/0.12)]'
          : 'border-border hover:border-border/80'
      )}
    >
      {/* Selected checkmark */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent"
          >
            <Check size={11} className="text-white" strokeWidth={3} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini UI mockup */}
      <div
        className="relative h-28 w-full overflow-hidden rounded-lg"
        style={{ background: isDark ? '#21252b' : '#f5f7fa' }}
      >
        {/* Mini sidebar */}
        <div
          className="absolute inset-y-0 left-0 w-12 flex flex-col gap-1 p-1.5"
          style={{
            background: 'linear-gradient(180deg, #515151 0%, #424242 100%)',
          }}
        >
          {/* Logo dot */}
          <div className="mb-1 flex h-4 items-center gap-1 px-0.5">
            <div
              className="h-3 w-3 flex-shrink-0 rounded"
              style={{ background: 'hsl(240 100% 25%)' }}
            />
          </div>
          {/* Nav items */}
          {[true, false, false, false].map((active, i) => (
            <div
              key={i}
              className="h-2.5 w-full rounded-sm"
              style={{
                background: active
                  ? isDark
                    ? 'rgba(0,0,128,0.22)'
                    : 'rgba(255,255,255,0.18)'
                  : isDark
                    ? 'rgba(181,181,181,0.10)'
                    : 'rgba(255,255,255,0.10)',
              }}
            />
          ))}
        </div>

        {/* Mini content */}
        <div className="absolute inset-y-0 left-12 right-0 p-2 flex flex-col gap-1.5">
          {/* Topbar */}
          <div
            className="h-4 w-full rounded"
            style={{ background: isDark ? '#272c32' : '#ffffff', opacity: 0.9 }}
          />
          {/* Stat cards row */}
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-7 flex-1 rounded"
                style={{ background: isDark ? '#272c32' : '#ffffff', opacity: 0.9 }}
              />
            ))}
          </div>
          {/* Chart area */}
          <div
            className="flex-1 rounded"
            style={{ background: isDark ? '#272c32' : '#ffffff', opacity: 0.9 }}
          >
            {/* Tiny chart bars */}
            <div className="flex h-full items-end gap-0.5 px-1.5 pb-1 pt-2">
              {[60, 80, 45, 90, 55, 75, 65].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{
                    height: `${h}%`,
                    background: isDark ? 'hsl(232 62% 52% / 0.55)' : 'hsl(240 100% 25% / 0.3)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Label row */}
      <div className="flex items-center gap-2">
        <Icon size={14} className={selected ? 'text-accent' : 'text-muted-foreground'} />
        <span
          className={cn(
            'text-sm font-semibold',
            selected ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {label}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-snug">{description}</p>
    </motion.button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConfiguracoesPage() {
  const { canEdit } = useAuth()
  const [activeSection, setActiveSection] = useState('empresa')
  const [saved, setSaved] = useState(false)
  const { theme, setTheme } = useTheme()

  async function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <PermissionGate module="configuracoes">
    <div>
      <PageHeader
        title="Configurações"
        subtitle="Gerencie as preferências do sistema"
        breadcrumbs={[{ label: 'Esync', href: '/dashboard' }, { label: 'Configurações' }]}
      />

      <div className="flex gap-6">
        {/* Sidebar menu */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden w-52 flex-shrink-0 md:block"
        >
          <Card className="sticky top-24">
            <CardContent className="p-2">
              <nav className="space-y-0.5">
                {secoes.map((secao) => (
                  <button
                    key={secao.id}
                    onClick={() => setActiveSection(secao.id)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors text-left',
                      activeSection === secao.id
                        ? 'bg-primary text-white'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <secao.icon size={14} className="flex-shrink-0" />
                    <span className="flex-1">{secao.label}</span>
                    {activeSection === secao.id && (
                      <ChevronRight size={12} className="flex-shrink-0" />
                    )}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-1 min-w-0"
        >
          {activeSection === 'empresa' && (
            <Card>
              <CardHeader>
                <CardTitle>Informações da Empresa</CardTitle>
                <CardDescription>
                  Dados cadastrais da organização exibidos no sistema
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Nome da Empresa</Label>
                    <Input defaultValue="Esync Industrial Ltda." />
                  </div>
                  <div className="space-y-1.5">
                    <Label>CNPJ</Label>
                    <Input defaultValue="00.000.000/0001-00" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>E-mail de Contato</Label>
                    <Input type="email" defaultValue="contato@esync.com.br" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Telefone</Label>
                    <Input defaultValue="(11) 3000-0000" />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label>Endereço</Label>
                    <Input defaultValue="Rua Industrial, 1500 — Distrito Industrial, São Paulo - SP" />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    Configurações Operacionais
                  </h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Turno de Trabalho</Label>
                      <Input defaultValue="06:00 – 18:00" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Fuso Horário</Label>
                      <Input defaultValue="America/Sao_Paulo (UTC-3)" />
                    </div>
                  </div>
                </div>

                <Separator />

                {canEdit('configuracoes') && (
                <div className="flex items-center justify-end gap-3">
                  <Button variant="outline" size="sm">
                    Cancelar
                  </Button>
                  <Button
                    variant={saved ? 'default' : 'accent'}
                    size="sm"
                    onClick={handleSave}
                    className={saved ? 'bg-success hover:bg-success/90' : ''}
                  >
                    {saved ? (
                      <>
                        <Check size={14} />
                        Salvo!
                      </>
                    ) : (
                      'Salvar Alterações'
                    )}
                  </Button>
                </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeSection === 'aparencia' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette size={18} className="text-accent" />
                  Aparência
                </CardTitle>
                <CardDescription>
                  Escolha o tema visual da interface. A preferência é salva automaticamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme selector cards */}
                <div>
                  <p className="mb-3 text-sm font-medium text-foreground">Modo de exibição</p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <ThemePreviewCard
                      themeKey="light"
                      label="Modo Claro"
                      icon={Sun}
                      description="Interface clara, ideal para ambientes bem iluminados."
                      selected={theme === 'light'}
                      onClick={() => setTheme('light')}
                    />
                    <ThemePreviewCard
                      themeKey="dark"
                      label="Modo Escuro"
                      icon={Moon}
                      description="Interface escura, confortável em baixa luminosidade."
                      selected={theme === 'dark'}
                      onClick={() => setTheme('dark')}
                    />
                    <ThemePreviewCard
                      themeKey="system"
                      label="Preferência do Sistema"
                      icon={Monitor}
                      description="Segue automaticamente a configuração do seu dispositivo."
                      selected={theme === 'system'}
                      onClick={() => setTheme('system')}
                    />
                  </div>
                </div>

                <Separator />

                {/* Current selection info */}
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 px-4 py-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10">
                    {theme === 'dark' ? (
                      <Moon size={15} className="text-accent" />
                    ) : theme === 'system' ? (
                      <Monitor size={15} className="text-accent" />
                    ) : (
                      <Sun size={15} className="text-accent" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {theme === 'dark'
                        ? 'Modo Escuro ativado'
                        : theme === 'system'
                          ? 'Usando preferência do sistema'
                          : 'Modo Claro ativado'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Preferência salva automaticamente no navegador
                    </p>
                  </div>
                  <div className="ml-auto flex h-2 w-2 flex-shrink-0 rounded-full bg-success" />
                </div>
              </CardContent>
            </Card>
          )}

          {activeSection !== 'empresa' && activeSection !== 'aparencia' && (
            <Card>
              <CardHeader>
                <CardTitle>
                  {secoes.find((s) => s.id === activeSection)?.label}
                </CardTitle>
                <CardDescription>
                  Esta seção está em desenvolvimento.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                    {React.createElement(
                      secoes.find((s) => s.id === activeSection)?.icon ?? Building2,
                      { size: 24, className: 'text-muted-foreground' }
                    )}
                  </div>
                  <p className="mt-4 text-base font-semibold text-foreground">Em breve</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Esta seção estará disponível em breve.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
    </PermissionGate>
  )
}
