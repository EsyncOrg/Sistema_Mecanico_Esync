// Core domain types for Esync Sistema Mecânico

export type UserRole = 'admin' | 'supervisor' | 'operador' | 'visualizador'

export type StatusGeral = 'ativo' | 'inativo' | 'pendente' | 'erro' | 'concluido' | 'em_progresso'

export type Priority = 'alta' | 'media' | 'baixa'

// ─── User ────────────────────────────────────────────────────────────────────

export interface Usuario {
  id: string
  nome: string
  email: string
  cargo: UserRole
  cargoId?: string
  departamento: string
  avatar?: string
  status: 'ativo' | 'inativo'
  criadoEm: string
  ultimoAcesso?: string
}

// ─── Peças ───────────────────────────────────────────────────────────────────

export type StatusPeca =
  | 'disponivel'
  | 'reservado'
  | 'em_producao'
  | 'estoque_baixo'
  | 'indisponivel'

export interface Peca {
  id: string
  codigo: string
  nome: string
  material: string
  espessura: number
  quantidade: number
  quantidadeMinima: number
  localizacao: string
  status: StatusPeca
  peso?: number
  unidade: string
  atualizadoEm: string
  categoria: string
  fornecedor?: string
}

// ─── Retalhos ────────────────────────────────────────────────────────────────

export type StatusRetalho = 'disponivel' | 'reservado' | 'descarte'

export interface Retalho {
  id: string
  codigo: string
  material: string
  dimensoes: {
    largura: number
    altura: number
    espessura: number
  }
  peso: number
  localizacao: string
  status: StatusRetalho
  pecaOrigem?: string
  criadoEm: string
}

// ─── Programas ───────────────────────────────────────────────────────────────

export type StatusPrograma = 'ativo' | 'em_teste' | 'arquivado' | 'revisao'

export interface Programa {
  id: string
  codigo: string
  nome: string
  maquina: string
  material: string
  status: StatusPrograma
  versao: string
  operador: string
  tempoEstimado: number
  criadoEm: string
  ultimaExecucao?: string
  execucoes: number
  descricao?: string
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface StatCard {
  id: string
  titulo: string
  valor: string | number
  variacao: number
  tipo: 'aumento' | 'queda' | 'neutro'
  icone: string
  cor: 'primary' | 'accent' | 'success' | 'warning'
  sufixo?: string
}

export interface AtividadeRecente {
  id: string
  tipo: 'peca' | 'retalho' | 'programa' | 'usuario' | 'sistema'
  titulo: string
  descricao: string
  tempo: string
  usuario: string
}

// ─── Notificação ─────────────────────────────────────────────────────────────

export interface Notificacao {
  id: string
  titulo: string
  mensagem: string
  tipo: 'info' | 'aviso' | 'erro' | 'sucesso'
  lida: boolean
  criadaEm: string
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

export interface NavItem {
  label: string
  href: string
  icon: string
  badge?: number
  children?: NavItem[]
}

// ─── Relatório ───────────────────────────────────────────────────────────────

export interface RelatorioItem {
  id: string
  titulo: string
  descricao: string
  tipo: 'producao' | 'estoque' | 'financeiro' | 'operacional'
  icone: string
  geradoEm?: string
}
