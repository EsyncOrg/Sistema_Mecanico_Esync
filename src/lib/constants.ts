export const APP_NAME = 'Esync'
export const APP_DESCRIPTION = 'Sistema Mecânico de Gestão'
export const APP_VERSION = '1.0.0'

export const NAV_ITEMS = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: 'LayoutDashboard',
  },
  {
    label: 'Desenvolvimento',
    href: '/desenvolvimento',
    icon: 'Lightbulb',
  },
  {
    label: 'Programação',
    href: '/programacao',
    icon: 'Workflow',
  },
  {
    label: 'Conjuntos',
    href: '/conjuntos',
    icon: 'Boxes',
  },
  {
    label: 'Corte',
    href: '/corte',
    icon: 'Scissors',
  },
  {
    label: 'Dobra',
    href: '/dobra',
    icon: 'FoldVertical',
  },
  {
    label: 'Peças',
    href: '/pecas',
    icon: 'Package',
    badge: 3,
  },
  {
    label: 'Retalhos',
    href: '/retalhos',
    icon: 'Layers',
  },
  {
    label: 'Programas',
    href: '/programas',
    icon: 'Code2',
    badge: 1,
  },
  {
    label: 'Estoque',
    href: '/estoque',
    icon: 'Warehouse',
  },
  {
    label: 'Relatórios',
    href: '/relatorios',
    icon: 'BarChart3',
  },
  {
    label: 'Esync IA',
    href: '/esync-ia',
    icon: 'Brain',
  },
  {
    label: 'Usuários',
    href: '/usuarios',
    icon: 'Users',
  },
  {
    label: 'Configurações',
    href: '/configuracoes',
    icon: 'Settings',
  },
] as const

export const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
  pendente: 'Pendente',
  erro: 'Erro',
  concluido: 'Concluído',
  em_progresso: 'Em Progresso',
  disponivel: 'Disponível',
  reservado: 'Reservado',
  descarte: 'Descarte',
  em_producao: 'Em Produção',
  estoque_baixo: 'Estoque Baixo',
  indisponivel: 'Indisponível',
  em_teste: 'Em Teste',
  arquivado: 'Arquivado',
  revisao: 'Revisão',
}

export const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  supervisor: 'Supervisor',
  operador: 'Operador',
  visualizador: 'Visualizador',
}

export const DEPARTAMENTOS = [
  'Produção',
  'Engenharia',
  'Qualidade',
  'Logística',
  'TI',
  'Administração',
  'Comercial',
]

export const MAQUINAS = [
  'CNC-001',
  'CNC-002',
  'CNC-003',
  'LASER-001',
  'LASER-002',
  'PLASMA-001',
  'TORNO-001',
  'FRESA-001',
]

export const MATERIAIS = [
  'Aço Carbono 1020',
  'Aço Carbono 1045',
  'Aço Inox 304',
  'Aço Inox 316',
  'Alumínio 6061',
  'Alumínio 7075',
  'Cobre',
  'Latão',
]
