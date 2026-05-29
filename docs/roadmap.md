# Roadmap

*Esync ERP — Development Roadmap*
*Generated: 2026-05-29 | Based on current implementation state*

---

## Overview

The ERP frontend is functionally complete with mock data. The primary development path is: backend integration → authentication hardening → real-time capabilities → AI intelligence → SaaS expansion.

---

## Phase 1 — Critical (Pre-Production)

These items must be completed before any real production use.

### 1.1 Supabase Backend Integration

**What:** Replace all `src/mocks/*.ts` data sources with Supabase PostgreSQL.

**Scope:**
- Create database schema mapping all 14 mock data files to Supabase tables
- Migrate each `src/contexts/*.tsx` to call Supabase client instead of mocks
- Enable RLS (Row Level Security) policies per company and role
- Set up database migrations workflow

**Affected files:**
- `src/contexts/` (all 6 contexts)
- `src/mocks/` (all 14 files — replaced, not deleted)
- New: `src/lib/supabase/client.ts`, `src/lib/supabase/types.ts`

**Tables to create (minimum):**
`pecas`, `retalhos`, `programas`, `conjuntos`, `peca_conjunto`, `solicitacoes_producao`, `peca_solicitacao`, `os_distribuicao`, `tarefas_dobra`, `programas_cnc`, `peca_programa`, `estoque_itens`, `movimentos_estoque`, `maquinas`, `eventos_maquina`, `usuarios`, `cargos`, `import_audit_log`, `action_audit_log`

### 1.2 Real Authentication

**What:** Replace mock login with Supabase Auth.

**Scope:**
- `AuthContext.login()` → `supabase.auth.signInWithPassword()`
- `AuthContext.logout()` → `supabase.auth.signOut()`
- Session from Supabase-managed cookies → server-side validation in middleware
- User lookup: `supabase.from('usuarios').select('*').eq('email', user.email)`
- `cargoId` from user record in Supabase

**Security fixes included:**
- Remove hardcoded `AuthUser` in login function
- Add server-side session validation to middleware
- Add `HttpOnly` session cookie

### 1.3 Import Password Security Fix

**What:** Move import password validation from client-side to server-side.

**Current:** `NEXT_PUBLIC_IMPORT_SECURITY_PASSWORD` (visible in browser bundle)

**Fix:**
```typescript
// In a new server action or API route:
const { data } = await supabase.rpc('validate_import_password', {
  pwd: password,
  empresa_id: user.empresaId
})
```

Remove `NEXT_PUBLIC_IMPORT_SECURITY_PASSWORD` entirely.

### 1.4 Audit Log Persistence

**What:** Move `ImportAuditEvent` and `ActionAuditEvent` from in-memory to Supabase.

Replace:
```typescript
_log.push(entry) // in importSecurity.ts
```

With:
```typescript
await supabase.from('import_audit_log').insert(entry)
await supabase.from('action_audit_log').insert(entry)
```

---

## Phase 2 — High Priority

Features needed for operational utility.

### 2.1 Full Dobra → Estoque Integration

**What:** When Dobra confirms a quantity, automatically create `EstoqueItem` entry.

**Currently:** `DobraContext` and `EstoqueContext` exist but the trigger is not fully wired.

**Scope:**
- `DobraContext.confirmQuantidade(id, quantidade)` → calls `EstoqueContext.entrada()`
- `EstoqueContext.entrada()` → Supabase insert to `movimentos_estoque` + upsert `estoque_itens`

### 2.2 Programação → Corte Integration

**What:** When a CNC program is concluded, automatically create Corte task records.

**Scope:**
- `ProgramacaoContext.conclude()` → `CorteContext.createFromPrograma(programa)`
- Corte page shows tasks with origin program reference
- Status updates flow back (Corte finished → triggers Dobra task creation)

### 2.3 Programação → Retalhos Integration

**What:** When `ProgramaCNC.retalhoGerado.gerou === true`, create `Retalho` record.

**Scope:**
- On program conclusion: if `retalhoGerado.gerou`, call `RetalhoContext.addFromPrograma()`
- New `Retalho` with dimensions from `retalhoGerado` and `pecaOrigem` set

### 2.4 QR System Full Implementation

**What:** Make QR codes functional end-to-end.

**Scope:**
- `/produto/[codigo]` fetches real data from Supabase
- QR code for Conjuntos links to assembled product detail
- QR code for Peças links to part specification sheet
- QR scanner integration (mobile camera API) for shop floor use
- Print-ready QR label generation (PDF format)

### 2.5 Desenvolvimento → Conjuntos Integration

**What:** Auto-fill production request from Conjunto selection.

**Scope:**
- Nova Solicitação form: add Conjunto selector
- On selection + quantity input: run `SimulacaoItemEstoque`
- Auto-populate `pecas` list with only `quantidadeProduzir > 0` items
- Stock check display in form

### 2.6 Real-Time Machine Status

**What:** Live machine status updates on Dashboard and Máquinas page.

**Scope:**
- Supabase Realtime subscription on `maquinas` table
- `useEffect` with channel subscription in `MaquinasContext` (new context)
- Dashboard machine panel auto-updates without page refresh

---

## Phase 3 — Medium Priority

Operational improvements that increase value.

### 3.1 Esync IA — Real OpenAI Integration

**What:** Replace mock responses with real OpenAI API calls.

**Scope:**
- `npm install openai`
- `OPENAI_API_KEY` in `.env.local`
- Uncomment OpenAI call scaffold in `/api/ai/chat/route.ts`
- Write `SYSTEM_PROMPT_INDUSTRIAL` with ERP context
- Add conversation history (last N messages as context)
- Add rate limiting (e.g., 50 requests/day per user)
- Add auth validation in route handler

### 3.2 Esync IA — Auto-Insights

**What:** Background job that generates insights from real production data.

**Scope:**
- Supabase Edge Function (cron trigger) → query production data
- OpenAI function calling for structured analysis
- Insert insights to `ai_insights` table
- Dashboard shows live insight count badge

### 3.3 Solda Module Page

**What:** Create `/solda` page — `ModuleId` exists in permissions but no page.

**Scope:**
- `src/app/(dashboard)/solda/page.tsx`
- `src/types/solda.ts` — `TarefaSolda` type
- `src/contexts/SoldaContext.tsx`
- `src/mocks/solda.ts`
- Sidebar already has Solda in `ALL_MODULES` (add `NavItem`)

### 3.4 Relatórios — Real Data & Filters

**What:** Connect reports to real Supabase aggregations with date filters.

**Scope:**
- Date range picker on all report charts
- Supabase RPC functions for aggregation queries
- Per-module report drill-down
- Scheduled PDF report generation

### 3.5 Machine Maintenance Scheduling

**What:** Preventive maintenance calendar and alert system for machines.

**Scope:**
- `TarefaManutencao` type + `maquinas_manutencao` Supabase table
- Maintenance calendar view in `/maquinas`
- Alert generation when maintenance is due
- Integration with Esync IA for predictive recommendations

### 3.6 Notifications System

**What:** Persistent, real-time notifications delivered across all modules.

**Scope:**
- `notificacoes` Supabase table with RLS per user
- Supabase Realtime subscription in Topbar
- Mark as read (persistent)
- Types: stock critical, OS delayed, machine down, import completed

### 3.7 Mobile-Responsive Optimization

**What:** Make the ERP usable on mobile devices for shop floor access.

**Scope:**
- Sidebar: full overlay on mobile with swipe gesture
- Tables: horizontal scroll or card layout on mobile
- Modals: full-screen on small screens
- QR scanner: camera API for part lookup
- Offline mode (PWA) for basic read access without internet

---

## Phase 4 — Future Expansion

Strategic features for SaaS and enterprise scale.

### 4.1 SaaS Multi-Company Architecture

**What:** Support multiple independent companies on the same infrastructure.

**Scope:**
- `empresas` Supabase table (company registry)
- `empresaId` on all domain entities
- RLS policies: `empresa_id = auth.jwt()→>'empresa_id'`
- Subdomain or path-based company routing (`company-a.esync.io` or `/e/company-a`)
- Company-level configuration (logo, name, departments, custom machine list)
- Super-admin panel for company management

**Already prepared:** `AuthUser.empresaId` field exists; `ImportAuditEvent` has `// Future: empresaId` comment.

### 4.2 Billing & Subscription Management

**What:** SaaS subscription billing for multi-company deployment.

**Scope:**
- Integration with Stripe (or similar)
- Plan tiers: Basic (X modules), Professional (all modules), Enterprise (custom)
- Module feature flags per plan
- Usage metering (AI tokens, active users, imported records)
- Invoice generation and payment history

### 4.3 Autodesk Inventor Integration

**What:** Connect 3D CAD data to the ERP for automatic part properties sync.

**Scope:**
- `Peca.arquivo3d` links to Inventor .ipt or .iam files
- REST API integration with Autodesk Platform Services (APS/Forge)
- Auto-sync: weight, area, volume from model properties
- 3D model viewer embedded in part detail page
- BOM extraction from assembly files to auto-populate Conjuntos

### 4.4 Machine Sensor Integration (IoT)

**What:** Real-time machine data from physical sensors.

**Scope:**
- MQTT or webhook integration for machine status events
- Auto-update `EventoMaquina` on sensor triggers
- OEE calculation from real sensor data
- Alert generation on machine downtime
- Integration with Esync IA for predictive maintenance

### 4.5 AI — Production Intelligence

**What:** Proactive AI-driven production optimization.

**Scope:**
- Bottleneck prediction (before it becomes critical)
- OS scheduling optimization (sequence to minimize setup time)
- Material yield optimization (nesting suggestions)
- Demand forecasting from order history
- Operator skill matching to task complexity

### 4.6 Client Portal

**What:** Read-only portal for clients to track their orders.

**Scope:**
- Public URL per `SolicitacaoProducao` (secure token)
- Status tracking page with timeline
- Document download (drawings, reports)
- No ERP internal data exposed

### 4.7 Financial Module

**What:** Basic cost tracking and financial reporting.

**Scope:**
- Material cost per part (from Estoque entries)
- Labor cost per OS (from time tracking in Dobra/Corte)
- Margin calculation per Conjunto
- Cost report per client/project
- Integration with accounting software (future)

### 4.8 Email & Push Notifications

**What:** Alerts delivered outside the application.

**Scope:**
- Email: stock critical alerts, OS status changes, import summaries
- Push notifications (PWA): machine downtime, task assignments
- Notification preferences per user role
- Daily digest email for supervisors
