export type ModuleId =
  | 'dashboard'
  | 'corte'
  | 'dobra'
  | 'solda'
  | 'pecas'
  | 'retalhos'
  | 'programas'
  | 'relatorios'
  | 'usuarios'
  | 'configuracoes'

export interface ModulePermission {
  visualizacao: boolean
  edicao: boolean
}

export type PermissionsMap = Record<ModuleId, ModulePermission>

export interface Cargo {
  id: string
  nome: string
  descricao: string
  cor: string
  permissoes: PermissionsMap
  isAdmin?: boolean
}

export const ALL_MODULES: { id: ModuleId; label: string }[] = [
  { id: 'dashboard',    label: 'Dashboard'     },
  { id: 'corte',        label: 'Corte'         },
  { id: 'dobra',        label: 'Dobra'         },
  { id: 'solda',        label: 'Solda'         },
  { id: 'pecas',        label: 'Peças'         },
  { id: 'retalhos',     label: 'Retalhos'      },
  { id: 'programas',    label: 'Programas'     },
  { id: 'relatorios',   label: 'Relatórios'    },
  { id: 'usuarios',     label: 'Usuários'      },
  { id: 'configuracoes',label: 'Configurações' },
]

export const CARGO_PRESET_COLORS = [
  '#0f4c5c',
  '#000080',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#6b7280',
  '#ec4899',
  '#f97316',
]
