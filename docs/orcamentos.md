# Orçamentos Module

*FORGE ERP — Commercial Quoting System*
*Phase 1 implemented: 2026-06-01 · Phase 2A: 2026-06-01 · Phase 3 PDF v2: 2026-06-01*
*Phase 7.2 Mandatory Config-First Creation: 2026-06-08*
*Phase 7.3 Catalog-Driven BOM (data integrity): 2026-06-08*
*Phase 8 Commercial Pricing Engine: 2026-06-10*

---

## 1. Purpose

The Orçamentos module manages the full commercial quoting lifecycle: from initial proposal creation, through client negotiation and approval, to conversion into a production order. It is the commercial entry point of the industrial flow.

**Business flow position:**
```
Orçamento (proposta) → Aprovado → Desenvolvimento (OS) → Programação → Produção
```

**Phase 7.2 critical rule:** A quotation MUST NOT be created without all material/configuration selections already made. Costs must be known before creation.

**Route:** `/orcamentos`
**Module ID:** `orcamentos`
**Nav position:** Second in sidebar, directly after Dashboard

---

## 1.1 Phase 7.2 — Creation-First Configuration Flow

### Previous flow (incorrect)
```
Create quotation → Add item → Save → Open → Select materials → Cost appears
```

### New mandatory flow (Phase 7.2)
```
New Quotation
  → Add piece/conjunto
  → Select manufacturing configuration (inline, during creation)
  → Cost calculated instantly
  → Totals and margin updated instantly
  → Create Quotation (BLOCKED until all catalog items are configured)
```

### Blocking rules (NovoOrcamentoModal)
"Criar Orçamento" is disabled when:
- Any `tipo='peca'` item with `pecaId` has no `configuracaoFabricacaoId` selected
- Any `tipo='conjunto'` item has catalog-linked pieces (`peca.pecaId` set) without config
- Standard validations fail (client name, title, validity date, item descriptions)

### Live cost display
- **Per catalog peca item:** unit cost from `CustoPecaBreakdown.custoTotal` for the selected config
- **Per conjunto item:** assembly cost from `calcularCustoConjunto()` for all selected configs
- **Summary panel:** Total Custo Calculado | Total Orçado (valorUnitario) | Margem %

### Auto-fill on config selection
When a configuration is selected for a catalog item:
- `valorUnitario` is automatically set to `custoCalculado` (user can override)
- Assembly total cost triggers a recompute of `valorUnitario` for conjunto items

### Snapshot on creation
After `criarOrcamento()` returns, `registrarSelecoesCriacao()` is called immediately:
- For `tipo='peca'` items: creates a `PecaItemSelecao` with `configuracaoFabricacaoId`
- For `tipo='conjunto'` items: creates `OrcamentoItemConfiguracao[]` + `ConjuntoCostSnapshot`
- These snapshots become the baseline for revisions, PDF generation, and production conversion

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

### Phase 3 — Professional Commercial PDF ✅ (current, v2 refactored)
- `gerarPdfOrcamento()` — portrait A4 commercial document, zero SSR bundle impact
- Triggered from: "Gerar PDF" button in detail modal footer + table row action
- PDF sections: header, destinatário, objeto, itens table (auto page break), resumo financeiro, condições comerciais, histórico de revisões
- Filename pattern: `ORCAMENTO_ORC-2026-00001_REV-A.pdf`
- New `Orcamento` fields: `garantia`, `condicoesComerciais`, `observacoesComerciais`
- Future extension hooks commented at every injection point (logo, QR, signature, cost breakdown)
- **v2 refactor:** section-based architecture — each section pre-calculates height, `checkSpace()` prevents all overlaps; commercial terms rendered as teal-accented card-per-field; revision history uses badge system (no Unicode corruption); financial summary has dominant TOTAL GERAL pill; typography hierarchy enforced at every level

### Phase 4 — Production Conversion ✅ (current)
- "Converter para Produção" button — available in detail modal footer + table row action
- Visible and enabled only when `status === 'aprovado'` and `canEdit('orcamentos')`
- Confirmation modal shows: número, cliente, valor total, quantidade de itens, revisão
- Creates `SolicitacaoProducao` in `DesenvolvimentoContext` with full traceability
- OS number auto-derived: `OS:CONV-{orcamento.numero.replace('ORC-', '')}`
- All `OrcamentoItem` fields transferred → `PecaSolicitacao[]` with `pecaId`, `conjuntoId`, `maquinaId` preserved
- `Orcamento` updated: `convertidoParaProducao`, `dataConversao`, `responsavelConversao`, `solicitacaoProducaoId`
- Audit history entry `tipo: 'conversao'` appended to `OrcamentoHistorico`
- 3 new dashboard KPI cards: Convertidos, Conversões no Mês, Aguardando Conversão
- Future extension hooks: `[HOOK:ENGENHARIA_GATE]`, `[HOOK:ESTRUTURA_AUTO]`, `[HOOK:CUSTO_CALC]`, `[HOOK:MAQUINA_ALLOC]`, `[HOOK:EMAIL_NOTIFY]`

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

## 13. PDF Architecture (Phase 3 — v2)

### File
`src/lib/orcamentos/gerarPdfOrcamento.ts`

### PDF Layout — Portrait A4 (210 × 297 mm)

```
0mm ─────────────────────────────────────────────── 210mm
│  HEADER BLOCK (0–47mm)                                 │
│  ┌─────────────────────────────────────────────────┐  │
│  │ [orange 5mm] ESYNC          PROPOSTA COMERCIAL  │  │
│  │              tagline          ORC-2026-00001    │  │
│  │                                 Revisao A       │  │
│  │                         [APROVADO chip if set]  │  │
│  ├─────────────────────────────────────────────────┤  │
│  │ INFO STRIP (14mm): Emissao  Validade  Resp.     │  │
│  └─────────────────────────────────────────────────┘  │
│  content y starts at 68mm                             │
│                                                        │
│  ┌── DESTINATARIO card (dynamic, ~40mm) ────────────┐ │
│  │  teal label + client fields                      │ │
│  └──────────────────────────────────────────────────┘ │
│  ┌── OBJETO DO ORCAMENTO card (dynamic) ─────────────┐│
│  │  teal label + title (11pt bold) + desc + obs     ││
│  └───────────────────────────────────────────────────┘│
│  ── ITENS DO ORCAMENTO  (autoTable, multi-page) ───── │
│  ┌── RESUMO FINANCEIRO card (47mm fixed) ────────────┐│
│  │  qty  subtotal  placeholders  ━━━━━  [TOTAL] pill ││
│  └───────────────────────────────────────────────────┘│
│  ┌── CONDICOES COMERCIAIS (card-per-field) ───────────┐│
│  │  each term = teal-stripe card, checkSpace guarded ││
│  └───────────────────────────────────────────────────┘│
│  ┌── HISTORICO DE REVISOES (card, dynamic rows) ─────┐│
│  │  table header + badge rows + ATUAL orange pill    ││
│  └───────────────────────────────────────────────────┘│
│  FOOTER (bottom 12mm, every page)                     │
│  ─ pag. X / Y ───────────────────────────── ESYNC ─  │
297mm ──────────────────────────────────────────────────│
```

### Rendering flow (v2 — section-based)

```
gerarPdfOrcamento(orcamento)
  drawFullHeader(doc, orc)          // always page 1
  y = CONTENT_START (68mm)

  checkSpace(doc, y, 48, orc)       // client section
  y = renderClientSection(...)

  checkSpace(doc, y, 40, orc)       // project section
  y = renderProjectSection(...)

  checkSpace(doc, y, 35, orc)       // items label
  sectionLabel(...)
  autoTable(...)                    // multi-page, didDrawPage → drawMiniHeader
  y = lastAutoTable.finalY + 9

  checkSpace(doc, y, 52, orc)       // financial
  y = renderFinancialSummary(...)

  renderCommercialTerms(...)        // each card calls checkSpace internally
    checkSpace(doc, y, 12+firstCardH, orc)  // label + first card together
    forEach card → checkSpace(doc, y, cardH+2, orc)

  renderRevisionHistory(...)        // calls checkSpace for entire block
    checkSpace(doc, y, boxH, orc)

  // post-loop footer pass
  for p in 1..totalPages → drawFooter(doc, p, total, orc)
```

### Page-break guard

```typescript
function checkSpace(doc, y, needed, orc): number {
  if (y + needed <= SAFE_BOTTOM) return y   // fits — no change
  doc.addPage()
  drawMiniHeader(doc, orc)
  return MINI_H + 8                         // cursor at top of new content area
}
```

`SAFE_BOTTOM = PH − FOOT_H − 4 = 281mm`. Every section, every card, and the items-table margin all respect this boundary.

### Height pre-calculation

Before any section draws, it measures its required height:

| Section | Method |
|---------|--------|
| Client | `fieldCount × 6mm + 15mm` fixed overhead |
| Project | `measureText()` for description + observations |
| Financial | Fixed `47mm` |
| Each commercial term card | `measureText()` for multi-line; `13mm` for single-line |
| Revision history | `25mm + rows × 7.5mm` |

`measureText(doc, text, maxW, fontSize)` — calls `splitTextToSize` without drawing, returns mm height. Zero drawing side-effects.

### Typography hierarchy

| Level | Font | Size | Usage |
|-------|------|------|-------|
| Logo | Helvetica Bold | 22pt | ESYNC logotype |
| Document title | Helvetica Bold | 15pt | PROPOSTA COMERCIAL |
| Quote number | Helvetica Bold | 9.5pt | ORC-2026-00001 |
| Section title | Helvetica Bold | 11pt | Quote title in Objeto |
| Section label | Helvetica Bold | 6.5pt | DESTINATARIO, ITENS… |
| Field label | Helvetica Bold | 7pt | Cliente:, Validade: |
| Body text | Helvetica Normal | 8pt | Descriptions, values |
| Table header | Helvetica Bold | 6.5pt | Column headers |
| Table body | Helvetica Normal | 8pt | Item rows |
| Footer | Helvetica Normal | 5.5–7pt | Page number, notice |

### Color constants

| Name | RGB | Usage |
|------|-----|-------|
| `teal` | `(10, 58, 74)` | Header bg, section labels, table header, rev badge |
| `orange` | `(224, 115, 25)` | Left accent bar, "ATUAL" revision badge |
| `dark` | `(22, 36, 54)` | Body text, values |
| `muted` | `(95, 118, 140)` | Field labels, secondary text |
| `mutedLt` | `(148, 170, 188)` | Placeholder rows, tertiary text |
| `tealLight` | `(165, 210, 228)` | Header secondary text, table header text |
| `bgCard` | `(244, 248, 252)` | Card fills |
| `bgLight` | `(236, 243, 248)` | Section alternating card fill |
| `bgZebra` | `(249, 252, 255)` | Table zebra rows |
| `borderLt` | `(216, 230, 240)` | Card outlines |
| `success` | `(20, 130, 82)` | Approved status chip |

### Items table columns

| Col | Width | Align | Style |
|-----|-------|-------|-------|
| `#` | 7mm | center | normal |
| CODIGO | 22mm | center | **bold**, teal |
| DESCRICAO | 73mm | left | linebreak overflow, 10mm min height |
| QTD. | 14mm | center | normal |
| UN. | 12mm | center | normal |
| VLR. UNIT. | 27mm | right | normal |
| TOTAL | 27mm | right | **bold** |

Total = 182mm = UW. Cell padding: 3.5mm top/bottom, 3mm left/right. `minCellHeight: 10mm`. `showHead: 'everyPage'`. `rowPageBreak: 'avoid'`.

### Financial summary (v2 — dominant TOTAL)

```
┌─ RESUMO FINANCEIRO ────────────────────────────────────┐
│  Quantidade de itens:                           5       │
│  Subtotal:                             R$ 9.990,00     │
│  Desconto: -    Frete: -    Impostos: -                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  ┌─────────────────────────────────────────────────┐   │
│  │ TOTAL GERAL                   R$ 9.990,00       │   │  ← deep teal pill, 13pt value
│  └─────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────┘
```

### Commercial terms (v2 — card-per-field)

Each field renders as a separate card with a teal left-stripe accent. Cards alternate `bgCard` / `bgLight` fill for visual rhythm. Single-line fields (Prazo, Pagamento, Garantia) show value right-aligned on the label line. Multi-line fields (Condições, Observações) render value below the label. Every card calls `checkSpace` before drawing, so long sections flow across pages without overlap.

### Revision history (v2 — badge system, no Unicode)

```
┌─ HISTORICO DE REVISOES ────────────────────────────────┐
│  ┌──────────────────────────────────────────────────┐  │
│  │ teal header: REV.   DATA      MOTIVO             │  │
│  ├──────────────────────────────────────────────────┤  │
│  │ [A]   01/06/2026   Criacao inicial               │  │
│  │ [B]   15/06/2026   Ajuste de precos  [ATUAL]←orange│ │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

- Rev badge: teal filled (current) / bgLight filled (past) — no Unicode glyphs
- "ATUAL" orange rounded-rect badge on the current revision row
- Alternating row fill (bgZebra every odd row)
- Current row: highlighted blue tint + bold text
- All labels are plain ASCII — eliminates character corruption from jsPDF's WinAnsi encoding limitation

### Unicode safety note

jsPDF's built-in `helvetica` uses WinAnsi (Windows-1252) encoding. Portuguese accented characters (ã, â, ç, é, etc.) are in WinAnsi and render correctly. The v1 corruption was caused by `▶` (U+25B6), which is outside 0x00–0xFF. v2 eliminates all such glyphs — visual intent is achieved with filled rectangles and rounded-rects instead.

### Export filename pattern

```
ORCAMENTO_{numero}_{REV-X}.pdf
```

Example: `ORCAMENTO_ORC-2026-00001_REV-A.pdf`

### Future extension hooks

| Hook | Location | Future use |
|------|----------|-----------|
| `[HOOK:LOGO]` | Header, left | Replace "ESYNC" text with `addImage(logoDataUrl)` |
| `[HOOK:QR]` | Header, right | QR code → quote public URL |
| `[HOOK:CLIENTE_LOGO]` | Client section | Customer logo `addImage()` |
| `[HOOK:FINANCEIRO_EXTRA]` | Financial summary | Discount, freight, tax rows |
| `[HOOK:COST_BREAKDOWN]` | After items table | Per-item material + labour detail |
| `[HOOK:SIGNATURE]` | Before footer | Digital signature block |
| `[HOOK:APPROVAL]` | Overlay | "APROVADO" stamp on approved quotes |

### Supabase compatibility

`gerarPdfOrcamento(orcamento: Orcamento)` accepts the domain type directly — no changes needed at Supabase integration time:

```typescript
const { data: orc } = await supabase
  .from('orcamentos')
  .select('*, itens:orcamento_itens(*), revisoes:orcamento_revisoes(*), historico:orcamento_historico(*)')
  .eq('id', id).single()

await gerarPdfOrcamento(orc as Orcamento)   // works as-is
```

### New `Orcamento` fields (Phase 3)

| Field | Type | Purpose |
|-------|------|---------|
| `garantia` | `string?` | Warranty terms — rendered in commercial terms card |
| `condicoesComerciais` | `string?` | General conditions (multi-line card) |
| `observacoesComerciais` | `string?` | External commercial notes (multi-line card) |

### Stress-test notes

| Scenario | Behaviour |
|----------|-----------|
| 50+ items | autoTable pages automatically; `showHead: 'everyPage'`; `rowPageBreak: 'avoid'` |
| Long descriptions | `overflow: 'linebreak'` inside autoTable; wraps cleanly, no clipping |
| 10+ revisions | `checkSpace` moves entire revision block to a new page if needed |
| Long commercial terms | card-per-field loop; each card has independent `checkSpace` |
| All sections combined | `checkSpace` before every section; zero overlaps guaranteed |

---

## 14. Phase 4 Architecture — Orçamento → Produção

### Commercial → Engineering → Production bridge

```
Orçamento (APROVADO)
  │
  │  click "Converter para Produção"
  ▼
ConversaoProducaoModal       — confirmation + preview
  │
  │  1. criarSolicitacao()   — DesenvolvimentoContext
  │  2. registrarConversao() — OrcamentosContext
  ▼
SolicitacaoProducao (pendente)   → Desenvolvimento module
  +
Orcamento (aprovado + converted)  → history entry 'conversao'
```

### Files

| File | Role |
|------|------|
| `src/components/orcamentos/ConversaoProducaoModal.tsx` | Confirmation UI + coordination logic |
| `src/contexts/OrcamentosContext.tsx` | `registrarConversao()` action |
| `src/contexts/DesenvolvimentoContext.tsx` | `criarSolicitacao()` now returns `SolicitacaoProducao` |
| `src/types/orcamentos.ts` | `'conversao'` history type; `convertidoParaProducao`, `dataConversao`, `responsavelConversao`; conversion analytics |
| `src/types/desenvolvimento.ts` | `origem`, `origemId`, `numeroOrigem` on `SolicitacaoProducao`; `pecaId`, `conjuntoId`, `maquinaId`, `unidade` on `PecaSolicitacao` |

### Conversion rules

| Condition | Result |
|-----------|--------|
| `status !== 'aprovado'` | Button hidden — conversion blocked |
| `!canEdit('orcamentos')` | Button hidden — permission denied |
| `convertidoParaProducao === true` | Button shows "Ver Conversão" in success style; modal shows already-converted notice |
| `convertidoParaProducao !== true` | Button shows "Converter para Produção"; modal shows preview + confirmation |

### OS number derivation

```typescript
numeroOS = `OS:CONV-${orcamento.numero.replace('ORC-', '')}`
// ORC-2026-00001 → OS:CONV-2026-00001
```

### Item transfer mapping

| OrcamentoItem field | PecaSolicitacao field | Notes |
|---------------------|-----------------------|-------|
| `codigo` | `codigo` | Falls back to first 30 chars of `descricao` if blank |
| `descricao` | `descricao` | Preserved verbatim |
| `quantidade` | `quantidade` + `osDistribuicao[0].quantidade` | Entire qty in single OS allocation |
| `unidade` | `unidade` | Optional field added to PecaSolicitacao |
| `pecaId` | `pecaId` | Traceability FK → Peças |
| `conjuntoId` | `conjuntoId` | Traceability FK → Conjuntos |
| `maquinaId` | `maquinaId` | Traceability FK → Máquinas |
| `observacoes` | `observacoes` | |
| — | `material` | Blank — Engineering fills in |
| — | `espessura` | 0 — Engineering fills in |
| — | `processos` | `[]` — Engineering assigns sectors |

### Traceability

```
Orcamento.solicitacaoProducaoId  ─────────────────────► SolicitacaoProducao.id
Orcamento.id  ◄──────────────────────────────────────── SolicitacaoProducao.origemId
Orcamento.numero ◄───────────────────────────────────── SolicitacaoProducao.numeroOrigem
```

Future navigation:
- **Orçamento → Abrir Solicitação**: `router.push('/desenvolvimento?sol=' + orcamento.solicitacaoProducaoId)`
- **Solicitação → Abrir Orçamento**: `router.push('/orcamentos?id=' + solicitacao.origemId)`

### Audit entry

```typescript
// Written to Orcamento.historico on conversion:
{
  tipo:     'conversao',
  descricao: 'Convertido para solicitação de produção — OS:CONV-2026-00001',
  usuario:  responsavelNome,
  timestamp: new Date(),
}
```

History icon: `Factory` (Lucide). History colour: `text-primary`.

### New Orcamento fields (Phase 4)

| Field | Type | Set when |
|-------|------|----------|
| `convertidoParaProducao` | `boolean?` | `true` after `registrarConversao()` |
| `dataConversao` | `Date?` | `new Date()` on conversion |
| `responsavelConversao` | `string?` | Logged-in user name |
| `solicitacaoProducaoId` | `string?` | ID of created `SolicitacaoProducao` |

### New analytics fields (Phase 4)

| Field | Computation |
|-------|-------------|
| `convertidos` | `orcamentos.filter(o => o.convertidoParaProducao).length` |
| `conversoesNoMes` | Conversions where `dataConversao` is in current calendar month |
| `pendenteConversao` | `aprovados.filter(o => !o.convertidoParaProducao).length` |

### Future extension hooks (Phase 5+)

| Hook | Location | Future use |
|------|----------|-----------|
| `[HOOK:ENGENHARIA_GATE]` | `ConversaoProducaoModal` | Require engineering approval before conversion |
| `[HOOK:ESTRUTURA_AUTO]` | `buildPecas()` | Auto-generate `PecaSolicitacao[]` from `Conjunto` BOM |
| `[HOOK:CUSTO_CALC]` | `buildPecas()` | Populate `custoMaterial`/`custoMaoObra` per item |
| `[HOOK:MAQUINA_ALLOC]` | `criarSolicitacao()` input | Auto-allocate machines from `maquinaId` references |
| `[HOOK:EMAIL_NOTIFY]` | After `registrarConversao()` | Email PCP team via SendGrid/Resend |

### Supabase future tables

```sql
-- New column on orcamentos table:
ALTER TABLE orcamentos ADD COLUMN convertido_para_producao BOOLEAN DEFAULT FALSE;
ALTER TABLE orcamentos ADD COLUMN data_conversao TIMESTAMPTZ;
ALTER TABLE orcamentos ADD COLUMN responsavel_conversao TEXT;
ALTER TABLE orcamentos ADD COLUMN solicitacao_producao_id UUID REFERENCES solicitacoes_producao(id);

-- New columns on solicitacoes_producao table:
ALTER TABLE solicitacoes_producao ADD COLUMN origem TEXT DEFAULT 'manual';
ALTER TABLE solicitacoes_producao ADD COLUMN origem_id UUID REFERENCES orcamentos(id);
ALTER TABLE solicitacoes_producao ADD COLUMN numero_origem TEXT;

-- New columns on solicitacao_itens (PecaSolicitacao):
ALTER TABLE solicitacao_itens ADD COLUMN unidade TEXT;
ALTER TABLE solicitacao_itens ADD COLUMN peca_id UUID REFERENCES pecas(id);
ALTER TABLE solicitacao_itens ADD COLUMN conjunto_id UUID REFERENCES conjuntos(id);
ALTER TABLE solicitacao_itens ADD COLUMN maquina_id UUID REFERENCES maquinas(id);

-- Future: conversion_log table for analytics
CREATE TABLE conversion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID REFERENCES orcamentos(id),
  solicitacao_id UUID REFERENCES solicitacoes_producao(id),
  responsavel TEXT,
  converted_at TIMESTAMPTZ DEFAULT NOW(),
  empresa_id UUID
);
```

---

## Phase 8 — Commercial Pricing Engine

> Full specification: [docs/commercial-pricing.md](./commercial-pricing.md)

### Summary

Phase 8 adds structured margin/tax/commission pricing to quotation creation. Key changes:

**`valorTotal` is now the commercial price** — when the pricing engine is applied during creation, `valorTotal = precoFinal` (not the sum of manufacturing cost items). This corrects the dashboard totals, analytics, and PDF totals.

**Blocking rule added:** A quotation cannot be created when `totalOrcado === 0 AND totalCusto === 0`. This prevents zero-value quotations from corrupting pipeline analytics.

**Catalog selector fixed:** `CatalogSelectorModal` now uses `useConjuntos()` (live context state) instead of the stale `mockConjuntos` import. Newly created conjuntos appear immediately.

### New `Orcamento` fields (all optional for backward compat)

| Field | Type | Description |
|-------|------|-------------|
| `perfilComercialId` | `string?` | FK → PerfilPrecificacao used at creation |
| `margemPercentual` | `number?` | Margin % snapshot |
| `impostosPercentual` | `number?` | Tax % snapshot |
| `comissaoPercentual` | `number?` | Commission % snapshot |
| `custoTotalCalculado` | `number?` | Manufacturing cost at creation time |
| `precoSugerido` | `number?` | Formula-derived price |
| `precoFinal` | `number?` | Actual selling price (= `valorTotal` when set) |
| `lucroBruto` | `number?` | `precoFinal − custoTotalCalculado` |
| `margemEfetiva` | `number?` | `lucroBruto / precoFinal × 100` |

### New analytics fields

| Field | Description |
|-------|-------------|
| `margemMedia` | Average effective margin across priced quotations |
| `margemMaxima` | Highest effective margin |
| `orcamentosAbaixoMeta` | Count of quotations with margin < 15% |
| `orcamentoMenorMargem` | `{ numero, margem }` — lowest margin quotation |

---

## Phase 8 Stabilization — Cost Propagation Fix

*Implemented: 2026-06-10*

### Problem

After quotation creation, changing material/configuration selections in `OrcamentoDetalheModal` updated the live `breakdownsPorItem` display in `OrcamentoConfiguracoesContext` (reactive useMemo) but did **not** write back to `OrcamentosContext`. As a result:

- `orcamento.valorTotal` stayed at the creation-time value
- `orcamento.custoTotalCalculado` stayed at the creation-time value
- `OrcamentoItem.valorUnitario` stayed at the creation-time value
- The "Total geral" strip showed stale/zero cost even after fresh config selection

Additionally, `getCustoTotalOrcamento()` only summed `tipo='conjunto'` item breakdowns — `tipo='peca'` catalog item costs were silently ignored.

### Root Causes

| # | Root Cause | Location |
|---|-----------|----------|
| 1 | `ConjuntoMaterialSelectorModal.handleAplicar()` calls `salvarSelecoes()` but never calls `atualizarOrcamento` | `ConjuntoMaterialSelectorModal.tsx` |
| 2 | `PecaConfiguracaoSelectorModal.handleConfirmar()` calls `salvarPecaItemSelecao()` but never calls `atualizarOrcamento` | `PecaConfiguracaoSelectorModal.tsx` |
| 3 | `getCustoTotalOrcamento()` filtered `tipo === 'conjunto'` only, losing all `tipo='peca'` item costs | `OrcamentoConfiguracoesContext.tsx` |
| 4 | No timing-safe mechanism to propagate the newly computed cost from modal to parent context | Architecture gap |

### Fix

**Callback-based write-back (timing-safe):**

1. `ConjuntoMaterialSelectorModal` now accepts an optional `onAplicar?: (custoTotal: number) => void` prop. On `handleAplicar`, the `liveBreakdown.custoTotal` (already computed synchronously in the modal's own closure) is passed to this callback before `onOpenChange(false)`.

2. `PecaConfiguracaoSelectorModal` now accepts an optional `onConfirmar?: (custoUnitario: number) => void` prop. On `handleConfirmar`, `selectedBD.custoTotal` is passed to this callback.

3. `ItemsTab` wires both callbacks to `onUpdateItemCost(itemId, novoValorUnitario)`, which is injected by `OrcamentoDetalheModal`.

4. `OrcamentoDetalheModal.handleUpdateItemCost` computes the updated `itens` array and new `custoTotalCalculado`, then calls `atualizarOrcamento(id, { itens, custoTotalCalculado })`.

5. `atualizarOrcamento` applies `recalcTotal(itens)` and then the `precoFinal` override — so `valorTotal` stays as the commercial price if one was set at creation.

6. `getCustoTotalOrcamento` now includes `tipo='peca'` catalog items: `sel.custoUnitario × item.quantidade` from `pecaItemSelecoesPorItem`.

### Propagation Chain (post-stabilization)

```
User applies config in detail modal
  │
  ├── ConjuntoMaterialSelectorModal.handleAplicar()
  │     salvarSelecoes() → OrcamentoConfiguracoesContext (breakdownsPorItem recomputes)
  │     onAplicar(liveBreakdown.custoTotal) → ItemsTab.onUpdateItemCost
  │
  └── PecaConfiguracaoSelectorModal.handleConfirmar()
        salvarPecaItemSelecao() → OrcamentoConfiguracoesContext (pecaItemSelecoesPorItem updates)
        onConfirmar(selectedBD.custoTotal) → ItemsTab.onUpdateItemCost
              │
              ▼
        OrcamentoDetalheModal.handleUpdateItemCost(itemId, novoValorUnitario)
          → updatedItens = orcamento.itens.map(i => i.id === itemId ? { ...i, valorUnitario } : i)
          → novoMfgTotal = sum of conjunto + catalog-peca item.valorTotal
          → atualizarOrcamento(id, { itens: updatedItens, custoTotalCalculado: novoMfgTotal })
              │
              ▼
        OrcamentosContext.atualizarOrcamento
          → valorTotal = recalcTotal(itens)
          → if precoFinal > 0: valorTotal = precoFinal  (commercial price preserved)
          → custoTotalCalculado = novoMfgTotal
```

### Timing Safety

The cost passed via `onAplicar`/`onConfirmar` is read from the modal's **local computed state** (`liveBreakdown`, `selectedBD`) — not from `breakdownsPorItem` in context. This bypasses the React batch-update timing issue: the context `useMemo` for `breakdownsPorItem` recomputes on the next render, after the event handler flush. Using the modal's own synchronous calculation avoids reading stale context state.

### Known Limitation (Phase 8.1 scope)

When a config change in the detail modal alters `custoTotalCalculado`, the stored `precoFinal` / `lucroBruto` / `margemEfetiva` are NOT automatically recomputed. They reflect the pricing decision made at creation time. Phase 8.1 will add a "Recalcular Precificação" action to the detail modal that reruns the commercial pricing engine with the current manufacturing cost.

### Files Modified

| File | Change |
|------|--------|
| `src/contexts/OrcamentoConfiguracoesContext.tsx` | `getCustoTotalOrcamento`: now includes `tipo='peca'` items; removed unused `calcularCustoTotalConjuntos` import |
| `src/components/orcamentos/ConjuntoMaterialSelectorModal.tsx` | Added `onAplicar?` prop; calls it with `liveBreakdown.custoTotal` in `handleAplicar` |
| `src/components/orcamentos/PecaConfiguracaoSelectorModal.tsx` | Added `onConfirmar?` prop; calls it with `selectedBD.custoTotal` in `handleConfirmar` |
| `src/components/orcamentos/OrcamentoDetalheModal.tsx` | `ItemsTabProps.onUpdateItemCost`; `handleUpdateItemCost` in main component; wired to both config modals |
