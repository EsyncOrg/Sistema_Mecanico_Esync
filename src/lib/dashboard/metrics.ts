/**
 * Dashboard data aggregation.
 *
 * Every metric returned here is derived directly from the canonical module mocks.
 * Future: swap mock imports for Supabase RPC / realtime queries — the dashboard
 * page stays unchanged because it only depends on this module.
 */

import { mockPecas }    from '@/mocks/pecas'
import { mockMaquinas } from '@/mocks/maquinas'
import { mockEstoque }  from '@/mocks/estoque'
import { mockRetalhos } from '@/mocks/retalhos'
import { mockProgramas } from '@/mocks/programas'
import { mockCentrosCusto, mockCustosMateriais, mockPerfisPrecificacao } from '@/mocks/custos'
import { calcularTemposAnalytics } from '@/lib/tempos/analytics'
import type { StatCard } from '@/types'

// ─── Output types ─────────────────────────────────────────────────────────────

export interface MaquinaDashboardRow {
  id:          string
  codigo:      string
  nome:        string
  status:      string           // StatusMaquina
  operador:    string
  referencia:  string           // OS or task label
  tempoOp:     string           // formatted
  eficiencia:  number
}

export interface DashboardAlerta {
  tipo:    'warning' | 'destructive' | 'info'
  iconKey: 'AlertTriangle' | 'Clock' | 'Package'
  titulo:  string
  descricao: string
}

export interface DashboardData {
  kpiCards:     StatCard[]
  maquinas:     MaquinaDashboardRow[]
  alertas:      DashboardAlerta[]
  chartData:    { dia: string; producao: number; meta: number }[]
  // Raw aggregates used for tooltips / secondary labels
  agg: {
    maquinasTotal:      number
    maquinasOperando:   number
    eficienciaMedia:    number
    totalPecas:         number
    pecasSem3d:         number
    pecasSemPlano:      number
    totalProgramas:     number
    programasAtivos:    number
    totalRetalhos:      number
    retalhosDisponiveis: number
    estoqueTotal:       number      // sum of all quantities
    estoqueAbaixoMinimo: number
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const

function fmtHM(secs: number): string {
  if (secs <= 0) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}min`
}

// ─── Main aggregator ──────────────────────────────────────────────────────────

export function computeDashboardData(): DashboardData {

  // ── Peças ─────────────────────────────────────────────────────────────────
  const totalPecas     = mockPecas.length
  const pecasSem3d     = mockPecas.filter((p) => !p.arquivo3d).length
  const pecasSemPlano  = mockPecas.filter((p) => !p.planoDobra).length

  // ── Programas ─────────────────────────────────────────────────────────────
  const totalProgramas  = mockProgramas.length
  const programasAtivos = mockProgramas.filter((p) => p.status === 'ativo').length

  // ── Retalhos ──────────────────────────────────────────────────────────────
  const totalRetalhos      = mockRetalhos.length
  const retalhosDisponiveis = mockRetalhos.filter((r) => r.status === 'disponivel').length

  // ── Estoque ───────────────────────────────────────────────────────────────
  const estoqueTotal       = mockEstoque.reduce((s, e) => s + e.quantidade, 0)
  const estoqueAbaixoMinimo = mockEstoque.filter((e) => e.quantidade < e.quantidadeMinima).length

  // ── Máquinas ──────────────────────────────────────────────────────────────
  const maquinasTotal    = mockMaquinas.length
  const maquinasOperando = mockMaquinas.filter(
    (m) => m.status === 'operando' || m.status === 'setup'
  ).length
  const eficienciaMedia  = Math.round(
    mockMaquinas.reduce((s, m) => s + m.eficiencia, 0) / maquinasTotal
  )

  // ── Tempos Industriais (Phase 5.5) ───────────────────────────────────────
  const temposAn = calcularTemposAnalytics(mockPecas)

  // ── Custos (Phase 5) ──────────────────────────────────────────────────────
  const activeCentros      = mockCentrosCusto.filter((c) => c.ativo)
  const custoMedioProjetado = activeCentros.length > 0
    ? Math.round(activeCentros.reduce((s, c) => s + c.custoHora, 0) / activeCentros.length * 100) / 100
    : 0
  const activePerfis   = mockPerfisPrecificacao.filter((p) => p.ativo)
  const margemMedia    = activePerfis.length > 0
    ? Math.round(activePerfis.reduce((s, p) => s + p.margemLucroPercentual, 0) / activePerfis.length * 10) / 10
    : 0
  const thirtyDaysAgo  = new Date(Date.now() - 30 * 86_400_000)
  const matDesatualizados = mockCustosMateriais.filter(
    (m) => m.ativo && m.dataAtualizacao < thirtyDaysAgo
  ).length

  // ── KPI Cards ─────────────────────────────────────────────────────────────
  const kpiCards: StatCard[] = [
    {
      id:       'kpi-maquinas',
      titulo:   'Máquinas Ativas',
      valor:    `${maquinasOperando} / ${maquinasTotal}`,
      variacao: eficienciaMedia,
      tipo:     eficienciaMedia >= 70 ? 'aumento' : 'queda',
      icone:    'Activity',
      cor:      eficienciaMedia >= 70 ? 'success' : 'warning',
      sufixo:   `${eficienciaMedia}% eficiência média`,
    },
    {
      id:       'kpi-pecas',
      titulo:   'Peças Catalogadas',
      valor:    totalPecas,
      variacao: 0,
      tipo:     'neutro',
      icone:    'Package',
      cor:      'primary',
      sufixo:   `${pecasSem3d} sem modelo 3D`,
    },
    {
      id:       'kpi-retalhos',
      titulo:   'Retalhos Disponíveis',
      valor:    retalhosDisponiveis,
      variacao: 0,
      tipo:     'neutro',
      icone:    'Layers',
      cor:      'warning',
      sufixo:   `de ${totalRetalhos} cadastrados`,
    },
    {
      id:       'kpi-programas',
      titulo:   'Programas Ativos',
      valor:    programasAtivos,
      variacao: 0,
      tipo:     'neutro',
      icone:    'Code2',
      cor:      'accent',
      sufixo:   `de ${totalProgramas} programas`,
    },
    // ── Phase 5: Custos ────────────────────────────────────────────────────
    {
      id:       'kpi-custo-medio',
      titulo:   'Custo Médio / Hora',
      valor:    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(custoMedioProjetado),
      variacao: 0,
      tipo:     'neutro',
      icone:    'Activity',
      cor:      'primary',
      sufixo:   `média dos ${activeCentros.length} centros ativos`,
    },
    {
      id:       'kpi-margem-media',
      titulo:   'Margem Média',
      valor:    `${margemMedia}%`,
      variacao: 0,
      tipo:     'neutro',
      icone:    'Activity',
      cor:      'success',
      sufixo:   `${activePerfis.length} perfis de precificação`,
    },
    {
      id:       'kpi-mat-desatualizados',
      titulo:   'Materiais Desatualizados',
      valor:    matDesatualizados,
      variacao: 0,
      tipo:     matDesatualizados > 0 ? 'queda' : 'neutro',
      icone:    'Activity',
      cor:      matDesatualizados > 0 ? 'warning' : 'primary',
      sufixo:   matDesatualizados > 0 ? 'preços acima de 30 dias' : 'todos os preços atualizados',
    },
    // ── Phase 5.5: Tempos Industriais ─────────────────────────────────────
    {
      id:       'kpi-tempo-medio-peca',
      titulo:   'Tempo Médio por Peça',
      valor:    `${temposAn.tempoMedioPorPeca}min`,
      variacao: 0,
      tipo:     'neutro',
      icone:    'Activity',
      cor:      'primary',
      sufixo:   `${temposAn.pecasComTempos} peças com tempos`,
    },
    {
      id:       'kpi-tempo-processo',
      titulo:   'Processo Mais Lento',
      valor:    temposAn.processoMaisDemorado ?? '—',
      variacao: 0,
      tipo:     'neutro',
      icone:    'Activity',
      cor:      'warning',
      sufixo:   temposAn.processoMaisDemorado
        ? `${temposAn.tempoMedioPorProcesso[temposAn.processoMaisDemorado]}min médio`
        : 'sem dados',
    },
    {
      id:       'kpi-pecas-sem-tempos',
      titulo:   'Peças sem Tempos',
      valor:    temposAn.pecasSemTempos,
      variacao: 0,
      tipo:     temposAn.pecasSemTempos > 0 ? 'queda' : 'neutro',
      icone:    'Package',
      cor:      temposAn.pecasSemTempos > 0 ? 'warning' : 'success',
      sufixo:   `de ${totalPecas} peças catalogadas`,
    },
    {
      id:       'kpi-tempo-total-catalogo',
      titulo:   'Tempo Total Catalogado',
      valor:    `${Math.round(temposAn.tempoTotalCatalogado / 60 * 10) / 10}h`,
      variacao: 0,
      tipo:     'neutro',
      icone:    'Activity',
      cor:      'accent',
      sufixo:   `${temposAn.tempoTotalCatalogado}min em ${temposAn.pecasComTempos} peças`,
    },
  ]

  // ── Machine status rows ────────────────────────────────────────────────────
  const maquinas: MaquinaDashboardRow[] = mockMaquinas.map((m) => ({
    id:         m.id,
    codigo:     m.codigo,
    nome:       m.nome,
    status:     m.status,
    operador:   m.operadorAtual ?? '—',
    referencia: m.osAtual ?? m.tarefaAtual ?? '—',
    tempoOp:    fmtHM(m.tempoOperacionalHoje),
    eficiencia: m.eficiencia,
  }))

  // ── Alertas ───────────────────────────────────────────────────────────────
  const alertas: DashboardAlerta[] = []

  if (estoqueAbaixoMinimo > 0) {
    const detail = mockEstoque.filter((e) => e.quantidade < e.quantidadeMinima)
    alertas.push({
      tipo:      'warning',
      iconKey:   'AlertTriangle',
      titulo:    'Estoque Baixo',
      descricao: `${estoqueAbaixoMinimo} SKU${estoqueAbaixoMinimo !== 1 ? 's' : ''} abaixo do mínimo — ${detail.slice(0, 2).map((e) => e.codigoPeca).join(', ')}${detail.length > 2 ? `…` : ''}`,
    })
  }

  const emManutencao = mockMaquinas.filter((m) => m.status === 'manutencao')
  if (emManutencao.length > 0) {
    alertas.push({
      tipo:      'destructive',
      iconKey:   'Clock',
      titulo:    'Máquina em Manutenção',
      descricao: `${emManutencao.map((m) => m.codigo).join(', ')} — intervenção em andamento`,
    })
  }

  if (pecasSem3d > 0) {
    alertas.push({
      tipo:      'info',
      iconKey:   'Package',
      titulo:    'Documentação Técnica Incompleta',
      descricao: `${pecasSem3d} peça${pecasSem3d !== 1 ? 's' : ''} sem modelo 3D · ${pecasSemPlano} sem plano de dobra`,
    })
  }

  // ── Production chart — derived from machine weekly productivity ────────────
  // produtividadeSemanal[i] = operational hours on day i (0=Sun … 6=Sat)
  // Normalize to % of theoretical capacity: n_machines × 8h/day
  const theoreticalHours = maquinasTotal * 8
  const chartData = DIAS.map((dia, i) => {
    const totalOp = mockMaquinas.reduce(
      (s, m) => s + (m.produtividadeSemanal[i] ?? 0),
      0
    )
    const producao = theoreticalHours > 0
      ? Math.round((totalOp / theoreticalHours) * 100)
      : 0
    return { dia, producao, meta: 85 }
  })

  return {
    kpiCards,
    maquinas,
    alertas,
    chartData,
    agg: {
      maquinasTotal,
      maquinasOperando,
      eficienciaMedia,
      totalPecas,
      pecasSem3d,
      pecasSemPlano,
      totalProgramas,
      programasAtivos,
      totalRetalhos,
      retalhosDisponiveis,
      estoqueTotal,
      estoqueAbaixoMinimo,
    },
  }
}
