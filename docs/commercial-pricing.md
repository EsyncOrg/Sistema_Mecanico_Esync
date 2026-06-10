# Commercial Pricing — Phase 8

*FORGE ERP — Intelligent Margin Engine*
*Phase 8 implemented: 2026-06-10*

---

## 1. Purpose

Phase 8 adds a **commercial pricing engine** to the quotation creation flow. Before Phase 8, `valorTotal` was computed by summing item `valorUnitario × quantidade` values — which were auto-filled from manufacturing costs. There was no structured way to apply margin, taxes, or commission.

Phase 8 provides:
- **Commercial profile templates** (Perfis Comerciais) with preset margin/taxes/commission %
- **Mode A:** user edits % → system computes `precoFinal` from cost
- **Mode B:** user edits `precoFinal` → system computes effective margin
- **`valorTotal` override:** when the pricing engine is applied, `valorTotal = precoFinal` (not manufacturing cost sum)
- **PDF commercial breakdown** showing cost, margin rows, and final price
- **Analytics KPIs:** average margin, quotations below 15% target, lowest-margin quotation

---

## 2. Pricing Formula

```
precoSugerido = custoTotalCalculado × (1 + margem/100 + impostos/100 + comissao/100)
lucroBruto    = precoFinal − custoTotalCalculado
margemEfetiva = lucroBruto / precoFinal × 100
```

- `custoTotalCalculado` = sum of Phase 7.x `CustoPecaBreakdown.custoTotal` values across all configured items
- All percentages operate on `custoTotalCalculado`, not `precoFinal` (additive, not compound)

---

## 3. Commercial Profiles (Perfis Comerciais)

Defined in `CustosContext` as `PerfilPrecificacao[]`. Managed at `/custos` → **Perfis Comerciais** tab.

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | |
| `nome` | `string` | Display name |
| `descricao` | `string?` | Internal note |
| `margemLucroPercentual` | `number` | Target margin % |
| `impostosPercentual` | `number` | Tax % applied on cost |
| `comissaoPercentual` | `number` | Sales commission % on cost |
| `ativo` | `boolean` | Only active profiles shown in selector |

### Seed profiles

| Profile | Margem | Impostos | Comissão |
|---------|--------|----------|----------|
| Conservador | 15% | 12% | 3% |
| Padrão | 25% | 12% | 5% |
| Agressivo | 35% | 12% | 7% |

---

## 4. Pricing State in NovoOrcamentoModal

Pricing state is managed in the main component and passed down to `PricingPanel`:

```typescript
const [perfilId,    setPerfilId]    = useState('')
const [margemPct,   setMargemPct]   = useState(25)
const [impostosPct, setImpostosPct] = useState(12)
const [comissaoPct, setComissaoPct] = useState(5)
const [modoPreco,   setModoPreco]   = useState<'A' | 'B'>('A')
const [precoFinalB, setPrecoFinalB] = useState(0)
```

Derived values (memos):
```typescript
precoSugerido    = custoTotalCalculado × (1 + margem + impostos + comissao)
precoFinalEfetivo = modoPreco === 'A' ? precoSugerido : (precoFinalB || precoSugerido)
lucroBruto        = precoFinalEfetivo − custoTotalCalculado
margemEfetiva     = lucroBruto / precoFinalEfetivo × 100
```

### PricingPanel visibility

The `PricingPanel` renders when `totalCusto > 0 || totalOrcado > 0`. It is always visible once any item has a value.

---

## 5. Warnings

| Warning | Condition |
|---------|-----------|
| Margem negativa | `margemEfetiva < 0` |
| Preço abaixo do custo | `precoFinal < custoTotalCalculado` |
| Abaixo da meta | `0 ≤ margemEfetiva < 15%` |
| Comissão excessiva | `custo × (comissao/100) > lucroBruto × 0.8` |

---

## 6. Snapshot on Creation

When `criarOrcamento()` is called, the pricing state is serialised as immutable fields on the `Orcamento` entity:

```typescript
perfilComercialId?:    string    // FK → PerfilPrecificacao.id
margemPercentual?:     number
impostosPercentual?:   number
comissaoPercentual?:   number
custoTotalCalculado?:  number    // volatile at creation time; frozen in snapshot
precoSugerido?:        number
precoFinal?:           number    // drives valorTotal
lucroBruto?:           number
margemEfetiva?:        number
```

**`valorTotal` override rule:** `criarOrcamento()` and `atualizarOrcamento()` in `OrcamentosContext` apply:
```typescript
if (orcamento.precoFinal != null && orcamento.precoFinal > 0) {
  orcamento.valorTotal = orcamento.precoFinal
}
```
This ensures dashboard totals, analytics, and PDF all use the commercial price, not manufacturing cost.

---

## 7. Validation (Phase 8 addition)

`NovoOrcamentoModal` now blocks creation when `totalOrcado === 0 && totalCusto === 0` — i.e. when no item has any unit value and no manufacturing cost is configured. This prevents zero-value quotations that would corrupt analytics.

---

## 8. PDF Integration

`renderFinancialSummary()` in `gerarPdfOrcamento.ts` detects Phase 8 data:

```typescript
const hasPricing = orc.precoFinal != null && orc.precoFinal > 0 && orc.custoTotalCalculado != null
```

When `hasPricing = true`:
- Box height expands from 47 mm to 66 mm
- "Subtotal" row becomes "Custo de fabricação"
- Breakdown rows added: margem, impostos, comissão, lucro bruto, margem efetiva
- "Preço sugerido" shown in muted text if it differs from `precoFinal`
- TOTAL GERAL pill shows `precoFinal` (not `valorTotal`)

When `hasPricing = false` (legacy/pre-Phase-8 quotations):
- Original layout preserved — placeholder Desconto/Frete/Impostos rows shown

---

## 9. OrcamentoDetalheModal — Pricing Card

A `PricingSummaryCard` component renders in the **Itens** tab when `orcamento.precoFinal > 0`.
It shows a compact breakdown: custo fabricação, preço final (bold), lucro bruto, margem efetiva, and the applied percentages.

---

## 10. Analytics KPIs

`OrcamentosAnalytics` (Phase 8 additions):

| Field | Computation |
|-------|-------------|
| `margemMedia` | Average `margemEfetiva` across all priced quotations |
| `margemMaxima` | Max `margemEfetiva` |
| `orcamentosAbaixoMeta` | Count where `margemEfetiva < 15` |
| `orcamentoMenorMargem` | `{ numero, margem }` of the lowest-margin quotation |

These are computed reactively in `OrcamentosContext.analytics` useMemo.

---

## 11. Supabase Migration Plan

### Table: `commercial_profiles`

```sql
create table commercial_profiles (
  id                    uuid primary key default gen_random_uuid(),
  empresa_id            uuid not null references empresas(id),
  nome                  text not null,
  descricao             text,
  margem_lucro_pct      numeric(5,2) not null default 0,
  impostos_pct          numeric(5,2) not null default 0,
  comissao_pct          numeric(5,2) not null default 0,
  ativo                 boolean not null default true,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now()
);

alter table commercial_profiles enable row level security;
create policy "empresa" on commercial_profiles
  using (empresa_id = (auth.jwt()->>'empresa_id')::uuid);
```

### Columns on `orcamentos` table (Phase 8 additions)

```sql
alter table orcamentos
  add column perfil_comercial_id   uuid references commercial_profiles(id) on delete set null,
  add column margem_percentual     numeric(5,2),
  add column impostos_percentual   numeric(5,2),
  add column comissao_percentual   numeric(5,2),
  add column custo_total_calculado numeric(15,2),
  add column preco_sugerido        numeric(15,2),
  add column preco_final           numeric(15,2),
  add column lucro_bruto           numeric(15,2),
  add column margem_efetiva        numeric(5,2);
```

### Table: `pricing_snapshots`

Immutable log — one row per quotation creation/revision that used the pricing engine:

```sql
create table pricing_snapshots (
  id                    uuid primary key default gen_random_uuid(),
  orcamento_id          uuid not null references orcamentos(id) on delete cascade,
  revisao_numero        int  not null default 0,
  perfil_comercial_id   uuid references commercial_profiles(id) on delete set null,
  custo_total_calculado numeric(15,2) not null,
  margem_pct            numeric(5,2)  not null,
  impostos_pct          numeric(5,2)  not null,
  comissao_pct          numeric(5,2)  not null,
  preco_sugerido        numeric(15,2),
  preco_final           numeric(15,2) not null,
  lucro_bruto           numeric(15,2),
  margem_efetiva        numeric(5,2),
  criado_em             timestamptz not null default now(),
  criado_por            uuid references auth.users(id)
);

create index on pricing_snapshots(orcamento_id);
```

### TypeScript field mapping

| TypeScript | Supabase column |
|------------|----------------|
| `perfilComercialId` | `perfil_comercial_id` |
| `margemPercentual` | `margem_percentual` |
| `impostosPercentual` | `impostos_percentual` |
| `comissaoPercentual` | `comissao_percentual` |
| `custoTotalCalculado` | `custo_total_calculado` |
| `precoSugerido` | `preco_sugerido` |
| `precoFinal` | `preco_final` |
| `lucroBruto` | `lucro_bruto` |
| `margemEfetiva` | `margem_efetiva` |

---

## 12. Files Modified in Phase 8

| File | Change |
|------|--------|
| `src/types/orcamentos.ts` | Added 9 optional pricing fields to `Orcamento`; added Phase 8 analytics fields to `OrcamentosAnalytics` |
| `src/mocks/orcamentos.ts` | All 4 mock quotations seeded with realistic pricing data |
| `src/contexts/OrcamentosContext.tsx` | `criarOrcamento` + `atualizarOrcamento`: override `valorTotal = precoFinal` when set; analytics extended |
| `src/components/orcamentos/NovoOrcamentoModal.tsx` | `PricingPanel` component; pricing state; validation for zero-value quotations |
| `src/components/orcamentos/CatalogSelectorModal.tsx` | Fixed: uses `useConjuntos()` (live context) instead of stale `mockConjuntos` |
| `src/components/orcamentos/OrcamentoDetalheModal.tsx` | `PricingSummaryCard` shown in Itens tab |
| `src/lib/orcamentos/gerarPdfOrcamento.ts` | `renderFinancialSummary`: Phase 8 commercial breakdown; dynamic box height |
| `src/app/(dashboard)/custos/page.tsx` | Tab label renamed from "Precificação" to "Perfis Comerciais" |

---

## 13. Phase 8 Stabilization — `custoTotalCalculado` Write-Back

*Implemented: 2026-06-10*

### Behavior after stabilization

When a user changes material/config selections in `OrcamentoDetalheModal` (post-creation):

1. `OrcamentoItem.valorUnitario` is updated to the new manufacturing cost per unit.
2. `orcamento.custoTotalCalculado` is updated to the new sum of all manufacturing item costs.
3. `orcamento.valorTotal` stays as `precoFinal` (if commercial pricing was applied), because `atualizarOrcamento` applies the `precoFinal` override after recomputing `recalcTotal(itens)`.

### Pricing snapshot immutability (Phase 8 Stabilization rule)

`precoFinal`, `lucroBruto`, and `margemEfetiva` are NOT automatically recomputed when config selections change post-creation. They reflect the pricing decision made at creation time and should be treated as **immutable** until the user explicitly reprices.

**Phase 8.1 will add**: "Recalcular Precificação" action in `OrcamentoDetalheModal` that runs the commercial pricing engine with the current `custoTotalCalculado` and lets the user commit the update.

### `PricingSummaryCard` behavior

After a config change, `PricingSummaryCard` shows:
- `custoTotalCalculado` → updated (reflects the new mfg cost)
- `precoFinal` → unchanged (original commercial decision)
- `lucroBruto` = `precoFinal − custoTotalCalculado` → the stored snapshot value (stale after config change)
- A visual gap may appear between stored `lucroBruto` and the actual current margin until Phase 8.1 repricing

This is acceptable: it signals to the commercial team that the manufacturing cost changed and repricing may be warranted.
