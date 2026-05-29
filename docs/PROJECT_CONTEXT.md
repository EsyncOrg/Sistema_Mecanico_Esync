# FORGE ERP — PROJECT CONTEXT
**Persistent AI context file. Include this at the start of every new chat.**
*Last updated: 2026-05-29 | Build: clean (0 TS errors, 0 ESLint errors)*

---

## 1. IDENTITY

| Field | Value |
|-------|-------|
| App Name | **Esync** (constant: `APP_NAME = 'Esync'`) |
| Brand | FORGE ERP (external branding) |
| Description | `Sistema Mecânico de Gestão` |
| Version | `1.0.0` |
| Language | Brazilian Portuguese (full PT-BR UI — all labels, modals, messages) |
| Target | Mechanical/manufacturing SMBs |
| Status | Frontend complete with mock data. Backend (Supabase) not yet connected. |

---

## 2. TECH STACK

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 15.5.18 | App Router, `src/` directory |
| Language | TypeScript 5 | Strict mode, no `any` |
| Styling | Tailwind CSS v4 | `@tailwindcss/postcss`, theme in `globals.css` |
| UI Primitives | Radix UI | avatar, dialog, dropdown, label, scroll-area, separator, slot, tooltip |
| Animation | Framer Motion 12.40 | Sidebar, page transitions |
| Icons | Lucide React 1.16 | All icons from this library only |
| Charts | Recharts 3.8 | Dashboard, relatorios |
| Dark Mode | next-themes 0.4 | Class-based `.dark` strategy |
| Export | xlsx 0.18, jsPDF 4.2, jsPDF-autotable 5.0 | XLSX, CSV, PDF generation |
| Import | react-dropzone 15, xlsx | Drag-drop + parse |
| QR Codes | qrcode 1.5 | Part/assembly QR generation |
| Utilities | clsx, tailwind-merge, class-variance-authority | Class utilities |

**Critical Tailwind v4 note:** Theme config lives exclusively in `src/styles/globals.css` via `@theme {}`. Do NOT use `tailwind.config.ts` for custom tokens. All design tokens use Tailwind v4 CSS variable convention (`--color-primary`, `--color-accent`, etc.).

---

## 3. ARCHITECTURE OVERVIEW

```
src/
├── app/
│   ├── (auth)/login/           # Unauthenticated route group — no layout
│   ├── (dashboard)/            # Authenticated route group — Sidebar + Topbar
│   │   ├── layout.tsx          # Shared layout wrapper with auth guard
│   │   └── [module]/page.tsx   # One page.tsx per module
│   ├── api/ai/chat/route.ts    # Server-side AI chat API (currently mock)
│   ├── produto/[codigo]/       # Dynamic QR product detail (public)
│   └── layout.tsx / page.tsx   # Root layout + splash
├── components/
│   ├── dashboard/              # Dashboard-specific modals (3)
│   ├── layout/                 # Sidebar.tsx, Topbar.tsx
│   ├── providers/              # ThemeProvider.tsx
│   ├── qr/                     # ProductQRModal.tsx
│   ├── shared/                 # 16 reusable page-level components
│   └── ui/                     # 14 atomic Radix-based components
├── contexts/                   # One React Context per data domain (6)
├── hooks/                      # useMediaQuery.ts, useSidebar.ts
├── lib/                        # Business logic + subsystems
│   ├── activity/               # Activity log
│   ├── ai/                     # Mock AI response bank
│   ├── alerts/                 # Alert creation + retrieval
│   ├── dashboard/              # KPI computation
│   ├── import-export/          # Full import/export pipeline (5 files)
│   ├── pecas/                  # Code generator, gauge map
│   ├── qr/                     # QR code generation
│   └── security/               # Import password + audit log
├── mocks/                      # 14 in-memory mock data files
├── styles/globals.css          # Tailwind @theme design tokens
└── types/                      # 9 TypeScript domain type files
```

**Route groups:**
- `(auth)` → only `/login` — no sidebar, no topbar
- `(dashboard)` → all authenticated pages — Sidebar + Topbar injected by `layout.tsx`

**Data flow (current):**
```
Page → React Context → src/mocks/*.ts (in-memory)
```

**Data flow (planned):**
```
Page → React Context → Supabase Client → PostgreSQL
```

---

## 4. DESIGN SYSTEM

Defined in `src/styles/globals.css` via `@theme {}`.

### Light Mode Tokens
| CSS Variable | HSL | Hex | Usage |
|-------------|-----|-----|-------|
| `--color-background` | `hsl(220 18% 97%)` | #f5f7fa | Page background |
| `--color-foreground` | `hsl(231 22% 20%)` | #282a3d | Body text |
| `--color-card` | `hsl(0 0% 100%)` | #ffffff | Card surfaces |
| `--color-primary` | `hsl(192 72% 21%)` | #0f4c5c | Teal — buttons, badges |
| `--color-secondary` | `hsl(231 22% 22%)` | #2b2d42 | Dark navy — headers |
| `--color-accent` | `hsl(240 100% 25%)` | #000080 | Navy — sidebar badge, ring |
| `--color-muted` | `hsl(220 16% 93%)` | #eceff4 | Muted backgrounds |
| `--color-border` | `hsl(220 14% 90%)` | #e2e6ee | Component borders |
| `--color-success` | `hsl(158 64% 38%)` | — | Success states |
| `--color-warning` | `hsl(38 92% 50%)` | — | Warning states |
| `--color-destructive` | `hsl(0 84% 60%)` | — | Error/delete states |

### Dark Mode Overrides (`.dark` class)
| Variable | Hex | Notes |
|----------|-----|-------|
| background | #21252b | Dark graphite |
| card | #272c32 | Elevated surface |
| primary | #2fafcc | Brighter teal for legibility |
| accent | #2e4fd4 | Visible navy on dark |
| foreground | #d8dce8 | Crisp readable text |

### Sidebar (`:root` custom props, outside `@theme`)
- Background: `linear-gradient(180deg, #515151 0%, #424242 100%)`
- Inactive text: `rgba(255,255,255,0.58)` | Active text: `#ffffff`
- Active bg: `rgba(255,255,255,0.13)` | Hover bg: `rgba(255,255,255,0.07)`
- Badge bg: `#000080` (navy)

### Typography
- Font sans: Geist Sans → Inter → system-ui
- Font mono: Geist Mono → monospace

### Animations
- `fade-in`: 0.4s ease-out — page entry
- `slide-in-left`: 0.3s ease-out — sidebar items
- `shimmer`: 2s infinite — skeleton loaders
- Theme transitions: 180ms on all theme-sensitive properties

### Utility Classes
- `.card-elevated` — shadow + border + hover lift
- `.dark .glow-primary` / `.glow-accent` — neon glow effects

---

## 5. MODULE STRUCTURE

15 navigation modules + 1 dynamic route:

| Module | Route | Module ID | Icon |
|--------|-------|-----------|------|
| Dashboard | `/dashboard` | `dashboard` | LayoutDashboard |
| Desenvolvimento | `/desenvolvimento` | `desenvolvimento` | Lightbulb |
| Programação | `/programacao` | `programacao` | Workflow |
| Produtos | `/conjuntos` | `conjuntos` | Boxes |
| Corte | `/corte` | `corte` | Scissors |
| Dobra | `/dobra` | `dobra` | FoldVertical |
| Máquinas | `/maquinas` | `maquinas` | Cpu |
| Peças | `/pecas` | `pecas` | Package |
| Retalhos | `/retalhos` | `retalhos` | Layers |
| Programas | `/programas` | `programas` | Code2 |
| Estoque | `/estoque` | `estoque` | Warehouse |
| Relatórios | `/relatorios` | `relatorios` | BarChart3 |
| Esync IA | `/esync-ia` | `esync_ia` | Brain |
| Usuários | `/usuarios` | `usuarios` | Users |
| Configurações | `/configuracoes` | `configuracoes` | Settings |
| Produto Detail | `/produto/[codigo]` | — (public) | — |

There is also `solda` as a `ModuleId` (welding sector) that exists in the permission system but does not yet have a dedicated page.

---

## 6. PERMISSION SYSTEM

### Roles (Cargos) — 7 defined in `src/mocks/cargos.ts`

| ID | Name | Admin | Description |
|----|------|-------|-------------|
| `mecanica` | Mecânica | ✓ | Full access — manages users, roles, all operations |
| `operador_corte` | Operador Corte | — | Full corte + view-only dashboard/desenvolvimento |
| `pcp` | PCP | — | Full programacao + conjuntos + programas; view others |
| `engenharia` | Engenharia | — | Full desenvolvimento + programacao + pecas + programas |
| `producao` | Produção | — | Full corte + dobra + solda + estoque; view others |
| `qualidade` | Qualidade | — | Full relatorios; view pecas, retalhos, dobra, estoque |
| `administrativo` | Administrativo | — | Full configuracoes; view dashboard + relatorios |

### Permission Structure
Each `Cargo` has a `permissoes: PermissionsMap` where every `ModuleId` maps to `{ visualizacao: boolean, edicao: boolean }`.

### RBAC Enforcement Points
1. `src/components/shared/PermissionGate.tsx` — wraps UI sections; renders `BlockedAccess.tsx` if denied
2. `src/contexts/AuthContext.tsx` — exposes `canView(module)`, `canEdit(module)`, `canExport(module)`, `isAdmin()`
3. `isAdmin` users (`mecanica` cargo) bypass all permission checks via `currentCargo.isAdmin === true`

### Authentication Flow
- Login: any email/password accepted (mock) → creates `AuthUser` hardcoded as `João Dias / cargoId: 'mecanica'`
- Session stored in `sessionStorage` key `forge-erp-session` + cookie `forge_erp_session`
- Cookie used only by `src/middleware.ts` to redirect `/login` → `/dashboard` when already authenticated
- Dashboard protection is client-side only (AuthContext + layout guard)
- **Limitation:** Any email/password logs in as the same admin user — full credential check pending Supabase Auth

---

## 7. CODING STANDARDS

- **TypeScript strict** — no `any`, all props/returns typed
- **Named exports only** from `lib/` files — no default exports
- **One component per file** — filename = PascalCase component name
- **Page files** — always named `page.tsx`
- **Context pattern** — every data domain has a dedicated Context in `src/contexts/`
- **No inline styles** — Tailwind utility classes exclusively
- **No comments** unless the WHY is non-obvious (invariant, workaround, future hook)
- **Hooks** — `use` prefix, camelCase, one concern per file
- **Context files** — `*Context.tsx`, export `use*` hook + Provider

---

## 8. NAMING CONVENTIONS

| Entity | Convention | Example |
|--------|-----------|---------|
| Components | PascalCase | `NovaPecaModal.tsx` |
| Hooks | `use` prefix camelCase | `useSidebar.ts` |
| Contexts | PascalCase + `Context` | `AuthContext.tsx` |
| Utility functions | camelCase | `generatePartCode()` |
| Types/Interfaces | PascalCase | `Peca`, `StatusMaquina` |
| Constants | SCREAMING_SNAKE_CASE | `APP_NAME`, `NAV_ITEMS` |
| CSS tokens | kebab-case `--color-` prefix | `--color-primary` |
| Route segments | lowercase PT words | `/pecas`, `/retalhos` |
| Module IDs | snake_case | `esync_ia`, `conjuntos` |

### Domain Vocabulary (Portuguese terms used in code)
| Code | Meaning |
|------|---------|
| `peca/pecas` | Part/parts |
| `retalho/retalhos` | Material scrap/remnant |
| `programa/programas` | NC program |
| `conjunto/conjuntos` | Assembly/product |
| `maquina/maquinas` | Machine/equipment |
| `solicitacao` | Production request |
| `programacao` | Scheduling/CNC programming |
| `desenvolvimento` | Production development |
| `estoque` | Inventory/stock |
| `dobra` | Sheet metal bending |
| `corte` | Cutting (laser/plasma/CNC) |
| `cargo` | Role/job title |
| `bitola` | Material gauge/thickness |
| `OS` | Ordem de Serviço (Service Order) |
| `PCP` | Planejamento e Controle da Produção |

---

## 9. SECURITY RULES

1. **Import password gate** — all imports require `NEXT_PUBLIC_IMPORT_SECURITY_PASSWORD` env var match; password validated in `src/lib/security/importSecurity.ts`
2. **RBAC via PermissionGate** — all sensitive UI wrapped; `edicao: true` required for mutations
3. **Audit logging** — all imports, edits, deletes logged to `ImportAuditEvent` / `ActionAuditEvent` in-memory; wired for Supabase persistence
4. **AI is server-side only** — `/api/ai/chat/route.ts` is the only API call site; `OPENAI_API_KEY` must never appear in client code
5. **No `any` in TypeScript** — prevents type-safety gaps
6. **Session cookies** — `HttpOnly` not yet set (sessions stored in `sessionStorage`); must fix before production

### Known Security Gaps (Pre-production Required)
- Import password currently in `NEXT_PUBLIC_` env var (visible in browser bundle) → must move to server-side RPC
- Session validation is client-only → must add server-side JWT verification
- No rate limiting on `/api/ai/chat` → required before production
- No input sanitization before AI calls → required before production
- Login accepts any credentials → must integrate Supabase Auth

---

## 10. ENVIRONMENT VARIABLES

| Variable | Usage | Scope |
|----------|-------|-------|
| `NEXT_PUBLIC_IMPORT_SECURITY_PASSWORD` | Import password gate | Public (browser) — must move to server |
| `OPENAI_API_KEY` | AI chat (future) | Server only — never `NEXT_PUBLIC_` |
| `AI_MODEL` | AI model ID (future) | Server only |
| `NEXT_PUBLIC_AI_ENABLED` | AI feature flag (future) | Public |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase (future) | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase (future) | Public |

---

## 11. IMPORT/EXPORT SYSTEM

**Pipeline:** `ImportModal` → `ImportPasswordModal` → parser → auto-mapping → validator → context update → audit log

**4 supported import modules:** `pecas`, `programas`, `retalhos`, `estoque`

**Export formats:** XLSX (xlsx lib), CSV, PDF (jsPDF + autotable)

**Key files:**
- `src/lib/import-export/types.ts` — shared interfaces
- `src/lib/import-export/modules.ts` — per-module field aliases
- `src/lib/import-export/parser.ts` — XLSX/CSV parsing
- `src/lib/import-export/validator.ts` — `buildAutoMapping()` + `validateRows()`
- `src/lib/import-export/template.ts` — downloadable import templates
- `src/lib/security/importSecurity.ts` — password validation + audit log
- `src/lib/exportUtils.ts` — export generators

---

## 12. DASHBOARD INTEGRATIONS

The `/dashboard` page aggregates from:
- `src/lib/dashboard/metrics.ts` — KPI computation
- `src/lib/alerts/alertSystem.ts` — active alerts
- `src/lib/activity/activityLog.ts` — recent activity feed
- `src/mocks/maquinas.ts` — machine status panel
- Recharts `BarChart` — production chart

Dashboard modals: `DashboardAlertsModal`, `DashboardAtividadesModal`, `DashboardMaquinasModal`

---

## 13. PRODUCTION FLOW (INDUSTRIAL BUSINESS LOGIC)

The implemented production flow is:
```
Desenvolvimento (OS creation)
  ↓ sends SolicitacaoProducao
Programação (CNC program creation)
  ↓ ProgramaCNC with retalho/OS tracking
Corte (cutting operations)
  ↓ pieces cut
Dobra (bending operations)
  ↓ TarefaDobra with setup/production/pause tracking
  ↓ Confirms quantity → updates Estoque
Solda (welding — module ID exists, page pending)
```

Key business invariants enforced in types:
- `sum(PecaSolicitacao.osDistribuicao[].quantidade) === PecaSolicitacao.quantidade`
- `sum(PecaPrograma.osDistribuicao[].quantidade) === PecaPrograma.quantidade`
- `SimulacaoItemEstoque.quantidadeDisponivel + quantidadeProduzir === quantidadeNecessaria`

---

## 14. CONJUNTOS INTEGRATION CHAIN

Assembly → Production flow (partially implemented):
1. User selects a `Conjunto` + quantity
2. System runs `SimulacaoItemEstoque` — computes stock vs. production needs
3. `ConjuntoParaProducao` bridge links to `Desenvolvimento`
4. Future: auto-fills `SolicitacaoProducao.pecas` with multiplied quantities
5. Future: routes only missing quantities to production sectors

---

## 15. CONTEXTS REFERENCE

| Context | File | Manages |
|---------|------|---------|
| `AuthContext` | `contexts/AuthContext.tsx` | User session, RBAC, login/logout |
| `ConjuntosContext` | `contexts/ConjuntosContext.tsx` | Assemblies CRUD + simulation |
| `DesenvolvimentoContext` | `contexts/DesenvolvimentoContext.tsx` | Production requests CRUD |
| `DobraContext` | `contexts/DobraContext.tsx` | Bending tasks + setup/production timing |
| `EstoqueContext` | `contexts/EstoqueContext.tsx` | Inventory + stock movements |
| `ProgramacaoContext` | `contexts/ProgramacaoContext.tsx` | CNC programs + scheduling |

---

## 16. KNOWN LIMITATIONS

1. **All data is in-memory** — every page refresh resets state to mock data
2. **Single user session** — login always creates the same hardcoded admin user
3. **No persistence** — no database, no file system writes
4. **Import password** in browser bundle — insecure for production
5. **AI is mocked** — keyword-matching responses, no real OpenAI calls from `route.ts`
6. **No real-time** — machine status does not update live
7. **Solda module** — `ModuleId` exists in permissions, no dedicated page
8. **Audit log** — in-memory only, reset on server restart

---

## 17. FUTURE BACKEND (SUPABASE) PREPARATION

All code is architecture-ready for Supabase migration:
- Contexts expose identical CRUD interfaces — swap mock arrays for Supabase client calls
- `AuthContext` has `empresaId` field on `AuthUser` — multi-company ready
- `ImportAuditEvent` / `ActionAuditEvent` have `// Future: empresaId` comments
- `importSecurity.ts` has `// TODO: replace with supabase.rpc('validate_import_password')` comment
- API route `/api/ai/chat` has full OpenAI integration scaffold commented in place

---

## 18. SAAS/MULTI-COMPANY PREPARATION

- `AuthUser.empresaId` field exists on the user object
- `ImportAuditEvent` and `ActionAuditEvent` have `empresaId` as future fields
- Module IDs and permission maps are designed to be company-scoped
- No tenant isolation implemented yet — single-company mode only

---

## 19. KEY FILES QUICK REFERENCE

| Purpose | Path |
|---------|------|
| Design tokens | `src/styles/globals.css` |
| Core domain types | `src/types/index.ts` |
| Permission types + ALL_MODULES | `src/types/permissions.ts` |
| Security types | `src/types/security.ts` |
| AI types | `src/types/ai.ts` |
| App constants + navigation | `src/lib/constants.ts` |
| Preset cargos | `src/mocks/cargos.ts` |
| Auth context + RBAC | `src/contexts/AuthContext.tsx` |
| Next.js middleware | `src/middleware.ts` |
| Import/export pipeline | `src/lib/import-export/` |
| AI mock response bank | `src/lib/ai/index.ts` |
| AI API route | `src/app/api/ai/chat/route.ts` |
| RBAC gate component | `src/components/shared/PermissionGate.tsx` |
| Sidebar | `src/components/layout/Sidebar.tsx` |
| Topbar | `src/components/layout/Topbar.tsx` |
