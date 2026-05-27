// ─── Esync IA — Mock AI Service ────────────────────────────────────────────────
// Mock implementations of all AI service functions.
// These will be replaced by real OpenAI API calls after integration.
//
// Future integration:
//   import OpenAI from 'openai'
//   const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
//
// Security: ALL API calls must be made server-side via /app/api/ai/ routes.
// NEVER expose OPENAI_API_KEY in client code.

import type {
  AIInsight,
  SetorAnalytics,
  AnalysisType,
  InsightSeverity,
  InsightCategory,
} from '@/types/ai'
import { mockAIInsights, mockSetorAnalytics } from '@/mocks/ai'

// ─── Mock response bank ───────────────────────────────────────────────────────

interface MockResponse {
  keywords: string[]
  analysisType: AnalysisType
  response: string
}

const MOCK_RESPONSES: MockResponse[] = [
  {
    keywords: ['dobra', 'dobramento', 'bend'],
    analysisType: 'Análise de Setor',
    response: `**Análise do Setor de Dobra — Concluída**

Período analisado: últimas 168h · Registros processados: 847

─────────────────────────────

**Situação Atual:**
- Tempo médio de setup: **22 min** (média histórica: 17 min ↑29%)
- Fila atual: **7 peças** aguardando (limite recomendado: 5)
- Eficiência líquida: **71%** — abaixo do target de 85%
- Principal causa de ineficiência: trocas de ferramentas não otimizadas

**Problemas Identificados:**
1. Setup excessivo nas trocas de ferramentas entre peças de geometria diferente
2. 3 peças com ângulo 90° poderiam ser processadas em sequência contínua
3. Troca de matriz R4 → R8 registrada 7x esta semana (média histórica: 3x)

**Recomendações:**
1. Agrupar peças com geometria similar na mesma batelada de processamento
2. Reorganizar fila atual priorizando peças com ângulo 90° primeiro
3. Programar manutenção preventiva das matrizes para fora do horário produtivo
4. Considerar kaizen focado em redução de setup: meta de 15 min

**Impacto Estimado:** Redução de ~4h/semana em tempo improdutivo.
Potencial de melhoria de eficiência: +14 pontos percentuais.

*Confiança da análise: 88% · Baseado em 847 registros de produção*`,
  },
  {
    keywords: ['corte', 'laser', 'plasma', 'cnc'],
    analysisType: 'Análise de Setor',
    response: `**Análise do Setor de Corte — Concluída**

Período analisado: últimas 168h · Máquinas analisadas: CNC-001, CNC-002, LASER-001

─────────────────────────────

**Situação Atual — ATENÇÃO NECESSÁRIA:**
- Taxa de entrada: **42 peças/turno** (capacidade nominal: 35)
- Sobrecarga: **+20%** acima da capacidade projetada
- Fila acumulada: **28 peças** pendentes
- Aproveitamento médio de chapa: **67%** (target: 80%)

**Análise por Máquina:**
- CNC-001: 94% de utilização · tempo médio 26 min/peça
- CNC-002: 88% de utilização · tempo médio 31 min/peça
- LASER-001: 102% utilização efetiva · sobrecarga confirmada

**Recomendações de Otimização:**
1. Redistribuir 15% da carga para turno noturno
2. Revisar nesting de chapas — potencial de +13% em aproveitamento
3. Priorizar peças de PLAT-EST-001 (material zerado em estoque)
4. Avaliar terceirização pontual de corte para próximas 2 semanas

**Impacto do Gargalo:**
- Atraso estimado em 6h na linha de produção downstream
- 3 ordens de entrega em risco para esta semana

*Confiança da análise: 94% · Alerta: situação crítica detectada*`,
  },
  {
    keywords: ['gargalo', 'bottleneck', 'lento', 'atraso', 'problema'],
    analysisType: 'Detecção de Gargalo',
    response: `**Análise de Gargalos Operacionais — Concluída**

Varredura completa de todos os setores · 1.847 registros processados

─────────────────────────────

**🔴 Gargalo Crítico — Setor de Corte**
Taxa de entrada: 42 peças/turno (capacidade: 35) → Sobrecarga de 20%
Fila acumulada: 28 peças pendentes · Impacto: 6h de atraso downstream

**🟡 Atenção — Setor de Dobra**
Fila com 7 peças (limite: 5) · Eficiência líquida: 71%
Causa principal: trocas de ferramentas sem otimização de sequência

**🟢 Capacidade Disponível — Solda**
Utilização atual: 55% · Capacidade livre: 45%
Pode absorver parte da sobrecarga dos setores anteriores

**🔵 Desenvolvimento — Estável**
Fila dentro do normal · 1 OS (OS:1508) com tempo acima da média

─────────────────────────────

**Plano de Ação Recomendado:**
1. **Imediato:** Redistribuir carga do Corte para turno alternativo
2. **Curto prazo:** Otimizar sequência de dobra por geometria
3. **Médio prazo:** Balancear capacidade Corte ↔ Solda para evitar recorrência

**Tempo estimado para normalização:** 2,5 turnos com ações imediatas.

*Confiança da análise: 91% · Prioridade: ALTA*`,
  },
  {
    keywords: ['estoque', 'inventário', 'peça', 'material', 'reposição'],
    analysisType: 'Análise de Estoque',
    response: `**Análise de Estoque — Concluída**

Inventário completo verificado · 847 SKUs analisados

─────────────────────────────

**Resumo de Inventário:**
- Total de itens catalogados: **847 SKUs**
- Itens com estoque crítico (< mínimo): **12 itens**
- Itens com excesso (> 90 dias parado): **34 itens**
- Giro médio do estoque: **18 dias**

**Itens Críticos — Reposição Urgente:**
🔴 LAT-E-001 — 4 un. · mínimo: 10 · demanda projetada: 18 un./5 dias
🔴 PORTA-F-001 — 2 un. · mínimo: 8 · reposição emergencial necessária
🟡 PLAT-EST-001 — **ZERADO** · reposição padrão necessária
🟡 BASE-PAI-001 — 1 un. · mínimo: 5 · atenção necessária

**Itens com Excesso (imobilizado):**
- BASE-EST-001: 12 un. · último uso: 94 dias · valor: ~R$ 480
- CANTEL-001: 5 un. · último uso: 112 dias · valor: ~R$ 215
- Outros 32 itens · valor total imobilizado: ~R$ 87.400

**Recomendações:**
1. Iniciar requisição de compra para 3 itens críticos imediatamente
2. Revisar curva ABC dos 34 itens parados (possível devolução/transferência)
3. Ajustar ponto de reposição de LAT-E-001 para 15 un. (atual: 10)

*Confiança da análise: 97% · Dados atualizados em tempo real*`,
  },
  {
    keywords: ['os', 'ordem de serviço', 'tempo de os', 'os:', '1508'],
    analysisType: 'Análise de OS',
    response: `**Análise de Ordens de Serviço — Ranking de Tempo**

Período: últimas 4 semanas · 47 OS analisadas

─────────────────────────────

**Top 5 OS por Tempo de Desenvolvimento:**

| OS      | Tempo   | Média | Δ      | Status          |
|---------|---------|-------|--------|-----------------|
| OS:1508 | 187 min | 139   | +34%   | 🔴 Acima da média |
| OS:1502 | 121 min | 139   | -13%   | 🟢 Dentro do esperado |
| OS:1515 | 98 min  | 85    | +15%   | 🟡 Levemente acima |
| OS:1521 | 87 min  | 85    | +2%    | 🟢 Normal |
| OS:1519 | 76 min  | 85    | -11%   | 🟢 Abaixo da média |

**Análise Detalhada — OS:1508:**
- Responsável: Carlos Mendes
- Maior concentração de tempo: setor de Desenvolvimento
- Setup acima da média histórica registrado 2x
- Pausas totais: 38 min (histórica: 14 min)
- Possível causa: especificação técnica não confirmada no início

**Recomendação:**
Verificar se OS:1508 possui algum impedimento técnico não registrado.
Comparar especificações com OS:1502 (mesma categoria, 121 min).

*Confiança da análise: 86% · Dados de 47 OS processados*`,
  },
  {
    keywords: ['eficiência', 'eficiente', 'performance', 'produtividade'],
    analysisType: 'Análise de Eficiência',
    response: `**Análise Global de Eficiência Operacional — Concluída**

Período: semana atual (6 dias) · Todos os setores

─────────────────────────────

**Eficiência por Setor:**
- Desenvolvimento: **79%** (target: 85%) · Tendência: ↑ crescendo
- Corte: **62%** (target: 85%) · Tendência: ↓ CRÍTICO — gargalo ativo
- Dobra: **71%** (target: 85%) · Tendência: → estável mas abaixo
- Solda: **88%** (target: 85%) · Tendência: ↑ ACIMA DO TARGET ✓

**Eficiência por Operador (Top 3):**
1. 🥇 Carlos Mendes — 94% · melhor do mês
2. 🥈 Ana Lima — 87% · consistente, acima do target
3. 🥉 Roberto Silva — 81% · dentro da faixa aceitável

**Principais Fatores de Ineficiência:**
1. Setup não otimizado no Corte e Dobra (responsável por ~40% da perda)
2. OS:1508 com pausas acima da média (responsável por ~15%)
3. Aguardando material (PLAT-EST-001 zerado) — ~25% da perda

**Meta para Próxima Semana:**
Eficiência global: de 75% → 82%
Ações necessárias: otimizar sequência de corte + repor estoque crítico

*Confiança: 84% · Baseado em 1.847 registros de produção da semana*`,
  },
  {
    keywords: ['operador', 'responsável', 'equipe', 'colaborador'],
    analysisType: 'Análise de Operador',
    response: `**Análise de Desempenho por Operador — Concluída**

Período: últimas 2 semanas · 6 operadores analisados

─────────────────────────────

**Ranking de Eficiência Líquida:**

| Operador         | Eficiência | Horas | OS Concluídas | Tendência |
|------------------|-----------|-------|---------------|-----------|
| Carlos Mendes    | 94%       | 80h   | 14            | ↑ Crescendo |
| Ana Lima         | 87%       | 78h   | 12            | → Estável |
| Roberto Silva    | 81%       | 74h   | 11            | ↑ Crescendo |
| Fernanda Rocha   | 78%       | 71h   | 10            | → Estável |
| Paulo Santos     | 74%       | 68h   | 9             | ↓ Caindo |
| Marcos Oliveira  | 71%       | 65h   | 8             | → Estável |

**Destaques:**
🏆 Carlos Mendes: melhor eficiência individual do mês (94%)
⚠️ Paulo Santos: queda de 83% → 74% nas últimas 2 semanas — verificar se há impedimentos

**Análise de Distribuição de Carga:**
Carga relativamente bem distribuída.
Diferença entre top e bottom: 23 pontos percentuais.
Recomendação: acompanhar Paulo Santos e verificar causas da queda.

**Benchmark de Referência:**
Meta de eficiência da equipe: 85%
Média atual da equipe: **80.8%** — 4.2 pontos abaixo da meta

*Confiança: 91% · Baseado em registros de ponto e produção*`,
  },
]

const DEFAULT_RESPONSE = `**Análise Operacional Geral — Concluída**

Sistema Esync IA processando dados da última semana de operação.

─────────────────────────────

**Resumo Executivo:**
- Eficiência global da operação: **75.4%**
- Setores monitorados: 4 (Corte, Dobra, Solda, Desenvolvimento)
- OS concluídas na semana: 23 de 31 planejadas (74%)
- Insights ativos: 8 (2 críticos, 3 atenção, 3 informativos)

**Principais Alertas Ativos:**
🔴 Gargalo no setor de Corte — ação necessária
🔴 Estoque crítico de LAT-E-001 e PORTA-F-001
🟡 Eficiência da dobra abaixo do target
🟡 OS:1508 com tempo acima da média histórica

**Oportunidades Identificadas:**
✅ Solda com 45% de capacidade disponível
✅ Carlos Mendes com melhor eficiência individual (94%)
✅ Agrupamento de OS:1520 e OS:1521 pode gerar 2h de economia

**Próximas Ações Recomendadas:**
1. Redistribuir carga do Corte para turno alternativo
2. Iniciar requisição de compra de LAT-E-001 (urgente)
3. Otimizar sequência de dobra por geometria

Pergunte-me sobre setores específicos, OS, estoque ou eficiência para análises mais detalhadas.

*Sistema Esync IA · Última sincronização: agora · 1.847 registros analisados*`

// ─── Exported service functions ──────────────────────────────────────────────

/**
 * Returns a mock AI response for the given user input.
 * Future: Will call /api/ai/chat which calls OpenAI API server-side.
 */
export function getMockAIResponse(input: string): {
  response: string
  analysisType: AnalysisType
  delayMs: number
} {
  const lower = input.toLowerCase()
  for (const item of MOCK_RESPONSES) {
    if (item.keywords.some((k) => lower.includes(k))) {
      return {
        response:     item.response,
        analysisType: item.analysisType,
        delayMs:      800 + Math.random() * 1000,
      }
    }
  }
  return {
    response:     DEFAULT_RESPONSE,
    analysisType: 'Análise Geral',
    delayMs:      1200 + Math.random() * 800,
  }
}

/**
 * Returns a random AI insight from the mock dataset.
 * Future: Will call OpenAI to generate contextual insights from real production data.
 */
export function generateMockInsight(): AIInsight {
  const severities: InsightSeverity[] = ['critical', 'warning', 'info', 'success']
  const categories: InsightCategory[] = ['gargalo', 'estoque', 'eficiencia', 'operador', 'maquina', 'otimizacao']
  const idx = Math.floor(Math.random() * mockAIInsights.length)
  return {
    ...mockAIInsights[idx],
    id: `ins-gen-${Date.now()}`,
    severity: severities[Math.floor(Math.random() * severities.length)],
    category: categories[Math.floor(Math.random() * categories.length)],
    confidence: 70 + Math.floor(Math.random() * 28),
    detectedAt: new Date(),
  }
}

/**
 * Returns mock production analysis for all sectors.
 * Future: Will analyze real production data from Supabase via OpenAI function calling.
 */
export function analyzeMockProduction(): SetorAnalytics[] {
  return mockSetorAnalytics.map((s) => ({
    ...s,
    eficiencia: s.eficiencia + Math.floor((Math.random() - 0.5) * 4),
  }))
}
