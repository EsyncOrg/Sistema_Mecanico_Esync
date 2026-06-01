# Orçamentos Module

*Esync ERP — Commercial Quoting System*
*Phase 1 implemented: 2026-06-01 | Phase 2A implemented: 2026-06-01*

---

## 1. Purpose

The Orçamentos module manages the full commercial quoting lifecycle: from initial proposal creation, through client negotiation and approval, to conversion into a production order. It is the commercial entry point of the industrial flow.

**Business flow position:**
```
Orçamento (proposta) → Aprovado → Desenvolvimento (OS) → Programação → Produção
```

**Route:** `/orcamentos`
**Module ID:** `orcamentos`
**Nav position:** Second in sidebar, directly after Dashboard

---

## 2. Data Model

### 2.1 `Orcamento` (main entity)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Future: Supabase UUID |
| `numero` | `string` | Human code — `ORC-{YEAR}-{SEQ}` |
| `titulo` | `string` | Quote title |
| `status` | `StatusOrcamento` | See §3 |
| `prioridade` | `PrioridadeOrcamento` | `alta \| media \| baixa` |
| `moeda` | `MoedaOrcamento` | `BRL \| USD \| EUR` |
| `cliente` | `ClienteResumo` | Embedded client summary |
| `itens` | `OrcamentoItem[]` | Line items |
| `revisoes` | `OrcamentoRevisao[]` | Revision history |
| `historico` | `OrcamentoHistorico[]` | Activity log |
| `conjuntoIds` | `string[]` | Links to Conjuntos module |
| `solicitacaoProducaoId` | `string?` | Link to Desenvolvimento (set on approval) |
| `programacaoId` | `string?` | Link to Programação |
| `valorTotal` | `number` | Sum of all item totals (BRL) |
| `validadeAte` | `Date` | Quote expiry date |
| `condicoesPagamento` | `string?` | e.g. "30/60/90 dias" |
| `prazoEntrega` | `string?` | e.g. "15 dias úteis" |
| `revisaoAtual` | `number` | Current revision number (0 = original) |
| `responsavel` | `string` | Future: `userId` FK |
| `criadoEm` | `Date` | |
| `atualizadoEm` | `Date` | Auto-updated on every mutation |
| `enviadoEm` | `Date?` | Set when status → enviado |
| `aprovadoEm` | `Date?` | Set when status → aprovado |
| `reprovadoEm` | `Date?` | Set when status → reprovado |
| `canceladoEm` | `Date?` | Set when status → cancelado |

### 2.2 `OrcamentoItem` (line item)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Future: Supabase UUID |
| `orcamentoId` | `string` | FK → `orcamentos.id` |
| `tipo` | `TipoItemOrcamento` | `peca \| conjunto \| servico \| material \| hora_maquina \| outro` |
| `pecaId` | `string?` | FK → `pecas.id` |
| `conjuntoId` | `string?` | FK → `conjuntos.id` |
| `maquinaId` | `string?` | FK → `maquinas.id` (machine time billing) |
| `codigo` | `string?` | Manual code (if no ERP link) |
| `descricao` | `string` | Item description |
| `unidade` | `string` | `un \| kg \| m² \| h \| conjunto` |
| `quantidade` | `number` | |
| `valorUnitario` | `number` | Unit price |
| `valorTotal` | `number` | `quantidade × valorUnitario` (computed) |
| `posicao` | `number` | Sort order |
| `observacoes` | `string?` | |

### 2.3 `ClienteResumo` (embedded client)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Future: FK → `clientes.id` |
| `nome` | `string` | |
| `email` | `string?` | |
| `telefone` | `string?` | |
| `cnpj` | `string?` | |
| `contatoPrincipal` | `string?` | |

### 2.4 `OrcamentoRevisao` (revision snapshot)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | |
| `orcamentoId` | `string` | FK → `orcamentos.id` |
| `numero` | `number` | Incremental: 1, 2, 3… |
| `criadoEm` | `Date` | |
| `criadoPor` | `string` | Future: `userId` FK |
| `motivo` | `string` | Reason for revision |
| `snapshot` | `object` | Frozen copy of items + total + notes + validity |

### 2.5 `OrcamentoHistorico` (activity log)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | |
| `orcamentoId` | `string` | FK → `orcamentos.id` |
| `tipo` | `TipoHistoricoOrcamento` | `criacao \| edicao \| envio \| aprovacao \| reprovacao \| cancelamento \| revisao \| comentario` |
| `descricao` | `string` | Human-readable log entry |
| `usuario` | `string` | Future: `userId` FK |
| `timestamp` | `Date` | |
| `dados` | `Record<string,unknown>?` | Serializable extra payload |

---

## 3. Status Model & Lifecycle

```
em_elaboracao ──→ enviado ──→ aprovado
      │               │
      │           reprovado
      │
   cancelado (from any state)
```

| Status | PT-BR | Description | Next States |
|--------|-------|-------------|-------------|
| `em_elaboracao` | Em Elaboração | Draft — being built | enviado, cancelado |
| `enviado` | Enviado | Sent to client, awaiting response | aprovado, reprovado, cancelado |
| `aprovado` | Aprovado | Approved — triggers production integration | (terminal / reabrir) |
| `reprovado` | Reprovado | Rejected by client | (terminal / reabrir) |
| `cancelado` | Cancelado | Cancelled | (terminal) |

**Reopen:** Any terminal state can be reopened via `reabrirOrcamento()` → returns to `em_elaboracao`. A new revision is automatically created.

---

## 4. Priority Model

| Value | PT-BR | Color |
|-------|-------|-------|
| `alta` | Alta | `text-destructive` (red) |
| `media` | Média | `text-warning` (amber) |
| `baixa` | Baixa | `text-muted-foreground` (gray) |

---

## 5. Item Types

| Type | PT-BR | ERP Link |
|------|-------|----------|
| `peca` | Peça | `pecaId` → Peças module |
| `conjunto` | Conjunto | `conjuntoId` → Conjuntos module |
| `servico` | Serviço | Manual (no ERP link) |
| `material` | Material | Manual |
| `hora_maquina` | Hora Máquina | `maquinaId` → Máquinas module |
| `outro` | Outro | Manual |

---

## 6. Permission Matrix

| Cargo | orcamentos |
|-------|-----------|
| Mecânica (admin) | ✅ full |
| Operador Corte | — no access |
| PCP | 👁 view |
| Engenharia | 👁 view |
| Produção | — no access |
| Qualidade | — no access |
| Administrativo | ✅ full |

**Rationale:** Only commercial/administrative roles create/edit quotes. Production operators and quality inspectors have no business accessing commercial pricing. PCP and Engineering have view access to understand what is approved for production.

---

## 7. Context API (`OrcamentosContext`)

### State
- `orcamentos: Orcamento[]` — full list from mock / future Supabase
- `filtros: OrcamentoFiltros` — active filter state
- `filtrados: Orcamento[]` — context-filtered list (computed)
- `analytics: OrcamentosAnalytics` — computed KPIs

### Actions
```typescript
// CRUD
criarOrcamento(input: NovoOrcamentoInput): Orcamento
atualizarOrcamento(id, changes: Partial<Orcamento>): void
excluirOrcamento(id): void
getById(id): Orcamento | undefined

// Status lifecycle
enviarOrcamento(id): void
aprovarOrcamento(id): void
reprovarOrcamento(id, motivo): void
cancelarOrcamento(id, motivo): void
reabrirOrcamento(id): void

// Revision control
criarRevisao(id, motivo): OrcamentoRevisao

// Items
adicionarItem(orcamentoId, item): void
removerItem(orcamentoId, itemId): void
atualizarItem(orcamentoId, itemId, changes): void
```

### Analytics (`OrcamentosAnalytics`)
All computed via `useMemo` from the `orcamentos` array:
- Counts per status
- `valorTotalAprovado` — sum of approved quote totals
- `valorTotalEnviado` — sum of sent-pending quote totals
- `taxaAprovacao` — `aprovados / (aprovados + reprovados) × 100`
- `ticketMedio` — average value of approved quotes

---

## 8. Entity Relationships

```
Orcamento
  ├── ClienteResumo       (embedded; future FK → clientes table)
  ├── OrcamentoItem[]
  │     ├── pecaId?       → Peças module (Peca entity)
  │     ├── conjuntoId?   → Conjuntos module (Conjunto entity)
  │     └── maquinaId?   → Máquinas module (Maquina entity)
  ├── OrcamentoRevisao[]  (append-only snapshots)
  ├── OrcamentoHistorico[] (append-only activity log)
  ├── conjuntoIds[]       → Conjuntos module
  ├── solicitacaoProducaoId → Desenvolvimento module (on approval)
  └── programacaoId       → Programação module (on production start)
```

---

## 9. Files Structure

```
src/
├── types/
│   └── orcamentos.ts                    # All TypeScript interfaces (14 types)
├── mocks/
│   └── orcamentos.ts                    # 4 sample quotes (all statuses)
├── contexts/
│   └── OrcamentosContext.tsx            # Provider + useOrcamentos hook
│                                        # Exposes proximoNumero for modal preview
├── components/orcamentos/               # ← Phase 2A
│   ├── NovoOrcamentoModal.tsx           # Create form with inline items table
│   └── OrcamentoDetalheModal.tsx        # Detail view: tabs + status workflow + history
└── app/(dashboard)/
    └── orcamentos/
        └── page.tsx                     # Full CRUD page with wired modals + live filters
```

**Modified files (Phase 1):**
- `src/types/permissions.ts` — added `'orcamentos'` to `ModuleId` and `ALL_MODULES`
- `src/lib/constants.ts` — added nav item (`FileText` icon) + status labels
- `src/components/layout/Sidebar.tsx` — added `FileText` to iconMap + route mapping
- `src/mocks/cargos.ts` — added `orcamentos` permissions to all 7 roles
- `src/app/layout.tsx` — registered `OrcamentosProvider` in the provider tree

**Modified files (Phase 2A):**
- `src/contexts/OrcamentosContext.tsx` — 5-digit number padding + `proximoNumero` in context value

---

## 10. Supabase Migration Strategy

### Tables required

```sql
-- Core tables
orcamentos
orcamento_itens
orcamento_revisoes
orcamento_historico
clientes                    -- New table (currently embedded as ClienteResumo)

-- Junction tables
orcamento_conjuntos         -- orcamento_id, conjunto_id
```

### Row Level Security (RLS)

```sql
-- All tables scoped to company
ALTER TABLE orcamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON orcamentos
  USING (empresa_id = (auth.jwt() ->> 'empresa_id'));
```

### Context migration pattern

```typescript
// Current (mock):
const [orcamentos, setOrcamentos] = useState<Orcamento[]>(mockOrcamentos)

// Future (Supabase):
const { data: orcamentos } = await supabase
  .from('orcamentos')
  .select(`
    *,
    itens: orcamento_itens(*),
    revisoes: orcamento_revisoes(*),
    historico: orcamento_historico(*)
  `)
  .eq('empresa_id', user.empresaId)
  .order('criado_em', { ascending: false })
```

### Audit log

```typescript
// Current: OrcamentoHistorico in-memory
// Future: INSERT into orcamento_historico table on every state change
// Can be triggered via Supabase DB function or edge function
```

---

## 11. Phase Roadmap

### Phase 1 — Foundation ✅ (current)
- TypeScript interfaces and data model
- Mock data (4 quotes, all statuses)
- OrcamentosContext with full CRUD and status lifecycle
- Page layout: KPI cards, financial strip, search/filter bar, table
- Sidebar integration and permissions

### Phase 2A — CRUD & Revision Control ✅ (current)
- `NovoOrcamentoModal` — full create form: client fields, project info, inline items table
- `OrcamentoDetalheModal` — tabbed detail view (Itens | Histórico | Revisões)
- Status workflow: Enviar → Aprovar / Reprovar / Cancelar → Reabrir (with inline confirm + motivo)
- Item management: add, edit inline, remove (protected when not em_elaboracao)
- Revision creation with motivo input; alphabetic labels (Rev. A, Rev. B…)
- History timeline: append-only, auto-logged on every state change
- Live filters: status tabs + search + prioridade + responsavel
- `proximoNumero` exposed from context for real-time preview in create modal
- 5-digit sequence: `ORC-2026-00001`

### Phase 2B — Catalog Integration & Commercial Dashboard ✅
- `CatalogSelectorModal` — search Peças + Conjuntos; auto-fills item fields
- Catalog button in `NovoOrcamentoModal` and `OrcamentoDetalheModal` (edit mode)
- `pecaId` / `conjuntoId` stored on `OrcamentoItem` when sourced from catalog
- 4 financial KPI cards (Valor Total, Aprovado, Em Aberto, Ticket Médio)
- Extended filters: cliente, data criação, data validade
- `valorTotal` added to analytics; `validadeInicio`/`validadeFim` added to filters

### Phase 3 — Professional Commercial PDF ✅ (current)
- `gerarPdfOrcamento()` — portrait A4 commercial document, zero SSR bundle impact
- Triggered from: "Gerar PDF" button in detail modal footer + table row action
- PDF sections: header, destinatário, objeto, itens table (auto page break), resumo financeiro, condições comerciais, histórico de revisões
- Filename pattern: `ORCAMENTO_ORC-2026-00001_REV-A.pdf`
- New `Orcamento` fields: `garantia`, `condicoesComerciais`, `observacoesComerciais`
- Future extension hooks commented at every injection point (logo, QR, signature, cost breakdown)

### Phase 4 — Production Conversion
- "Converter em OS" button (approved quote → `SolicitacaoProducao` in Desenvolvimento)
- Auto-populate production request from approved quote items
- Email delivery via SendGrid/Resend (future)

### Phase 5 — Dashboard & Analytics
- Commercial dashboard: monthly revenue forecast, win rate, pipeline value
- Quote-to-production conversion rate
- Top clients by quote value
- Average time to approval per responsavel
- Integration with Esync IA for commercial pattern analysis
- Expiry alerts (5 days before validity date) → Dashboard + notifications

---

## 12. Architecture Decisions

### Embedded `ClienteResumo` vs. separate `Clientes` module
**Decision:** Embed client data inside `Orcamento` for Phase 1.
**Rationale:** No `Clientes` module exists yet. Embedding avoids a new module dependency while keeping the data model forward-compatible (the `id` field maps to a future `clientes` Supabase table).
**Migration path:** Phase 3 adds a `ClienteModal` + `clientes` table; all existing `ClienteResumo.id` values become valid FKs.

### `valorTotal` as stored field vs. computed
**Decision:** Store `valorTotal` on `Orcamento` and `OrcamentoItem`.
**Rationale:** Simplifies queries and avoids re-calculation on every read. Kept in sync by `recalcTotal()` helper in context.
**Risk:** Denormalization — mitigated by always recalculating in `atualizarOrcamento`.

### Append-only `OrcamentoHistorico`
**Decision:** The history log is never mutated — only appended.
**Rationale:** Provides tamper-evident audit trail. Aligns with future Supabase RLS where only INSERT is allowed on the history table (no UPDATE/DELETE).

### Context-level filtering vs. server-side filtering
**Decision:** Phase 1 filters in-memory via `useMemo`.
**Migration path:** Phase 5 moves filters to Supabase query parameters with indexed columns for performance.

### Number format: `ORC-{YEAR}-{SEQ}`
**Decision:** `ORC-2026-00001`, `ORC-2026-00002`, etc. (5-digit, updated in Phase 2A).
**Rationale:** Year prefix prevents collision across fiscal years. 5-digit sequence supports up to 99,999 quotes per year. Future: Supabase sequence resets per year.

### Alphabetic revision labels (Phase 2A)
**Decision:** `revisaoAtual: number` stored internally (0, 1, 2…), displayed as letters (Rev. A, Rev. B, Rev. C…).
**Rationale:** Alphabetic labels are the industry standard for engineering revision control. Numeric storage makes arithmetic easy (increment, compare); display conversion is a pure `String.fromCharCode(65 + n)` function exported from `OrcamentoDetalheModal.tsx` as `revisionLabel()`.

### Edit items only when `em_elaboracao`
**Decision:** Item editing is locked when status ≠ `em_elaboracao`.
**Rationale:** Sent or approved quotes are legal documents — items must not change without a formal revision. When a revision is created, the old state is snapshotted and status returns to `em_elaboracao`, enabling editing again.

### `proximoNumero` in context (Phase 2A)
**Decision:** The next quote number is a computed `useMemo` value exposed in the context interface.
**Rationale:** The create modal needs to show the auto-generated number as a real-time preview before the quote is saved. Keeping the computation in the context ensures a single source of truth and prevents race conditions when multiple quotes are created in the same session.

### Portrait A4 for commercial PDF, landscape for module reports (Phase 3)
**Decision:** `gerarPdfOrcamento` uses portrait A4 (210×297mm). All other `exportPDF` calls use landscape A4 (297×210mm).
**Rationale:** Commercial documents (proposals, invoices) are universally portrait. Data tables (Peças, Estoque, etc.) are landscape for column density. The same jsPDF+autoTable infrastructure serves both — only orientation differs.

### Dynamic imports for PDF utility (Phase 3)
**Decision:** `gerarPdfOrcamento` uses `await Promise.all([import('jspdf'), import('jspdf-autotable')])`.
**Rationale:** Same pattern as `exportUtils.ts`. Keeps jsPDF (~200 kB) out of the initial JS bundle — it's only loaded when the user clicks "Gerar PDF". Zero SSR impact since it's called from a browser `onClick`.

### Pure utility function, no React (Phase 3)
**Decision:** `gerarPdfOrcamento` is in `src/lib/orcamentos/` with no React imports.
**Rationale:** A pure async function is testable without mounting components. It accepts an `Orcamento` value object, making it compatible with any data source: mock state, Supabase response, or a direct API response in future server actions.

### `revisionLabel()` duplicated in PDF utility (Phase 3)
**Decision:** The letter-conversion function is replicated in `gerarPdfOrcamento.ts` rather than imported from `OrcamentoDetalheModal.tsx`.
**Rationale:** Importing a pure function from a React component file would create an unnecessary dependency from a lib utility on a UI module. The 3-line function is a stable algorithm unlikely to diverge.

---

## 13. PDF Architecture (Phase 3)

### File
`src/lib/orcamentos/gerarPdfOrcamento.ts`

### PDF Layout — Portrait A4 (210 × 297 mm)

```
0mm ─────────────────────────────────────────────── 210mm
│  HEADER (0–44mm)                                       │
│  ┌─────────────────────────────────────────────────┐  │
│  │ [orange 5mm] ESYNC          PROPOSTA COMERCIAL  │  │
│  │             Sistema Mecânico   ORC-2026-00001   │  │
│  │                                  Rev. A          │  │
│  ├─────────────────────────────────────────────────┤  │
│  │ INFO STRIP: Emissão · Validade · Responsável    │  │
│  └─────────────────────────────────────────────────┘  │
│  DESTINATÁRIO (≈30mm, dynamic)                        │
│  OBJETO DO ORÇAMENTO (≈25mm, dynamic)                 │
│  ITENS DO ORÇAMENTO — autoTable (auto page break)     │
│  RESUMO FINANCEIRO (28mm fixed)                       │
│  CONDIÇÕES COMERCIAIS (dynamic, hidden if empty)      │
│  HISTÓRICO DE REVISÕES (dynamic)                      │
│  FOOTER (bottom 12mm, all pages)                      │
│  ─ pág. X / Y ─────────────────────────────── ESYNC ─│
297mm ──────────────────────────────────────────────────│
```

### Section rendering

Each section uses a **y-cursor** approach:
- `y` starts at `HDR (44) + INFO_STRIP (13) + 6 = 63mm`
- Each section function returns the new `y` after rendering
- `guardPageBreak(doc, y, neededMm, orcamento)` adds a page when content won't fit
- On new pages: `drawMiniHeader()` repeats a compact 10mm teal header

### Color constants

| Name | RGB | Usage |
|------|-----|-------|
| `teal` | `(10, 58, 74)` | Header bg, section labels, table header |
| `orange` | `(224, 115, 25)` | Left accent bar (all pages) |
| `dark` | `(20, 35, 52)` | Main body text |
| `muted` | `(100, 120, 140)` | Field labels, secondary text |
| `bgLight` | `(239, 244, 248)` | Section backgrounds |
| `bgZebra` | `(245, 249, 252)` | Alternating table rows |

### Items table columns

| Col | Width | Align | Style |
|-----|-------|-------|-------|
| `#` | 7mm | center | normal |
| CÓDIGO | 22mm | center | **bold**, teal color |
| DESCRIÇÃO | 73mm | left | linebreak overflow |
| QTD. | 14mm | center | normal |
| UN. | 12mm | center | normal |
| VLR. UNIT. | 27mm | right | normal |
| TOTAL | 27mm | right | **bold** |

Total table width = 182mm (UW = 210 − 14 × 2).

### Financial summary block

```
┌─ RESUMO FINANCEIRO ──────────────────────────────┐
│  Quantidade de itens:              5              │
│  Subtotal:                 R$ 9.990,00            │
│  Desconto: —    Frete: —    Impostos: —           │
│  ────────────────────────────────────────────     │
│  TOTAL GERAL:         [ R$ 9.990,00 ] ←teal box  │
└───────────────────────────────────────────────────┘
```

Placeholders (`Desconto: —`, `Frete: —`, `Impostos: —`) are rendered as visible but inactive. `[HOOK:FINANCEIRO_EXTRA]` marks the injection point for Phase 5 cost breakdown.

### Export filename pattern

```
ORCAMENTO_{numero}_{REV-X}.pdf
```

Example: `ORCAMENTO_ORC-2026-00001_REV-A.pdf`

### Future extension hooks

Every future feature has a comment marking the injection point:

| Hook | Location | Future use |
|------|----------|-----------|
| `[HOOK:LOGO]` | Header, left side | Replace "ESYNC" text with `addImage(logoDataUrl)` |
| `[HOOK:QR]` | Header, right side | QR code linking to quote public URL |
| `[HOOK:CLIENTE_LOGO]` | Client section | Customer logo addImage |
| `[HOOK:FINANCEIRO_EXTRA]` | Financial summary | Discount, freight, tax rows |
| `[HOOK:COST_BREAKDOWN]` | After items table | Material + labor cost per item |
| `[HOOK:SIGNATURE]` | Before footer | Digital signature block |
| `[HOOK:APPROVAL]` | Overlay | "APROVADO" stamp on approved quotes |

### Supabase compatibility

`gerarPdfOrcamento(orcamento: Orcamento)` accepts the domain type directly. When Supabase is integrated:
```typescript
// In a server action or API route:
const { data: orc } = await supabase
  .from('orcamentos')
  .select('*, itens:orcamento_itens(*), revisoes:orcamento_revisoes(*), historico:orcamento_historico(*)')
  .eq('id', id)
  .single()

// Then on client after receiving data:
await gerarPdfOrcamento(orc as Orcamento)
```

No changes to the PDF function itself are needed for Supabase migration.

### New `Orcamento` fields (Phase 3)

| Field | Type | Purpose |
|-------|------|---------|
| `garantia` | `string?` | Warranty terms shown in PDF |
| `condicoesComerciais` | `string?` | General commercial conditions (multi-line) |
| `observacoesComerciais` | `string?` | Commercial notes shown in PDF |

These fields already existed in `NovoOrcamentoInput` (Phase 3 update) and are stored on the `Orcamento` entity. Existing mock data for ORC-2026-001 includes sample values for `garantia` and `condicoesComerciais`.
