import type { Cargo, ModuleId, ModulePermission, PermissionsMap } from '@/types/permissions'
import { ALL_MODULES } from '@/types/permissions'

function none(): ModulePermission { return { visualizacao: false, edicao: false } }
function view(): ModulePermission { return { visualizacao: true,  edicao: false } }
function full(): ModulePermission { return { visualizacao: true,  edicao: true  } }

function buildMap(overrides: Partial<PermissionsMap>): PermissionsMap {
  const base = Object.fromEntries(ALL_MODULES.map((m) => [m.id, none()])) as PermissionsMap
  return { ...base, ...overrides }
}

export const mockCargos: Cargo[] = [
  {
    id: 'mecanica',
    nome: 'Mecânica',
    descricao: 'Acesso completo ao sistema. Gerencia usuários, cargos e todas as operações.',
    cor: '#0f4c5c',
    isAdmin: true,
    permissoes: buildMap({
      dashboard:    full(),
      corte:        full(),
      dobra:        full(),
      solda:        full(),
      pecas:        full(),
      retalhos:     full(),
      programas:    full(),
      estoque:      full(),
      relatorios:   full(),
      usuarios:     full(),
      configuracoes:full(),
    } as Partial<Record<ModuleId, ModulePermission>>),
  },
  {
    id: 'operador_corte',
    nome: 'Operador Corte',
    descricao: 'Operação completa do módulo de corte. Visualização do dashboard.',
    cor: '#000080',
    permissoes: buildMap({
      dashboard: view(),
      corte:     full(),
      dobra:     view(),
      estoque:   view(),
    } as Partial<Record<ModuleId, ModulePermission>>),
  },
  {
    id: 'pcp',
    nome: 'PCP',
    descricao: 'Planejamento e controle da produção. Gestão de programas e acompanhamento de ordens.',
    cor: '#10b981',
    permissoes: buildMap({
      dashboard:  view(),
      pecas:      view(),
      programas:  full(),
      corte:      view(),
      dobra:      view(),
      estoque:    view(),
      relatorios: view(),
    } as Partial<Record<ModuleId, ModulePermission>>),
  },
  {
    id: 'engenharia',
    nome: 'Engenharia',
    descricao: 'Gestão de programas CNC e cadastro de peças. Acesso a relatórios técnicos.',
    cor: '#f59e0b',
    permissoes: buildMap({
      dashboard:  view(),
      pecas:      full(),
      retalhos:   view(),
      programas:  full(),
      dobra:      view(),
      estoque:    view(),
      relatorios: view(),
    } as Partial<Record<ModuleId, ModulePermission>>),
  },
  {
    id: 'producao',
    nome: 'Produção',
    descricao: 'Operação de máquinas de corte, dobra e solda. Acompanhamento de programas.',
    cor: '#8b5cf6',
    permissoes: buildMap({
      dashboard:  view(),
      corte:      full(),
      dobra:      full(),
      solda:      full(),
      programas:  view(),
      estoque:    full(),
      relatorios: view(),
    } as Partial<Record<ModuleId, ModulePermission>>),
  },
  {
    id: 'qualidade',
    nome: 'Qualidade',
    descricao: 'Inspeção e controle de qualidade. Acesso a relatórios e visualização de peças.',
    cor: '#ef4444',
    permissoes: buildMap({
      dashboard:  view(),
      pecas:      view(),
      retalhos:   view(),
      dobra:      view(),
      estoque:    view(),
      relatorios: full(),
    } as Partial<Record<ModuleId, ModulePermission>>),
  },
  {
    id: 'administrativo',
    nome: 'Administrativo',
    descricao: 'Acesso a relatórios e configurações do sistema. Sem acesso à produção.',
    cor: '#6b7280',
    permissoes: buildMap({
      dashboard:    view(),
      relatorios:   view(),
      configuracoes:full(),
    } as Partial<Record<ModuleId, ModulePermission>>),
  },
]
