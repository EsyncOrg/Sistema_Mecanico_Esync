# Manufacturing Configurations

*FORGE ERP — Piece → Configuration → Cost Architecture*
*Phase 6.1 implemented: 2026-06-01 · Phase 7.1 extended: 2026-06-08*

---

## 1. Purpose

Phase 6.1 introduces `ConfiguracaoFabricacao` to solve the fundamental limitation of Phase 6: **the same piece can be produced with different materials and different process combinations**, each resulting in a different cost.

**Before Phase 6.1:**
```
Peca → Cost (one value, fuzzy material match)
```

**After Phase 6.1:**
```
Peca
  ├── CFG-0003: Aço Carbono 6mm  + Dobra + Pintura + Montagem → R$ 252,67
  ├── CFG-0004: Aço Inox 304 6mm + Dobra + Montagem (no paint) → R$ 219,54
  └── CFG-0005: Aço Galv. Z275   + Dobra + Montagem (no paint) → R$ 189,73
```

The cost engine now calculates per configuration, giving the engineering team full visibility into material choice impact on unit cost.

**Phase 7.1 extension:** `ConfiguracaoFabricacao` is now the **primary selection unit in quotations**. When quoting a piece or an assembly, the user selects a `ConfiguracaoFabricacao` — not a raw material. `materialId` is derived from the selected configuration.

`PecaConjunto.pecaId` (new in Phase 7.1) links assembly BOM slots to catalog pieces, enabling configuration lookup for individual pieces within assemblies.

---

## 2. Data Model — `ConfiguracaoFabricacao`

**Future Supabase table:** `configuracoes_fabricacao`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | PK — future UUID |
| `codigo` | `string` | Auto-generated: `CFG-0001` (global sequence) |
| `pecaId` | `string` | FK → `pecas.id` |
| `materialId` | `string` | FK → `materiais.id` (exact — no fuzzy matching) |
| `dobra` | `boolean` | Include bending (Dobra) in cost calculation |
| `solda` | `boolean` | Include welding (Solda) in cost calculation |
| `pintura` | `boolean` | Include painting (Pintura) in cost calculation |
| `montagem` | `boolean` | Include assembly (Montagem) in cost calculation |
| `observacoes` | `string?` | Free-text note |
| `ativo` | `boolean` | Inactive configs hidden from cost comparisons |
| `criadoEm` | `Date` | |
| `atualizadoEm` | `Date` | Auto-updated on every mutation |

### Base vs. Optional processes

| Process | Type | Rule |
|---------|------|------|
| Corte | **Base** | Always included — cannot be disabled |
| Desenvolvimento | **Base** | Always included |
| Programação | **Base** | Always included |
| Dobra | **Optional** | Controlled by `cfg.dobra` |
| Solda | **Optional** | Controlled by `cfg.solda` |
| Pintura | **Optional** | Controlled by `cfg.pintura` |
| Montagem | **Optional** | Controlled by `cfg.montagem` |

**Business rule:** A galvanized steel piece does not need painting (the zinc coating provides corrosion protection). Setting `pintura: false` eliminates the painting cost from the `CustoPecaBreakdown` for that configuration, producing a meaningfully different total.

---

## 3. Entity Relationships

```
Peca (pecas.id)
  └──< ConfiguracaoFabricacao (configuracoes_fabricacao.peca_id)
         └── CustoMaterial (materiais.id via material_id)
                   ↓
         calcularCustoPecaComConfig()
                   ↓
         CustoPecaBreakdown (peca_custos.configuracao_id)
```

**Multiplicity:** One `Peca` → many `ConfiguracaoFabricacao` → one `CustoMaterial` each.

---

## 4. Seed Data (`src/mocks/configuracoes-fabricacao.ts`)

7 seed configurations across 3 pieces:

### PCA-0001 — Flange de Conexão (12mm, 2.10kg)

| Config | Material | Dobra | Solda | Pintura | Montagem | Cost ~  |
|--------|----------|-------|-------|---------|----------|---------|
| CFG-0001 | MAT-004 (AC 1020 12mm) | No | No | No | Yes | R$120,90 |
| CFG-0002 | MAT-006 (Inox 304 3mm) | No | No | No | Yes | R$146,00 |

### PCA-0002 — Suporte de Fixação (6mm, 0.80kg)

| Config | Material | Dobra | Solda | Pintura | Montagem | Cost ~  |
|--------|----------|-------|-------|---------|----------|---------|
| CFG-0003 | MAT-002 (AC 1020 6mm) — exact | Yes | No | Yes | Yes | R$252,67 |
| CFG-0004 | MAT-007 (Inox 304 6mm) | Yes | No | No | Yes | R$219,54 |
| CFG-0005 | MAT-010 (Galv. Z275 6mm) | Yes | No | No | Yes | R$189,73 |

### PCA-0007 — Perfil Dobrado U (4mm, 5.20kg)

| Config | Material | Dobra | Solda | Pintura | Montagem | Cost ~  |
|--------|----------|-------|-------|---------|----------|---------|
| CFG-0006 | MAT-001 (AC 1020 3mm) | Yes | No | Yes | Yes | R$135,00 |
| CFG-0007 | MAT-009 (Galv. Z275 3mm) | Yes | No | No | No | R$106,00 |

Cost calculations use: `taxaIndiretos = 20%`, `fatorWaste = 1.15`.

---

## 5. Cost Engine — `calcularCustoPecaComConfig()`

**File:** `src/lib/custos/pecasEngine.ts`

**Signature:**
```typescript
function calcularCustoPecaComConfig(
  peca:           Peca,
  cfg:            ConfiguracaoFabricacao,
  material:       CustoMaterial,   // resolved externally — no fuzzy matching
  centros:        CentroCusto[],
  maquinasCustos: MaquinaCustos[],
  config:         ConfiguracaoCustos,
  usuario?:       string,
): CustoPecaBreakdown
```

**Key differences from `calcularCustoPecaCompleto()` (Phase 6 legacy):**

| Aspect | Phase 6 Legacy | Phase 6.1 Config-Aware |
|--------|----------------|------------------------|
| Material resolution | Fuzzy: closest espessura match | Exact: `cfg.materialId` lookup |
| Material warning | Added if approximated | Never — always exact |
| Process filtering | All times used | `cfg.dobra/solda/pintura/montagem` flags |
| Output `configuracaoId` | `undefined` | `cfg.id` |
| Output `configuracaoCodigo` | `undefined` | `cfg.codigo` |
| Output `materialId` | `undefined` | `cfg.materialId` |

**Informational warnings** (non-fatal, for UI display):
- `"Dobra excluída desta configuração"` — when `cfg.dobra = false` and piece has `tempoDobraMin > 0`
- Same for Solda, Pintura, Montagem

---

## 6. Context API — `ConfiguracoesFabricacaoContext`

**File:** `src/contexts/ConfiguracoesFabricacaoContext.tsx`

Nested inside `CustosProvider` and `CustosPecasProvider` (provider tree order in `layout.tsx`).

### State

| State | Type | Description |
|-------|------|-------------|
| `configuracoes` | `ConfiguracaoFabricacao[]` | All configs (active + inactive) |
| `breakdownsComConfig` | `CustoPecaBreakdown[]` | One per active config; auto-recomputed via `useMemo` |
| `analytics` | `ConfiguracoesAnalytics` | Aggregate stats; auto-recomputed via `useMemo` |

### `breakdownsComConfig` recomputation

Triggered automatically whenever any of these change:
- `configuracoes` array (add / update / delete / toggle)
- `centros` hourly rates (via `useCustos()`)
- `materiais` pricing (via `useCustos()`)
- `maquinasCustos` rates (via `useCustos()`)
- `custoConfig` (taxaIndiretos / fatorWasteDefault via `useCustosPecas()`)

### Actions

```typescript
// CRUD
criarConfiguracao(input: NovaConfiguracaoInput): ConfiguracaoFabricacao
atualizarConfiguracao(id, changes: Partial<ConfiguracaoFabricacao>): void
excluirConfiguracao(id): void
toggleAtivo(id): void   // flip active/inactive status

// Lookups
getByPeca(pecaId): ConfiguracaoFabricacao[]
getBreakdownsByPeca(pecaId): CustoPecaBreakdown[]
getById(id): ConfiguracaoFabricacao | undefined

// Triggered from EditarPecaModal.handleSave()
recalcularConfigsPeca(peca: Peca): void
```

### `recalcularConfigsPeca(peca)`

Called from `EditarPecaModal` after saving a piece. Updates `pecasRef.current` (the internal piece list) and forces a re-render so `breakdownsComConfig` recomputes with the new piece data (updated `peso`, `espessura`, `tempoXxxMin` fields).

---

## 7. UI — `ConfiguracoesPainel` Component

Rendered inside the "Custos das Peças" tab when a piece has ≥ 1 configuration. Shown in the expanded row immediately above the legacy `CustoBreakdownPanel`.

**Props:**
```typescript
{
  configs:     ConfiguracaoFabricacao[]
  breakdowns:  CustoPecaBreakdown[]
  materiais:   CustoMaterial[]
  userCanEdit: boolean
  onAdd:    () => void
  onEdit:   (cfg: ConfiguracaoFabricacao) => void
  onDelete: (id: string) => void
  onToggle: (id: string) => void
}
```

**Layout:**
```
┌── Configurações de Fabricação  (N)  ────────────────── [Adicionar] ──┐
│                                                                        │
│  CONFIG   MATERIAL          PROCESSOS      CUSTO TOTAL   STATUS  ▾    │
│  CFG-003  AC 1020 6mm       Dobra Pintura  R$ 252,67     ●Ativo        │
│  CFG-004  Inox 304 6mm      Dobra          R$ 219,54     ●Ativo        │
│  CFG-005  Galv. Z275 6mm    Dobra          R$ 189,73     ●Ativo        │
│                                                                        │
│  [ Expanded: CFG-003 ]                                                 │
│  ┌── CustoBreakdownPanel (breakdown bars + summary) ──────────────┐   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

**Row actions (per config):**
- `▾ / ▴` — toggle inline breakdown expansion
- `Pencil` — open `ConfiguracaoFabricacaoModal` in edit mode
- `Settings` — toggle active/inactive
- `Trash` — delete

**Empty state:** When no configs exist, the expanded row shows only the legacy `CustoBreakdownPanel` plus an "Adicionar Configuração de Fabricação" button.

---

## 8. UI — `ConfiguracaoFabricacaoModal`

**File:** `src/components/custos/ConfiguracaoFabricacaoModal.tsx`

Create or edit a `ConfiguracaoFabricacao` for a specific piece.

**Sections:**
1. **Material selector** — scrollable list with search input; shows `codigo`, `descricao`, `tipoMaterial`, `fornecedor`, `valorKg` per row; checkmark highlights selected
2. **Processos incluídos** — four toggle buttons (Dobra, Solda, Pintura, Montagem); pre-checked based on the piece's time data (if `tempoDobraMin > 0`, Dobra defaults to checked)
3. **Observações** — optional free text

---

## 9. "Configs" Column in Custos das Peças Table

The "Custo por Peça" table in the Custos das Peças tab gained a `Configs` column:
- Piece with 0 configs: `—` (muted)
- Piece with N configs: orange badge with count (e.g. `⚙ 3`)

Clicking a row expands to show `ConfiguracoesPainel` (if configs exist) followed by the legacy `CustoBreakdownPanel`.

---

## 10. `ConfiguracoesAnalytics`

Computed via `useMemo` inside `ConfiguracoesFabricacaoContext`.

| Field | Computation |
|-------|-------------|
| `total` | `configuracoes.length` |
| `ativas` | `configuracoes.filter(c => c.ativo).length` |
| `pecasComConfiguracao` | `new Set(configuracoes.map(c => c.pecaId)).size` |
| `pecasSemConfiguracao` | `totalPecas − pecasComConfiguracao` |
| `materiaisMaisUsados` | top 3 `materialId` values by frequency |

Displayed in the "Custo Total Catálogo" KPI card sub-label: `"N configs · maior: Material"`.

---

## 11. Files Structure

```
src/
├── types/
│   └── configuracoes-fabricacao.ts      # ConfiguracaoFabricacao, NovaConfiguracaoInput, ConfiguracoesAnalytics
├── mocks/
│   └── configuracoes-fabricacao.ts      # 7 seed configs for PCA-0001, 0002, 0007
├── contexts/
│   └── ConfiguracoesFabricacaoContext.tsx  # Provider + useConfiguracoesFabricacao hook
├── lib/
│   └── custos/
│       └── pecasEngine.ts               # +calcularCustoPecaComConfig() (legacy preserved)
└── components/
    └── custos/
        └── ConfiguracaoFabricacaoModal.tsx  # Create/edit modal
```

**Modified files:**
- `src/types/custos.ts` — `TipoMaterial` enum + `TIPO_MATERIAL_LABELS` + new optional fields on `CustoMaterial`
- `src/types/custos-pecas.ts` — `configuracaoId?`, `configuracaoCodigo?`, `materialId?` added to `CustoPecaBreakdown`
- `src/mocks/custos.ts` — 12 materials with full catalog fields (replaces 6 sparse records)
- `src/app/(dashboard)/custos/page.tsx` — Custos das Peças tab wired; `ConfiguracoesPainel`; modal renders
- `src/app/layout.tsx` — `ConfiguracoesFabricacaoProvider` registered
- `src/components/shared/EditarPecaModal.tsx` — calls `recalcularConfigsPeca(updated)` on save

---

## 12. Supabase Migration

```sql
CREATE TABLE configuracoes_fabricacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  peca_id UUID NOT NULL REFERENCES pecas(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES materiais(id),
  dobra BOOLEAN NOT NULL DEFAULT FALSE,
  solda BOOLEAN NOT NULL DEFAULT FALSE,
  pintura BOOLEAN NOT NULL DEFAULT FALSE,
  montagem BOOLEAN NOT NULL DEFAULT FALSE,
  observacoes TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  empresa_id UUID NOT NULL
);

ALTER TABLE configuracoes_fabricacao ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON configuracoes_fabricacao
  USING (empresa_id = (auth.jwt() ->> 'empresa_id')::UUID);

CREATE INDEX idx_cfg_fab_peca ON configuracoes_fabricacao(peca_id, empresa_id);
CREATE INDEX idx_cfg_fab_material ON configuracoes_fabricacao(material_id, empresa_id);
CREATE INDEX idx_cfg_fab_ativo ON configuracoes_fabricacao(ativo, empresa_id) WHERE ativo = TRUE;

-- Computed cost table (one row per active config per piece)
CREATE TABLE peca_custos (
  ...
  configuracao_id UUID REFERENCES configuracoes_fabricacao(id) ON DELETE CASCADE,
  ...
);
```

### Migration from Phase 6 (legacy breakdowns)

Existing `peca_custos` rows without `configuracao_id` represent legacy Phase 6 breakdowns (fuzzy material match). Phase 6.1 adds config-aware rows alongside them. In Phase 7, legacy rows will be deprecated in favor of config-based costs.

---

## 13. Future Integration Hooks

```typescript
// [HOOK:SHEET_UTILIZATION] — Phase 6.5
// larguraChapa × comprimentoChapa → sheetArea
// custoMaterial = valorKg × peso × fatorWaste  (current)
// → refined to: valorChapa × (pecaArea / sheetArea)  (Phase 6.5)

// [HOOK:QUOTATION_INTEGRATION] — Phase 8
// OrcamentoItem.pecaId → getByPeca(pecaId) → let user choose which config to price
// OrcamentoDetalheModal: "Configuração" column with cost per item

// [HOOK:ASSEMBLY_COST] — Phase 7
// Conjunto.pecas[].pecaId → for each: getBreakdownsByPeca → pick default config
// custoConjunto = Σ (config.custoTotal × quantidade)

// [HOOK:SUPABASE_SYNC] — Supabase integration
// criarConfiguracao → INSERT into configuracoes_fabricacao
// breakdownsComConfig → UPSERT into peca_custos (WHERE configuracao_id = cfg.id)

// [HOOK:MATERIAL_STOCK] — Future purchasing module
// materialId → FK → estoque_itens → sheets on hand
// Alert when stock < threshold

// [HOOK:PURCHASING_MODULE] — Future
// Low material stock → auto-generate purchase request
```

---

## 14. Backward Compatibility Notes

Phase 6 `CustoPecaBreakdown` objects (without `configuracaoId`) continue to exist in `CustosPecasContext.breakdowns[]`. They are unaffected by Phase 6.1.

The Custos das Peças UI shows both:
- **Legacy breakdown** (Phase 6): always shown — `CustoBreakdownPanel`
- **Config breakdowns** (Phase 6.1): shown above legacy when configs exist — `ConfiguracoesPainel`

This dual display ensures engineering teams can see the baseline (legacy) cost alongside the config-specific costs for comparison.

No existing modules, contexts, or pages were broken. All existing tests (manual, TypeScript, build) continue to pass.
