import type { StatCard, AtividadeRecente } from '@/types'

export const mockStats: StatCard[] = [
  {
    id: '1',
    titulo: 'Peças em Estoque',
    valor: 1_248,
    variacao: 12.5,
    tipo: 'aumento',
    icone: 'Package',
    cor: 'primary',
    sufixo: 'itens',
  },
  {
    id: '2',
    titulo: 'Programas Ativos',
    valor: 37,
    variacao: 4.2,
    tipo: 'aumento',
    icone: 'Code2',
    cor: 'accent',
    sufixo: 'programas',
  },
  {
    id: '3',
    titulo: 'Retalhos Disponíveis',
    valor: 89,
    variacao: -3.1,
    tipo: 'queda',
    icone: 'Layers',
    cor: 'warning',
    sufixo: 'retalhos',
  },
  {
    id: '4',
    titulo: 'Produção Hoje',
    valor: '94%',
    variacao: 2.8,
    tipo: 'aumento',
    icone: 'Activity',
    cor: 'success',
    sufixo: 'eficiência',
  },
]

export const mockAtividades: AtividadeRecente[] = [
  {
    id: '1',
    tipo: 'programa',
    titulo: 'Programa CNC-P0421 executado',
    descricao: 'Máquina CNC-002 — 45 peças produzidas',
    tempo: '2026-05-25T14:30:00',
    usuario: 'Carlos Lima',
  },
  {
    id: '2',
    tipo: 'peca',
    titulo: 'Estoque Baixo: Aço Inox 304',
    descricao: 'Quantidade atual: 12 (mínimo: 50)',
    tempo: '2026-05-25T13:15:00',
    usuario: 'Sistema',
  },
  {
    id: '3',
    tipo: 'retalho',
    titulo: 'Retalho RET-0089 reservado',
    descricao: '500x300mm — Alumínio 6061',
    tempo: '2026-05-25T12:00:00',
    usuario: 'Ana Ferreira',
  },
  {
    id: '4',
    tipo: 'usuario',
    titulo: 'Novo usuário cadastrado',
    descricao: 'Marcos Oliveira — Operador de CNC',
    tempo: '2026-05-25T10:45:00',
    usuario: 'João Dias',
  },
  {
    id: '5',
    tipo: 'programa',
    titulo: 'Programa LASER-P0118 revisado',
    descricao: 'Versão 2.3 aprovada pela engenharia',
    tempo: '2026-05-25T09:30:00',
    usuario: 'Paulo Santos',
  },
  {
    id: '6',
    tipo: 'sistema',
    titulo: 'Backup automático realizado',
    descricao: 'Dados sincronizados com sucesso',
    tempo: '2026-05-25T08:00:00',
    usuario: 'Sistema',
  },
]

export const mockProducaoSemanal = [
  { dia: 'Seg', producao: 82, meta: 90 },
  { dia: 'Ter', producao: 91, meta: 90 },
  { dia: 'Qua', producao: 88, meta: 90 },
  { dia: 'Qui', producao: 95, meta: 90 },
  { dia: 'Sex', producao: 94, meta: 90 },
  { dia: 'Sáb', producao: 72, meta: 80 },
  { dia: 'Dom', producao: 0, meta: 0 },
]

export const mockStatusMaquinas = [
  { id: 'CNC-001', nome: 'CNC-001', status: 'operando', operador: 'Carlos Lima', programa: 'CNC-P0421', tempo: '02:34' },
  { id: 'CNC-002', nome: 'CNC-002', status: 'operando', operador: 'Marcos Oliveira', programa: 'CNC-P0388', tempo: '01:12' },
  { id: 'CNC-003', nome: 'CNC-003', status: 'parado', operador: '—', programa: '—', tempo: '—' },
  { id: 'LASER-001', nome: 'LASER-001', status: 'manutencao', operador: 'Técnico José', programa: '—', tempo: '—' },
  { id: 'LASER-002', nome: 'LASER-002', status: 'operando', operador: 'Ana Ferreira', programa: 'LASER-P0118', tempo: '00:45' },
  { id: 'PLASMA-001', nome: 'PLASMA-001', status: 'operando', operador: 'Roberto Costa', programa: 'PLASMA-P0067', tempo: '03:20' },
]
