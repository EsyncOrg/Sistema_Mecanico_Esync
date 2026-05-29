# FORGE ERP — PROJECT CONTEXT

> Persistent documentation for AI-assisted development. Update this file after every major feature addition.
> Last updated: 2026-05-29

---

## 1. PROJECT OVERVIEW

**Product Name:** Esync (branded internally as FORGE ERP)
**Description:** Premium industrial management SaaS for mechanical/manufacturing companies.
**Language:** Brazilian Portuguese (full PT-BR UI — all labels, messages, and modals)
**Status:** Frontend complete with mock data. Backend integration (Supabase) is planned.
**Dev server:** `npm run dev` → http://localhost:3000

---

## 2. TECH STACK

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15.5.18 (App Router, `src/` dir) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 (`@tailwindcss/postcss`) |
| UI Primitives | Radix UI (avatar, dialog, dropdown, label, scroll-area, separator, slot, tooltip) |
| Animation | Framer Motion 12 |
| Icons | Lucide React |
| Charts | Recharts 3 |
| Dark Mode | next-themes |
| Export | xlsx, jsPDF, jsPDF-autotable |
| Import | react-dropzone, xlsx (parser) |
| QR Codes | qrcode library |
| Utilities | clsx, tailwind-merge, class-variance-authority |

**Tailwind v4 note:** Theme config lives in `src/styles/globals.css` via `@theme {}` — NOT in `tailwind.config.ts`. All custom colors use CSS variable naming (`--color-primary`, `--color-accent`, etc.).

---

## 3. ARCHITECTURE

```
src/
├── app/
│   ├── (auth)/login/         # Login page (no sidebar)
│   ├── (dashboard)/          # All authenticated pages (Sidebar + Topbar layout)
│   │   ├── layout.tsx        # Shared layout wrapper
│   │   └── [page]/page.tsx   # One page per module
│   ├── api/ai/chat/          # AI chat API route
│   ├── produto/[codigo]/     # Dynamic product detail (QR scannable)
│   └── layout.tsx / page.tsx # Root layout + splash
├── components/
│   ├── dashboard/            # Dashboard-specific modals
│   ├── layout/               # Sidebar, Topbar
│   ├── providers/            # ThemeProvider
│   ├── qr/                   # QR code modal
│   ├── shared/               # Reusable page-level components
│   └── ui/                   # Atomic Radix-based UI components
├── contexts/                 # React context per data domain
├── hooks/                    # Custom React hooks
├── lib/                      # Business logic, utilities, subsystems
│   ├── activity/             # Activity log
│   ├── ai/                   # AI mock response bank
│   ├── alerts/               # Alert system
│   ├── dashboard/            # KPI metrics computation
│   ├── import-export/        # Full import/export subsystem
│   ├── pecas/                # Part code generation, gauge map
│   ├── qr/                   # QR generation
│   └── security/             # Import password + audit log
├── mocks/                    # All in-memory mock data (14 files)
├── styles/globals.css        # Tailwind @theme design tokens
└── types/                    # TypeScript domain types (9 files)
```

**Route groups:**
- `(auth)` → no layout, only login page
- `(dashboard)` → Sidebar + Topbar wrapper applied to all pages

**Data flow:** Pages consume React Contexts → Contexts expose mock data from `src/mocks/` → Future: Contexts will call Supabase client instead of mocks.

---

## 4. COLOR PALETTE & DESIGN SYSTEM

Defined in `src/styles/globals.css` via `@theme {}`.

### Light Mode
| Token | Value | Hex |
|-------|-------|-----|
| `--color-background` | hsl(220 18% 97%) | #f5f7fa |
| `--color-foreground` | hsl(231 22% 20%) | #282a3d |
| `--color-card` | hsl(0 0% 100%) | #ffffff |
| `--color-primary` | hsl(192 72% 21%) | #0f4c5c (teal) |
| `--color-secondary` | hsl(231 22% 22%) | #2b2d42 (dark navy) |
| `--color-accent` | hsl(240 100% 25%) | #000080 (navy) |
| `--color-destructive` | hsl(0 84% 60%) | red |
| `--color-success` | hsl(158 64% 38%) | green |
| `--color-warning` | hsl(38 92% 50%) | amber |

### Dark Mode Overrides
| Token | Value | Hex |
|-------|-------|-----|
| `--color-background` | hsl(220 11% 15%) | #21252b (graphite) |
| `--color-foreground` | hsl(220 14% 90%) | #d8dce8 |
| `--color-card` | hsl(220 10% 19%) | #272c32 |
| `--color-primary` | hsl(192 56% 46%) | #2fafcc (brighter teal) |
| `--color-accent` | hsl(232 62% 52%) | #2e4fd4 (visible navy) |

### Sidebar
- Background: `linear-gradient(180deg, #515151 0%, #424242 100%)`
- Inactive text: `rgba(255,255,255,0.58)` / Active: `#ffffff`
- Badge bg: navy `#000080`

### Utility Classes
- `.card-elevated` — shadow + border + hover lift
- `.dark .glow-primary` / `.glow-accent` — neon glow effects
- Theme transitions: 180ms on all theme-sensitive properties

---

## 5. MODULES

| Module | Route | Description |
|--------|-------|-------------|
| Dashboard | `/dashboard` | KPI cards, machine status, alerts, activity feed |
| Desenvolvimento | `/desenvolvimento` | Production request workflow (OS creation) |
| Programação | `/programacao` | Task scheduling and routing across sectors |
| Produtos (Conjuntos) | `/conjuntos` | Product/assembly catalog |
| Corte | `/corte` | Cutting sector operations |
| Dobra | `/dobra` | Bending sector operations |
| Máquinas | `/maquinas` | Equipment status, timeline, efficiency tracking |
| Peças | `/pecas` | Parts catalog with full import/export |
| Retalhos | `/retalhos` | Material scraps/remnants tracking |
| Programas | `/programas` | CNC/laser NC program library |
| Estoque | `/estoque` | Inventory with stock movements |
| Relatórios | `/relatorios` | Analytics with bar/pie charts |
| Esync IA | `/esync-ia` | AI insights and production analysis chat |
| Usuários | `/usuarios` | User management + role assignment |
| Configurações | `/configuracoes` | System settings |
| Produto Detail | `/produto/[codigo]` | QR-scannable product detail page |

---

## 6. PERMISSIONS & RBAC

### Roles (UserRole)
- `admin` → Administrador
- `supervisor` → Supervisor
- `operador` → Operador
- `visualizador` → Visualizador

### Module IDs (16 total)
```
dashboard | desenvolvimento | programacao | conjuntos | corte | dobra | solda
maquinas | pecas | retalhos | programas | estoque | relatorios | esync_ia | usuarios | configuracoes
```

### Permission Structure
Each role (`Cargo`) has a `permissoes` map: `{ [ModuleId]: { visualizacao: boolean, edicao: boolean } }`

### RBAC Enforcement
- `src/components/shared/PermissionGate.tsx` — wraps UI blocks; renders `BlockedAccess.tsx` if denied
- `src/contexts/AuthContext.tsx` — exposes `hasPermission(moduleId, 'edicao' | 'visualizacao')`
- `src/types/permissions.ts` — `ModuleId`, `ModulePermission`, `Cargo` type definitions

### Data Operation Permissions (`src/types/security.ts`)
```typescript
DataOperationPermissions {
  canImport: boolean
  canExport: boolean
  canEdit: boolean
  canDelete: boolean
}
```

---

## 7. UI STANDARDS

### Component Architecture
- **Atomic UI:** `src/components/ui/` — 14 Radix-based components (no shadcn CLI)
- **Shared page-level:** `src/components/shared/` — 16 reusable page components
- **Page-specific:** inline or per-module components

### Key Shared Components
| Component | Purpose |
|-----------|---------|
| `PageHeader` | Page title + action buttons (import/export/add) |
| `StatCard` | KPI metric with value, variation, icon, color |
| `StatusBadge` | Color-coded status label pill |
| `EmptyState` | No-data placeholder with icon + message |
| `PermissionGate` | RBAC wrapper — shows content only if permitted |
| `BlockedAccess` | Permission denied fallback UI |
| `DeleteConfirmModal` | Two-step delete confirmation dialog |
| `SecurityConfirmModal` | Generic action confirmation |

### Animation
- All sidebar transitions: Framer Motion (collapse, expand, hover)
- Page entries: `fade-in` / `slide-in-left` CSS keyframes (180ms)
- No gratuitous animations — prefer snappy transitions

### Responsive
- `useMediaQuery` hook for breakpoint detection
- `useSidebar` hook manages collapse state
- Sidebar auto-collapses on small screens

### Toast Notifications
- `src/lib/toast.ts` → `showToast(message, type)` — success/error/info/warning
- `src/components/ui/toast.tsx` — display component

---

## 8. CODING STANDARDS

- **TypeScript strict** — all props and return values typed; no `any`
- **No default exports from lib files** — named exports only
- **Context pattern** — every data domain has a React Context in `src/contexts/`
- **No inline styles** — Tailwind utility classes only
- **Tailwind v4 CSS vars** — use `bg-primary`, `text-foreground`, etc. (maps to `@theme` tokens)
- **No comments** unless the WHY is non-obvious
- **Component files** — one component per file; filename = component name (PascalCase)
- **Page files** — always `page.tsx`, export default anonymous or named component
- **Hooks** — `use` prefix, camelCase, one concern per file
- **Context files** — `*Context.tsx`, export `use*` hook + Provider

---

## 9. NAMING CONVENTIONS

| Entity | Convention | Example |
|--------|-----------|---------|
| Components | PascalCase | `NovaPecaModal.tsx` |
| Hooks | camelCase with `use` prefix | `useSidebar.ts` |
| Contexts | PascalCase with `Context` suffix | `AuthContext.tsx` |
| Utility functions | camelCase | `generatePartCode()` |
| Types/Interfaces | PascalCase | `Peca`, `StatusMaquina` |
| Constants | SCREAMING_SNAKE_CASE | `APP_NAME`, `NAV_ITEMS` |
| Mock files | singular domain name | `pecas.ts`, `maquinas.ts` |
| CSS tokens | kebab-case with `--color-` prefix | `--color-primary` |
| Route segments | lowercase Portuguese words | `/pecas`, `/retalhos` |

**Domain vocabulary (Portuguese terms used in code):**
- `peca` / `pecas` — part / parts
- `retalho` / `retalhos` — scrap/remnant
- `programa` / `programas` — NC program
- `conjunto` / `conjuntos` — assembly / product
- `maquina` / `maquinas` — machine
- `solicitacao` — production request
- `programacao` — scheduling / programming
- `desenvolvimento` — production development
- `estoque` — inventory / stock
- `dobra` — bending
- `corte` — cutting
- `cargo` — role / job title
- `bitola` — material gauge/thickness

---

## 10. PRODUCT/PART CODE STRUCTURE

Part codes are auto-generated by `src/lib/pecas/codeGenerator.ts`.

**Code anatomy:** `[GRUPO]-[FAMILIA]-[ESPESSURA]-[SEQ]`

Fields on `Peca` type:
- `codigo` — unique part code
- `descricao` — description
- `grupo` — part group category
- `familia` — family within group
- `espessura` — thickness (bitola)
- `areaPeca` — part area (m²)
- `desperdicio` — waste percentage
- `percFabricacao` — fabrication percentage
- `percPintura` — painting percentage
- `peso` — weight
- `cor` — color
- `modelo3dPath` — 3D model file path
- `desenhoDobraPath` — bend drawing file path
- `status` — StatusPeca enum

**Gauge map:** `src/lib/pecas/bitolaMap.ts` — standard thickness reference for all supported materials.

---

## 11. IMPLEMENTED SYSTEMS

### Authentication
- `src/contexts/AuthContext.tsx` — session state, `currentUser`, `hasPermission()`
- `src/middleware.ts` — redirects authenticated users from `/login` → `/dashboard`
- Session stored in `sessionStorage` (client-only; resets on tab close)
- **Future:** Replace with Supabase Auth + server-side session cookies

### Import System
- Entry: `src/components/shared/ImportModal.tsx` + `ImportPasswordModal.tsx`
- Security gate: `src/lib/security/importSecurity.ts` → validates password via `NEXT_PUBLIC_IMPORT_SECURITY_PASSWORD`
- Parsing: `src/lib/import-export/parser.ts` → handles XLSX + CSV
- Validation: `src/lib/import-export/validator.ts` → `buildAutoMapping()` + `validateRows()`
- Field aliases: `src/lib/import-export/modules.ts` → flexible column matching per module
- Audit log: `logImportAudit()` → in-memory (future: Supabase)

### Export System
- Entry: `src/components/shared/ExportModal.tsx`
- Formats: XLSX (xlsx lib), CSV, PDF (jsPDF + autotable)
- Utilities: `src/lib/exportUtils.ts` → `generateXLSX()`, `generateCSV()`, `generatePDF()`
- Templates: `src/lib/import-export/template.ts` → downloadable import templates with example rows

### Activity Log
- `src/lib/activity/activityLog.ts` → `logActivity()`, `getActivityLog()`
- Used by dashboard activity feed modal

### Alert System
- `src/lib/alerts/alertSystem.ts` → `createAlert()`, `getAlerts()`
- Alerts displayed in `DashboardAlertsModal.tsx`

### QR Code System
- `src/lib/qr/index.ts` → `generateProductQR()` — creates QR code data URL
- `src/components/qr/ProductQRModal.tsx` — display + download modal
- QR resolves to `/produto/[codigo]` — static product detail page

### Dashboard Metrics
- `src/lib/dashboard/metrics.ts` → `computeKPI()`, `aggregateStats()`
- Powers stat cards and chart data on the main dashboard

### Security / Audit
- `src/types/security.ts` → `ImportAuditEvent`, `ActionAuditEvent`, `DataOperationPermissions`
- `src/lib/security/importSecurity.ts` → `validateImportPassword()`, `logImportAudit()`, `logActionAudit()`
- All audit events currently in-memory — wired for Supabase persistence

---

## 12. MACHINE SYSTEM

### Types (`src/types/index.ts`)
- `Maquina` — full machine record:
  - `setor`: sector (corte / dobra / solda / etc.)
  - `status`: `StatusMaquina` (operando / setup / pausada / ociosa / manutencao)
  - `eficiencia`: 0–100 efficiency rating
  - `tempoOperacional`, `tempoSetup`, `tempoOcioso`, `tempoPausado` — daily time breakdown (minutes)
  - `timelineSegmentos`: array of `MaquinaTimelineSegmento` (status, start hour, duration)
  - `produtividadeSemanal`: weekly productivity array
- `EventoMaquina` — machine event log (producao_inicio/fim, setup, pausa, troca_operador, manutencao)
- `MaquinaTimelineSegmento` — timeline block type

### Page (`/maquinas`)
- Displays all machines with status cards
- Timeline visualization per machine
- Efficiency gauges
- Event history

### Dashboard Integration
- `DashboardMaquinasModal.tsx` — quick machine status overview
- Machine count + operational status shown in dashboard KPI cards

### Mock Data (`src/mocks/maquinas.ts`)
- 8 sample machines: CNC-001/002/003, LASER-001/002, PLASMA-001, TORNO-001, FRESA-001
- Pre-populated events and timeline segments

---

## 13. AI MODULE (Esync IA)

### Route
- Page: `/esync-ia`
- API: `POST /api/ai/chat` → `src/app/api/ai/chat/route.ts`

### Types (`src/types/ai.ts`)
- `ChatMessage`: role ('user' | 'assistant'), content, timestamp
- `AIInsight`: id, title, description, severity, category, confidence
- `AIChatRequest`: `{ message: string; context?: ChatMessage[] }`
- `AIChatResponse`: `{ response: string; analysisType; tokensUsed; model; durationMs }`
- `AnalysisType`: 'production' | 'efficiency' | 'bottleneck' | 'stock' | 'maintenance' | 'general'
- `AIModel`: model identifier

### Mock Response Bank (`src/lib/ai/index.ts`)
7 analysis templates matched by keywords:
| Keyword | Analysis Type |
|---------|--------------|
| `dobra` | Bending sector analysis |
| `corte` / `laser` / `plasma` / `cnc` | Cutting sector analysis |
| `gargalo` | Bottleneck detection |
| `estoque` / `inventário` | Inventory analysis |
| `os:` | Service order analysis |
| `eficiência` | Efficiency analysis |
| `operador` / `equipe` | Operator performance |
| (fallback) | General operational summary |

Simulated delay: 600–2000ms to mimic real API latency.

### Future OpenAI Integration
- Replace mock in `route.ts` with real `openai` SDK call
- Requires `OPENAI_API_KEY` environment variable (server-side only)
- Add rate limiting + request authentication before production
- All AI calls must stay server-side (never expose API key to client)

---

## 14. PRODUCTS MODULE (Conjuntos)

### Types (`src/types/conjuntos.ts`)
- `Conjunto` — assembly/product:
  - `codigo`, `nome`, `cliente`, `categoria`
  - `pecas: PecaConjunto[]` — list of parts with quantity
  - `historico` — modification history
- `PecaConjunto` — part reference within assembly: `pecaId`, `quantidade`, `observacao`

### Page (`/conjuntos`)
- Assembly catalog with search and filters
- Click-through to individual assembly detail
- QR code generation per assembly

### Dynamic Detail Page (`/produto/[codigo]`)
- Static-renderable product detail
- Designed for QR code scan entry (no auth required to view basic info)
- Displays part list, specifications, status

### Context (`src/contexts/ConjuntosContext.tsx`)
- CRUD state for conjuntos
- Exposes `add`, `update`, `remove`, `getById`

---

## 15. PROGRAMMING MODULE

### Scope
Two distinct but related modules:

**Programas** (`/programas`) — NC Program library:
- `Programa` type: codigo, nome, maquina, material, status, versao, operador, tempoEstimado
- Stores execution history per program
- Mock: 8 sample NC programs

**Programação** (`/programacao`) — Production scheduling:
- `TarefaProgramacao` type: tipo (corte/dobra), maquina, operador, prioridade, status
- Links tasks to specific machines and operators
- Context: `src/contexts/ProgramacaoContext.tsx`
- Mock: `src/mocks/programacao.ts`

### Desenvolvimento (`/desenvolvimento`) — Production Requests:
- `SolicitacaoProducao` type: titulo, cliente, OS number, status, lista de peças
- `PecaSolicitacao`: pecaId, quantidade, distribuição por OS
- Context: `src/contexts/DesenvolvimentoContext.tsx`
- Entry point for new production orders

---

## 16. IMPORT / EXPORT SYSTEM

### Supported Modules
- `pecas` — parts catalog
- `programas` — NC programs
- `retalhos` — scraps/remnants
- `estoque` — inventory

### Import Flow
1. User opens `ImportModal` → selects module
2. `ImportPasswordModal` → validates security password (`NEXT_PUBLIC_IMPORT_SECURITY_PASSWORD`)
3. File drop (react-dropzone) → XLSX or CSV accepted
4. `parser.ts` → parses file → `ParseResult { headers, rows }`
5. `buildAutoMapping()` → maps file columns to schema fields (fuzzy, accent-insensitive)
6. `validateRows()` → validates required fields + custom validators
7. Returns `{ valid[], errors[] }` → user sees error report or confirmation
8. On confirm → context `add()` → updates in-memory state
9. `logImportAudit()` → records event

### Export Flow
1. User opens `ExportModal` → selects format (XLSX / CSV / PDF)
2. `generateXLSX()` / `generateCSV()` / `generatePDF()` from `src/lib/exportUtils.ts`
3. PDF uses jsPDF-autotable with brand-consistent styling
4. File downloaded to browser

### Template Download
- `src/lib/import-export/template.ts` → generates per-module template file
- Includes column headers + 1 example row
- Helps users understand expected import format

### Field Alias System (`src/lib/import-export/modules.ts`)
Flexible column header matching. Example for `pecas.codigo`:
- Accepted aliases: `"cod"`, `"code"`, `"sku"`, `"codigo"`, `"código"`

---

## 17. DASHBOARD INTEGRATIONS

The dashboard (`/dashboard`) aggregates data from all modules:

| Section | Source |
|---------|--------|
| KPI Stat Cards | `src/lib/dashboard/metrics.ts` → `aggregateStats()` |
| Production Chart | Recharts BarChart from `src/mocks/dashboard.ts` |
| Machine Status Panel | `src/mocks/maquinas.ts` → quick status overview |
| Alerts Panel | `src/lib/alerts/alertSystem.ts` → `getAlerts()` |
| Activity Feed | `src/lib/activity/activityLog.ts` → `getActivityLog()` |

**Dashboard Modals:**
- `DashboardAlertsModal` — full alert list with severity
- `DashboardAtividadesModal` — full activity timeline
- `DashboardMaquinasModal` — machine status cards

**Notification System (`Notificacao` type):**
- `tipo`: 'info' | 'aviso' | 'erro' | 'sucesso'
- `lida`: boolean read flag
- Displayed in Topbar notification dropdown

---

## 18. SECURITY RULES

1. **Import password gate** — all imports require `NEXT_PUBLIC_IMPORT_SECURITY_PASSWORD` match
2. **RBAC via PermissionGate** — every sensitive UI block wrapped; `edicao` permission required for mutations
3. **Audit logging** — all imports, edits, and deletes logged to `ImportAuditEvent` / `ActionAuditEvent`
4. **AI API is server-side only** — `route.ts` is the only call site; no API keys on client
5. **Middleware auth check** — `src/middleware.ts` guards dashboard routes via session cookie
6. **No `any` in TypeScript** — prevents type-safety gaps at compile time
7. **Future rules (pre-production):**
   - Add rate limiting to `/api/ai/chat`
   - Migrate session from `sessionStorage` to HttpOnly cookies
   - Move audit log from in-memory to Supabase
   - Add input sanitization before any Supabase mutations

---

## 19. FUTURE INTEGRATIONS

### Supabase (Primary Backend)
- Replace all `src/mocks/*.ts` with Supabase client calls in contexts
- Tables map 1:1 to domain types (`pecas`, `maquinas`, `usuarios`, etc.)
- Supabase Auth → replaces mock auth in `AuthContext.tsx`
- Supabase Row Level Security → enforces RBAC at DB level
- Realtime subscriptions → live machine status updates on dashboard

### OpenAI API
- Replace mock responses in `src/app/api/ai/chat/route.ts`
- System prompt: manufacturing ERP context
- Add message history for multi-turn conversations
- Add `OPENAI_API_KEY` to `.env.local` (never `NEXT_PUBLIC_` prefix)

### Other Planned
- Email notifications (machine alerts, OS status changes)
- PDF report generation with full company branding
- Barcode scanner integration (part lookup on mobile)
- Machine sensor data ingestion (real-time efficiency)

---

## 20. MOCK DATA INVENTORY

All mocks in `src/mocks/` — in-memory, reset on page reload.

| File | Entities | Notes |
|------|----------|-------|
| `pecas.ts` | `Peca[]` | Full part catalog |
| `maquinas.ts` | `Maquina[]`, `EventoMaquina[]` | 8 machines, timeline segments |
| `retalhos.ts` | `Retalho[]` | Material remnants |
| `programas.ts` | `Programa[]` | NC programs |
| `conjuntos.ts` | `Conjunto[]`, `PecaConjunto[]` | Assemblies with part lists |
| `desenvolvimento.ts` | `SolicitacaoProducao[]` | Production requests |
| `dobra.ts` | `TarefaDobra[]` | Bending tasks |
| `programacao.ts` | `TarefaProgramacao[]` | Scheduling tasks |
| `estoque.ts` | `EstoqueItem[]`, `MovimentoEstoque[]` | Inventory + movements |
| `dashboard.ts` | `StatCard[]`, `AtividadeRecente[]` | Dashboard aggregates |
| `usuarios.ts` | `Usuario[]` | User accounts |
| `cargos.ts` | `Cargo[]` | Roles with permission maps |
| `ai.ts` | `AIInsight[]`, `SetorAnalytics[]` | AI pre-built insights |
| `index.ts` | Re-exports all mocks | Single import point |

---

## 21. ENVIRONMENT VARIABLES

| Variable | Usage | Required |
|----------|-------|---------|
| `NEXT_PUBLIC_IMPORT_SECURITY_PASSWORD` | Import password gate | Yes (import feature) |
| `OPENAI_API_KEY` | AI chat (future) | No (currently mocked) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase (future) | No (currently mocked) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase (future) | No (currently mocked) |

---

## 22. BUILD & SCRIPTS

```bash
npm run dev       # Dev server at localhost:3000
npm run build     # Production build (13 pages)
npm run lint      # ESLint check
npm run start     # Start production build
```

Build status: Clean — 0 TypeScript errors, 0 ESLint errors (as of 2026-05-29).

---

## 23. CONTEXTS REFERENCE

| Context | File | Manages |
|---------|------|---------|
| `AuthContext` | `contexts/AuthContext.tsx` | Current user, permissions, session |
| `ConjuntosContext` | `contexts/ConjuntosContext.tsx` | Assemblies/products CRUD |
| `DesenvolvimentoContext` | `contexts/DesenvolvimentoContext.tsx` | Production requests |
| `DobraContext` | `contexts/DobraContext.tsx` | Bending sector tasks |
| `EstoqueContext` | `contexts/EstoqueContext.tsx` | Inventory + stock movements |
| `ProgramacaoContext` | `contexts/ProgramacaoContext.tsx` | Scheduling tasks |

---

## 24. KEY FILES QUICK REFERENCE

| Purpose | File |
|---------|------|
| Design tokens | `src/styles/globals.css` |
| Core domain types | `src/types/index.ts` |
| Permission types | `src/types/permissions.ts` |
| Security types | `src/types/security.ts` |
| AI types | `src/types/ai.ts` |
| App constants + nav | `src/lib/constants.ts` |
| Import/export pipeline | `src/lib/import-export/` |
| AI mock bank | `src/lib/ai/index.ts` |
| AI API route | `src/app/api/ai/chat/route.ts` |
| Auth middleware | `src/middleware.ts` |
| RBAC gate component | `src/components/shared/PermissionGate.tsx` |
| Import modal | `src/components/shared/ImportModal.tsx` |
| Export modal | `src/components/shared/ExportModal.tsx` |
| Sidebar | `src/components/layout/Sidebar.tsx` |
| Topbar | `src/components/layout/Topbar.tsx` |
