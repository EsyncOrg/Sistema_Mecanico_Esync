# Material Catalog

*Esync ERP — Industrial Material Catalog*
*Phase 6.1 implemented: 2026-06-08*

---

## 1. Purpose

The Material Catalog is the **single source of truth for all raw materials** used in manufacturing. It replaces the simpler `CustoMaterial` pricing table from Phase 5 with a full industrial catalog that includes physical dimensions, material type classification, and sheet geometry — the foundation needed for Phase 6.5 Sheet Utilization.

**Position in the ERP flow:**

```
Material Catalog (Phase 6.1)
  ↓
ConfiguracaoFabricacao.materialId → FK → materiais.id
  ↓
calcularCustoPecaComConfig() → custoMaterial = peso × valorKg × fatorWaste
  ↓
Phase 6.5: area-based cost → pesoChapa × (usedArea / sheetArea) × valorKg
```

---

## 2. Data Model — `CustoMaterial` (extended)

Phase 6.1 extends the existing `CustoMaterial` interface with new optional fields. All existing code continues to work unchanged — new fields are backward-compatible.

**Future Supabase table:** `materiais`

| Field | Type | Phase | Notes |
|-------|------|-------|-------|
| `id` | `string` | 5 | PK — future UUID |
| `codigo` | `string?` | 6.1 | Auto-generated: `MAT-001` |
| `descricao` | `string?` | 6.1 | `"Aço Carbono 1020 — Chapa 3mm"` |
| `tipoMaterial` | `TipoMaterial?` | 6.1 | See §3 |
| `material` | `string` | 5 | Base name (backward compat) |
| `bitola` | `string?` | 5 | e.g. `"3mm"` |
| `espessura` | `number` | 5 | mm |
| `larguraChapa` | `number?` | 6.1 | mm (default 3000) |
| `comprimentoChapa` | `number?` | 6.1 | mm (default 1500) |
| `pesoChapa` | `number` | 5 | kg |
| `valorChapa` | `number` | 5 | R$ (full sheet price) |
| `valorKg` | `number` | 5 | Auto-calculated: `valorChapa / pesoChapa` |
| `fornecedor` | `string?` | 5 | |
| `dataAtualizacao` | `Date` | 5 | Last pricing update |
| `ativo` | `boolean` | 5 | |

### Auto-calculation invariant

`valorKg = valorChapa / pesoChapa` — enforced in `CustosContext.atualizarMaterial()` and `criarMaterial()`. Never stored without recalculation.

---

## 3. `TipoMaterial` Enum

| Value | PT-BR Label | Usage |
|-------|-------------|-------|
| `aco_carbono` | Aço Carbono | SAE 1020, 1045, etc. |
| `aco_inox` | Aço Inox | 304, 316, etc. |
| `aco_galvanizado` | Aço Galvanizado | Z275, etc. |
| `aco_ferramentas` | Aço Ferramenta | Tool steels |
| `aluminio` | Alumínio | 6061, 7075, etc. |
| `cobre` | Cobre | Copper alloys |
| `latao` | Latão | Brass alloys |
| `outro` | Outro | Catch-all |

Labels are exported via `TIPO_MATERIAL_LABELS: Record<TipoMaterial, string>` from `src/types/custos.ts`.

---

## 4. Seed Data (`src/mocks/custos.ts`)

12 materials seeded for Phase 6.1:

| Código | Material | Tipo | Espessura | R$/kg |
|--------|----------|------|-----------|-------|
| MAT-001 | Aço Carbono 1020 | aco_carbono | 3mm | R$10,00 |
| MAT-002 | Aço Carbono 1020 | aco_carbono | 6mm | R$10,00 |
| MAT-003 | Aço Carbono 1020 | aco_carbono | 8mm | R$10,50 |
| MAT-004 | Aço Carbono 1020 | aco_carbono | 12mm | R$11,00 |
| MAT-005 | Aço Carbono 1045 | aco_carbono | 6mm | R$11,50 |
| MAT-006 | Aço Inox 304 | aco_inox | 3mm | R$40,00 |
| MAT-007 | Aço Inox 304 | aco_inox | 6mm | R$40,00 |
| MAT-008 | Aço Inox 316 | aco_inox | 3mm | R$50,00 |
| MAT-009 | Aço Galvanizado Z275 | aco_galvanizado | 3mm | R$13,00 |
| MAT-010 | Aço Galvanizado Z275 | aco_galvanizado | 6mm | R$13,00 |
| MAT-011 | Alumínio 6061 | aluminio | 3mm | R$50,00 |
| MAT-012 | Alumínio 6061 | aluminio | 6mm | R$50,00 |

Standard sheet dimensions: 3000mm × 1500mm (all materials).

---

## 5. UI — Materiais Tab (`/custos`)

**Route:** `/custos` → tab "Materiais"

### 5.1 Analytics KPIs (4 cards)

| KPI | Source |
|-----|--------|
| Materiais Ativos | `materiais.filter(m => m.ativo).length` |
| Tipos de Material | count of distinct `tipoMaterial` values |
| Preço Médio/kg | avg `valorKg` across active materials |
| Desatualizados | materials where `dataAtualizacao < now − 30d` |

### 5.2 Search + Filter

- **Search input**: matches `descricao`, `material`, `bitola`, `fornecedor`
- **Tipo filter**: dropdown populated from distinct `tipoMaterial` values in the current list

### 5.3 Table columns

`Código | Material | Tipo | Esp. | Dimensões | Peso | Valor Chapa | Valor/kg | Fornecedor | Atualizado | Actions`

- `Valor Chapa` cell: inline-editable (same mechanism as Phase 5 inline editing)
- `Valor/kg`: read-only, auto-updates when `valorChapa` changes
- Actions: Edit (opens `MaterialModal`) + Delete

### 5.4 `MaterialModal` (`src/components/custos/MaterialModal.tsx`)

Full create/edit dialog with sections:
1. **Tipo de Material** — chip selector (8 options)
2. **Material + Bitola** — name and gauge
3. **Espessura + Dimensões** — espessura (mm), largura (mm), comprimento (mm)
4. **Peso + Valor** — pesoChapa, valorChapa, valorKg (auto preview)
5. **Fornecedor** — optional

**Código** is auto-generated on create: `MAT-{seq}` where seq = max existing sequence + 1.

---

## 6. Supabase Migration

```sql
CREATE TABLE materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  descricao TEXT,
  tipo_material TEXT,
  material TEXT NOT NULL,
  bitola TEXT,
  espessura NUMERIC(8,2) NOT NULL,
  largura_chapa NUMERIC(8,2) NOT NULL DEFAULT 3000,
  comprimento_chapa NUMERIC(8,2) NOT NULL DEFAULT 1500,
  peso_chapa NUMERIC(10,3) NOT NULL,
  valor_chapa NUMERIC(10,2) NOT NULL,
  valor_kg NUMERIC(10,4) GENERATED ALWAYS AS (valor_chapa / NULLIF(peso_chapa, 0)) STORED,
  fornecedor TEXT,
  data_atualizacao TIMESTAMPTZ DEFAULT NOW(),
  ativo BOOLEAN DEFAULT TRUE,
  empresa_id UUID NOT NULL
);

ALTER TABLE materiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON materiais
  USING (empresa_id = (auth.jwt() ->> 'empresa_id')::UUID);

CREATE INDEX idx_materiais_espessura ON materiais(espessura, empresa_id);
CREATE INDEX idx_materiais_tipo ON materiais(tipo_material, empresa_id);
CREATE INDEX idx_materiais_ativo ON materiais(ativo, empresa_id) WHERE ativo = TRUE;
```

### FK references

`configuracoes_fabricacao.material_id → materiais.id`

### RLS rationale

Material pricing is commercially sensitive. Same policy as `custos_materiais` (Phase 5). Only admin and Administrativo roles can edit; PCP and Engenharia have view access.

---

## 7. Architecture Hooks

```typescript
// [HOOK:SHEET_UTILIZATION] — Phase 6.5
// larguraChapa × comprimentoChapa → sheet area
// Actual usage: sum(areaPeca) / sheetArea → utilization %
// custoMaterial refined: valorChapa × (usedArea / sheetArea)

// [HOOK:MATERIAL_STOCK] — Future
// materialId → FK → estoque_itens.material_id
// Track actual stock of each material (sheets on hand)
// Alert when stock < minimum threshold

// [HOOK:PURCHASING_MODULE] — Future
// When stock < reorder point → generate PurchaseOrder
// materialId, fornecedor, quantidade, valorUnitario
```

---

## 8. Backward Compatibility

All Phase 5 consumers of `CustoMaterial` continue to work unchanged:

- `CustosContext.tsx` — all mutations preserved; new fields added via `MaterialModal`
- `pecasEngine.ts` — `calcularCustoPecaCompleto()` uses `material.valorKg` as before
- `CustosPage` — Materials tab fully replaced with richer UI; inline `valorChapa` editing preserved
- `EditarPecaModal.tsx` — uses `useCustos().materiais` for live cost preview; unchanged

The only behavioral change: the `Novo Material` inline form in the Materials tab was replaced by `MaterialModal`. All functionality preserved; modal adds `codigo`, `descricao`, `tipoMaterial`, `larguraChapa`, `comprimentoChapa` fields.
