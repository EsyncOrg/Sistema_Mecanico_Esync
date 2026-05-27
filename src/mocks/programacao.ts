// ─── Programação Module — Mock Data ──────────────────────────────────────────
// Replace with real Supabase queries after integration.

import type {
  SolicitacaoProgramacao,
  ProgramaCNC,
  AtividadeProg,
  HistoricoEntradaProg,
} from '@/types/programacao'

const N = Date.now()
const min = (m: number) => N - m * 60_000
const hrs = (h: number) => N - h * 3_600_000
const days = (d: number) => N - d * 86_400_000

// ─── Solicitações Pendentes ───────────────────────────────────────────────────

export const mockSolicitacoesProg: SolicitacaoProgramacao[] = [
  {
    id: 'sol-prog-001',
    titulo: 'Estrutura Suporte EST-L04',
    cliente: 'Alfa Industrial',
    numeroOS: 'OS:1551',
    solicitante: 'João Dias',
    dataCriacao: new Date(min(28)),
    prioridade: 'urgente',
    setores: ['corte', 'dobra', 'solda'],
    osEnvolvidas: ['OS:1551', 'OS:1552'],
    observacoes: 'Entrega prevista para quinta-feira. Material parcialmente disponível em estoque.',
    status: 'pendente',
    pecas: [
      {
        id: 'pp-001-1', codigo: 'LAT-E-001', descricao: 'Lateral Estrutura',
        quantidade: 10, material: 'Aço Carbono 1020', espessura: 3,
        processos: ['corte', 'dobra'],
        osDistribuicao: [
          { id: 'os-001-1a', os: 'OS:1551', quantidade: 6 },
          { id: 'os-001-1b', os: 'OS:1552', quantidade: 4 },
        ],
      },
      {
        id: 'pp-001-2', codigo: 'BASE-EST-001', descricao: 'Base Principal',
        quantidade: 2, material: 'Aço Inox 304', espessura: 5,
        processos: ['corte', 'solda'],
        osDistribuicao: [
          { id: 'os-001-2a', os: 'OS:1551', quantidade: 2 },
        ],
      },
      {
        id: 'pp-001-3', codigo: 'PLAT-EST-001', descricao: 'Plataforma de Fixação',
        quantidade: 4, material: 'Aço Carbono 1020', espessura: 4,
        processos: ['corte', 'dobra'],
        osDistribuicao: [
          { id: 'os-001-3a', os: 'OS:1551', quantidade: 2 },
          { id: 'os-001-3b', os: 'OS:1552', quantidade: 2 },
        ],
      },
      {
        id: 'pp-001-4', codigo: 'CANTEL-001', descricao: 'Canteliamento Lateral',
        quantidade: 8, material: 'Aço Carbono 1045', espessura: 2,
        processos: ['corte'],
        osDistribuicao: [
          { id: 'os-001-4a', os: 'OS:1551', quantidade: 8 },
        ],
      },
    ],
  },
  {
    id: 'sol-prog-002',
    titulo: 'Tampa Proteção TMP-800',
    cliente: 'Beta Metais Ltda',
    numeroOS: 'OS:1553',
    solicitante: 'João Dias',
    dataCriacao: new Date(hrs(2)),
    prioridade: 'alta',
    setores: ['corte', 'dobra'],
    osEnvolvidas: ['OS:1553'],
    observacoes: 'Material inox disponível. Atenção ao acabamento superficial.',
    status: 'pendente',
    pecas: [
      {
        id: 'pp-002-1', codigo: 'TMP-TOP-001', descricao: 'Tampa Superior',
        quantidade: 3, material: 'Aço Inox 304', espessura: 2,
        processos: ['corte', 'dobra'],
        osDistribuicao: [{ id: 'os-002-1a', os: 'OS:1553', quantidade: 3 }],
      },
      {
        id: 'pp-002-2', codigo: 'TMP-LAT-001', descricao: 'Lateral Tampa',
        quantidade: 6, material: 'Aço Inox 304', espessura: 2,
        processos: ['corte', 'dobra'],
        osDistribuicao: [{ id: 'os-002-2a', os: 'OS:1553', quantidade: 6 }],
      },
      {
        id: 'pp-002-3', codigo: 'TMP-DOR-001', descricao: 'Dobradiça Suporte',
        quantidade: 4, material: 'Aço Inox 316', espessura: 3,
        processos: ['corte'],
        osDistribuicao: [{ id: 'os-002-3a', os: 'OS:1553', quantidade: 4 }],
      },
    ],
  },
  {
    id: 'sol-prog-003',
    titulo: 'Grade Ventilação GVT-450',
    cliente: 'Projeto Interno',
    numeroOS: 'OS:1554',
    solicitante: 'Carlos Mendes',
    dataCriacao: new Date(hrs(5)),
    prioridade: 'normal',
    setores: ['corte'],
    osEnvolvidas: ['OS:1554'],
    observacoes: 'Grade para sistema de ventilação da linha 3.',
    status: 'pendente',
    pecas: [
      {
        id: 'pp-003-1', codigo: 'GRD-FRM-001', descricao: 'Frame Principal Grade',
        quantidade: 2, material: 'Aço Carbono 1020', espessura: 2,
        processos: ['corte'],
        osDistribuicao: [{ id: 'os-003-1a', os: 'OS:1554', quantidade: 2 }],
      },
      {
        id: 'pp-003-2', codigo: 'GRD-BAR-001', descricao: 'Barras Grade',
        quantidade: 20, material: 'Aço Carbono 1020', espessura: 1.5,
        processos: ['corte'],
        osDistribuicao: [{ id: 'os-003-2a', os: 'OS:1554', quantidade: 20 }],
      },
    ],
  },
  {
    id: 'sol-prog-004',
    titulo: 'Suporte Motor SMT-220',
    cliente: 'Gama Industrial',
    numeroOS: 'OS:1555',
    solicitante: 'Ana Lima',
    dataCriacao: new Date(days(1)),
    prioridade: 'baixa',
    setores: ['corte', 'solda'],
    osEnvolvidas: ['OS:1555'],
    observacoes: 'Sem urgência. Programar para próxima semana.',
    status: 'pendente',
    pecas: [
      {
        id: 'pp-004-1', codigo: 'SMT-BASE-001', descricao: 'Base Motor',
        quantidade: 1, material: 'Aço Carbono 1045', espessura: 8,
        processos: ['corte', 'solda'],
        osDistribuicao: [{ id: 'os-004-1a', os: 'OS:1555', quantidade: 1 }],
      },
    ],
  },
]

// ─── Programas Em Programação ─────────────────────────────────────────────────

export const mockProgramasEmAndamento: ProgramaCNC[] = [
  {
    id: 'prg-203',
    nome: 'Painel Lateral PNL-003',
    codigo: 'PRG-203',
    dataCriacao: new Date(hrs(3)),
    dataInicio: new Date(hrs(2)),
    programador: 'João Dias',
    status: 'em_programacao',
    numeroExecucoes: 1,
    osGerais: ['OS:1548', 'OS:1549'],
    observacoes: 'Verificar tolerâncias das dobras — cliente exige +/- 0,5mm.',
    retalhoUtilizado: { tipo: 'retalho', codigo: 'RT-089', largura: 1200, comprimento: 600, espessura: 3 },
    retalhoGerado: { gerou: true, codigo: 'RT-091', largura: 400, comprimento: 600, espessura: 3 },
    tempoEstimadoMin: 90,
    pecas: [
      {
        id: 'pp-203-1', codigo: 'PNL-LAT-001', descricao: 'Painel Lateral Esquerdo',
        quantidade: 4, material: 'Aço Carbono 1020', espessura: 3,
        processos: ['corte', 'dobra'],
        osDistribuicao: [
          { id: 'os-203-1a', os: 'OS:1548', quantidade: 2 },
          { id: 'os-203-1b', os: 'OS:1549', quantidade: 2 },
        ],
      },
      {
        id: 'pp-203-2', codigo: 'PNL-LAT-002', descricao: 'Painel Lateral Direito',
        quantidade: 4, material: 'Aço Carbono 1020', espessura: 3,
        processos: ['corte', 'dobra'],
        osDistribuicao: [
          { id: 'os-203-2a', os: 'OS:1548', quantidade: 2 },
          { id: 'os-203-2b', os: 'OS:1549', quantidade: 2 },
        ],
      },
      {
        id: 'pp-203-3', codigo: 'PNL-RFI-001', descricao: 'Reforço Inferior',
        quantidade: 2, material: 'Aço Carbono 1020', espessura: 4,
        processos: ['corte'],
        osDistribuicao: [
          { id: 'os-203-3a', os: 'OS:1548', quantidade: 1 },
          { id: 'os-203-3b', os: 'OS:1549', quantidade: 1 },
        ],
      },
    ],
    historico: [
      { id: 'h-203-1', tipo: 'criacao', timestamp: new Date(hrs(3)), operador: 'João Dias', descricao: 'Programa criado a partir da solicitação OS:1548/OS:1549', programaId: 'prg-203', programaNome: 'Painel Lateral PNL-003', programaCodigo: 'PRG-203' },
      { id: 'h-203-2', tipo: 'inicio', timestamp: new Date(hrs(2)), operador: 'João Dias', descricao: 'Programação iniciada', programaId: 'prg-203', programaNome: 'Painel Lateral PNL-003', programaCodigo: 'PRG-203' },
    ],
  },
  {
    id: 'prg-204',
    nome: 'Suporte Inferior SI-002',
    codigo: 'PRG-204',
    dataCriacao: new Date(min(55)),
    dataInicio: new Date(min(45)),
    programador: 'Carlos Mendes',
    status: 'em_programacao',
    numeroExecucoes: 1,
    osGerais: ['OS:1550'],
    observacoes: '',
    retalhoUtilizado: { tipo: 'chapa_inteira' },
    retalhoGerado: { gerou: false },
    tempoEstimadoMin: 60,
    pecas: [
      {
        id: 'pp-204-1', codigo: 'SI-BASE-001', descricao: 'Base Inferior',
        quantidade: 3, material: 'Aço Carbono 1020', espessura: 5,
        processos: ['corte', 'dobra'],
        osDistribuicao: [{ id: 'os-204-1a', os: 'OS:1550', quantidade: 3 }],
      },
    ],
    historico: [
      { id: 'h-204-1', tipo: 'criacao', timestamp: new Date(min(55)), operador: 'Carlos Mendes', descricao: 'Programa criado', programaId: 'prg-204', programaNome: 'Suporte Inferior SI-002', programaCodigo: 'PRG-204' },
      { id: 'h-204-2', tipo: 'inicio', timestamp: new Date(min(45)), operador: 'Carlos Mendes', descricao: 'Programação iniciada', programaId: 'prg-204' },
    ],
  },
]

// ─── Programas Finalizados ────────────────────────────────────────────────────

export const mockProgramasFinalizados: ProgramaCNC[] = [
  {
    id: 'prg-202', nome: 'Estrutura Painel PANE-EST-01', codigo: 'PRG-202',
    dataCriacao: new Date(days(1)), dataInicio: new Date(days(1)), dataConclusao: new Date(hrs(6)),
    programador: 'João Dias', status: 'finalizado', numeroExecucoes: 2,
    osGerais: ['OS:1545', 'OS:1546'],
    observacoes: 'Programa reutilizável — geometrias padronizadas.',
    retalhoUtilizado: { tipo: 'chapa_inteira' },
    retalhoGerado: { gerou: true, codigo: 'RT-090', largura: 800, comprimento: 400, espessura: 4 },
    tempoEstimadoMin: 120, tempoRealMin: 108,
    pecas: [
      { id: 'pp-202-1', codigo: 'PANE-FRM-001', descricao: 'Frame Principal', quantidade: 6, material: 'Aço Carbono 1020', espessura: 4, processos: ['corte', 'dobra'], osDistribuicao: [{ id: 'o1', os: 'OS:1545', quantidade: 3 }, { id: 'o2', os: 'OS:1546', quantidade: 3 }] },
      { id: 'pp-202-2', codigo: 'PANE-LAT-001', descricao: 'Lateral Painel', quantidade: 8, material: 'Aço Carbono 1020', espessura: 3, processos: ['corte'], osDistribuicao: [{ id: 'o3', os: 'OS:1545', quantidade: 4 }, { id: 'o4', os: 'OS:1546', quantidade: 4 }] },
    ],
    historico: [
      { id: 'h-202-1', tipo: 'criacao', timestamp: new Date(days(1)), operador: 'João Dias', descricao: 'Programa criado', programaId: 'prg-202', programaCodigo: 'PRG-202' },
      { id: 'h-202-2', tipo: 'conclusao', timestamp: new Date(hrs(6)), operador: 'João Dias', descricao: 'Programação concluída em 108 min', programaId: 'prg-202', programaCodigo: 'PRG-202' },
      { id: 'h-202-3', tipo: 'reutilizacao', timestamp: new Date(hrs(3)), operador: 'Carlos Mendes', descricao: 'Programa reutilizado para OS:1546', programaId: 'prg-202', programaCodigo: 'PRG-202' },
    ],
  },
  {
    id: 'prg-201', nome: 'Grade Proteção GRD-450', codigo: 'PRG-201',
    dataCriacao: new Date(days(2)), dataInicio: new Date(days(2)), dataConclusao: new Date(days(2) + hrs(1.5)),
    programador: 'Carlos Mendes', status: 'finalizado', numeroExecucoes: 1,
    osGerais: ['OS:1544'],
    observacoes: '',
    retalhoUtilizado: { tipo: 'retalho', codigo: 'RT-087', largura: 1000, comprimento: 500, espessura: 2 },
    retalhoGerado: { gerou: false },
    tempoEstimadoMin: 75, tempoRealMin: 82,
    pecas: [
      { id: 'pp-201-1', codigo: 'GRD-FRM-001', descricao: 'Frame Grade', quantidade: 4, material: 'Aço Carbono 1020', espessura: 2, processos: ['corte'], osDistribuicao: [{ id: 'o5', os: 'OS:1544', quantidade: 4 }] },
    ],
    historico: [
      { id: 'h-201-1', tipo: 'criacao', timestamp: new Date(days(2)), operador: 'Carlos Mendes', descricao: 'Programa criado', programaId: 'prg-201', programaCodigo: 'PRG-201' },
      { id: 'h-201-2', tipo: 'conclusao', timestamp: new Date(days(2) + hrs(1.5)), operador: 'Carlos Mendes', descricao: 'Programação concluída em 82 min', programaId: 'prg-201', programaCodigo: 'PRG-201' },
    ],
  },
  {
    id: 'prg-200', nome: 'Tampa Equipamento TMP-600', codigo: 'PRG-200',
    dataCriacao: new Date(days(3)), dataInicio: new Date(days(3)), dataConclusao: new Date(days(3) + hrs(1)),
    programador: 'Ana Lima', status: 'finalizado', numeroExecucoes: 3,
    osGerais: ['OS:1540', 'OS:1541', 'OS:1543'],
    observacoes: 'Alta reutilização — peças padronizadas.',
    retalhoUtilizado: { tipo: 'chapa_inteira' },
    retalhoGerado: { gerou: true, codigo: 'RT-085', largura: 600, comprimento: 300, espessura: 2 },
    tempoEstimadoMin: 60, tempoRealMin: 58,
    pecas: [
      { id: 'pp-200-1', codigo: 'TMP-SUP-001', descricao: 'Tampa Superior', quantidade: 3, material: 'Aço Inox 304', espessura: 2, processos: ['corte', 'dobra'], osDistribuicao: [{ id: 'o6', os: 'OS:1540', quantidade: 1 }, { id: 'o7', os: 'OS:1541', quantidade: 1 }, { id: 'o8', os: 'OS:1543', quantidade: 1 }] },
    ],
    historico: [
      { id: 'h-200-1', tipo: 'criacao', timestamp: new Date(days(3)), operador: 'Ana Lima', descricao: 'Programa criado', programaId: 'prg-200', programaCodigo: 'PRG-200' },
      { id: 'h-200-2', tipo: 'conclusao', timestamp: new Date(days(3) + hrs(1)), operador: 'Ana Lima', descricao: 'Conclusão em 58 min', programaId: 'prg-200', programaCodigo: 'PRG-200' },
      { id: 'h-200-3', tipo: 'reutilizacao', timestamp: new Date(days(2)), operador: 'João Dias', descricao: 'Reutilizado para OS:1541', programaId: 'prg-200', programaCodigo: 'PRG-200' },
      { id: 'h-200-4', tipo: 'reutilizacao', timestamp: new Date(days(1)), operador: 'Carlos Mendes', descricao: 'Reutilizado para OS:1543', programaId: 'prg-200', programaCodigo: 'PRG-200' },
    ],
  },
  {
    id: 'prg-199', nome: 'Suporte Fixação SF-003', codigo: 'PRG-199',
    dataCriacao: new Date(days(4)), dataInicio: new Date(days(4)), dataConclusao: new Date(days(4) + hrs(0.8)),
    programador: 'João Dias', status: 'finalizado', numeroExecucoes: 1,
    osGerais: ['OS:1538'],
    observacoes: '',
    retalhoUtilizado: { tipo: 'chapa_inteira' },
    retalhoGerado: { gerou: false },
    tempoEstimadoMin: 50, tempoRealMin: 48,
    pecas: [
      { id: 'pp-199-1', codigo: 'SF-PLT-001', descricao: 'Placa Suporte', quantidade: 2, material: 'Aço Carbono 1020', espessura: 6, processos: ['corte'], osDistribuicao: [{ id: 'o9', os: 'OS:1538', quantidade: 2 }] },
    ],
    historico: [{ id: 'h-199-1', tipo: 'conclusao', timestamp: new Date(days(4) + hrs(0.8)), operador: 'João Dias', descricao: 'Concluído em 48 min', programaId: 'prg-199', programaCodigo: 'PRG-199' }],
  },
  {
    id: 'prg-198', nome: 'Base Painel BP-001', codigo: 'PRG-198',
    dataCriacao: new Date(days(5)), dataInicio: new Date(days(5)), dataConclusao: new Date(days(5) + hrs(2)),
    programador: 'Carlos Mendes', status: 'finalizado', numeroExecucoes: 2,
    osGerais: ['OS:1535', 'OS:1537'],
    observacoes: 'Material espesso — velocidade de corte reduzida.',
    retalhoUtilizado: { tipo: 'chapa_inteira' },
    retalhoGerado: { gerou: true, codigo: 'RT-082', largura: 500, comprimento: 250, espessura: 6 },
    tempoEstimadoMin: 100, tempoRealMin: 118,
    pecas: [
      { id: 'pp-198-1', codigo: 'BP-PLT-001', descricao: 'Plataforma Base', quantidade: 2, material: 'Aço Carbono 1045', espessura: 6, processos: ['corte', 'dobra'], osDistribuicao: [{ id: 'o10', os: 'OS:1535', quantidade: 1 }, { id: 'o11', os: 'OS:1537', quantidade: 1 }] },
    ],
    historico: [{ id: 'h-198-1', tipo: 'conclusao', timestamp: new Date(days(5) + hrs(2)), operador: 'Carlos Mendes', descricao: 'Concluído em 118 min', programaId: 'prg-198', programaCodigo: 'PRG-198' }],
  },
  {
    id: 'prg-197', nome: 'Painel Controle PCN-002', codigo: 'PRG-197',
    dataCriacao: new Date(days(6)), dataInicio: new Date(days(6)), dataConclusao: new Date(days(6) + hrs(1.2)),
    programador: 'Ana Lima', status: 'finalizado', numeroExecucoes: 1,
    osGerais: ['OS:1532'],
    observacoes: '',
    retalhoUtilizado: { tipo: 'retalho', codigo: 'RT-078', largura: 900, comprimento: 450, espessura: 2 },
    retalhoGerado: { gerou: false },
    tempoEstimadoMin: 70, tempoRealMin: 72,
    pecas: [
      { id: 'pp-197-1', codigo: 'PCN-FRT-001', descricao: 'Frente Painel', quantidade: 1, material: 'Aço Inox 304', espessura: 2, processos: ['corte', 'dobra'], osDistribuicao: [{ id: 'o12', os: 'OS:1532', quantidade: 1 }] },
    ],
    historico: [{ id: 'h-197-1', tipo: 'conclusao', timestamp: new Date(days(6) + hrs(1.2)), operador: 'Ana Lima', descricao: 'Concluído em 72 min', programaId: 'prg-197', programaCodigo: 'PRG-197' }],
  },
]

// ─── Activity Feed ────────────────────────────────────────────────────────────

export const mockAtividadesProg: AtividadeProg[] = [
  { id: 'act-001', mensagem: 'Nova solicitação pendente recebida: Estrutura Suporte EST-L04.', tipo: 'novo_pendente',       timestamp: new Date(min(28)) },
  { id: 'act-002', mensagem: 'PRG-203 entrou em programação — João Dias.',                   tipo: 'inicio_programacao',  timestamp: new Date(hrs(2))  },
  { id: 'act-003', mensagem: 'Retalho RT-089 utilizado no PRG-203.',                         tipo: 'retalho',             timestamp: new Date(hrs(2))  },
  { id: 'act-004', mensagem: 'Nova solicitação pendente: Tampa Proteção TMP-800.',            tipo: 'novo_pendente',       timestamp: new Date(hrs(2))  },
  { id: 'act-005', mensagem: 'PRG-204 iniciado — Carlos Mendes.',                            tipo: 'inicio_programacao',  timestamp: new Date(min(45)) },
  { id: 'act-006', mensagem: 'PRG-202 finalizado. Disponível para Corte.',                   tipo: 'finalizado',          timestamp: new Date(hrs(6))  },
  { id: 'act-007', mensagem: 'Programa PRG-200 reutilizado pela 3ª vez — OS:1543.',          tipo: 'reutilizacao',        timestamp: new Date(days(1)) },
  { id: 'act-008', mensagem: 'Retalho RT-090 gerado no PRG-202 (800×400mm, e=4mm).',        tipo: 'retalho',             timestamp: new Date(hrs(6))  },
  { id: 'act-009', mensagem: 'Nova solicitação pendente: Grade Ventilação GVT-450.',         tipo: 'novo_pendente',       timestamp: new Date(hrs(5))  },
  { id: 'act-010', mensagem: 'PRG-198 reutilizado — OS:1537 adicionada ao registro.',        tipo: 'reutilizacao',        timestamp: new Date(days(2)) },
]

// ─── Histórico Global ─────────────────────────────────────────────────────────

export const mockHistoricoProg: HistoricoEntradaProg[] = [
  ...mockProgramasEmAndamento.flatMap((p) => p.historico),
  ...mockProgramasFinalizados.flatMap((p) => p.historico),
].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

// ─── Chart / Analytics Data ───────────────────────────────────────────────────

export const mockEficienciaSemanalProg = [
  { dia: 'Seg', eficiencia: 88, programas: 3 },
  { dia: 'Ter', eficiencia: 82, programas: 2 },
  { dia: 'Qua', eficiencia: 91, programas: 4 },
  { dia: 'Qui', eficiencia: 79, programas: 2 },
  { dia: 'Sex', eficiencia: 85, programas: 3 },
  { dia: 'Sáb', eficiencia: 76, programas: 1 },
]

export const mockTempoMedioSemanal = [
  { semana: 'S-4', tempoMedio: 95 },
  { semana: 'S-3', tempoMedio: 88 },
  { semana: 'S-2', tempoMedio: 102 },
  { semana: 'S-1', tempoMedio: 79 },
  { semana: 'Atual', tempoMedio: 85 },
]

export const mockProgramasPorOS = [
  { os: 'OS:1540', programas: 3, fill: '#0f4c5c' },
  { os: 'OS:1545', programas: 2, fill: '#000080' },
  { os: 'OS:1548', programas: 2, fill: '#10b981' },
  { os: 'OS:1550', programas: 1, fill: '#f59e0b' },
  { os: 'OS:1551', programas: 1, fill: '#8b5cf6' },
]

export const mockAproveitamentoRetalho = [
  { name: 'Chapa Inteira',     value: 45, fill: '#000080' },
  { name: 'Retalho Utilizado', value: 35, fill: '#10b981' },
  { name: 'Retalho Gerado',    value: 20, fill: '#f59e0b' },
]

export const mockEficienciaProgramadores = [
  { nome: 'João Dias',    programas: 8, tempoMedio: 82, eficiencia: 94, fill: '#0f4c5c' },
  { nome: 'Carlos Mendes', programas: 6, tempoMedio: 91, eficiencia: 88, fill: '#000080' },
  { nome: 'Ana Lima',    programas: 4, tempoMedio: 78, eficiencia: 85, fill: '#10b981' },
]
