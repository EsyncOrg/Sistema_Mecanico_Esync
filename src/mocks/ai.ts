// ─── Esync IA — Mock Data ────────────────────────────────────────────────────
// All mock data for the AI intelligence module.
// Replace with real API calls after OpenAI integration.

import type {
  AIInsight,
  AIHistoryEntry,
  AIActivityItem,
  AIConfig,
  ChatMessage,
  SetorAnalytics,
} from '@/types/ai'

// ─── Default config ────────────────────────────────────────────────────────────

export const DEFAULT_AI_CONFIG: AIConfig = {
  model:         'gpt-5-mini',
  maxTokens:     2048,
  temperature:   0.7,
  dailyLimit:    500,
  autoInsights:  true,
  autoAnalysis:  false,
}

// ─── AI Insights ──────────────────────────────────────────────────────────────

export const mockAIInsights: AIInsight[] = [
  {
    id: 'ins-001',
    title: 'Gargalo Crítico — Setor de Corte',
    description: 'Taxa de entrada de 42 peças/turno excede a capacidade nominal de 35 peças/turno em 20%. Fila acumulada: 28 peças pendentes.',
    severity: 'critical',
    category: 'gargalo',
    setor: 'corte',
    recommendation: 'Redistribuir carga para turnos alternativos ou acionar recurso adicional. Revisar sequência de programas para reduzir tempo de setup entre cortes.',
    impact: 'Atraso estimado de 6h na linha de produção',
    confidence: 94,
    detectedAt: new Date(Date.now() - 1000 * 60 * 38),
  },
  {
    id: 'ins-002',
    title: 'Eficiência Abaixo do Target — Dobra',
    description: 'Eficiência líquida do setor de dobra em 71%, abaixo do target operacional de 85%. Principal causa: trocas de ferramentas não otimizadas.',
    severity: 'warning',
    category: 'eficiencia',
    setor: 'dobra',
    recommendation: 'Agrupar peças com ângulos similares (90°) na mesma batelada. Programar trocas de ferramentas fora do horário produtivo. Sequência otimizada pode reduzir setup em 23%.',
    impact: '~4h/semana de tempo produtivo recuperável',
    confidence: 88,
    detectedAt: new Date(Date.now() - 1000 * 60 * 72),
  },
  {
    id: 'ins-003',
    title: 'Estoque Crítico — LAT-E-001',
    description: 'Peça LAT-E-001 com estoque de 4 unidades, abaixo do mínimo recomendado de 10. Demanda projetada para próximos 5 dias: 18 unidades.',
    severity: 'critical',
    category: 'estoque',
    recommendation: 'Iniciar requisição de compra imediatamente. Tempo médio de reposição: 3 dias úteis. Considerar reposição de emergência para PORTA-F-001 (2 un. em estoque).',
    impact: 'Risco de parada de produção em 2–3 dias',
    confidence: 97,
    detectedAt: new Date(Date.now() - 1000 * 60 * 15),
  },
  {
    id: 'ins-004',
    title: 'OS:1508 com Tempo Acima da Média',
    description: 'Ordem de serviço OS:1508 acumula 187 minutos de desenvolvimento — 34% acima da média histórica de 139 min para estruturas similares.',
    severity: 'warning',
    category: 'eficiencia',
    recommendation: 'Verificar se há impedimentos técnicos não registrados. Comparar especificações com OS:1502 (mesma categoria, 121 min). Consultar responsável Carlos Mendes.',
    impact: 'Atraso em 2 ordens subsequentes na fila',
    confidence: 81,
    detectedAt: new Date(Date.now() - 1000 * 60 * 120),
  },
  {
    id: 'ins-005',
    title: 'Solda Operando Abaixo da Capacidade',
    description: 'Setor de solda com 45% de capacidade livre. Utilização atual: 55%. Pode absorver sobrecarga dos setores de corte e dobra sem impacto em qualidade.',
    severity: 'info',
    category: 'maquina',
    setor: 'solda',
    recommendation: 'Antecipar ordens de solda da próxima semana. Considerar alocação de OS com geometria simples para aproveitar capacidade disponível.',
    impact: 'Oportunidade de adiantar 3 ordens de entrega',
    confidence: 75,
    detectedAt: new Date(Date.now() - 1000 * 60 * 200),
  },
  {
    id: 'ins-006',
    title: 'Eficiência Elevada — Carlos Mendes',
    description: 'Operador Carlos Mendes registrou eficiência líquida de 94% nas últimas 40 horas de desenvolvimento — melhor índice individual do mês.',
    severity: 'success',
    category: 'operador',
    recommendation: 'Documentar metodologia de trabalho para replicação na equipe. Considerar como referência para treinamento de novos membros.',
    impact: 'Benchmark positivo para a equipe',
    confidence: 99,
    detectedAt: new Date(Date.now() - 1000 * 60 * 60),
  },
  {
    id: 'ins-007',
    title: 'Estoque Parado — BASE-EST-001 e CANTEL-001',
    description: 'BASE-EST-001 (12 un.) e CANTEL-001 (5 un.) com mais de 90 dias de permanência no estoque sem demanda registrada.',
    severity: 'info',
    category: 'estoque',
    recommendation: 'Revisar curva de demanda histórica. Verificar se estes itens estão associados a projetos suspensos. Avaliar devolução ou reutilização em outros conjuntos.',
    impact: 'Capital imobilizado estimado: R$ 1.240',
    confidence: 83,
    detectedAt: new Date(Date.now() - 1000 * 60 * 480),
  },
  {
    id: 'ins-008',
    title: 'Oportunidade de Otimização — Agrupamento de OS',
    description: 'OS:1520 e OS:1521 possuem 73% de peças em comum (material, espessura, processos). Processamento conjunto estimado em 28% mais eficiente.',
    severity: 'info',
    category: 'otimizacao',
    recommendation: 'Agrupar OS:1520 e OS:1521 em um único programa de corte. Programar dobra sequencial para mesmas geometrias. Potencial de saving: ~2h de produção.',
    impact: 'Economia estimada de ~2h de produção',
    confidence: 79,
    detectedAt: new Date(Date.now() - 1000 * 60 * 300),
  },
]

// ─── AI History ───────────────────────────────────────────────────────────────

export const mockAIHistory: AIHistoryEntry[] = [
  { id: 'h-001', pergunta: 'Como reduzir o tempo de setup da dobra?',        usuario: 'João Dias', data: new Date(Date.now() - 1000*60*20),    tempoResposta: 1240, tipoAnalise: 'Análise de Setor',       tokensUsed: 384  },
  { id: 'h-002', pergunta: 'Existe algum gargalo na produção atual?',        usuario: 'João Dias', data: new Date(Date.now() - 1000*60*85),    tempoResposta: 1830, tipoAnalise: 'Detecção de Gargalo',    tokensUsed: 512  },
  { id: 'h-003', pergunta: 'Qual OS consumiu mais tempo esta semana?',       usuario: 'João Dias', data: new Date(Date.now() - 1000*60*180),   tempoResposta: 960,  tipoAnalise: 'Análise de OS',          tokensUsed: 298  },
  { id: 'h-004', pergunta: 'Analise o nível de estoque crítico',             usuario: 'João Dias', data: new Date(Date.now() - 1000*60*360),   tempoResposta: 1420, tipoAnalise: 'Análise de Estoque',     tokensUsed: 447  },
  { id: 'h-005', pergunta: 'Como está a eficiência por operador?',           usuario: 'João Dias', data: new Date(Date.now() - 1000*60*720),   tempoResposta: 1680, tipoAnalise: 'Análise de Operador',    tokensUsed: 521  },
  { id: 'h-006', pergunta: 'Quais setores precisam de atenção imediata?',   usuario: 'João Dias', data: new Date(Date.now() - 1000*60*1440),  tempoResposta: 2100, tipoAnalise: 'Análise Geral',          tokensUsed: 634  },
  { id: 'h-007', pergunta: 'Existe excesso de estoque em algum item?',      usuario: 'João Dias', data: new Date(Date.now() - 1000*60*2160),  tempoResposta: 1120, tipoAnalise: 'Análise de Estoque',     tokensUsed: 356  },
  { id: 'h-008', pergunta: 'Analise a tendência de produção desta semana',  usuario: 'João Dias', data: new Date(Date.now() - 1000*60*2880),  tempoResposta: 1930, tipoAnalise: 'Análise de Setor',       tokensUsed: 578  },
  { id: 'h-009', pergunta: 'Qual o tempo médio do corte?',                  usuario: 'João Dias', data: new Date(Date.now() - 1000*60*4320),  tempoResposta: 840,  tipoAnalise: 'Análise de Setor',       tokensUsed: 271  },
  { id: 'h-010', pergunta: 'Sugira melhorias para a solda',                 usuario: 'João Dias', data: new Date(Date.now() - 1000*60*5760),  tempoResposta: 2240, tipoAnalise: 'Análise de Eficiência',  tokensUsed: 689  },
]

// ─── AI Activity Feed ────────────────────────────────────────────────────────

export const mockAIActivities: AIActivityItem[] = [
  { id: 'a-001', message: 'Analisando tempo médio do setor de dobra...',                         type: 'analyzing',  timestamp: new Date(Date.now() - 1000*30)   },
  { id: 'a-002', message: 'Detectado possível gargalo no setor de corte.',                       type: 'detected',   timestamp: new Date(Date.now() - 1000*90)   },
  { id: 'a-003', message: 'Sugestão gerada: agrupar OS:1520 e OS:1521.',                        type: 'suggestion', timestamp: new Date(Date.now() - 1000*180)  },
  { id: 'a-004', message: 'Estoque crítico detectado — LAT-E-001 abaixo do mínimo.',            type: 'warning',    timestamp: new Date(Date.now() - 1000*300)  },
  { id: 'a-005', message: 'Análise semanal concluída — 8 insights gerados.',                   type: 'success',    timestamp: new Date(Date.now() - 1000*480)  },
  { id: 'a-006', message: 'Processando métricas de produção das últimas 24h...',               type: 'analyzing',  timestamp: new Date(Date.now() - 1000*600)  },
  { id: 'a-007', message: 'Eficiência de OS:1508 abaixo da média histórica.',                  type: 'warning',    timestamp: new Date(Date.now() - 1000*900)  },
  { id: 'a-008', message: 'Carlos Mendes: melhor eficiência individual do mês.',               type: 'success',    timestamp: new Date(Date.now() - 1000*1200) },
  { id: 'a-009', message: 'Solda operando 45% abaixo da capacidade — oportunidade.',           type: 'suggestion', timestamp: new Date(Date.now() - 1000*1800) },
  { id: 'a-010', message: 'Revisão automática de conjuntos PAINEL-800 e EST-L04 concluída.', type: 'success',    timestamp: new Date(Date.now() - 1000*2400) },
]

// ─── Initial chat messages ────────────────────────────────────────────────────

export const initialChatMessages: ChatMessage[] = [
  {
    id: 'msg-welcome',
    role: 'assistant',
    content: `**Olá. Sou a Esync IA — inteligência operacional industrial.**

Estou conectada aos dados de produção e pronta para analisar:

- **Setores:** Corte, Dobra, Solda, Desenvolvimento
- **Estoque:** níveis críticos, excessos, tendências
- **OS:** desempenho, gargalos, tempo médio
- **Operadores:** eficiência líquida e comparativos
- **Conjuntos:** análise de estrutura e otimização

Como posso ajudar sua operação hoje?`,
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    analysisType: 'Análise Geral',
  },
]

// ─── Sector analytics ────────────────────────────────────────────────────────

export const mockSetorAnalytics: SetorAnalytics[] = [
  { setor: 'Corte',         tempoMedio: 28, eficiencia: 62, gargalo: true,  tendencia: 'down',   capacidade: 120 },
  { setor: 'Dobra',         tempoMedio: 22, eficiencia: 71, gargalo: false, tendencia: 'stable', capacidade: 78  },
  { setor: 'Solda',         tempoMedio: 35, eficiencia: 88, gargalo: false, tendencia: 'up',     capacidade: 55  },
  { setor: 'Desenvolvimento', tempoMedio: 139, eficiencia: 79, gargalo: false, tendencia: 'up',  capacidade: 82  },
]

// ─── Analytics chart data ─────────────────────────────────────────────────────

export const mockTempoPorSetor = [
  { setor: 'Desenvolvimento', minutos: 139, fill: '#000080' },
  { setor: 'Corte',           minutos: 28,  fill: '#0f4c5c' },
  { setor: 'Dobra',           minutos: 22,  fill: '#10b981' },
  { setor: 'Solda',           minutos: 35,  fill: '#f59e0b' },
]

export const mockEficienciaSemanal = [
  { dia: 'Seg', corte: 68, dobra: 72, solda: 85, dev: 81 },
  { dia: 'Ter', corte: 61, dobra: 70, solda: 88, dev: 77 },
  { dia: 'Qua', corte: 74, dobra: 68, solda: 90, dev: 82 },
  { dia: 'Qui', corte: 58, dobra: 75, solda: 87, dev: 79 },
  { dia: 'Sex', corte: 62, dobra: 71, solda: 88, dev: 80 },
  { dia: 'Sáb', corte: 55, dobra: 69, solda: 84, dev: 74 },
]

export const mockTopOSTempos = [
  { os: 'OS:1508', minutos: 187, fill: '#ef4444' },
  { os: 'OS:1502', minutos: 121, fill: '#000080' },
  { os: 'OS:1515', minutos: 98,  fill: '#0f4c5c' },
  { os: 'OS:1521', minutos: 87,  fill: '#10b981' },
  { os: 'OS:1519', minutos: 76,  fill: '#f59e0b' },
  { os: 'OS:1520', minutos: 65,  fill: '#8b5cf6' },
]

export const mockGargaloDist = [
  { name: 'Corte — sobrecarga',     value: 45, fill: '#ef4444' },
  { name: 'Dobra — setup',          value: 30, fill: '#f59e0b' },
  { name: 'Desenvolvimento — espera', value: 15, fill: '#000080' },
  { name: 'Material faltante',       value: 10, fill: '#8b5cf6' },
]
