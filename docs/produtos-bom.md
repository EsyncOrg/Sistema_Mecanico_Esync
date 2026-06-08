# Produtos — Catalog-Driven BOM Architecture

*FORGE ERP — Phase 7.3: Catalog-Driven Products + BOM Normalization*
*Implemented: 2026-06-08*

---

## 1. Terminology

| Context | Term | Notes |
|---------|------|-------|
| Internal code | `Conjunto` | All TypeScript types, contexts, hooks |
| UI label (PT-BR) | `Produto` | All user-facing strings |
| URL route | `/conjuntos` | Unchanged — route rename not needed |
| Module ID | `conjuntos` | Permissions, navigation constants |
| BOM row type | `PecaConjunto` | A piece slot within a Produto/Conjunto |

No renaming was performed in Phase 7.3. The split between internal `Conjunto` naming and user-facing "Produto" was already present and correct.

---

## 2. Phase 7.3 Problem Statement

### Before Phase 7.3

The product creation form allowed users to enter piece technical data manually:

```
[Código]        [Descrição]
LAT-E-001       Lateral Esquerda 800×600

[Material]      [Espessura]    [Peso]
Aço Carbono 1020   2.0mm        1.92kg
```

This creates multiple problems:
- PCA-0001 could have `peso: 2.10kg` in the Peças catalog but `pesoEstimado: 0.80kg` inside a Produto
- Stock simulation uses incorrect weight
- Cost calculations are inconsistent
- Material is redundant (actual material is selected at quotation time via ConfiguracaoFabricacao)
- Migrating to Supabase requires reconciling two sources of truth

### After Phase 7.3

Product creation uses catalog selection only:

```
[Buscar Peça do Catálogo]
PCA-0001 — Flange de Conexão Ø150mm   12mm · 2.10kg · Estrutural

[Dados do Catálogo — Somente leitura]
Código: PCA-0001  Descrição: Flange de Conexão  Espessura: 12mm  Peso: 2.10kg

[Editável]
Qtd.: 1    Processos: [corte] [montagem]    Observações: Verificar tolerância
```

---

## 3. Data Ownership Model

```
Peça (catalog source of truth)
  ├── codigo
  ├── descricao
  ├── espessura
  ├── peso
  ├── grupo, familia
  └── tempos industriais

PecaConjunto (BOM entry — references Peça)
  ├── pecaId → FK Peça.id  (required for new entries, Phase 7.3+)
  ├── codigo  ← COPY from Peca (legacy display/simulation fallback)
  ├── descricao ← COPY from Peca (legacy display/simulation fallback)
  ├── espessura ← COPY from Peca (legacy display/simulation fallback)
  ├── pesoEstimado ← COPY from Peca.peso (legacy simulation use)
  ├── material: ''  ← empty for new entries; material resolved at quotation time
  ├── quantidade  ← UNIQUE to BOM (how many per complete assembly)
  ├── processos   ← UNIQUE to BOM (production routing for this slot)
  └── observacoes ← UNIQUE to BOM (slot-specific notes)
```

**Why keep local copies?**
- 18 existing mock pieces have no `pecaId` — backward compatibility
- Simulation engine uses `peca.codigo` for stock lookup (still works for legacy)
- Display in tree view works without API calls (for both legacy and new)
- Future Supabase migration can drop copies once joins are available

---

## 4. Phase 7.3 Rule

> A PecaConjunto MUST reference a catalog Peca via `pecaId`.  
> Users MUST NOT manually enter technical piece data during product creation.  
> The Peça is the single source of truth for: código, descrição, espessura, peso, grupo, tempos industriais.

This rule is enforced at the UI level (create form blocks "Adicionar" unless `selectedCatalogPeca` is set). The TypeScript type keeps `pecaId?: string` for backward compatibility with existing data.

---

## 5. Catalog Selector UI

### New "Estrutura de Peças" section

1. **Search field** — searches `mockPecas` by código, descrição, or grupo
   - Shows first 12 results by default (no query)
   - Filters to max 10 matches when typing
   - Dropdown closes on selection

2. **Selected piece card** — read-only info pulled from catalog
   - Shows: código, descrição, espessura, peso, grupo, família
   - Informational note: "Material será definido na etapa de orçamento via configuração de fabricação"

3. **Editable fields** (BOM-specific, disabled until piece is selected):
   - `quantidade` — units per complete product assembly
   - `observacoes` — BOM-specific notes (e.g., "Dobra 90°, furação M8")
   - `processos` — sector/routing toggle buttons

4. **"Adicionar" button** — disabled until catalog piece is selected; shows piece código in label when active

### When piece is added

```typescript
{
  pecaId:       catalogPeca.id,          // FK to catalog
  codigo:       catalogPeca.codigo,      // read-only copy for display
  descricao:    catalogPeca.descricao,   // read-only copy for display
  quantidade:   userInput.quantidade,    // user-configured
  material:     '',                      // empty — set at quotation time
  espessura:    catalogPeca.espessura,   // read-only copy for simulation
  pesoEstimado: catalogPeca.peso,        // read-only copy for simulation
  observacoes:  userInput.observacoes,   // user-configured
  processos:    userInput.processos,     // user-configured
}
```

---

## 6. Backward Compatibility

### Legacy mock pieces (no `pecaId`)

18 of 21 existing `PecaConjunto` entries have no `pecaId` (production mock data). These continue to work:

| Feature | Behavior |
|---------|----------|
| Display (tree view, estrutura tab) | Uses local `codigo`, `descricao` — unchanged |
| Stock simulation | Uses `peca.codigo` for stock lookup — unchanged |
| Cost calculation | Uses `peca.pesoEstimado` for material fallback — unchanged |
| Quotation config selection | Requires `pecaId` — these pieces show "sem vínculo" and are skipped |

### Phase 7.1 / 7.2 quota flow

Only `CONJ-0007` (demo assembly) has catalog-linked pieces with `pecaId`. The configuration selection in quotations (`ConjuntoMaterialSelectorModal`) requires `pecaId` to look up manufacturing configurations. Existing assemblies without `pecaId` show an informational "sem vínculo" row and are excluded from blocking checks.

---

## 7. Migration Strategy for Legacy Data

### When migrating to Supabase

**Step 1 — Identify pieces** that can be linked to catalog:
```sql
SELECT pc.codigo, p.id as peca_id
FROM produto_pecas pc
JOIN pecas p ON p.codigo = pc.codigo  -- best-effort match by código
WHERE pc.peca_id IS NULL
```

**Step 2 — Semi-automated migration** (requires human review):
- Auto-link where `PecaConjunto.codigo = Peca.codigo` (exact match)
- Flag for manual review where código doesn't match (custom BOM-only pieces)
- Custom BOM-only pieces (no catalog entry) → create catalog entries first

**Step 3 — Drop redundant fields** (future, after full catalog linkage):
- `produto_pecas.codigo` → derived from JOIN to pecas
- `produto_pecas.descricao` → derived from JOIN to pecas
- `produto_pecas.espessura` → derived from JOIN to pecas
- `produto_pecas.peso_estimado` → derived from JOIN to pecas
- `produto_pecas.material` → removed (resolved via configuracoes_fabricacao at quotation time)

### Assumptions

1. `Peca.codigo` is unique within an empresa (enforced by future UNIQUE constraint)
2. Custom BOM pieces (not in catalog) must be registered as Peca entries before migration
3. The `pesoEstimado` copy may diverge from `Peca.peso` in legacy data — use Peca as canonical on update

---

## 8. Entity Relationship Model

```
Peca (1) ──────────────────────────────────< PecaConjunto (BOM entry)
  id, codigo, descricao, espessura, peso      pecaId FK, quantidade, processos, observacoes
                                               (produto_pecas in Supabase)

Peca (1) ──────────────────────────────────< ConfiguracaoFabricacao (N)
  id                                           pecaId FK, materialId FK, processos flags

Conjunto / Produto (1) ────────────────────< PecaConjunto (N)
  id, codigo, nome                             conjuntoId FK

Conjunto / Produto (1) ────────────────────< OrcamentoItem (N)
  id                                           tipo='conjunto', conjuntoId FK

OrcamentoItem (1) ─────────────────────────< OrcamentoItemConfiguracao (N)
  id                                           configuracaoFabricacaoId FK (primary)
```

---

## 9. Recommended Supabase Schema (Phase 7.3 Target)

### `produtos` (internal: `conjuntos`)
```sql
CREATE TABLE produtos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          text NOT NULL,
  nome            text NOT NULL,
  cliente         text NOT NULL,
  categoria       text NOT NULL CHECK (categoria IN ('painel','estrutura','gabinete','maquina','suporte','montagem','outro')),
  revisao         text NOT NULL DEFAULT 'Rev. 01',
  prioridade      text NOT NULL DEFAULT 'media',
  responsavel     text,
  observacoes_tecnicas text,
  status          text NOT NULL DEFAULT 'ativo',
  vezes_produzido integer NOT NULL DEFAULT 0,
  qtd_total_produzida integer NOT NULL DEFAULT 0,
  empresa_id      uuid NOT NULL REFERENCES empresas(id),
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(codigo, empresa_id)
);
CREATE INDEX idx_produtos_empresa ON produtos(empresa_id);
```

### `produto_pecas` (internal: `PecaConjunto`)
```sql
CREATE TABLE produto_pecas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id      uuid NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  peca_id         uuid NOT NULL REFERENCES pecas(id),         -- REQUIRED (Phase 7.3+)
  quantidade      integer NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  processos       text[] NOT NULL DEFAULT '{}',
  observacoes     text,
  empresa_id      uuid NOT NULL REFERENCES empresas(id),
  criado_em       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(produto_id, peca_id, empresa_id)                      -- no duplicate pieces in same BOM
);
CREATE INDEX idx_produto_pecas_produto ON produto_pecas(produto_id);
CREATE INDEX idx_produto_pecas_peca    ON produto_pecas(peca_id);
```

### Row-Level Security (RLS)
```sql
-- Produtos: empresa isolation
ALTER TABLE produtos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE produto_pecas ENABLE ROW LEVEL SECURITY;

CREATE POLICY rls_produtos_select ON produtos
  FOR SELECT USING (empresa_id = auth.jwt()->>'empresa_id'::uuid);

CREATE POLICY rls_produto_pecas_select ON produto_pecas
  FOR SELECT USING (empresa_id = auth.jwt()->>'empresa_id'::uuid);
```

---

## 10. Files Modified (Phase 7.3)

| File | Change |
|------|--------|
| `src/types/conjuntos.ts` | Added Phase 7.3 ownership docs, annotated all PecaConjunto fields |
| `src/app/(dashboard)/conjuntos/page.tsx` | Replaced manual piece builder with catalog selector |

## 11. Files Created

| File | Purpose |
|------|---------|
| `docs/produtos-bom.md` | This document |

## 12. What Was NOT Changed (backward compat)

- `PecaConjunto` TypeScript type (kept all fields, `pecaId` stays optional)
- `ConjuntosContext` — CRUD and simulation unchanged
- `conjuntoEngine.ts` — cost calculation unchanged
- Phase 7.1 quotation config selection flow — unchanged
- Phase 7.2 creation-time config flow — unchanged
- All 21 existing mock pieces — unchanged, continue to work
- Route `/conjuntos`, module ID `conjuntos` — unchanged
