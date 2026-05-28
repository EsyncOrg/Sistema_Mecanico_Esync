export type ModuleId =
  | 'dashboard'
  | 'desenvolvimento'
  | 'programacao'
  | 'conjuntos'
  | 'corte'
  | 'dobra'
  | 'solda'
  | 'maquinas'
  | 'pecas'
  | 'retalhos'
  | 'programas'
  | 'estoque'
  | 'relatorios'
  | 'esync_ia'
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
  { id: 'dashboard',     label: 'Dashboard'      },
  { id: 'desenvolvimento',label: 'Desenvolvimento' },
  { id: 'programacao',   label: 'Programação'    },
  { id: 'conjuntos',     label: 'Produtos'       },
  { id: 'corte',         label: 'Corte'          },
  { id: 'dobra',         label: 'Dobra'          },
  { id: 'solda',         label: 'Solda'          },
  { id: 'maquinas',      label: 'Máquinas'       },
  { id: 'pecas',         label: 'Peças'          },
  { id: 'retalhos',      label: 'Retalhos'       },
  { id: 'programas',     label: 'Programas'      },
  { id: 'estoque',       label: 'Estoque'        },
  { id: 'relatorios',    label: 'Relatórios'     },
  { id: 'esync_ia',      label: 'Esync IA'       },
  { id: 'usuarios',      label: 'Usuários'       },
  { id: 'configuracoes', label: 'Configurações'  },
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
