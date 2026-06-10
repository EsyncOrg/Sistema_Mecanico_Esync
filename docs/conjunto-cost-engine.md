# Assembly Cost Engine

*FORGE ERP — Phase 7 / 7.1: Conjunto → Configuration Selection → Cost*
*Phase 7 implemented: 2026-06-01 · Phase 7.1 updated: 2026-06-08 · Phase 7.2 updated: 2026-06-08 · Phase 7.3 updated: 2026-06-08*

---

## 1. Purpose

Phase 7 solves a critical real-world manufacturing constraint: **the same assembly can be produced with different material combinations**. The cost varies significantly depending on which material is chosen for each piece.

**Architecture evolution:**

```
Phase 6:   Peca → fixed material match → Cost
Phase 6.1: Peca → ConfiguracaoFabricacao → Cost (per-piece config)
Phase 7:   Conjunto → per-piece material selection → Assembly Cost → Quotation Cost
Phase 7.1: Conjunto → per-piece CONFIGURATION selection → Assembly Cost (config-aware)
           Peca item → single configuration selection → Item Cost
```

**Business rule enforced (Phase 7.1 + 7.2):**
- Selection unit is `configuracaoFabricacaoId`, NOT `materialId`
- `materialId` is derived from config and retained for engine fallback only
- Assemblies (`Conjunto`) are material-agnostic by design
- Pieces within assemblies require `peca.pecaId` (catalog link) for config lookup
- Individual piece quotation items (`tipo='peca'`) also require configuration selection
- **Phase 7.2:** Selection is mandatory BEFORE quotation creation (not just before send/approve)
- **Phase 7.2:** Costs are computed live during quotation creation in `NovoOrcamentoModal`

**New engine function (Phase 7.2):**
`buildSelecoesDraft()` in `conjuntoEngine.ts` — builds `OrcamentoItemConfiguracao[]` from draft selections for registration immediately after quotation creation.

---

## 2. Cost Flow

```
OrcamentoItem (tipo='conjunto', conjuntoId=X, quantidade=N)
    ↓ user clicks "Selecionar Materiais"
ConjuntoMaterialSelectorModal
    ↓ for each PecaConjunto in the assembly:
    │   user selects CustoMaterial (required)
    │   [optional: links to ConfiguracaoFabricacao for richer costing]
    ↓
OrcamentoItemConfiguracao[] → saved to OrcamentoConfiguracoesContext
    ↓ auto-recomputed via useMemo
ConjuntoCostBreakdown (live, volatile)
    ↓ displayed in OrcamentoDetalheModal
"Custo calculado: R$ X"
    ↓ on approval / revision / conversion
ConjuntoCostSnapshot (immutable)
```

---

## 3. Cost Formula

### Data resolution chain (Phase 7.3)
```
PecaConjunto.pecaId
    ↓
Peca (catalog) → peso, espessura, grupo, tempos
    ↓
ConfiguracaoFabricacao.pecaId → configs available for this piece
    ↓ (user selects one at quotation time)
OrcamentoItemConfiguracao.configuracaoFabricacaoId (primary)
    ↓
CustoPecaBreakdown → custoTotal (full process breakdown)
```

### Per piece (material-only path — fallback):
```
custoMat  = PecaConjunto.pesoEstimado × CustoMaterial.valorKg × fatorWasteDefault
custoInd  = custoMat × (taxaIndiretos / 100)
custoUnPeca = custoMat + custoInd
```

Note: `PecaConjunto.pesoEstimado` is derived from `Peca.peso` for catalog-linked pieces (set at BOM creation time). For legacy pieces without `pecaId`, the local copy is used.

### Per piece (config-path — when ConfiguracaoFabricacao is linked):
```
custoUnPeca = CustoPecaBreakdown.custoTotal
```
(Uses the full process+material+machine breakdown from Phase 6.1)

### Per assembly line item in quotation:
```
custoTotal = Σ (custoUnPeca × PecaConjunto.quantidade) × OrcamentoItem.quantidade
```

### Cost inputs used:
| Input | Source |
|-------|--------|
| `pesoEstimado` | `PecaConjunto.pesoEstimado` (kg per unit) |
| `valorKg` | `CustoMaterial.valorKg` (auto-calculated: valorChapa / pesoChapa) |
| `fatorWasteDefault` | `ConfiguracaoCustos.fatorWasteDefault` (default: 1.15) |
| `taxaIndiretos` | `ConfiguracaoCustos.taxaIndiretos` (default: 20%) |

---

## 4. Engine Functions (`src/lib/custos/conjuntoEngine.ts`)

All pure functions — no React, no side effects.

### `calcularCustoUnPeca(selecao, materiais, breakdownsComConfig, config): number`

Calculates the unit cost of ONE piece in ONE assembly:
1. If `configuracaoFabricacaoId` is set → look up `CustoPecaBreakdown.custoTotal`
2. Else → material-weight formula
3. Returns `0` if no material is selected

### `calcularCustoConjunto(orcamentoItem, conjunto, selecoes, materiais, breakdownsComConfig, config): ConjuntoCostBreakdown`

Full assembly cost for all pieces × all assemblies in the quotation line.

Returns `ConjuntoCostBreakdown` with:
- `custoMaterial` — material cost share
- `custoProcesso` — process cost share (when configs used)
- `custoIndiretos` — overhead
- `custoTotal` — grand total for this assembly line
- `pecasSemSelecao` — count of pieces still missing material selection
- `calculadoComSucesso` — true when all pieces are costed

### `inicializarSelecoes(orcamentoId, orcamentoItemId, conjunto): OrcamentoItemConfiguracao[]`

Creates blank selection entries for all pieces in an assembly. Called when a conjunto item is first encountered.

### `criarConjuntoSnapshot(breakdown, selecoes, orcamentoId, orcamentoNumero, motivo, usuario): ConjuntoCostSnapshot`

Creates an immutable snapshot. Called on quotation approval, revision creation, or production conversion.

### `calcularCustoTotalConjuntos(breakdowns): number`

Sum of all assembly costs across a quotation.

---

## 5. `ConjuntoCostBreakdown` (live, volatile)

```typescript
interface ConjuntoCostBreakdown {
  conjuntoId:     string
  conjuntoCodigo: string
  conjuntoNome:   string
  orcamentoItemId:string
  quantidade:     number    // assemblies in the quotation
  custoMaterial:  number
  custoProcesso:  number
  custoIndiretos: number
  custoTotal:     number
  pesoTotalKg:    number
  pecasTotal:        number
  pecasCalculadas:   number
  pecasSemSelecao:   number
  calculadoComSucesso: boolean
  calculadoEm:    Date
}
```

Recomputed automatically via `useMemo` whenever:
- Material selections change
- Material prices change (CustosContext)
- `taxaIndiretos` or `fatorWasteDefault` changes (CustosPecasContext)

---

## 6. `ConjuntoCostSnapshot` (immutable)

Created on key events, never modified after creation:

| `motivo` | Trigger |
|---------|---------|
| `configuracao_inicial` | First time selections are applied |
| `mudanca_material` | Any material selection changes |
| `aprovacao` | Quotation approved (`aprovarOrcamento`) |
| `revisao` | Quotation revision created (`criarRevisao`) |
| `conversao_producao` | Converted to production order |
| `manual` | User explicitly creates snapshot |

Future Supabase: `conjunto_cost_snapshots` with INSERT-only RLS policy.

---

## 7. Supabase Schema

```sql
-- Future: orcamento_item_configuracoes
CREATE TABLE orcamento_item_configuracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
  orcamento_item_id UUID NOT NULL REFERENCES orcamento_itens(id) ON DELETE CASCADE,
  conjunto_id UUID NOT NULL REFERENCES conjuntos(id),
  peca_conjunto_id TEXT NOT NULL,     -- PecaConjunto.id (local ID within assembly)
  peca_conjunto_codigo TEXT NOT NULL,
  peca_conjunto_descricao TEXT,
  peca_conjunto_quantidade NUMERIC(8,3) NOT NULL,
  peca_conjunto_peso NUMERIC(10,4) NOT NULL,
  peca_conjunto_espessura NUMERIC(8,2),
  material_id UUID NOT NULL REFERENCES materiais(id),
  configuracao_fabricacao_id UUID REFERENCES configuracoes_fabricacao(id),
  custo_unitario NUMERIC(12,4) NOT NULL DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW(),
  empresa_id UUID NOT NULL,
  UNIQUE(orcamento_item_id, peca_conjunto_id, empresa_id)
);

-- Future: conjunto_cost_snapshots (INSERT-only)
CREATE TABLE conjunto_cost_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  orcamento_id UUID NOT NULL REFERENCES orcamentos(id),
  orcamento_numero TEXT NOT NULL,
  orcamento_item_id UUID NOT NULL REFERENCES orcamento_itens(id),
  conjunto_id UUID NOT NULL REFERENCES conjuntos(id),
  conjunto_codigo TEXT NOT NULL,
  conjunto_nome TEXT NOT NULL,
  quantidade NUMERIC(8,3) NOT NULL,
  custo_material NUMERIC(12,2) NOT NULL,
  custo_processo NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_indiretos NUMERIC(12,2) NOT NULL DEFAULT 0,
  custo_total NUMERIC(12,2) NOT NULL,
  peso_total_kg NUMERIC(10,3),
  selecoes JSONB NOT NULL DEFAULT '[]',
  motivo TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  criado_por TEXT NOT NULL,
  empresa_id UUID NOT NULL
);

-- Indexes
CREATE INDEX idx_oic_orcamento ON orcamento_item_configuracoes(orcamento_id, empresa_id);
CREATE INDEX idx_oic_item ON orcamento_item_configuracoes(orcamento_item_id);
CREATE INDEX idx_ccs_orcamento ON conjunto_cost_snapshots(orcamento_id, empresa_id);

-- RLS
ALTER TABLE orcamento_item_configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conjunto_cost_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_isolation" ON orcamento_item_configuracoes
  USING (empresa_id = (auth.jwt() ->> 'empresa_id')::UUID);
CREATE POLICY "company_isolation" ON conjunto_cost_snapshots
  USING (empresa_id = (auth.jwt() ->> 'empresa_id')::UUID);
-- Note: conjunto_cost_snapshots should have INSERT-only for non-admin roles
```

---

## 8. Phase 8 Stabilization — Cost Propagation

*Implemented: 2026-06-10*

### Problem

`calcularCustoTotalConjuntos()` (imported into `OrcamentoConfiguracoesContext`) was the ONLY cost aggregator called in `getCustoTotalOrcamento()`. This function only sums `ConjuntoCostBreakdown[]` — it has no awareness of `tipo='peca'` catalog items. Result: `tipo='peca'` manufacturing costs were silently excluded from the quotation's manufacturing total.

Additionally, the config selectors in `OrcamentoDetalheModal` (both assembly and per-peca) computed costs live in their modal state and saved to `OrcamentoConfiguracoesContext`, but never wrote back to `OrcamentosContext`. The two contexts were permanently out of sync post-creation.

### Fix

- `calcularCustoTotalConjuntos` is no longer called in `getCustoTotalOrcamento` (import removed).
- `getCustoTotalOrcamento` now iterates all `OrcamentoItem[]` and sums both `breakdownsPorItem` (conjunto) and `pecaItemSelecoesPorItem` (peca catalog item) costs.
- Both config selector modals pass their locally-computed cost to an `onAplicar`/`onConfirmar` callback, which propagates to `atualizarOrcamento` in `OrcamentosContext`.

See `docs/orcamentos.md §Phase 8 Stabilization` and `docs/quotation-material-selection.md §13` for the full write-back architecture.

### Engine function status post-stabilization

| Function | Status | Notes |
|----------|--------|-------|
| `calcularCustoUnPeca` | ✅ Active | Used in `OrcamentoConfiguracoesContext.atualizarSelecao` |
| `calcularCustoConjunto` | ✅ Active | Used in `ConjuntoMaterialSelectorModal` for live preview and `breakdownsPorItem` useMemo |
| `inicializarSelecoes` | ✅ Active | Called from `OrcamentoConfiguracoesContext.inicializarConjunto` |
| `criarConjuntoSnapshot` | ✅ Active | Called from `OrcamentoConfiguracoesContext.criarSnapshot` |
| `calcularCustoTotalConjuntos` | ⚠ Unused | Was used in `getCustoTotalOrcamento`; replaced by the new per-item loop. Still exported from `conjuntoEngine.ts` for future use (e.g. batch reporting). |
| `buildSelecoesDraft` | ✅ Active | Called from `OrcamentoConfiguracoesContext.registrarSelecoesCriacao` |

---

## 9. Future Integration Hooks

```typescript
// [HOOK:SHEET_UTILIZATION] — Phase 6.5
// custoMat refined: valorChapa × (pecaArea / sheetArea) instead of weight-based

// [HOOK:QUOTATION_INTEGRATION] — THIS IS Phase 8 activation point
// OrcamentoDetalheModal: sum of conjunto costs → margin display
// PDF: include cost breakdown in comercial quotation document

// [HOOK:ASSEMBLY_COST] — Phase 7 (current)
// calcularCustoConjunto() is the activated hook

// [HOOK:SUPABASE_SYNC] — Future Supabase
// salvarSelecoes → UPSERT orcamento_item_configuracoes
// criarSnapshot → INSERT conjunto_cost_snapshots

// [HOOK:MATERIAL_STOCK] — Future purchasing
// low stock on selected material → alert before quoting
```
