import type {
  CentroCusto,
  CustoMaterial,
  CustoMaoDeObra,
  MaquinaCustos,
  PerfilPrecificacao,
  HistoricoCusto,
} from '@/types/custos'

const now  = new Date()
const ago  = (days: number) => new Date(now.getTime() - days * 86_400_000)

// ─── Centros de Custo ─────────────────────────────────────────────────────────
// Hourly rates reflect a typical small-to-mid Brazilian industrial company.

export const mockCentrosCusto: CentroCusto[] = [
  { id: 'cc-001', nome: 'Engenharia',     descricao: 'Horas de projeto e especificação técnica',     ativo: true,  custoHora: 75.00,  ultimaAtualizacao: ago(5)  },
  { id: 'cc-002', nome: 'Programação',    descricao: 'Horas de programação CNC e CAM',               ativo: true,  custoHora: 65.00,  ultimaAtualizacao: ago(5)  },
  { id: 'cc-003', nome: 'Corte',          descricao: 'Horas de operação de corte a laser/plasma',    ativo: true,  custoHora: 120.00, ultimaAtualizacao: ago(3)  },
  { id: 'cc-004', nome: 'Dobra',          descricao: 'Horas de operação de dobradeira CNC',          ativo: true,  custoHora: 85.00,  ultimaAtualizacao: ago(3)  },
  { id: 'cc-005', nome: 'Solda',          descricao: 'Horas de soldagem MIG/TIG',                    ativo: true,  custoHora: 95.00,  ultimaAtualizacao: ago(10) },
  { id: 'cc-006', nome: 'Pintura',        descricao: 'Horas de preparação e aplicação de pintura',   ativo: true,  custoHora: 70.00,  ultimaAtualizacao: ago(10) },
  { id: 'cc-007', nome: 'Montagem',       descricao: 'Horas de montagem e acabamento final',         ativo: true,  custoHora: 60.00,  ultimaAtualizacao: ago(8)  },
  { id: 'cc-008', nome: 'Administrativo', descricao: 'Overhead administrativo e comercial',          ativo: true,  custoHora: 45.00,  ultimaAtualizacao: ago(15) },
  { id: 'cc-009', nome: 'Indiretos',      descricao: 'Custos indiretos de fábrica (aluguel, energia, seguros)', ativo: true, custoHora: 35.00, ultimaAtualizacao: ago(15) },
]

// ─── Custos de Materiais ──────────────────────────────────────────────────────
// Sheet dimensions assumed 3000 × 1500 mm standard.
// Weights are realistic market values (2026).

export const mockCustosMateriais: CustoMaterial[] = [
  {
    id: 'mat-001',
    material:       'Aço Carbono 1020',
    bitola:         '3mm',
    espessura:      3.0,
    pesoChapa:      106.0,   // kg — 3m × 1.5m × 3mm × 7.85 g/cm³
    valorChapa:     1_060.00,
    valorKg:        10.00,   // R$ 10,00/kg
    fornecedor:     'Aços Villares',
    dataAtualizacao: ago(8),
    ativo:          true,
  },
  {
    id: 'mat-002',
    material:       'Aço Carbono 1020',
    bitola:         '6mm',
    espessura:      6.0,
    pesoChapa:      212.0,
    valorChapa:     2_120.00,
    valorKg:        10.00,
    fornecedor:     'Aços Villares',
    dataAtualizacao: ago(8),
    ativo:          true,
  },
  {
    id: 'mat-003',
    material:       'Aço Inox 304',
    bitola:         '3mm',
    espessura:      3.0,
    pesoChapa:      108.0,   // density 8.0 g/cm³
    valorChapa:     4_320.00,
    valorKg:        40.00,
    fornecedor:     'Outokumpu',
    dataAtualizacao: ago(12),
    ativo:          true,
  },
  {
    id: 'mat-004',
    material:       'Aço Inox 316',
    bitola:         '3mm',
    espessura:      3.0,
    pesoChapa:      108.0,
    valorChapa:     5_400.00,
    valorKg:        50.00,
    fornecedor:     'Outokumpu',
    dataAtualizacao: ago(35),   // > 30 days — marked outdated
    ativo:          true,
  },
  {
    id: 'mat-005',
    material:       'Alumínio 6061',
    bitola:         '3mm',
    espessura:      3.0,
    pesoChapa:      36.5,    // density 2.7 g/cm³
    valorChapa:     1_825.00,
    valorKg:        50.00,
    fornecedor:     'Novelis',
    dataAtualizacao: ago(40),   // > 30 days — marked outdated
    ativo:          true,
  },
  {
    id: 'mat-006',
    material:       'Aço Carbono 1045',
    bitola:         '6mm',
    espessura:      6.0,
    pesoChapa:      212.0,
    valorChapa:     2_440.00,
    valorKg:        11.50,
    fornecedor:     'Gerdau',
    dataAtualizacao: ago(4),
    ativo:          true,
  },
]

// ─── Custos de Mão de Obra ────────────────────────────────────────────────────
// Brazilian labor market rates + typical 70-75% encargos sociais.

export const mockCustosMaoDeObra: CustoMaoDeObra[] = [
  {
    id: 'mob-001',
    cargo:              'Engenharia',
    custoHora:          45.00,
    encargosPercentual: 75,
    custoHoraTotal:     78.75,
    ativo:              true,
    ultimaAtualizacao:  ago(6),
  },
  {
    id: 'mob-002',
    cargo:              'Programação',
    custoHora:          38.00,
    encargosPercentual: 75,
    custoHoraTotal:     66.50,
    ativo:              true,
    ultimaAtualizacao:  ago(6),
  },
  {
    id: 'mob-003',
    cargo:              'Operador Laser',
    custoHora:          28.00,
    encargosPercentual: 70,
    custoHoraTotal:     47.60,
    ativo:              true,
    ultimaAtualizacao:  ago(20),
  },
  {
    id: 'mob-004',
    cargo:              'Operador Dobra',
    custoHora:          26.00,
    encargosPercentual: 70,
    custoHoraTotal:     44.20,
    ativo:              true,
    ultimaAtualizacao:  ago(20),
  },
  {
    id: 'mob-005',
    cargo:              'Soldador',
    custoHora:          32.00,
    encargosPercentual: 70,
    custoHoraTotal:     54.40,
    ativo:              true,
    ultimaAtualizacao:  ago(14),
  },
  {
    id: 'mob-006',
    cargo:              'Pintor',
    custoHora:          25.00,
    encargosPercentual: 70,
    custoHoraTotal:     42.50,
    ativo:              true,
    ultimaAtualizacao:  ago(14),
  },
  {
    id: 'mob-007',
    cargo:              'Montador',
    custoHora:          24.00,
    encargosPercentual: 70,
    custoHoraTotal:     40.80,
    ativo:              true,
    ultimaAtualizacao:  ago(14),
  },
]

// ─── Custos de Máquinas ───────────────────────────────────────────────────────
// IDs match src/mocks/maquinas.ts (m1-m8).
// processoPrincipal enables Phase 6 engine lookup per process.

export const mockCustosMaquinas: MaquinaCustos[] = [
  {
    id:                   'cmaq-001',
    maquinaId:            'm2',            // Corte a Laser Trumpf TruLaser 3030 (LASER-001)
    maquinaNome:          'Laser TruLaser 3030',
    maquinaCodigo:        'LASER-001',
    energiaHora:          42.00,
    custoManutencaoHora:  18.00,
    custoHora:            47.60,           // Operador Laser custoHoraTotal
    custoTotalHora:       107.60,
    ultimaAtualizacao:    ago(7),
    processoPrincipal:    'Corte',
  },
  {
    id:                   'cmaq-002',
    maquinaId:            'm3',            // Dobradeira CNC Amada HFB 80 (DOBRA-001)
    maquinaNome:          'Dobradeira CNC Amada HFB 80',
    maquinaCodigo:        'DOBRA-001',
    energiaHora:          15.00,
    custoManutencaoHora:  12.00,
    custoHora:            44.20,           // Operador Dobra
    custoTotalHora:       71.20,
    ultimaAtualizacao:    ago(7),
    processoPrincipal:    'Dobra',
  },
  {
    id:                   'cmaq-003',
    maquinaId:            'm7',            // Robô de Solda Lincoln Power Wave S350
    maquinaNome:          'Robô de Solda Lincoln S350',
    maquinaCodigo:        'SOLDA-001',
    energiaHora:          18.00,
    custoManutencaoHora:  14.00,
    custoHora:            54.40,           // Soldador custoHoraTotal
    custoTotalHora:       86.40,
    ultimaAtualizacao:    ago(10),
    processoPrincipal:    'Solda',
  },
  {
    id:                   'cmaq-004',
    maquinaId:            'm8',            // Cabine de Pintura Eletrostática Graco EP100
    maquinaNome:          'Cabine de Pintura Graco EP100',
    maquinaCodigo:        'PINTURA-001',
    energiaHora:          12.00,
    custoManutencaoHora:  8.00,
    custoHora:            42.50,           // Pintor custoHoraTotal
    custoTotalHora:       62.50,
    ultimaAtualizacao:    ago(12),
    processoPrincipal:    'Pintura',
  },
]

// ─── Perfis de Precificação ───────────────────────────────────────────────────

export const mockPerfisPrecificacao: PerfilPrecificacao[] = [
  {
    id:                    'perf-001',
    nome:                  'Conservador',
    descricao:             'Para clientes estratégicos ou projetos de longo prazo',
    margemLucroPercentual: 15,
    comissaoPercentual:    3,
    impostosPercentual:    12,
    ativo:                 true,
  },
  {
    id:                    'perf-002',
    nome:                  'Padrão',
    descricao:             'Perfil padrão para a maioria dos projetos',
    margemLucroPercentual: 25,
    comissaoPercentual:    5,
    impostosPercentual:    12,
    ativo:                 true,
  },
  {
    id:                    'perf-003',
    nome:                  'Agressivo',
    descricao:             'Projetos spot ou clientes com alta competitividade de mercado',
    margemLucroPercentual: 35,
    comissaoPercentual:    7,
    impostosPercentual:    12,
    ativo:                 true,
  },
]

// ─── Histórico de Custos ──────────────────────────────────────────────────────

export const mockHistoricoCustos: HistoricoCusto[] = [
  {
    id:             'hc-001',
    entidade:       'material',
    entidadeId:     'mat-001',
    entidadeNome:   'Aço Carbono 1020 — 3mm',
    campo:          'valorChapa',
    valorAnterior:  'R$ 980,00',
    valorNovo:      'R$ 1.060,00',
    usuario:        'Carlos Mendes',
    timestamp:      ago(8),
    motivo:         'Reajuste de fornecedor — nota fiscal NF-4521',
  },
  {
    id:             'hc-002',
    entidade:       'centro_custo',
    entidadeId:     'cc-003',
    entidadeNome:   'Corte',
    campo:          'custoHora',
    valorAnterior:  'R$ 110,00',
    valorNovo:      'R$ 120,00',
    usuario:        'Carlos Mendes',
    timestamp:      ago(3),
    motivo:         'Atualização semestral de custos de operação',
  },
  {
    id:             'hc-003',
    entidade:       'mao_obra',
    entidadeId:     'mob-001',
    entidadeNome:   'Engenharia',
    campo:          'custoHora',
    valorAnterior:  'R$ 42,00',
    valorNovo:      'R$ 45,00',
    usuario:        'Ana Lima',
    timestamp:      ago(6),
    motivo:         'Dissídio coletivo 2026',
  },
  {
    id:             'hc-004',
    entidade:       'perfil',
    entidadeId:     'perf-002',
    entidadeNome:   'Padrão',
    campo:          'margemLucroPercentual',
    valorAnterior:  '22',
    valorNovo:      '25',
    usuario:        'Carlos Mendes',
    timestamp:      ago(15),
    motivo:         'Revisão estratégica Q1-2026',
  },
]
