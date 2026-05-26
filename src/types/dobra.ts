export type StatusDobra = 'pendente' | 'em_setup' | 'produzindo' | 'pausado' | 'finalizado'
export type PrioridadeDobra = 'alta' | 'media' | 'baixa'

export interface PausaRegistroDobra {
  id: string
  motivo: string
  inicio: Date
  fim: Date | null
  duracao: number | null
}

export interface TarefaDobra {
  id: string
  codigoPeca: string
  descricao: string
  quantidade: number
  quantidadePlanejada: number
  programaOrigem: string
  programaOrigemId: string
  osVinculadas: string[]
  prioridade: PrioridadeDobra
  material: string
  espessura: number
  status: StatusDobra
  liberadoEm: Date
  operador: string | null
  maquina: string | null
  setupInicio: Date | null
  setupFim: Date | null
  producaoInicio: Date | null
  producaoFim: Date | null
  pausas: PausaRegistroDobra[]
  quantidadeConfirmada?: number
}

export interface NovaTarefaDobraInput {
  codigoPeca: string
  descricao: string
  quantidade: number
  quantidadePlanejada: number
  programaOrigem: string
  programaOrigemId: string
  osVinculadas: string[]
  prioridade: PrioridadeDobra
  material: string
  espessura: number
  liberadoEm: Date
}
