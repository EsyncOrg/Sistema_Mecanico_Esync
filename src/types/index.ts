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

export interface Peca {
  id: string
  codigo: string
  espessura: number
  descricao: string
  grupo: string
  familia: string
  codigoSistema: string
  areaPeca: number        // mm²
  desperdicio: number     // m²
  percFabricacao: number  // numeric, display with %
  percPintura: number     // numeric, display with %
  peso: number            // kg
  cor: string
  arquivo3d: string       // path/url — future Autodesk Inventor integration
  planoDobra: string      // path/url — future PDF/DWG integration
  atualizadoEm: string    // ISO datetime, auto-updated on every edit
}

// Kept for other modules (estoque, etc.) that still use status
export type StatusPeca =
  | 'disponivel'
  | 'reservado'
  | 'em_producao'
  | 'estoque_baixo'
  | 'indisponivel'

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

// ─── Máquinas ────────────────────────────────────────────────────────────────

export type StatusMaquina = 'operando' | 'setup' | 'pausada' | 'ociosa' | 'manutencao'

export type SetorMaquina = 'corte' | 'dobra' | 'solda' | 'pintura' | 'desenvolvimento' | 'outros'

export type TipoEventoMaquina =
  | 'inicio_producao'
  | 'fim_producao'
  | 'inicio_setup'
  | 'fim_setup'
  | 'pausa'
  | 'retomada'
  | 'inicio_ociosidade'
  | 'troca_operador'
  | 'manutencao'
  | 'falha_tecnica'

export interface MaquinaTimelineSegmento {
  tipo: StatusMaquina
  inicio: number   // decimal hour from midnight (e.g. 6.5 = 06:30)
  duracao: number  // hours
  label?: string
}

export interface Maquina {
  id: string
  nome: string
  codigo: string
  setor: SetorMaquina
  fabricante: string
  modelo: string
  ano: number
  capacidade?: string
  observacoes?: string
  status: StatusMaquina
  operadorAtual?: string
  tarefaAtual?: string
  osAtual?: string
  eficiencia: number            // 0–100
  tempoOperacionalHoje: number  // seconds
  tempoSetupHoje: number        // seconds
  tempoOciosoHoje: number       // seconds
  tempoPausadoHoje: number      // seconds
  totalHorasTrabalhadas: number // cumulative hours
  producoesFinalizadas: number
  ultimaAtividade: string       // ISO datetime
  atualizadoEm: string          // ISO datetime
  motivoPausa?: string
  timeline: MaquinaTimelineSegmento[]
  produtividadeSemanal: number[] // last 7 days operational hours
}

export interface EventoMaquina {
  id: string
  maquinaId: string
  maquinaNome: string
  maquinaCodigo: string
  tipo: TipoEventoMaquina
  descricao: string
  operador: string
  os?: string
  duracao?: number     // seconds
  observacoes?: string
  timestamp: string    // ISO datetime
}

export interface OsTimeData {
  numero: string
  maquinaCodigo: string
  totalSegundos: number
  tempoSetupSeg: number
  tempoProdSeg: number
  eficiencia: number         // 0–100
  participacaoPct: number    // filled in by compute helper
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
