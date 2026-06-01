import type {
  ProcessoIndustrial,
  TemplateTempos,
  HistoricoTempo,
} from '@/types/tempos'

const now = new Date()
const ago = (days: number) => new Date(now.getTime() - days * 86_400_000)

// ─── Process catalog ──────────────────────────────────────────────────────────
// 7 canonical industrial processes.
// Future: users can add custom processes (unlimited).
// The `icone` field maps to Lucide icon names, consumed by TemposIndustriaisSection.

export const mockProcessos: ProcessoIndustrial[] = [
  {
    id: 'proc-001', nome: 'Desenvolvimento', ordem: 1, ativo: true,
    icone: 'Lightbulb',
    descricao: 'Projeto de engenharia, especificação técnica e desenho',
    // [HOOK:MAQUINA_RELAÇÃO] — Phase 6: maquinaIds: [] (no machine for eng)
  },
  {
    id: 'proc-002', nome: 'Programação', ordem: 2, ativo: true,
    icone: 'Code2',
    descricao: 'Programação CNC, CAM e preparação de arquivos',
    // [HOOK:MAQUINA_RELAÇÃO] — Phase 6: maquinaIds: [] (software only)
  },
  {
    id: 'proc-003', nome: 'Corte', ordem: 3, ativo: true,
    icone: 'Scissors',
    descricao: 'Corte a laser, plasma ou guilhotina',
    // [HOOK:MAQUINA_RELAÇÃO] — Phase 6: maquinaIds: ['m2'] (LASER-001)
  },
  {
    id: 'proc-004', nome: 'Dobra', ordem: 4, ativo: true,
    icone: 'FoldVertical',
    descricao: 'Dobra em prensa CNC ou dobradeira hidráulica',
    // [HOOK:MAQUINA_RELAÇÃO] — Phase 6: maquinaIds: ['m3', 'm4'] (DOBRA-001, DOBRA-002)
  },
  {
    id: 'proc-005', nome: 'Solda', ordem: 5, ativo: true,
    icone: 'Flame',
    descricao: 'Soldagem MIG, TIG ou por robô',
    // [HOOK:MAQUINA_RELAÇÃO] — Phase 6: maquinaIds: ['m7'] (SOLDA-001)
  },
  {
    id: 'proc-006', nome: 'Pintura', ordem: 6, ativo: true,
    icone: 'Paintbrush',
    descricao: 'Jateamento, primer, pintura epóxi ou eletrostática',
    // [HOOK:MAQUINA_RELAÇÃO] — Phase 6: maquinaIds: ['m8'] (PINTURA-001)
  },
  {
    id: 'proc-007', nome: 'Montagem', ordem: 7, ativo: true,
    icone: 'Wrench',
    descricao: 'Montagem final, ajuste e verificação dimensional',
    // [HOOK:MAQUINA_RELAÇÃO] — Phase 6: maquinaIds: [] (manual assembly station)
  },
]

// ─── Time templates ───────────────────────────────────────────────────────────
// Reusable defaults — users apply a template during piece creation/editing
// to pre-fill all process times. All times in minutes.

export const mockTemplates: TemplateTempos[] = [
  {
    id: 'tmpl-001',
    nome: 'Painel Simples',
    descricao: 'Chapa cortada com dobras simples, sem solda. Pintura opcional.',
    tempos: {
      tempoDesenvolvimentoMin: 20,
      tempoProgramacaoMin:     15,
      tempoCorteMin:           8,
      tempoDobraMin:           15,
      tempoSoldaMin:           0,
      tempoPinturaMin:         20,
      tempoMontagemMin:        10,
    },
    totalMinutos: 88,
  },
  {
    id: 'tmpl-002',
    nome: 'Painel Médio',
    descricao: 'Estrutura de média complexidade com solda MIG pontual.',
    tempos: {
      tempoDesenvolvimentoMin: 35,
      tempoProgramacaoMin:     25,
      tempoCorteMin:           14,
      tempoDobraMin:           20,
      tempoSoldaMin:           30,
      tempoPinturaMin:         35,
      tempoMontagemMin:        20,
    },
    totalMinutos: 179,
  },
  {
    id: 'tmpl-003',
    nome: 'Painel Complexo',
    descricao: 'Gabinete completo com múltiplas dobras, solda estrutural e pintura epóxi.',
    tempos: {
      tempoDesenvolvimentoMin: 60,
      tempoProgramacaoMin:     45,
      tempoCorteMin:           20,
      tempoDobraMin:           35,
      tempoSoldaMin:           60,
      tempoPinturaMin:         50,
      tempoMontagemMin:        40,
    },
    totalMinutos: 310,
  },
  {
    id: 'tmpl-004',
    nome: 'Estrutura Soldada',
    descricao: 'Perfis e chapas com solda estrutural extensa. Sem pintura interna.',
    tempos: {
      tempoDesenvolvimentoMin: 45,
      tempoProgramacaoMin:     20,
      tempoCorteMin:           25,
      tempoDobraMin:           15,
      tempoSoldaMin:           90,
      tempoPinturaMin:         30,
      tempoMontagemMin:        25,
    },
    totalMinutos: 250,
  },
  {
    id: 'tmpl-005',
    nome: 'Peça Usinada Simples',
    descricao: 'Peça torneada ou fresada sem processos de chapa. Alta complexidade CNC.',
    tempos: {
      tempoDesenvolvimentoMin: 45,
      tempoProgramacaoMin:     60,
      tempoCorteMin:           30,
      tempoDobraMin:           0,
      tempoSoldaMin:           0,
      tempoPinturaMin:         0,
      tempoMontagemMin:        10,
    },
    totalMinutos: 145,
  },
]

// ─── Time history ─────────────────────────────────────────────────────────────

export const mockHistoricoTempos: HistoricoTempo[] = [
  {
    id:               'ht-001',
    pecaId:           '2',
    pecaCodigo:       'PCA-0002',
    processo:         'Solda',
    valorAnteriorMin: 0,
    valorNovoMin:     0,
    usuario:          'Carlos Mendes',
    timestamp:        ago(5),
    motivo:           'Confirmado: peça não requer solda',
  },
  {
    id:               'ht-002',
    pecaId:           '1',
    pecaCodigo:       'PCA-0001',
    processo:         'Corte',
    valorAnteriorMin: 12,
    valorNovoMin:     8,
    usuario:          'Carlos Mendes',
    timestamp:        ago(3),
    motivo:           'Tempo real medido na produção — ajuste de lazer fibra',
  },
  {
    id:               'ht-003',
    pecaId:           '4',
    pecaCodigo:       'PCA-0004',
    processo:         'Programação',
    valorAnteriorMin: 20,
    valorNovoMin:     30,
    usuario:          'Ana Lima',
    timestamp:        ago(1),
    motivo:           'Eixo requer programa de 5 eixos — tempo revisado',
  },
]
