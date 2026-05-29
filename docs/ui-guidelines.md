# UI Guidelines

*Esync ERP — Visual Identity & Component Standards*

---

## 1. Design Philosophy

Esync follows an **industrial premium** aesthetic: clean, confident, and functional. No decorative flourishes. Every UI element earns its place through utility. The visual identity communicates precision and reliability — aligned with the mechanical manufacturing context.

Key principles:
- **Clarity over decoration** — information density over whitespace excess
- **Status at a glance** — color-coded badges and cards make state immediately readable
- **Progressive disclosure** — modals and drawers reveal detail on demand
- **Consistency** — same patterns repeated across all modules (table → modal → confirm)

---

## 2. Color System

All colors are defined in `src/styles/globals.css` via Tailwind v4 `@theme {}`. Use Tailwind utility classes — never hardcode hex values.

### Semantic Color Usage

| Color | Token | Light Hex | Dark Hex | When to Use |
|-------|-------|-----------|----------|-------------|
| Primary | `bg-primary text-primary-foreground` | #0f4c5c | #2fafcc | Primary actions, key badges, headers |
| Secondary | `bg-secondary text-secondary-foreground` | #2b2d42 | #313740 | Secondary surfaces, subtitles |
| Accent (Navy) | `bg-accent text-accent-foreground` | #000080 | #2e4fd4 | Sidebar badges, focus rings |
| Muted | `bg-muted text-muted-foreground` | #eceff4 | #2d3239 | Disabled states, secondary labels |
| Success | `text-success bg-success/10` | — | — | Positive states, active badges |
| Warning | `text-warning bg-warning/10` | — | — | Low stock, attention needed |
| Destructive | `text-destructive bg-destructive/10` | — | — | Errors, delete actions |

### Status Color Mapping
| Status | Color Class | Usage |
|--------|------------|-------|
| `ativo` / `disponivel` / `operando` | `text-success` | Active, available |
| `pendente` / `ociosa` / `estoque_baixo` | `text-warning` | Attention needed |
| `erro` / `manutencao` / `critico` | `text-destructive` | Error, critical |
| `inativo` / `arquivado` | `text-muted-foreground` | Inactive |
| `em_progresso` / `em_producao` / `produzindo` | `text-primary` | In progress |
| `concluido` / `finalizado` | `text-success` | Completed |
| `pausado` / `reservado` | `text-warning` | Paused/reserved |
| `setup` | `text-accent` | Setup phase |

---

## 3. Typography

### Font Stack
- **Sans:** Geist Sans → Inter → system-ui (loaded via Next.js `localFont`)
- **Mono:** Geist Mono → monospace

### Scale
| Role | Class | Usage |
|------|-------|-------|
| Page title | `text-2xl font-bold text-foreground` | PageHeader title |
| Section heading | `text-lg font-semibold text-foreground` | Card headers, modal titles |
| Body | `text-sm text-foreground` | Table cells, descriptions |
| Secondary label | `text-xs text-muted-foreground` | Timestamps, subtitles, metadata |
| Monospace data | `font-mono text-sm` | Codes, OS numbers, part codes |

### Rules
- All module labels, status strings, and user-facing text must be in **PT-BR**
- Technical codes (OS numbers, part codes, machine codes) displayed in monospace
- Never truncate status or role labels — they are short by design
- `text-muted-foreground` for helper text, placeholders, metadata

---

## 4. Spacing & Layout

### Page Layout
```
┌──────────────────────────────────────────────┐
│ Sidebar (240px / 64px collapsed)             │
│ ┌──────────────────────────────────────────┐ │
│ │ Topbar (56px sticky)                     │ │
│ │──────────────────────────────────────────│ │
│ │ PageHeader (title + actions)             │ │
│ │ ──────────────────────────────────────── │ │
│ │ Content area (p-6, flex gap-6)           │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### Spacing Scale
- Page padding: `p-6` (24px)
- Section gap: `gap-6` (24px)
- Card internal padding: `p-5` or `p-6`
- Table cell padding: `px-4 py-3`
- Modal padding: `p-6`
- Form field gap: `space-y-4`
- Button gap in groups: `gap-2` or `gap-3`

### Grid Patterns
- **KPI cards:** `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`
- **Content + sidebar:** `grid grid-cols-1 lg:grid-cols-3 gap-6` (2/3 + 1/3)
- **Full width table:** `w-full`
- **Modal content:** `max-w-md` (confirm), `max-w-2xl` (form), `max-w-4xl` (data preview)

---

## 5. Alignment Rules

- **Table columns:**
  - Text columns: left-aligned
  - Number/quantity columns: right-aligned
  - Status badges: center or left depending on column width
  - Action buttons: right-aligned in last column
- **Form labels:** left-aligned, above inputs (never inline)
- **Page header:** title left, action buttons right (flex justify-between)
- **StatCard:** icon top-right, value large left, variation bottom-left
- **Modals:** content centered, action buttons bottom-right (cancel left, primary right)

---

## 6. Table Patterns

All tables follow a consistent structure:

```
┌─ PageHeader (title + search + export + import buttons) ─────────────┐
│  ┌─ ColumnFilterDropdown (column visibility toggle) ──────────────┐  │
│  │                                                                │  │
│  │  ┌──────────┬──────────┬──────────┬──────────┬──────────────┐ │  │
│  │  │ Column 1 │ Column 2 │ Status   │ Date     │ Actions      │ │  │
│  │  ├──────────┼──────────┼──────────┼──────────┼──────────────┤ │  │
│  │  │ DATA     │ DATA     │ BADGE    │ date     │ Edit Delete  │ │  │
│  │  └──────────┴──────────┴──────────┴──────────┴──────────────┘ │  │
│  └────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

Rules:
- Use `src/components/ui/table.tsx` (Radix-based) for all tables
- Status column always uses `StatusBadge` component
- Action column contains only icon buttons (no labels), with `Tooltip` on hover
- `EmptyState` renders when data array is empty
- Pagination: not yet implemented — all data rendered (adequate for mock scale)

---

## 7. Modal Patterns

Three modal categories:

### Confirm/Destructive Modal
- **Component:** `DeleteConfirmModal` or `SecurityConfirmModal`
- **Size:** `max-w-md`
- **Structure:** Icon (destructive color) + title + description + item name (bold) + Cancel + Confirm buttons
- **Confirm button:** `variant="destructive"` (red)

### Form Modal
- **Components:** `NovaPecaModal`, `EditarPecaModal`, etc.
- **Size:** `max-w-2xl` to `max-w-4xl`
- **Structure:** Header with title + close button + scrollable form body + sticky footer with Cancel + Save
- **Form layout:** `space-y-4` with `Label` + `Input` pairs; grouped sections with separators

### Data Preview Modal
- **Components:** `ImportModal`, `ExportModal`
- **Size:** `max-w-4xl`
- **Structure:** Header + content area (table preview or format selector) + footer actions

### General Rules
- All modals use `src/components/ui/dialog.tsx` (Radix Dialog)
- Backdrop click closes non-destructive modals; destructive modals require explicit close
- Loading state shown with spinner or disabled buttons during async operations
- Error messages shown inside modal body (not toast) for form validation errors
- Success → close modal + show toast notification

---

## 8. Dashboard Standards

### StatCard
```
┌─────────────────────────────────┐
│  Title              [Icon]      │
│                                 │
│  Value (large, bold)            │
│  Sufixo                         │
│                                 │
│  ↑ +12% vs last period          │
└─────────────────────────────────┘
```
- `cor` prop: `'primary' | 'accent' | 'success' | 'warning'` — sets icon color
- `tipo` prop: `'aumento' | 'queda' | 'neutro'` — sets variation arrow direction and color
- Value displayed as formatted string (includes unit if `sufixo` set)

### Chart Standards
- All charts use **Recharts**
- BarChart for time-series production data
- PieChart for distribution data
- Colors follow brand palette: primary teal, accent navy, success green, warning amber
- Tooltips use `text-sm` with PT-BR labels

---

## 9. Animation Standards

All animations use either Framer Motion (complex transitions) or CSS keyframes (simple entries).

### Framer Motion Usage
- Sidebar collapse/expand — width and opacity animated
- Sidebar item entry — stagger children with `variants`
- Modal overlay — opacity fade
- Dropdown menus — height/opacity on open/close

### CSS Keyframe Animations
- `animate-fade-in` (0.4s ease-out) — page content entry
- `animate-slide-in-left` (0.3s ease-out) — sidebar items
- `animate-shimmer` (2s infinite) — skeleton loading states

### Rules
- No animation on every hover — reserve for meaningful state changes
- Animation duration: max 400ms for UI transitions; 300ms preferred
- Never animate core data content — only structural/layout elements
- Respect `prefers-reduced-motion` — Framer Motion handles this automatically

---

## 10. Sidebar Design

- **Expanded width:** 240px | **Collapsed width:** 64px (icon only)
- **Background:** `linear-gradient(180deg, #515151 0%, #424242 100%)` (same in both themes)
- **Collapse trigger:** arrow button at bottom-right
- **Active item:** `rgba(255,255,255,0.13)` background + white text
- **Hover item:** `rgba(255,255,255,0.07)` background
- **Badge:** navy `#000080` background, white text, `text-xs` font
- **Icons:** Lucide React — 20px (expanded) / 24px (collapsed)
- **Logo area:** Top section with app name — hidden in collapsed state

---

## 11. Topbar Design

- **Height:** 56px sticky
- **Background:** `bg-card` with `border-b border-border`
- **Left:** hamburger / breadcrumb area
- **Right:** theme toggle → notifications bell → user avatar + dropdown
- **User dropdown:** shows nome, cargo label, department; contains logout + cargo switcher (dev)
- **Notifications:** unread count badge; dropdown lists recent `Notificacao[]`

---

## 12. Form Standards

- **Labels:** always above inputs, `text-sm font-medium`
- **Required indicator:** asterisk `*` in `text-destructive` after label
- **Inputs:** `src/components/ui/input.tsx` — full width, `h-10`, `text-sm`
- **Select:** `src/components/ui/dropdown-menu.tsx` — consistent appearance
- **Textarea:** same styling as input, `resize-none`, fixed height
- **Error state:** `border-destructive` + `text-destructive text-xs` message below field
- **Disabled state:** `opacity-50 cursor-not-allowed`

---

## 13. Badge / Status Standards

`StatusBadge` component maps status strings to colored pills:

```tsx
<StatusBadge status="operando" />  // → green pill "Operando"
<StatusBadge status="pausado" />   // → amber pill "Pausado"
<StatusBadge status="erro" />      // → red pill "Erro"
```

Standard `badge.tsx` (Radix-based) used for: cargo labels, category labels, version tags. Variants: `default`, `secondary`, `destructive`, `outline`.

---

## 14. Responsive Behavior

| Breakpoint | Behavior |
|-----------|---------|
| `< sm` (640px) | Single column layouts; sidebar auto-collapses; modals full-screen |
| `sm` (640px+) | 2-column grids for KPI cards |
| `lg` (1024px+) | 4-column KPI grids; sidebar always visible |
| `xl` (1280px+) | Full layout; all columns visible in tables |

- `useMediaQuery` hook drives programmatic breakpoint detection
- Sidebar: collapses to icon-only on `< lg`; fully hidden with overlay on mobile
- Tables: horizontal scroll on mobile via `overflow-x-auto` wrapper
- Modals: `max-w-[95vw]` cap on small screens

---

## 15. PageHeader Component

Used at the top of every module page:

```tsx
<PageHeader
  title="Peças"
  description="Gestão do catálogo de peças"
  actions={[
    { label: 'Importar', icon: Upload, onClick: openImport, requiresEdit: true },
    { label: 'Exportar', icon: Download, onClick: openExport },
    { label: 'Nova Peça', icon: Plus, onClick: openCreate, requiresEdit: true },
  ]}
  module="pecas"
/>
```

- `requiresEdit: true` → action hidden if `canEdit(module)` returns false
- Always includes search input if `onSearch` prop provided
- Count badge shows total records if `count` prop provided

---

## 16. Icons

All icons from **Lucide React** exclusively. Never mix icon libraries.

Common usage:
- Plus → add/create
- Pencil → edit
- Trash2 → delete
- Upload → import
- Download → export
- Search → search
- Filter → filter
- ChevronDown → dropdown
- X → close
- Check → confirm/success
- AlertTriangle → warning
- Ban → blocked
- QrCode → QR generation
