# Technical Debt

*Esync ERP — Known Limitations, Temporary Implementations & Improvement Backlog*
*Last reviewed: 2026-05-29*

---

## 1. Temporary Implementations

These are intentional placeholders with clear upgrade paths. They are not bugs — they are scaffolding.

### 1.1 Hardcoded Login

**Location:** `src/contexts/AuthContext.tsx:108`

```typescript
const authUser: AuthUser = {
  id:        'user-001',
  nome:      'João Dias',
  email:     credentials.email,
  cargoId:   'mecanica',
  empresaId: 'empresa-001',
}
```

Any email/password logs in as the same admin user. Intentional for development — zero friction prototype.

**Risk:** HIGH — cannot be shipped to production.

**Fix:** Replace with `supabase.auth.signInWithPassword()` + user lookup from `usuarios` table.

---

### 1.2 Import Password in Browser Bundle

**Location:** `src/lib/security/importSecurity.ts:11`

```typescript
const expected = process.env.NEXT_PUBLIC_IMPORT_SECURITY_PASSWORD
```

`NEXT_PUBLIC_` variables are embedded in the JavaScript bundle served to browsers. The import password is readable by any user who opens browser DevTools.

**Risk:** HIGH — security vulnerability.

**Fix:** Move to server-side RPC: `supabase.rpc('validate_import_password', { pwd, empresa_id })`. Remove the `NEXT_PUBLIC_` var entirely.

---

### 1.3 In-Memory Audit Log

**Location:** `src/lib/security/importSecurity.ts:25-28`

```typescript
const _log: ImportAuditEvent[] = []
// ...
_log.push(entry)
```

Both `_log` and `_actionLog` are module-level arrays. They reset on every server restart and are invisible to other server instances (breaks in multi-server deployments).

**Risk:** MEDIUM — compliance gap; audit trail is not persistent.

**Fix:** `supabase.from('import_audit_log').insert(entry)` replacing both push calls.

---

### 1.4 All Mock Data

**Location:** `src/mocks/*.ts` (14 files)

All data displayed in the UI comes from static in-memory arrays. Every page refresh resets state. Changes are lost when the browser tab closes.

**Risk:** MEDIUM (for dev), CRITICAL (for production).

**Fix:** Phase 1 of roadmap — migrate each context to Supabase queries.

**Affected mocks:**
| File | Context | Tables (future) |
|------|---------|----------------|
| `pecas.ts` | — (direct) | `pecas` |
| `maquinas.ts` | — (direct) | `maquinas`, `eventos_maquina` |
| `retalhos.ts` | — (direct) | `retalhos` |
| `programas.ts` | — (direct) | `programas` |
| `conjuntos.ts` | `ConjuntosContext` | `conjuntos`, `peca_conjunto`, `historico_conjuntos` |
| `desenvolvimento.ts` | `DesenvolvimentoContext` | `solicitacoes_producao`, `peca_solicitacao`, `tarefas_desenvolvimento` |
| `dobra.ts` | `DobraContext` | `tarefas_dobra`, `pausas_dobra` |
| `programacao.ts` | `ProgramacaoContext` | `programas_cnc`, `peca_programa`, `historico_prog` |
| `estoque.ts` | `EstoqueContext` | `estoque_itens`, `movimentos_estoque` |
| `dashboard.ts` | — (direct) | Supabase aggregations |
| `usuarios.ts` | — (direct) | `usuarios` |
| `cargos.ts` | `AuthContext` | `cargos` |
| `ai.ts` | — (direct) | `ai_insights`, generated |

---

### 1.5 AI Chat Returns Mock Response

**Location:** `src/app/api/ai/chat/route.ts:53-61`

The API route returns a hardcoded mock string after a 600ms `setTimeout`. No real AI call is made.

**Risk:** LOW (for now) — clearly documented, intentional placeholder.

**Fix:** Uncomment OpenAI scaffold, set `OPENAI_API_KEY`, write system prompt.

---

### 1.6 Client-Side Session Validation Only

**Location:** `src/middleware.ts` + `src/contexts/AuthContext.tsx`

The middleware only redirects `/login` → `/dashboard` based on a cookie. Dashboard protection is entirely client-side (AuthContext `isAuthenticated` check). A motivated attacker could bypass by manipulating client state.

**Risk:** MEDIUM — mitigated by the fact that the mock data is not sensitive; CRITICAL after real data.

**Fix:** After Supabase Auth integration, validate JWT in middleware for all `/dashboard/**` routes.

---

## 2. Mock Data Still Present

Summary of mock data that needs to be replaced before production:

| Mock File | Data | Status |
|-----------|------|--------|
| `cargos.ts` | 7 preset roles with permissions | Replace with Supabase query; keep presets as seed data |
| `usuarios.ts` | Sample users | Replace with Supabase Auth users |
| `dashboard.ts` | KPI values and chart data | Replace with Supabase aggregation queries |
| `ai.ts` | Pre-built insights and sector analytics | Replace with OpenAI-generated insights |
| `maquinas.ts` | Machine registry and timeline | Replace with real sensor/manual data |

---

## 3. Missing Module: Solda (Welding)

**Location:** `src/types/permissions.ts` — `'solda'` is a valid `ModuleId`

The welding sector exists in the permission system and is assigned full access to the `producao` role, but there is no:
- `src/app/(dashboard)/solda/page.tsx`
- `src/types/solda.ts`
- `src/contexts/SoldaContext.tsx`
- `src/mocks/solda.ts`
- Nav item in `NAV_ITEMS`

**Risk:** LOW — no broken functionality; users with `solda` permission see nothing extra.

**Fix:** Implement Solda module following the same pattern as Dobra.

---

## 4. Partial Module Integrations

### 4.1 Dobra → Estoque
**Gap:** `DobraContext.confirmQuantidade()` should call `EstoqueContext.entrada()`. The context APIs exist but the call is not wired.

### 4.2 Programação → Retalhos
**Gap:** When `ProgramaCNC.retalhoGerado.gerou === true`, a new `Retalho` should be created in `RetalhoContext`. Not wired.

### 4.3 Programação → Corte
**Gap:** No Corte context or page task creation from concluded programs.

### 4.4 Desenvolvimento → Conjuntos
**Gap:** `ConjuntoRef` type exists in `desenvolvimento.ts` and `ConjuntoParaProducao` bridge exists in `conjuntos.ts`, but the Nova Solicitação form does not yet use them to auto-fill parts.

---

## 5. Security Improvements Required

| Issue | Severity | Fix |
|-------|---------|-----|
| Import password in browser bundle | HIGH | Move to server-side RPC |
| Any credentials = admin login | CRITICAL | Supabase Auth |
| No rate limiting on `/api/ai/chat` | HIGH | Add before production |
| No input sanitization before AI calls | HIGH | Sanitize in route.ts |
| `sessionStorage` sessions (not HttpOnly) | HIGH | Supabase cookies |
| No CSRF protection | MEDIUM | Next.js handles this partially; verify after Auth migration |
| No audit log for login events | MEDIUM | Add to Supabase Auth hooks |
| Cargo switcher in Topbar (dev only) | LOW | Remove before production |

---

## 6. Scalability Concerns

### 6.1 Table Rendering Performance
All tables render all rows without virtualization or pagination. Adequate for mock scale (< 200 rows) but will degrade significantly at 10,000+ records.

**Fix:** Add pagination (cursor-based for Supabase), or virtual scrolling with `@tanstack/react-virtual`.

### 6.2 Single Activity Log Store
`src/lib/activity/activityLog.ts` uses a module-level array. In a multi-user Supabase environment, this must become a database table with user attribution.

### 6.3 No Connection Pooling
After Supabase integration, ensure the client uses the anon key with RLS (not service role) and that connection limits are respected. Use Supabase's connection pooler (pgBouncer) for production.

### 6.4 Context Over-Fetching
Currently all mock data is loaded at context initialization. After Supabase migration, implement:
- Pagination for list queries
- `React Query` or `SWR` for caching + stale-while-revalidate
- Lazy loading for module data (only fetch when module is visited)

---

## 7. Performance Improvements

| Item | Impact | Effort |
|------|--------|--------|
| Table virtualization for large datasets | HIGH | MEDIUM |
| React Query / SWR for data caching | HIGH | MEDIUM |
| `next/image` for all avatar/asset images | LOW | LOW |
| Code splitting per module route | MEDIUM | LOW (Next.js auto) |
| Recharts chart data memoization | LOW | LOW |
| Sidebar Framer Motion optimization | LOW | LOW |

---

## 8. Architecture Improvements

### 8.1 Shared Type for OS Distribution
`OsDistribuicao` (in `desenvolvimento.ts`) and `OSDistribuicaoProg` (in `programacao.ts`) are structurally identical but defined separately to avoid circular imports. After module refactoring, consolidate into a shared `src/types/shared.ts`.

### 8.2 No Error Boundaries
No React error boundaries defined. A runtime error in one module will crash the entire app.

**Fix:** Add `ErrorBoundary` wrappers per route group.

### 8.3 No Loading Skeletons
Pages render empty state until context data loads. After Supabase, async data loading will be visible. Add `Suspense` + skeleton components per page.

### 8.4 Cargo Switcher is a Dev Tool
The Topbar includes a Cargo switcher that lets any user impersonate any role. This is a development convenience feature that must be removed (or restricted to `isAdmin`) before production.

**Location:** `src/components/layout/Topbar.tsx`

### 8.5 No Test Coverage
Zero automated tests. Before production:
- Unit tests for business logic in `src/lib/` (validators, code generators, simulators)
- Integration tests for contexts
- E2E tests for critical paths (login, import, OS creation flow)

---

## 9. Code Quality Notes

| Item | Location | Note |
|------|----------|------|
| `analytics.ts` underused | `src/lib/analytics.ts` | File exists but utility unclear; may overlap with `dashboard/metrics.ts` |
| `globals.css` in app root | `src/app/globals.css` | Appears to be a redirect to `src/styles/globals.css`; verify or remove |
| `next.config.ts` empty | `next.config.ts` | Config options commented out — add `images.domains` after Supabase storage |
| `tailwind.config.ts` minimal | `tailwind.config.ts` | Intentional (Tailwind v4 config is in globals.css) — document this clearly |
