# Quotation Configuration Selection

*FORGE ERP — Phase 7 / 7.1 / 7.2: Per-Piece Manufacturing Configuration Selection*
*Phase 7 implemented: 2026-06-01 · Phase 7.1 implemented: 2026-06-08 · Phase 7.2 implemented: 2026-06-08*

---

## 1. Purpose

This module enables **per-piece manufacturing configuration selection when quoting pieces or assemblies**. Configuration choices are:
- Made **during quotation creation** (Phase 7.2), not after (Phase 7/7.1 enforced this post-creation only)
- Selected by `configuracaoFabricacaoId` (NOT raw `materialId`)
- Instant: cost updates live on every selection change
- Traceable: preserved through revision, approval, and production conversion
- Blocking: quotation **cannot be created** (Phase 7.2) until all catalog items have a configuration; also cannot be sent or approved afterward

### Phase 7.2 upgrade

Phase 7.2 enforces configuration selection **before** the quotation is created. The `NovoOrcamentoModal` now:
1. Shows inline config panels for every catalog-linked item
2. Blocks "Criar Orçamento" until all pieces are configured
3. Auto-fills `valorUnitario` from the selected config cost
4. Calls `registrarSelecoesCriacao()` immediately after `criarOrcamento()` to create immutable snapshots

---

## 2. Critical Design Rule

**The user selects a `ConfiguracaoFabricacao`, not a `CustoMaterial`.**

`materialId` is derived from `config.materialId` and retained for engine fallback only.

Reason: a configuration encodes material + processes + routing. This is what production needs. `materialId` alone is insufficient for welding, painting, assembly, PCP, and production routing.

---

## 3. Architecture

```
OrcamentosContext (Phase 1–4)
  └── Orcamento.itens[]: OrcamentoItem

Phase 7.1 adds:

OrcamentoConfiguracoesContext
  ├── selecoesPorItem: Record<itemId, OrcamentoItemConfiguracao[]>
  │     └── one per PecaConjunto — primary field: configuracaoFabricacaoId
  ├── pecaItemSelecoesPorItem: Record<itemId, PecaItemSelecao>
  │     └── one per tipo='peca' item — stores configuracaoFabricacaoId
  ├── breakdownsPorItem: Record<itemId, ConjuntoCostBreakdown>  (useMemo)
  └── itensSemConfiguracao(itens): OrcamentoItem[]  → blocking check
```

---

## 4. Selection Rules by Item Type

### `tipo='peca'` (individual piece)
1. Item must have `pecaId` linking to the catalog.
2. Immediately shows config selector row below the item line.
3. User clicks "Selecionar" → `PecaConfiguracaoSelectorModal` opens.
4. Modal lists all active `ConfiguracaoFabricacao` for that piece (via `getByPeca(pecaId)`).
5. If no configs exist: warning + link to Custos → Configurações de Fabricação.
6. On "Confirmar": saves `PecaItemSelecao` with `configuracaoFabricacaoId`.

### `tipo='conjunto'` (assembly)
1. Shows config selector row below the item line.
2. User clicks "Selecionar Configurações" → `ConjuntoMaterialSelectorModal` opens.
3. Each `PecaConjunto` in the BOM is shown.
4. For pieces with `peca.pecaId`: shows all active configs for that catalog piece.
5. For pieces without `pecaId`: shows info row (no config required).
6. If a piece has `pecaId` but no configs: shows warning + link to Custos.
7. On "Aplicar": saves `OrcamentoItemConfiguracao[]` with `configuracaoFabricacaoId` as primary.

---

## 5. Blocking Rule

`ActionBar` blocks "Enviar ao Cliente" and "Aprovar" when `itensSemConfiguracao(itens).length > 0`.

A warning banner is shown listing the count of items pending configuration.

`itensSemConfiguracao` logic:
- `tipo='peca'`: blocked if no `PecaItemSelecao` or empty `configuracaoFabricacaoId`
- `tipo='conjunto'`: blocked if any catalog-linked piece (`peca.pecaId` set) is missing `configuracaoFabricacaoId`
- Other types (`servico`, `material`, etc.): never blocked

---

## 6. New Entities

### `OrcamentoItemConfiguracao` (updated Phase 7.1)

| Field | Change |
|-------|--------|
| `configuracaoFabricacaoId` | Was `?: string` (optional). Now `string` (required, primary) |
| `materialId` | Was primary. Now derived from `config.materialId` |

### `PecaItemSelecao` (new Phase 7.1)

One entry per `OrcamentoItem` where `tipo='peca'`.

| Field | Description |
|-------|-------------|
| `orcamentoItemId` | FK → OrcamentoItem.id |
| `pecaId` | FK → Peca.id (catalog) |
| `configuracaoFabricacaoId` | FK → ConfiguracaoFabricacao.id — selected config |
| `custoUnitario` | Derived from config's `CustoPecaBreakdown.custoTotal` |

### `PecaConfiguracaoDisponivel` (new Phase 7.1)

Formalizes which configurations are available for quotation per catalog piece.

| Field | Description |
|-------|-------------|
| `pecaId` | FK → Peca.id |
| `configuracaoFabricacaoId` | FK → ConfiguracaoFabricacao.id |
| `ativo` | Independently toggleable (separate from config.ativo) |

Future: per-client availability, seasonal pricing windows.

---

## 7. New Mock Data

### `CONJ-0007` (mockConjuntos)

A new assembly whose `PecaConjunto` pieces have `pecaId` linked to catalog pieces:
- `pcp-101` → `pecaId: '1'` (PCA-0001 — 2 configs: cfg-0001, cfg-0002)
- `pcp-102` → `pecaId: '2'` (PCA-0002 — 3 configs: cfg-0003..cfg-0005)
- `pcp-103` → `pecaId: '7'` (PCA-0007 — 2 configs: cfg-0006, cfg-0007)

### `mockPecaConfiguracoesDisponiveis`

7 entries linking PCA-0001, PCA-0002, PCA-0007 to their configurations.
File: `src/mocks/peca-configuracoes-disponiveis.ts`

---

## 8. UI Components

### `ConjuntoMaterialSelectorModal` (refactored Phase 7.1)

**File:** `src/components/orcamentos/ConjuntoMaterialSelectorModal.tsx`

Shows `ConfiguracaoFabricacao` options per BOM piece — NOT raw materials.

Per-piece row (when `peca.pecaId` set and configs exist):
```
● PCA-0002  Suporte de Fixação (6mm · 0.80kg/un · ×2)
  [CFG-0003 Aço Carbono 6mm · corte · dobra · pintura  R$ 252,67 ▾]
  Comparação:
    Aço Carbono + Pintura     R$ 505,34
    Inox 304                  R$ 436,00   ← selected
    Galvanizado Z275          R$ 379,46
```

Per-piece row (no configs available):
```
⚠ PCA-0001  no configs  →  [Custos → Configurações]
```

### `PecaConfiguracaoSelectorModal` (new Phase 7.1)

**File:** `src/components/orcamentos/PecaConfiguracaoSelectorModal.tsx`

Modal for `tipo='peca'` items. Shows config cards with full cost breakdown.

```
[◉] CFG-0003  Aço Carbono 1020 6mm
    corte · dobra · pintura
    Material R$18,40  Processo R$210,27  Indiretos R$24,00
                                                    R$ 252,67

[○] CFG-0004  Aço Inox 304 6mm
    ...

[calc] R$ 252,67 / un = R$ 505,34 total    [Cancelar] [Confirmar]
```

---

## 9. Cost Engine Integration

`conjuntoEngine.ts` already supports both paths:

| Path | When used | Cost source |
|------|-----------|-------------|
| Config breakdown | `configuracaoFabricacaoId` set + breakdown found | `CustoPecaBreakdown.custoTotal` (process-aware) |
| Material fallback | `materialId` set, no config breakdown | `peso × valorKg × fatorWaste` |

Phase 7.1: `configuracaoFabricacaoId` is now always set (to `''` when blank, to the config ID when selected). The engine checks for a non-empty value before using the config path.

---

## 10. Production Compatibility

Future production modules receive:
- `configuracaoFabricacaoId` (primary — for routing, processes, PCP)
- `materialId` (derived — for stock lookup)

Inside each `PecaSolicitacao` generated during conversion.

---

## 11. Files Modified (Phase 7.1)

| File | Change |
|------|--------|
| `src/types/conjuntos.ts` | Added `pecaId?: string` to `PecaConjunto` |
| `src/types/orcamento-configuracoes.ts` | `configuracaoFabricacaoId` required; added `PecaItemSelecao` |
| `src/lib/custos/conjuntoEngine.ts` | `inicializarSelecoes` uses `''` for blank config |
| `src/contexts/OrcamentoConfiguracoesContext.tsx` | Added peca item state + `itensSemConfiguracao` |
| `src/components/orcamentos/ConjuntoMaterialSelectorModal.tsx` | Refactored to config-based selection |
| `src/components/orcamentos/OrcamentoDetalheModal.tsx` | Peca config row + blocking in ActionBar |
| `src/mocks/conjuntos.ts` | Added `CONJ-0007` with catalog-linked pieces |

## 12. Files Created (Phase 7.1)

| File | Purpose |
|------|---------|
| `src/types/peca-configuracoes-disponiveis.ts` | Was created in Phase 7, now used |
| `src/mocks/peca-configuracoes-disponiveis.ts` | Seed data for PecaConfiguracaoDisponivel |
| `src/components/orcamentos/PecaConfiguracaoSelectorModal.tsx` | Config selection for peca items |
