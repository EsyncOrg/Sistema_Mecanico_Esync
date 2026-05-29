# Esync IA (AI Intelligence Module)

*Esync ERP — AI Module Reference*

---

## 1. Purpose

Esync IA is the artificial intelligence layer of the ERP. It provides:
- An interactive chat interface for operational queries
- Pre-computed production insights (bottleneck detection, efficiency analysis)
- Sector performance analytics with trend detection
- Activity feed of AI-generated observations

All AI responses are currently mocked. The architecture is prepared for real OpenAI API integration.

**Route:** `/esync-ia`
**Module ID:** `esync_ia`
**Access:** `mecanica` only (admin) — most sensitive module

---

## 2. Architecture Overview

```
UI (esync-ia page)
    ↓ user message
src/lib/ai/index.ts (getMockAIResponse)
    ↓ keyword matching → mock response
Response displayed in chat

─── Future ───

UI (esync-ia page)
    ↓ user message
POST /api/ai/chat (route.ts)
    ↓ OpenAI API call (server-side)
ChatCompletion response
    ↓
Response displayed in chat
```

---

## 3. Type System (`src/types/ai.ts`)

### Core Types

```typescript
type AIModel =
  | 'gpt-5-mini'
  | 'gpt-5'
  | 'gpt-4.1'
  | 'claude-3-5'
  | 'gemini-2.0'

type AIStatus = 'online' | 'offline' | 'syncing' | 'analyzing'

type InsightSeverity = 'critical' | 'warning' | 'info' | 'success'

type InsightCategory =
  | 'gargalo'
  | 'estoque'
  | 'eficiencia'
  | 'operador'
  | 'maquina'
  | 'otimizacao'
  | 'tendencia'

type AnalysisType =
  | 'Análise de Setor'
  | 'Análise de OS'
  | 'Análise de Estoque'
  | 'Análise de Eficiência'
  | 'Análise de Operador'
  | 'Análise Geral'
  | 'Detecção de Gargalo'
```

### Chat

```typescript
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  analysisType?: AnalysisType
  isLoading?: boolean
}
```

### Insights

```typescript
interface AIInsight {
  id: string
  title: string
  description: string
  severity: InsightSeverity
  category: InsightCategory
  recommendation: string
  setor?: string
  impact: string
  confidence: number     // 0–100
  detectedAt: Date
}
```

### Analytics

```typescript
interface SetorAnalytics {
  setor: string
  tempoMedio: number     // minutes
  eficiencia: number     // 0–100
  gargalo: boolean
  tendencia: 'up' | 'down' | 'stable'
  capacidade: number     // 0–100
}
```

### History

```typescript
interface AIHistoryEntry {
  id: string
  pergunta: string
  usuario: string
  data: Date
  tempoResposta: number  // ms
  tipoAnalise: AnalysisType
  tokensUsed: number
}
```

### Config

```typescript
interface AIConfig {
  model: AIModel
  maxTokens: number
  temperature: number    // 0.0 – 2.0
  dailyLimit: number
  autoInsights: boolean
  autoAnalysis: boolean
}
```

---

## 4. Mock AI Service (`src/lib/ai/index.ts`)

### Response Bank

7 keyword-matched analysis templates:

| Trigger Keywords | Analysis Type | Key Content |
|----------------|--------------|-------------|
| `dobra`, `dobramento`, `bend` | Análise de Setor | Setup time 22min (+29%), queue 7 pieces, efficiency 71%, tooling changes |
| `corte`, `laser`, `plasma`, `cnc` | Análise de Setor | 42 pieces/shift (overloaded +20%), LASER-001 at 102%, nesting at 67% |
| `gargalo`, `bottleneck`, `atraso` | Detecção de Gargalo | Full cross-sector scan with priority ranking and remediation plan |
| `estoque`, `inventário`, `reposição` | Análise de Estoque | 847 SKUs, 12 critical items, 34 excess items, reorder recommendations |
| `os`, `os:`, `1508` | Análise de OS | OS time ranking table, OS:1508 detailed breakdown (+34% above average) |
| `eficiência`, `performance` | Análise de Eficiência | Per-sector and per-operator efficiency table, gap to 85% target |
| `operador`, `equipe` | Análise de Operador | 6-operator ranking table (Carlos Mendes 94%, Paulo Santos ↓74%) |
| *(default)* | Análise Geral | Executive summary: 75.4% global efficiency, all active alerts, opportunities |

### Service Functions

```typescript
getMockAIResponse(input: string): {
  response: string
  analysisType: AnalysisType
  delayMs: number        // 800–2000ms simulated latency
}

generateMockInsight(): AIInsight
// Returns random insight from mockAIInsights with randomized severity/confidence/timestamp

analyzeMockProduction(): SetorAnalytics[]
// Returns mockSetorAnalytics with ±2% random efficiency variation
```

---

## 5. API Route (`src/app/api/ai/chat/route.ts`)

**Endpoint:** `POST /api/ai/chat`

**Current behavior:** Returns mock response after 600ms delay.

**Request format:**
```typescript
interface AIChatRequest {
  message: string
  context?: Pick<ChatMessage, 'role' | 'content'>[]
  model?: AIModel
}
```

**Response format:**
```typescript
interface AIChatResponse {
  response: string
  analysisType: AnalysisType
  tokensUsed: number    // 0 in mock
  model: AIModel
  durationMs: number
}
```

**Input validation:** Empty message returns `400 { error: 'Mensagem inválida' }`.

### Future OpenAI Integration

The route has the full OpenAI integration scaffolded in comments:

```typescript
// Future — uncomment after npm install openai:
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const completion = await openai.chat.completions.create({
  model: process.env.AI_MODEL || 'gpt-5-mini',
  max_tokens: 2048,
  temperature: 0.7,
  messages: [
    { role: 'system', content: SYSTEM_PROMPT_INDUSTRIAL },
    ...(body.context || []),
    { role: 'user', content: message },
  ],
})
```

**Required before activation:**
1. `npm install openai`
2. Set `OPENAI_API_KEY` in `.env.local` (server-side, never `NEXT_PUBLIC_`)
3. Set `AI_MODEL` env var (optional, defaults to `gpt-5-mini`)
4. Add rate limiting middleware
5. Add user authentication validation in route handler
6. Add input sanitization before sending to OpenAI
7. Write `SYSTEM_PROMPT_INDUSTRIAL` system prompt with ERP context

---

## 6. Module UI Features

### Chat Interface
- Message input with send button
- Message history with role-differentiated bubbles (user right, assistant left)
- Loading state with typing indicator (`isLoading: true` on assistant message)
- `analysisType` shown as badge on assistant messages
- Markdown rendering for formatted AI responses (bold, bullet lists, tables)

### Insights Panel
- Pre-generated `AIInsight[]` cards
- Severity-colored (critical=red, warning=amber, info=blue, success=green)
- Confidence score display (0–100%)
- Category badge
- Recommendation text

### Sector Analytics
- `SetorAnalytics[]` for all production sectors
- Efficiency gauge per sector
- Trend indicator (up/down/stable)
- Bottleneck flag (boolean → highlighted)

### Activity Feed
- `AIActivityItem[]` — chronological AI activity log
- Types: `analyzing`, `detected`, `suggestion`, `warning`, `success`

### History
- `AIHistoryEntry[]` — past questions with response times and analysis types
- Useful for reviewing what the team has asked the AI

---

## 7. Security Rules

1. All AI API calls must be **server-side only** — route.ts is the only allowed call site
2. `OPENAI_API_KEY` must **never** appear in client-side code or `NEXT_PUBLIC_` env vars
3. Rate limiting **required** before production deployment
4. User authentication **must** be validated inside route handler before processing
5. Input sanitization **required** before sending any user text to OpenAI
6. Response content filtering for any sensitive production data in system prompt

---

## 8. Mock Data (`src/mocks/ai.ts`)

- `mockAIInsights: AIInsight[]` — pre-built insight dataset covering all categories
- `mockSetorAnalytics: SetorAnalytics[]` — sector analytics for corte, dobra, solda, desenvolvimento

---

## 9. Planned AI Capabilities (Future)

| Capability | Technical Approach |
|-----------|-------------------|
| Real chat with production context | OpenAI GPT with system prompt including current day's data |
| Auto-generated insights | Scheduled job: query Supabase → GPT function calling → insert to insights table |
| Bottleneck detection | Supabase aggregation → GPT analysis → alert generation |
| Stock forecast | Historical movement data → GPT time-series analysis |
| OS time prediction | Past OS data → fine-tuned model or few-shot prompting |
| Operator coaching | Per-operator efficiency trends → personalized recommendations |
| Nesting optimization | Sheet + parts dimensions → OpenAI function calling with nesting algorithm |

---

## 10. Pending Improvements

| Feature | Priority |
|---------|---------|
| Real OpenAI API integration in route.ts | Critical |
| Industrial system prompt with ERP context | Critical |
| Rate limiting on /api/ai/chat | Critical (security) |
| Auth validation in route handler | Critical (security) |
| Multi-turn conversation with context window | High |
| Auto-insights generation from real data | High |
| Token usage tracking and daily limit enforcement | Medium |
| Model selection in AIConfig UI | Medium |
| Chat history persistence (Supabase) | Medium |
| Export conversation as PDF | Low |
