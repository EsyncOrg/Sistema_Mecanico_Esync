# Architecture

*Esync ERP — Technical Architecture Reference*

---

## 1. Folder Structure

```
forge-erp/
├── public/                      # Static assets
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── (auth)/              # Route group — no layout applied
│   │   │   └── login/page.tsx
│   │   ├── (dashboard)/         # Route group — Sidebar + Topbar applied
│   │   │   ├── layout.tsx       # Auth guard + layout wrapper
│   │   │   ├── configuracoes/page.tsx
│   │   │   ├── conjuntos/page.tsx
│   │   │   ├── corte/page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── desenvolvimento/page.tsx
│   │   │   ├── dobra/page.tsx
│   │   │   ├── estoque/page.tsx
│   │   │   ├── esync-ia/page.tsx
│   │   │   ├── maquinas/page.tsx
│   │   │   ├── pecas/page.tsx
│   │   │   ├── programacao/page.tsx
│   │   │   ├── programas/page.tsx
│   │   │   ├── relatorios/page.tsx
│   │   │   ├── retalhos/page.tsx
│   │   │   └── usuarios/page.tsx
│   │   ├── api/
│   │   │   └── ai/chat/route.ts # Server-side AI endpoint
│   │   ├── produto/[codigo]/    # Public QR product detail
│   │   ├── globals.css          # (redirect — real CSS is in styles/)
│   │   ├── layout.tsx           # Root layout (fonts, providers)
│   │   └── page.tsx             # Splash / redirect to /dashboard
│   │
│   ├── components/
│   │   ├── dashboard/           # Page-specific modals
│   │   │   ├── DashboardAlertsModal.tsx
│   │   │   ├── DashboardAtividadesModal.tsx
│   │   │   └── DashboardMaquinasModal.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx      # Collapsible navigation sidebar
│   │   │   └── Topbar.tsx       # Sticky top bar
│   │   ├── providers/
│   │   │   └── ThemeProvider.tsx
│   │   ├── qr/
│   │   │   └── ProductQRModal.tsx
│   │   ├── shared/              # Reusable page-level components
│   │   │   ├── BlockedAccess.tsx
│   │   │   ├── ColumnFilterDropdown.tsx
│   │   │   ├── DeleteConfirmModal.tsx
│   │   │   ├── EditarPecaModal.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── ExportModal.tsx
│   │   │   ├── ImportModal.tsx
│   │   │   ├── ImportPasswordModal.tsx
│   │   │   ├── NovaPecaModal.tsx
│   │   │   ├── PageHeader.tsx
│   │   │   ├── PauseModal.tsx
│   │   │   ├── PermissionGate.tsx
│   │   │   ├── SecurityConfirmModal.tsx
│   │   │   ├── StatCard.tsx
│   │   │   └── StatusBadge.tsx
│   │   └── ui/                  # Atomic Radix-based primitives
│   │       ├── avatar.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── card.tsx
│   │       ├── dialog.tsx
│   │       ├── dropdown-menu.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       ├── progress.tsx
│   │       ├── scroll-area.tsx
│   │       ├── separator.tsx
│   │       ├── table.tsx
│   │       ├── toast.tsx
│   │       └── tooltip.tsx
│   │
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   ├── ConjuntosContext.tsx
│   │   ├── DesenvolvimentoContext.tsx
│   │   ├── DobraContext.tsx
│   │   ├── EstoqueContext.tsx
│   │   └── ProgramacaoContext.tsx
│   │
│   ├── hooks/
│   │   ├── useMediaQuery.ts
│   │   └── useSidebar.ts
│   │
│   ├── lib/
│   │   ├── activity/activityLog.ts
│   │   ├── ai/index.ts
│   │   ├── alerts/alertSystem.ts
│   │   ├── analytics.ts
│   │   ├── constants.ts
│   │   ├── dashboard/metrics.ts
│   │   ├── exportUtils.ts
│   │   ├── import-export/
│   │   │   ├── modules.ts
│   │   │   ├── parser.ts
│   │   │   ├── template.ts
│   │   │   ├── types.ts
│   │   │   └── validator.ts
│   │   ├── pecas/
│   │   │   ├── bitolaMap.ts
│   │   │   └── codeGenerator.ts
│   │   ├── qr/index.ts
│   │   ├── security/importSecurity.ts
│   │   ├── toast.ts
│   │   └── utils.ts
│   │
│   ├── middleware.ts             # Next.js edge middleware
│   │
│   ├── mocks/
│   │   ├── ai.ts
│   │   ├── cargos.ts
│   │   ├── conjuntos.ts
│   │   ├── dashboard.ts
│   │   ├── desenvolvimento.ts
│   │   ├── dobra.ts
│   │   ├── estoque.ts
│   │   ├── index.ts
│   │   ├── maquinas.ts
│   │   ├── pecas.ts
│   │   ├── programacao.ts
│   │   ├── programas.ts
│   │   ├── retalhos.ts
│   │   └── usuarios.ts
│   │
│   ├── styles/globals.css        # Tailwind v4 @theme design tokens
│   │
│   └── types/
│       ├── ai.ts
│       ├── conjuntos.ts
│       ├── desenvolvimento.ts
│       ├── dobra.ts
│       ├── estoque.ts
│       ├── index.ts
│       ├── permissions.ts
│       ├── programacao.ts
│       └── security.ts
│
├── docs/                         # This documentation folder
├── next.config.ts
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts            # Minimal — no custom tokens here (see globals.css)
└── tsconfig.json
```

---

## 2. Routing Architecture

### Route Groups

Next.js App Router route groups are used to apply different layouts:

**`(auth)` group** — unauthenticated:
- `/login` → `app/(auth)/login/page.tsx`
- No Sidebar, no Topbar
- Redirected to `/dashboard` by middleware if session cookie exists

**`(dashboard)` group** — authenticated:
- All main modules
- `app/(dashboard)/layout.tsx` applies Sidebar + Topbar
- Auth guard: reads from `AuthContext.isAuthenticated`; redirects to `/login` if false

**Dynamic routes:**
- `/produto/[codigo]` — public product detail for QR scans; no auth required

**API routes:**
- `POST /api/ai/chat` — server-side AI endpoint; currently returns mock response

### Middleware (`src/middleware.ts`)

Runs at Edge runtime. Performs one check only:
- If `forge_erp_session` cookie exists AND path is `/login` → redirect to `/dashboard`
- All other routes pass through

Dashboard route protection is intentionally client-side (AuthContext) because server-side middleware cannot read `sessionStorage`.

---

## 3. Contexts

All contexts follow the same pattern:
```tsx
const XContext = createContext<XContextValue>(defaultValue)
export function XProvider({ children }) { ... }
export function useX() { return useContext(XContext) }
```

### AuthContext
- **State:** `isAuthenticated`, `isLoading`, `user: AuthUser | null`, `currentCargoId`
- **Actions:** `login(credentials)`, `logout()`
- **RBAC:** `canView(module)`, `canEdit(module)`, `canExport(module)`, `isAdmin()`
- **Session:** `sessionStorage` key `forge-erp-session` + cookie `forge_erp_session`
- **Cargo lookup:** `mockCargos.find(c => c.id === currentCargoId)` — future: Supabase query

### ConjuntosContext
- **State:** `conjuntos: Conjunto[]`, `historico: HistoricoConjunto[]`
- **Actions:** add, update, remove conjunto; run `SimulacaoItemEstoque`

### DesenvolvimentoContext
- **State:** `solicitacoes: SolicitacaoProducao[]`, `tarefas: TarefaDesenvolvimento[]`
- **Actions:** create/update/delete requests and tasks; send to Programacao

### DobraContext
- **State:** `tarefas: TarefaDobra[]`
- **Actions:** start setup, start production, pause, resume, confirm quantity → triggers Estoque entry

### EstoqueContext
- **State:** `itens: EstoqueItem[]`, `movimentos: MovimentoEstoque[]`
- **Actions:** entrada (from Dobra/Corte), saida, ajuste; compute status from quantities

### ProgramacaoContext
- **State:** `programas: ProgramaCNC[]`, `solicitacoes: SolicitacaoProgramacao[]`
- **Actions:** create program, conclude program (enforces OS distribution invariant), reuse

---

## 4. Shared Components

### Layout Components
- **`Sidebar.tsx`** — collapsible, animated with Framer Motion; reads `NAV_ITEMS` from constants; shows `PermissionGate` per item
- **`Topbar.tsx`** — sticky; contains theme toggle, notification dropdown, user menu with cargo switcher (dev tool), logout

### Shared Page Components
| Component | Purpose |
|-----------|---------|
| `PageHeader` | Title + action buttons (import, export, add) with permission-gated rendering |
| `StatCard` | KPI metric card with value, variação %, icon, color variant |
| `StatusBadge` | Color-coded pill mapped from `STATUS_LABELS` |
| `EmptyState` | No-data placeholder with icon and call-to-action |
| `PermissionGate` | Reads `canView/canEdit` from AuthContext; renders children or `BlockedAccess` |
| `BlockedAccess` | Permission denied fallback — shows role and contact message |
| `DeleteConfirmModal` | Two-step delete dialog with item name confirmation |
| `SecurityConfirmModal` | Generic confirmation dialog with title/message/action |
| `ImportModal` | Drag-drop import with module selection, preview, and error report |
| `ImportPasswordModal` | Password gate before import; calls `validateImportPassword()` |
| `ExportModal` | Format selection (XLSX/CSV/PDF) + column selection |
| `EditarPecaModal` | Part edit form with all `Peca` fields |
| `NovaPecaModal` | Part creation form with auto-code generation |
| `PauseModal` | Pause operation with reason field |
| `ColumnFilterDropdown` | Table column visibility toggle |

### UI Primitives (`src/components/ui/`)
Radix-based components styled with Tailwind v4 tokens. No shadcn CLI used — components are written directly. Same API as shadcn but customized.

---

## 5. Hooks

### `useMediaQuery(query: string): boolean`
- Returns whether a CSS media query matches
- Used to detect mobile breakpoints and adjust Sidebar behavior

### `useSidebar()`
- Returns `{ isOpen, toggle, close }`
- Sidebar collapse state — persisted across renders

---

## 6. Utilities

### `src/lib/constants.ts`
- `APP_NAME`, `APP_VERSION`, `APP_DESCRIPTION`
- `NAV_ITEMS` — navigation items array (used by Sidebar)
- `STATUS_LABELS` — Portuguese status string map
- `ROLE_LABELS` — role to Portuguese label
- `DEPARTAMENTOS`, `MAQUINAS`, `MATERIAIS` — domain reference arrays

### `src/lib/utils.ts`
- `cn(...classes)` — clsx + tailwind-merge utility
- Date formatting helpers
- String normalization utilities

### `src/lib/pecas/codeGenerator.ts`
- `generatePartCode(grupo, familia, espessura)` — produces structured part codes

### `src/lib/pecas/bitolaMap.ts`
- Standard material thickness reference array

### `src/lib/qr/index.ts`
- `generateProductQR(codigo)` — returns QR code data URL using `qrcode` library

### `src/lib/toast.ts`
- `showToast(message, type)` — wraps toast.tsx; variants: success, error, info, warning

### `src/lib/activity/activityLog.ts`
- `logActivity(event)`, `getActivityLog()` — in-memory log for dashboard feed

### `src/lib/alerts/alertSystem.ts`
- `createAlert(alert)`, `getAlerts()` — in-memory alert store for dashboard

### `src/lib/dashboard/metrics.ts`
- `computeKPI(data)`, `aggregateStats(data)` — KPI calculation for stat cards

### `src/lib/analytics.ts`
- Cross-module analytics computation helpers

---

## 7. Current Data Flow

```
User Action (UI)
    ↓
Page Component
    ↓
React Context (src/contexts/*.tsx)
    ↓
Mock Data (src/mocks/*.ts)   ←── in-memory arrays, reset on reload
    ↓
State update → re-render
```

Side effects (audit log, activity log, alerts) are written to separate in-memory stores.

---

## 8. Future Backend Migration Strategy

### Phase 1 — Supabase Schema
Map each `src/types/*.ts` domain type to a Supabase table. Key tables:
- `pecas`, `retalhos`, `programas`, `conjuntos`
- `solicitacoes_producao`, `tarefas_dobra`
- `estoque_itens`, `movimentos_estoque`
- `programas_cnc`, `solicitacoes_programacao`
- `usuarios`, `cargos`, `import_audit_log`, `action_audit_log`
- `maquinas`, `eventos_maquina`

### Phase 2 — Context Migration
Replace each `src/mocks/*.ts` import inside contexts with Supabase client calls. The context API surface stays identical — pages do not change.

### Phase 3 — Authentication
- Replace mock `login()` in `AuthContext` with `supabase.auth.signInWithPassword()`
- Move session from `sessionStorage` to Supabase-managed cookies
- Add Supabase Row Level Security (RLS) policies per `empresaId`

### Phase 4 — Server Actions / API Routes
- Import password validation → `supabase.rpc('validate_import_password')`
- Audit log → `supabase.from('import_audit_log').insert(entry)`
- AI route → real OpenAI API call with user context from Supabase

### Phase 5 — Real-time
- Machine status → Supabase Realtime subscriptions on `maquinas` table
- Dashboard activity → Realtime on `activity_log` table
