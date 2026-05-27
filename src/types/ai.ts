// ─── Esync IA — Type Definitions ─────────────────────────────────────────────
// All AI-related types for the Esync IA intelligence module.
// Architecture prepared for future OpenAI API integration.

// ─── Enums ────────────────────────────────────────────────────────────────────

export type AIModel =
  | 'gpt-5-mini'
  | 'gpt-5'
  | 'gpt-4.1'
  | 'claude-3-5'
  | 'gemini-2.0'

export type AIStatus = 'online' | 'offline' | 'syncing' | 'analyzing'

export type InsightSeverity = 'critical' | 'warning' | 'info' | 'success'

export type InsightCategory =
  | 'gargalo'
  | 'estoque'
  | 'eficiencia'
  | 'operador'
  | 'maquina'
  | 'otimizacao'
  | 'tendencia'

export type AnalysisType =
  | 'Análise de Setor'
  | 'Análise de OS'
  | 'Análise de Estoque'
  | 'Análise de Eficiência'
  | 'Análise de Operador'
  | 'Análise Geral'
  | 'Detecção de Gargalo'

// ─── Chat ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  analysisType?: AnalysisType
  isLoading?: boolean
}

// ─── Insights ─────────────────────────────────────────────────────────────────

export interface AIInsight {
  id: string
  title: string
  description: string
  severity: InsightSeverity
  category: InsightCategory
  recommendation: string
  setor?: string
  impact: string
  /** 0–100 confidence score */
  confidence: number
  detectedAt: Date
}

// ─── History ──────────────────────────────────────────────────────────────────

export interface AIHistoryEntry {
  id: string
  pergunta: string
  usuario: string
  data: Date
  /** ms */
  tempoResposta: number
  tipoAnalise: AnalysisType
  tokensUsed: number
}

// ─── Config ───────────────────────────────────────────────────────────────────

export interface AIConfig {
  model: AIModel
  maxTokens: number
  /** 0.0 – 2.0 */
  temperature: number
  dailyLimit: number
  autoInsights: boolean
  autoAnalysis: boolean
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export interface AIActivityItem {
  id: string
  message: string
  type: 'analyzing' | 'detected' | 'suggestion' | 'warning' | 'success'
  timestamp: Date
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface SetorAnalytics {
  setor: string
  tempoMedio: number     // min
  eficiencia: number     // 0–100
  gargalo: boolean
  tendencia: 'up' | 'down' | 'stable'
  capacidade: number     // 0–100
}

// ─── Future API payload shapes ────────────────────────────────────────────────
// These interfaces define the contract with future backend routes.
// /app/api/ai/chat will accept ChatRequest and return ChatResponse.

export interface AIChatRequest {
  message: string
  /** Conversation context (last N messages) */
  context?: Pick<ChatMessage, 'role' | 'content'>[]
  model?: AIModel
}

export interface AIChatResponse {
  response: string
  analysisType: AnalysisType
  tokensUsed: number
  model: AIModel
  durationMs: number
}
