'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  MoreHorizontal,
  Users,
  Shield,
  ShieldCheck,
  Eye,
  Edit3,
  Trash2,
  Check,
  Lock,
  EyeOff,
  Pencil,
} from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGate } from '@/components/shared/PermissionGate'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { formatDate, getInitials, relativeTime } from '@/lib/utils'
import { mockUsuarios } from '@/mocks'
import { useAuth } from '@/contexts/AuthContext'
import { mockCargos } from '@/mocks/cargos'
import { ALL_MODULES, CARGO_PRESET_COLORS } from '@/types/permissions'
import type { Cargo, ModuleId, ModulePermission, PermissionsMap } from '@/types/permissions'

type PageTab = 'usuarios' | 'cargos'

// ─── Animated Toggle Switch ───────────────────────────────────────────────────

function PermToggle({
  enabled,
  onChange,
  color = '#000080',
}: {
  enabled: boolean
  onChange: (v: boolean) => void
  color?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none',
        enabled ? '' : 'bg-muted'
      )}
      style={enabled ? { backgroundColor: color } : {}}
      role="switch"
      aria-checked={enabled}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="inline-block h-4 w-4 rounded-full bg-white shadow-sm"
        style={{
          position: 'absolute',
          top: '2px',
          left: enabled ? 'calc(100% - 18px)' : '2px',
        }}
      />
    </button>
  )
}

// ─── Permission Row ───────────────────────────────────────────────────────────

function PermRow({
  moduleId,
  label,
  perm,
  onChange,
  disabled = false,
}: {
  moduleId: ModuleId
  label: string
  perm: ModulePermission
  onChange: (m: ModuleId, field: 'visualizacao' | 'edicao', v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
      </div>
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-muted-foreground w-20 text-right">Visualização</span>
          <PermToggle
            enabled={perm.visualizacao}
            onChange={(v) => onChange(moduleId, 'visualizacao', v)}
            color="#0f4c5c"
          />
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-xs text-muted-foreground w-14 text-right">Edição</span>
          <PermToggle
            enabled={perm.edicao}
            onChange={(v) => onChange(moduleId, 'edicao', v)}
            color="#000080"
          />
        </label>
      </div>
      {disabled && (
        <Lock size={12} className="flex-shrink-0 text-muted-foreground/40" />
      )}
    </div>
  )
}

// ─── Novo Cargo Modal ─────────────────────────────────────────────────────────

function buildEmptyPermissions(): PermissionsMap {
  return Object.fromEntries(
    ALL_MODULES.map((m) => [m.id, { visualizacao: false, edicao: false }])
  ) as PermissionsMap
}

function NovoCargo({
  open,
  onClose,
  onSave,
  editing,
}: {
  open: boolean
  onClose: () => void
  onSave: (cargo: Cargo) => void
  editing: Cargo | null
}) {
  const [nome, setNome] = useState(editing?.nome ?? '')
  const [descricao, setDescricao] = useState(editing?.descricao ?? '')
  const [cor, setCor] = useState(editing?.cor ?? CARGO_PRESET_COLORS[0])
  const [permissoes, setPermissoes] = useState<PermissionsMap>(
    editing?.permissoes ?? buildEmptyPermissions()
  )

  React.useEffect(() => {
    if (open) {
      setNome(editing?.nome ?? '')
      setDescricao(editing?.descricao ?? '')
      setCor(editing?.cor ?? CARGO_PRESET_COLORS[0])
      setPermissoes(editing?.permissoes ?? buildEmptyPermissions())
    }
  }, [open, editing])

  const handlePerm = useCallback(
    (moduleId: ModuleId, field: 'visualizacao' | 'edicao', value: boolean) => {
      setPermissoes((prev) => {
        const updated = { ...prev[moduleId], [field]: value }
        // Edição implies visualização
        if (field === 'edicao' && value) updated.visualizacao = true
        // Revoking visualização also revokes edição
        if (field === 'visualizacao' && !value) updated.edicao = false
        return { ...prev, [moduleId]: updated }
      })
    },
    []
  )

  function handleSave() {
    if (!nome.trim()) return
    const cargo: Cargo = {
      id: editing?.id ?? nome.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      nome: nome.trim(),
      descricao: descricao.trim(),
      cor,
      permissoes,
    }
    onSave(cargo)
  }

  const viewCount = ALL_MODULES.filter((m) => permissoes[m.id]?.visualizacao).length
  const editCount = ALL_MODULES.filter((m) => permissoes[m.id]?.edicao).length

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield size={16} className="text-accent" />
            {editing ? 'Editar Cargo' : 'Novo Cargo'}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-5 pb-2 max-h-[70vh] overflow-y-auto">
          {/* Basic info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider">Nome do Cargo *</Label>
              <Input
                placeholder="ex: Operador Dobra"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider">Cor do Cargo</Label>
              <div className="flex flex-wrap gap-2 pt-1">
                {CARGO_PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCor(c)}
                    className={cn(
                      'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                      cor === c ? 'border-foreground scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider">Descrição</Label>
              <Input
                placeholder="Descreva as responsabilidades deste cargo..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
              />
            </div>
          </div>

          {/* Preview badge */}
          {nome && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2"
            >
              <span className="text-xs text-muted-foreground">Prévia:</span>
              <span
                className="rounded px-2 py-0.5 text-xs font-bold text-white"
                style={{ backgroundColor: cor }}
              >
                {nome}
              </span>
            </motion.div>
          )}

          <Separator />

          {/* Permission matrix */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Matriz de Permissões</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {viewCount} visualização · {editCount} edição habilitados
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const all = buildEmptyPermissions()
                    ALL_MODULES.forEach((m) => {
                      all[m.id] = { visualizacao: true, edicao: false }
                    })
                    setPermissoes(all)
                  }}
                  className="text-[11px] text-primary hover:underline"
                >
                  Marcar visualização
                </button>
                <span className="text-muted-foreground/40">·</span>
                <button
                  type="button"
                  onClick={() => setPermissoes(buildEmptyPermissions())}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Column headers */}
            <div className="flex items-center gap-3 px-3 pb-1">
              <div className="flex-1" />
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-1.5 w-[100px] justify-end">
                  <Eye size={11} className="text-muted-foreground" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Visualização</span>
                </div>
                <div className="flex items-center gap-1.5 w-[70px] justify-end">
                  <Edit3 size={11} className="text-muted-foreground" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Edição</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 divide-y divide-border/50">
              {ALL_MODULES.map((m) => (
                <PermRow
                  key={m.id}
                  moduleId={m.id}
                  label={m.label}
                  perm={permissoes[m.id] ?? { visualizacao: false, edicao: false }}
                  onChange={handlePerm}
                />
              ))}
            </div>
          </div>

          {/* Info note */}
          <div className="flex gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <Lock size={13} className="flex-shrink-0 mt-0.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Edição</strong> implica automaticamente em{' '}
              <strong className="text-foreground">Visualização</strong>. Usuários sem{' '}
              <strong className="text-foreground">Visualização</strong> verão o módulo bloqueado ao navegar.
            </p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>Cancelar</Button>
          <Button
            variant="accent"
            size="sm"
            onClick={handleSave}
            disabled={!nome.trim()}
          >
            <Check size={13} />
            {editing ? 'Salvar Alterações' : 'Criar Cargo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ─── Cargo Card ───────────────────────────────────────────────────────────────

function CargoCard({
  cargo,
  userCount,
  onEdit,
  onDelete,
  canManage,
  index,
}: {
  cargo: Cargo
  userCount: number
  onEdit: (c: Cargo) => void
  onDelete: (id: string) => void
  canManage: boolean
  index: number
}) {
  const viewModules = ALL_MODULES.filter((m) => cargo.permissoes[m.id]?.visualizacao)
  const editModules = ALL_MODULES.filter((m) => cargo.permissoes[m.id]?.edicao)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
    >
      {/* Header stripe */}
      <div className="h-1 w-full" style={{ backgroundColor: cargo.cor }} />

      <div className="p-5 space-y-4">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${cargo.cor}18` }}
            >
              {cargo.isAdmin ? (
                <ShieldCheck size={17} style={{ color: cargo.cor }} />
              ) : (
                <Shield size={17} style={{ color: cargo.cor }} />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground">{cargo.nome}</h3>
                {cargo.isAdmin && (
                  <span className="rounded-full border border-accent/20 bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                    Super Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{cargo.descricao}</p>
            </div>
          </div>
          {canManage && !cargo.isAdmin && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon-sm" onClick={() => onEdit(cargo)}>
                <Pencil size={13} />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDelete(cargo.id)}
              >
                <Trash2 size={13} />
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users size={11} />
            {userCount} {userCount === 1 ? 'usuário' : 'usuários'}
          </span>
          <span className="flex items-center gap-1">
            <Eye size={11} />
            {viewModules.length} visualização
          </span>
          <span className="flex items-center gap-1">
            <Edit3 size={11} />
            {editModules.length} edição
          </span>
        </div>

        <Separator />

        {/* Permission chips */}
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Acessos habilitados
          </p>
          {viewModules.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Nenhum módulo habilitado</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {ALL_MODULES.map((m) => {
                const perm = cargo.permissoes[m.id]
                if (!perm?.visualizacao) return null
                return (
                  <span
                    key={m.id}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold',
                      perm.edicao
                        ? 'border border-accent/20 bg-accent/8 text-accent'
                        : 'border border-border bg-muted text-muted-foreground'
                    )}
                  >
                    {perm.edicao ? <Edit3 size={8} /> : <Eye size={8} />}
                    {m.label}
                  </span>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const { canEdit, isAdmin } = useAuth()
  const canManage = isAdmin()

  const [activeTab, setActiveTab] = useState<PageTab>('usuarios')
  const [search, setSearch] = useState('')
  const [cargos, setCargos] = useState<Cargo[]>(mockCargos)
  const [novoCargoOpen, setNovoCargoOpen] = useState(false)
  const [editingCargo, setEditingCargo] = useState<Cargo | null>(null)

  const filtered = mockUsuarios.filter(
    (u) =>
      u.nome.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.departamento.toLowerCase().includes(search.toLowerCase())
  )

  function handleSaveCargo(cargo: Cargo) {
    setCargos((prev) => {
      const idx = prev.findIndex((c) => c.id === cargo.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = cargo
        return next
      }
      return [...prev, cargo]
    })
    setNovoCargoOpen(false)
    setEditingCargo(null)
  }

  function handleDeleteCargo(id: string) {
    setCargos((prev) => prev.filter((c) => c.id !== id))
  }

  function openEdit(cargo: Cargo) {
    setEditingCargo(cargo)
    setNovoCargoOpen(true)
  }

  function openNew() {
    setEditingCargo(null)
    setNovoCargoOpen(true)
  }

  const ativos = mockUsuarios.filter((u) => u.status === 'ativo').length

  return (
    <PermissionGate module="usuarios">
      <div>
        <PageHeader
          title="Usuários"
          subtitle={`${ativos} usuários ativos · ${cargos.length} cargos cadastrados`}
          breadcrumbs={[{ label: 'Esync', href: '/dashboard' }, { label: 'Usuários' }]}
          actions={
            <div className="flex items-center gap-2">
              {canManage && (
                <Button variant="outline" size="sm" onClick={openNew}>
                  <Shield size={13} />
                  Novo Cargo
                </Button>
              )}
              {(canEdit('usuarios') || canManage) && (
                <Button variant="accent" size="sm">
                  <Plus size={13} />
                  Novo Usuário
                </Button>
              )}
            </div>
          }
        />

        {/* Summary cards */}
        <div className="mb-5 grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: 'Total de Usuários',  value: mockUsuarios.length,                                            color: 'text-foreground'       },
            { label: 'Ativos',             value: ativos,                                                         color: 'text-success'           },
            { label: 'Cargos Cadastrados', value: cargos.length,                                                  color: 'text-accent'            },
            { label: 'Inativos',           value: mockUsuarios.filter((u) => u.status === 'inativo').length,      color: 'text-muted-foreground'  },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border bg-card p-4 shadow-card"
            >
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className={`mt-1 text-2xl font-bold ${item.color}`}>{item.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-xl border border-border bg-muted p-1 w-fit">
          {([
            { id: 'usuarios' as PageTab, label: 'Usuários',      icon: Users  },
            { id: 'cargos'   as PageTab, label: 'Cargos',        icon: Shield },
          ]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── USUARIOS TAB ── */}
          {activeTab === 'usuarios' && (
            <motion.div
              key="usuarios"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="mb-4">
                <CardContent className="p-4">
                  <div className="relative max-w-md">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar por nome, e-mail ou departamento..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </CardContent>
              </Card>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardContent className="p-0">
                    {filtered.length === 0 ? (
                      <EmptyState icon={<Users size={24} />} title="Nenhum usuário encontrado" className="m-6" />
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Cargo</TableHead>
                            <TableHead>Departamento</TableHead>
                            <TableHead>Permissões</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Último Acesso</TableHead>
                            <TableHead className="w-10" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((usuario, i) => {
                            const cargo = cargos.find((c) => c.id === usuario.cargoId)
                            const viewCount = cargo
                              ? ALL_MODULES.filter((m) => cargo.permissoes[m.id]?.visualizacao).length
                              : 0
                            const editCount = cargo
                              ? ALL_MODULES.filter((m) => cargo.permissoes[m.id]?.edicao).length
                              : 0

                            return (
                              <motion.tr
                                key={usuario.id}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: i * 0.03 }}
                                className="border-b border-border transition-colors hover:bg-muted/40 cursor-pointer"
                              >
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8">
                                      <AvatarFallback className="text-xs">
                                        {getInitials(usuario.nome)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <p className="text-sm font-medium text-foreground">{usuario.nome}</p>
                                      <p className="text-xs text-muted-foreground">{usuario.email}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {cargo ? (
                                    <span
                                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold text-white"
                                      style={{ backgroundColor: cargo.cor }}
                                    >
                                      {cargo.isAdmin && <ShieldCheck size={10} />}
                                      {cargo.nome}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">Sem cargo</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-muted-foreground">{usuario.departamento}</span>
                                </TableCell>
                                <TableCell>
                                  {cargo ? (
                                    <div className="flex items-center gap-3 text-xs">
                                      <span className="flex items-center gap-1 text-primary">
                                        <Eye size={10} /> {viewCount}
                                      </span>
                                      <span className="flex items-center gap-1 text-accent">
                                        <Edit3 size={10} /> {editCount}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <Lock size={10} /> Sem acesso
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={usuario.status} />
                                </TableCell>
                                <TableCell>
                                  <span className="text-xs text-muted-foreground">
                                    {usuario.ultimoAcesso ? relativeTime(usuario.ultimoAcesso) : '—'}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {canManage && (
                                    <Button variant="ghost" size="icon-sm">
                                      <MoreHorizontal size={14} />
                                    </Button>
                                  )}
                                </TableCell>
                              </motion.tr>
                            )
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}

          {/* ── CARGOS TAB ── */}
          {activeTab === 'cargos' && (
            <motion.div
              key="cargos"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Permission legend */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-1">Legenda de Permissões</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        <Eye size={8} /> Módulo
                      </span>
                      <span className="text-xs text-muted-foreground">= Somente visualização</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md border border-accent/20 bg-accent/8 px-2 py-0.5 text-[10px] font-semibold text-accent">
                        <Edit3 size={8} /> Módulo
                      </span>
                      <span className="text-xs text-muted-foreground">= Visualização + Edição completa</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        <EyeOff size={8} />
                      </span>
                      <span className="text-xs text-muted-foreground">= Sem acesso (bloqueado)</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cargo cards grid */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {cargos.map((cargo, i) => {
                  const userCount = mockUsuarios.filter((u) => u.cargoId === cargo.id).length
                  return (
                    <CargoCard
                      key={cargo.id}
                      cargo={cargo}
                      userCount={userCount}
                      onEdit={openEdit}
                      onDelete={handleDeleteCargo}
                      canManage={canManage}
                      index={i}
                    />
                  )
                })}

                {/* Add new card */}
                {canManage && (
                  <motion.button
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: cargos.length * 0.05 }}
                    onClick={openNew}
                    className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/20 p-8 text-muted-foreground transition-all hover:border-accent/40 hover:bg-accent/5 hover:text-accent"
                  >
                    <Plus size={24} />
                    <span className="text-sm font-medium">Novo Cargo</span>
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Novo Cargo modal */}
        <NovoCargo
          open={novoCargoOpen}
          onClose={() => { setNovoCargoOpen(false); setEditingCargo(null) }}
          onSave={handleSaveCargo}
          editing={editingCargo}
        />
      </div>
    </PermissionGate>
  )
}
