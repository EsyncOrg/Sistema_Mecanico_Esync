# Dashboard

*Esync ERP — Dashboard Module Reference*

---

## 1. Purpose

The dashboard is the system's entry point for authenticated users. It provides a real-time operational snapshot: KPI metrics, machine status, production alerts, and activity history. It aggregates read-only data from all other modules.

**Route:** `/dashboard`
**Module ID:** `dashboard`
**Minimum permission:** `visualizacao: true`

---

## 2. Layout Structure

```
┌─ Topbar (notifications + user menu) ──────────────────────────┐
│                                                               │
│  ┌─ PageHeader ──────────────────────────────────────────┐   │
│  │  "Dashboard"  [Alert count badge]                     │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─ KPI Stat Cards (4 columns) ──────────────────────────┐   │
│  │  [Peças]  [Retalhos]  [Programas]  [Eficiência]       │   │
│  └───────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌─ Production Chart (2/3) ─────┐  ┌─ Machine Status (1/3) ─┐│
│  │  Recharts BarChart            │  │  Machine cards + status  ││
│  │  monthly production data      │  │  [Ver todas →]           ││
│  └──────────────────────────────┘  └─────────────────────────┘│
│                                                               │
│  ┌─ Alerts Panel (1/2) ─────────┐  ┌─ Activity Feed (1/2) ──┐│
│  │  Active alerts list           │  │  Recent event timeline   ││
│  │  [Ver todos →]                │  │  [Ver todos →]           ││
│  └──────────────────────────────┘  └─────────────────────────┘│
└───────────────────────────────────────────────────────────────┘
```

---

## 3. KPI Stat Cards

### Component: `StatCard` (`src/components/shared/StatCard.tsx`)

```typescript
interface StatCard {
  id: string
  titulo: string
  valor: string | number
  variacao: number          // percentage variation vs previous period
  tipo: 'aumento' | 'queda' | 'neutro'
  icone: string             // Lucide icon name
  cor: 'primary' | 'accent' | 'success' | 'warning'
  sufixo?: string           // e.g. '%', 'un', 'h'
}
```

### Standard KPIs (from `src/mocks/dashboard.ts`)
1. **Total de Peças** — parts in catalog
2. **Retalhos Disponíveis** — available material remnants
3. **Programas Ativos** — active NC programs
4. **Eficiência Global** — production efficiency %

### Computation
KPI values are computed by `src/lib/dashboard/metrics.ts`:
- `aggregateStats(data)` — produces `StatCard[]` from cross-module data
- `computeKPI(data)` — derives efficiency and utilization metrics

---

## 4. Production Chart

**Library:** Recharts `BarChart`

Data source: `src/mocks/dashboard.ts` (monthly production totals)

Features:
- X-axis: months (PT-BR abbreviated)
- Y-axis: quantity / efficiency %
- Tooltip: formatted values with unit
- Legend: production categories
- Colors: follow brand palette (primary teal primary bars, accent navy secondary)

Future: date range selector, module filter, export chart as PNG.

---

## 5. Machine Status Panel

**Component:** Inline cards (summary view) + `DashboardMaquinasModal` (full view)

Data source: `src/mocks/maquinas.ts`

Summary shows:
- Machine code + name
- Current status badge (operando / setup / pausada / ociosa / manutencao)
- Efficiency % bar
- Current operator (if assigned)
- "Ver todas" button → opens `DashboardMaquinasModal`

Modal shows all 8 machines with full detail cards.

---

## 6. Alerts Panel

**Component:** Alert list + `DashboardAlertsModal`

Data source: `src/lib/alerts/alertSystem.ts`

### Alert Structure
```typescript
interface Alert {
  id: string
  titulo: string
  mensagem: string
  tipo: 'info' | 'aviso' | 'erro' | 'sucesso'
  criadoEm: string
}
```

Alert severity → visual styling:
- `erro` → red (destructive)
- `aviso` → amber (warning)
- `info` → blue (primary)
- `sucesso` → green (success)

Dashboard shows top N alerts; "Ver todos" opens modal with full list.

---

## 7. Activity Feed

**Component:** Timeline list + `DashboardAtividadesModal`

Data source: `src/lib/activity/activityLog.ts`

### Activity Structure
```typescript
interface AtividadeRecente {
  id: string
  tipo: 'peca' | 'retalho' | 'programa' | 'usuario' | 'sistema'
  titulo: string
  descricao: string
  tempo: string     // relative time string ("2 min atrás", "1h atrás")
  usuario: string
}
```

Activity is logged by:
- `logActivity(event)` — called from any context action that creates/edits/deletes
- Dashboard reads via `getActivityLog()`
- Modal shows full chronological timeline

---

## 8. Notification System (Topbar)

**Location:** Topbar bell icon with unread badge count

```typescript
interface Notificacao {
  id: string
  titulo: string
  mensagem: string
  tipo: 'info' | 'aviso' | 'erro' | 'sucesso'
  lida: boolean
  criadaEm: string
}
```

Dropdown shows recent notifications. Clicking marks as read. Badge shows unread count.

Future: push notifications, per-module notification preferences, email alerts.

---

## 9. Dashboard Modals

### `DashboardAlertsModal`
- Full alert list with severity icons and timestamps
- Filter by tipo (all/erro/aviso/info)
- Mark all as read action (future)

### `DashboardAtividadesModal`
- Full activity timeline
- Filter by tipo (peca/retalho/programa/usuario/sistema)
- User attribution on each event

### `DashboardMaquinasModal`
- All 8 machine cards in a grid
- Status badge + efficiency percentage
- Current operator + task (if assigned)
- Link to full `/maquinas` page

---

## 10. Data Dependencies

| Dashboard Section | Data Source | Module Relationship |
|------------------|-------------|---------------------|
| KPI Cards | `src/lib/dashboard/metrics.ts` | Aggregates: Peças, Retalhos, Programas |
| Production Chart | `src/mocks/dashboard.ts` | No live link yet |
| Machine Status | `src/mocks/maquinas.ts` | Máquinas module |
| Alerts | `alertSystem.ts` | All modules |
| Activity Feed | `activityLog.ts` | All modules |
| Notifications | In-memory array | All modules |

---

## 11. Permissions

Dashboard has `visualizacao` granted to all 7 preset roles. Only `mecanica` (admin) has `edicao`, though there are no edit actions on the dashboard itself — all interactions are read-only views.

---

## 12. Future Improvements

| Feature | Priority |
|---------|---------|
| Real-time machine status (Supabase Realtime) | High |
| Date range filter for all dashboard sections | High |
| Customizable KPI card selection per user | Medium |
| Live alert generation from Supabase triggers | Medium |
| Drill-down from KPI card to filtered module view | Medium |
| Export dashboard as PDF report | Medium |
| Mobile-optimized dashboard layout | Medium |
| Esync IA insight panel on dashboard | Low |
