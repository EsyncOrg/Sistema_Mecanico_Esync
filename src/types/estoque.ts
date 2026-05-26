export const OS_ESTOQUE = 'OS:1508'

export type StatusEstoque = 'normal' | 'estoque_baixo' | 'critico'

export interface EstoqueItem {
  id: string
  codigoPeca: string
  descricao: string
  material: string
  espessura: number
  quantidade: number
  quantidadeMinima: number
  localizacao: string
  status: StatusEstoque
  ultimaEntrada: Date
  origemPrograma: string
  unidade: string
}

export interface MovimentoEstoque {
  id: string
  tipo: 'entrada' | 'saida' | 'ajuste'
  codigoPeca: string
  descricaoPeca: string
  quantidade: number
  programaOrigem: string
  os: string
  timestamp: Date
  operador: string
  observacao?: string
  tarefaDobraId?: string
  programaCorteId?: string
}

export interface EntradaEstoqueInput {
  codigoPeca: string
  descricaoPeca: string
  quantidade: number
  material: string
  espessura: number
  programaOrigem: string
  os: string
  operador: string
  observacao?: string
  tarefaDobraId?: string
  programaCorteId?: string
}
