import type {
  CentroCusto,
  CustoMaterial,
  CustoMaoDeObra,
  MaquinaCustos,
  PerfilPrecificacao,
  HistoricoCusto,
  TipoMaterial,
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
// Phase 6.1: extended with full industrial catalog fields.
// Sheet dimensions assumed 3000 × 1500 mm standard unless noted.
// Weights are realistic market values (2026).

function mat(
  id: string,
  codigo: string,
  tipoMaterial: TipoMaterial,
  material: string,
  bitola: string,
  espessura: number,
  pesoChapa: number,
  valorChapa: number,
  fornecedor: string,
  daysAgo: number,
  ativo = true,
): CustoMaterial {
  return {
    id,
    codigo,
    descricao: `${material} — Chapa ${bitola}`,
    tipoMaterial,
    material,
    bitola,
    espessura,
    larguraChapa:    3000,
    comprimentoChapa:1500,
    pesoChapa,
    valorChapa,
    valorKg: Math.round((valorChapa / pesoChapa) * 100) / 100,
    fornecedor,
    dataAtualizacao: ago(daysAgo),
    ativo,
  }
}

export const mockCustosMateriais: CustoMaterial[] = [
  // ── Aço Carbono 1020 ──────────────────────────────────────────────────────
  mat('mat-001','MAT-001','aco_carbono','Aço Carbono 1020','3mm', 3.0,106.0,1_060.00,'Aços Villares',8),
  mat('mat-002','MAT-002','aco_carbono','Aço Carbono 1020','6mm', 6.0,212.0,2_120.00,'Aços Villares',8),
  mat('mat-003','MAT-003','aco_carbono','Aço Carbono 1020','8mm', 8.0,283.0,2_971.50,'Aços Villares',20),
  mat('mat-004','MAT-004','aco_carbono','Aço Carbono 1020','12mm',12.0,424.0,4_664.00,'Aços Villares',20),
  // ── Aço Carbono 1045 ──────────────────────────────────────────────────────
  mat('mat-005','MAT-005','aco_carbono','Aço Carbono 1045','6mm', 6.0,212.0,2_440.00,'Gerdau',4),
  // ── Aço Inox ─────────────────────────────────────────────────────────────
  mat('mat-006','MAT-006','aco_inox','Aço Inox 304','3mm',3.0,108.0,4_320.00,'Outokumpu',12),
  mat('mat-007','MAT-007','aco_inox','Aço Inox 304','6mm',6.0,216.0,8_640.00,'Outokumpu',35),   // > 30d outdated
  mat('mat-008','MAT-008','aco_inox','Aço Inox 316','3mm',3.0,108.0,5_400.00,'Outokumpu',35),   // > 30d outdated
  // ── Aço Galvanizado ───────────────────────────────────────────────────────
  mat('mat-009','MAT-009','aco_galvanizado','Aço Galvanizado Z275','3mm',3.0,107.0,1_391.00,'Usiminas',6),
  mat('mat-010','MAT-010','aco_galvanizado','Aço Galvanizado Z275','6mm',6.0,214.0,2_782.00,'Usiminas',6),
  // ── Alumínio ──────────────────────────────────────────────────────────────
  mat('mat-011','MAT-011','aluminio','Alumínio 6061','3mm',3.0,36.5,1_825.00,'Novelis',40),      // > 30d outdated
  mat('mat-012','MAT-012','aluminio','Alumínio 6061','6mm',6.0,73.0,3_650.00,'Novelis',40),      // > 30d outdated
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
