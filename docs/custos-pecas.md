# Custos das Peças Module

*Esync ERP — Automatic Industrial Piece Cost Engine*
*Phase 6 implemented: 2026-06-01*

---

## 1. Purpose

Phase 6 activates the **automatic per-piece cost engine**. It consumes the rate tables established in Phase 5 (CentroCusto, CustoMaterial, MaquinaCustos) and the process time data from Phase 5.5 (Peca.tempoXxxMin fields) to produce a full, itemized cost breakdown for every piece in the catalog.

**Costs are NEVER manually entered — always derived:**

```
Peca.peso × CustoMaterial.valorKg × fatorWaste   → custoMaterial
Peca.tempoXxxMin / 60 × CentroCusto.custoHora    → custoXxx (per sector)
Peca.tempoXxxMin / 60 × MaquinaCustos.custoTotalHora → custoMaquinas
(sum of above) × taxaIndiretos%                   → custoIndiretos
─────────────────────────────────────────────────────────────────
                                                    custoTotal
```

**Position in the ERP flow:**

```
Phase 5  → CentroCusto, CustoMaterial, MaquinaCustos, PerfilPrecificacao
Phase 5.5 → Peca.tempoXxxMin (time data per piece)
                  ↓
Phase 6  → calcularCustoPecaCompleto() → CustoPecaBreakdown
                  ↓
Phase 7  → CustoConjunto (sum of piece costs × quantities per Conjunto)
Phase 8  → CustoOrcamento (quote cost via pricing profile simulation)
```

---

## 2. Data Model

All types are defined in `src/types/custos-pecas.ts`.

### 2.1 `ConfiguracaoCustos`

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `taxaIndiretos` | `number` | `20` | Indirect overhead % applied to direct costs |
| `fatorWasteDefault` | `number` | `1.15` | Nesting/cutting waste multiplier (1.0 = no waste) |

Stored in `CustosPecasContext`. Editable in the "Custos das Peças" tab by users with `canEdit('custos')`. Changing either field triggers immediate recalculation of all pieces.

Future Supabase: `custos_config` table, one row per `empresa_id`.

### 2.2 `CustoPecaBreakdown` (computed, volatile)

Full cost breakdown for one piece at one point in time.

| Field | Source |
|-------|--------|
| `custoMaterial` | `peso × valorKg × fatorWaste` |
| `custoEngenharia` | `tempoDesenvolvimentoMin / 60 × Engenharia.custoHora` |
| `custoProgramacao` | `tempoProgramacaoMin / 60 × Programação.custoHora` |
| `custoCorte` | `tempoCorteMin / 60 × Corte.custoHora` |
| `custoDobra` | `tempoDobraMin / 60 × Dobra.custoHora` |
| `custoSolda` | `tempoSoldaMin / 60 × Solda.custoHora` |
| `custoPintura` | `tempoPinturaMin / 60 × Pintura.custoHora` |
| `custoMontagem` | `tempoMontagemMin / 60 × Montagem.custoHora` |
| `custoMaquinas` | Σ `(tempoXxxMin / 60 × maquina.custoTotalHora)` per `processoPrincipal` |
| `custoIndiretos` | `(sum of all above) × taxaIndiretos / 100` |
| `custoTotal` | Sum of all components |

Percentage distribution (`percentuais`) groups:
- `material` — custoMaterial / custoTotal
- `engenharia` — custoEngenharia / custoTotal
- `programacao` — custoProgramacao / custoTotal
- `producao` — (corte + dobra + solda + pintura + montagem) / custoTotal
- `maquinas` — custoMaquinas / custoTotal
- `indiretos` — custoIndiretos / custoTotal

Status:
- `calculadoComSucesso: true` when ≥ 1 time field > 0 AND a material was matched
- `avisos: string[]` — human-readable warnings (approximate material, missing times)

Phase 6: stored in-memory (volatile).
Phase 7: stored in `peca_custos` Supabase table (indexed by `peca_id`).

### 2.3 `CustoSnapshot` (immutable, versioned)

Created automatically when a piece's cost changes and manually on user request.

| Trigger | `motivo` value |
|---------|---------------|
| First mount of CustosPecasContext | `calculo_inicial` |
| Piece times or weight changed | `mudanca_tempo` |
| Material prices changed | `mudanca_material` |
| Machine costs changed | `mudanca_maquina` |
| `taxaIndiretos` or `fatorWasteDefault` changed | `mudanca_configuracao` |
| User clicks "Forçar snapshot" | `manual` |

Snapshots are **append-only** — never mutated or deleted. Same pattern as `OrcamentoHistorico` and `HistoricoCusto`.

Future Supabase: `peca_custo_snapshots` table with INSERT-only RLS policy.

### 2.4 `HistoricoRecalculo` (recalculation event log)

Append-only log. One entry per recalculation event (single piece or all pieces).

| `EventoRecalculo` | Description |
|-------------------|-------------|
| `recalculo_automatico` | Triggered by piece edit (EditarPecaModal.onSave) |
| `recalculo_forcado` | User clicks "Recalcular Todos" |
| `snapshot_criado` | Manual snapshot action |
| `config_alterada` | taxaIndiretos or fatorWasteDefault changed |

Future Supabase: `peca_custo_historico` table with INSERT-only RLS policy.

### 2.5 `CustoPecasAnalytics`

Computed via `useMemo` from all current breakdowns.

| Field | Computation |
|-------|-------------|
| `custoMedioPecas` | avg `custoTotal` across pieces with `custoTotal > 0` |
| `pecaMaisCara` | piece with highest `custoTotal` |
| `pecaMaisBarata` | piece with lowest `custoTotal > 0` |
| `percentualMedioMaterial` | avg `percentuais.material` across priced pieces |
| `percentualMedioProducao` | avg `percentuais.producao` |
| `percentualMedioMaquinas` | avg `percentuais.maquinas` |
| `percentualMedioIndiretos` | avg `percentuais.indiretos` |
| `maiorComponente` | the component with highest average percentage |
| `pecasComCusto` | pieces where `custoTotal > 0` |
| `pecasSemCusto` | pieces where `custoTotal === 0` |
| `custoTotalCatalogo` | sum of all `custoTotal` values |

---

## 3. Calculation Engine

### File
`src/lib/custos/pecasEngine.ts`

### `encontrarMaterial(peca, materiais): MaterialMatch`

1. Filter to active materials only
2. Find exact espessura match → return with `exataCorrespondencia: true`
3. If no exact match: find material with closest espessura → return with `exataCorrespondencia: false`
4. If no materials at all: return `{ material: null, exataCorrespondencia: false }`

An approximate match adds a warning to `CustoPecaBreakdown.avisos`.

### `calcularCustoPecaCompleto(peca, centros, materiais, maquinasCustos, config, usuario?): CustoPecaBreakdown`

Full sequential calculation:
1. Material match → `custoMaterial`
2. Per-sector labor costs (7 sectors × their CentroCusto rate)
3. Machine costs via `MaquinaCustos.processoPrincipal` lookup
4. Indirect overhead on total direct costs
5. Percentage distribution
6. `calculadoComSucesso` and `avisos` evaluation

All intermediate values rounded to 2 decimal places (monetary) or 1 decimal place (percentages).

### `breakdownParaSnapshot(bd, motivo, versao): CustoSnapshot`

Creates an immutable snapshot from a live breakdown. `versao` is a monotonically increasing counter per piece tracked in `CustosPecasContext.versaoRef`.

### `calcularCustoPecasAnalytics(breakdowns): CustoPecasAnalytics`

Pure aggregation function. Called via `useMemo` in `CustosPecasContext`.

---

## 4. Context API (`CustosPecasContext`)

### Location
`src/contexts/CustosPecasContext.tsx`

Nested inside `CustosProvider` (accesses `useCustos()` for rate data).

### State
- `breakdowns: CustoPecaBreakdown[]` — one per piece, recomputed on demand
- `snapshots: CustoSnapshot[]` — append-only
- `historico: HistoricoRecalculo[]` — append-only
- `config: ConfiguracaoCustos`
- `analytics: CustoPecasAnalytics` — computed via `useMemo`
- `pecasRef: RefObject<Peca[]>` — latest known piece list (internal)
- `versaoRef: RefObject<Map<string, number>>` — snapshot version counters (internal)

### Actions

```typescript
// Retrieve breakdown for a specific piece
getBreakdown(pecaId: string): CustoPecaBreakdown | undefined

// Recompute one piece — called from EditarPecaModal.handleSave()
recalcularPeca(peca: Peca): void

// Recompute all pieces — called from "Recalcular Todos" button
// If pecas is omitted, uses the last known list (pecasRef.current)
recalcularTodas(pecas?: Peca[]): void

// Create a manual immutable snapshot
forcarSnapshot(pecaId: string): void

// Update calculation config — triggers immediate recalculation
atualizarConfig(changes: Partial<ConfiguracaoCustos>): void
```

### Initialization

On first mount, `useEffect` runs once:
1. Computes `calcularCustoPecaCompleto` for all `mockPecas`
2. Sets `breakdowns`
3. Creates `calculo_inicial` snapshots for all pieces with `calculadoComSucesso: true`
4. Appends initial `recalculo_automatico` history entry

---

## 5. Files Structure

```
src/
├── types/
│   └── custos-pecas.ts                  # All Phase 6 types + hooks for Phase 7-8
├── lib/
│   └── custos/
│       └── pecasEngine.ts               # Pure engine: calcularCustoPecaCompleto,
│                                        # breakdownParaSnapshot, calcularCustoPecasAnalytics
├── contexts/
│   └── CustosPecasContext.tsx           # Provider + useCustosPecas hook
└── app/(dashboard)/
    └── custos/
        └── page.tsx                     # New tab: "Custos das Peças" (7th tab)
```

**Modified files (Phase 6):**
- `src/app/layout.tsx` — registered `CustosPecasProvider` inside `CustosProvider`
- `src/app/(dashboard)/custos/page.tsx` — added 7th tab "Custos das Peças"
- `src/components/shared/EditarPecaModal.tsx` — cost preview card + `recalcularPeca()` on save

---

## 6. UI — Custos das Peças Tab

**Route:** `/custos` → tab "Custos das Peças"

```
/custos → Custos das Peças tab

┌── Parâmetros de Cálculo ───────────────────────────── [Recalcular Todos] ──┐
│  Taxa de Indiretos: [20%]     Fator de Desperdício: [×1.15]               │
└────────────────────────────────────────────────────────────────────────────┘

KPI Row: [Custo Médio/Peça]  [Peça Mais Cara]  [Peças sem Custo]  [Total Catálogo]

┌── Custo por Peça (table) ─────────────────────────────────────────────────┐
│ CÓDIGO   DESCRIÇÃO        ESP.  PESO  MATERIAL         CUSTO  STATUS  ▾  │
│ PCA-0001 Flange Ø150mm   12mm  2.1kg ~AC 1020 6mm   R$120,90 ⚠Aprox.    │
│ PCA-0002 Suporte Fixação   6mm  0.8kg AC 1020 6mm    R$252,67 ✓         │
│                                                                           │
│ ┌── Expanded: PCA-0002 ───────────────────────────────────────────────┐  │
│ │  [Breakdown bars]           [Summary + Total pill + Warnings]       │  │
│ └────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────┘
```

### Expanded row panel (`CustoBreakdownPanel`)

Shows:
- **Left:** Horizontal bar per cost component (Material, Engenharia, Programação, Corte, Dobra, Solda, Pintura, Montagem, Máquinas, Indiretos) with R$ amount and % share. Bars animated via Framer Motion.
- **Right:** Input summary (material name, R$/kg, taxa, fator, calculado em), total pill (teal background), warnings list, "Forçar snapshot" link for admins.

---

## 7. EditarPecaModal Integration

When a user edits a piece in `EditarPecaModal`:

1. **Live cost preview** (read-only card at the bottom of the dialog):
   - Recomputes on every change to peso, bitola, or any time field
   - Shows total + component breakdown in one line
   - Shows warnings (approximate material, missing times)
   - Does NOT write to context during editing — purely computed

2. **On save** (`handleSave`):
   ```typescript
   onSave(updated)          // updates parent page state
   recalcularPeca(updated)  // refreshes CustosPecasContext breakdown
   ```

---

## 8. Material Matching Details

| Peca.espessura | Best match | Notes |
|----------------|-----------|-------|
| 3mm | Exact: Aço Carbono 1020 3mm (mat-001) | `exataCorrespondencia: true` |
| 6mm | Exact: Aço Carbono 1020 6mm (mat-002) | `exataCorrespondencia: true` |
| 4mm | Closest: mat-001 (3mm) | Warning added |
| 8mm | Closest: mat-002 (6mm) | Warning added |
| 12mm | Closest: mat-002 (6mm) | Warning added |
| 50mm | Closest: mat-002 (6mm) | Warning added |

To improve matching, add more material entries in the Custos → Materiais tab for the actual espessuras used in production.

---

## 9. Calculated Cost Examples (seed data)

Using default config (taxaIndiretos=20%, fatorWaste=1.15):

### PCA-0001 — Flange de Conexão Ø150mm (espessura 12mm, peso 2.10kg)

| Component | Calc | Value |
|-----------|------|-------|
| Material | 2.10 × R$10.00 × 1.15 (approx mat-002 6mm) | R$ 24.15 |
| Engenharia | 20min / 60 × R$75/h | R$ 25.00 |
| Programação | 15min / 60 × R$65/h | R$ 16.25 |
| Corte | 8min / 60 × R$120/h | R$ 16.00 |
| Montagem | 5min / 60 × R$60/h | R$ 5.00 |
| Máquinas (Corte) | 8min / 60 × R$107.60/h | R$ 14.35 |
| Indiretos (20%) | R$100.75 × 20% | R$ 20.15 |
| **Total** | | **R$ 120.90** |

### PCA-0002 — Suporte de Fixação (espessura 6mm EXACT, peso 0.80kg)

| Component | Calc | Value |
|-----------|------|-------|
| Material | 0.80 × R$10.00 × 1.15 | R$ 9.20 |
| Engenharia | 30min / 60 × R$75/h | R$ 37.50 |
| Programação | 20min / 60 × R$65/h | R$ 21.67 |
| Corte | 10min / 60 × R$120/h | R$ 20.00 |
| Dobra | 15min / 60 × R$85/h | R$ 21.25 |
| Pintura | 25min / 60 × R$70/h | R$ 29.17 |
| Montagem | 10min / 60 × R$60/h | R$ 10.00 |
| Máquinas Corte | 10min / 60 × R$107.60/h | R$ 17.93 |
| Máquinas Dobra | 15min / 60 × R$71.20/h | R$ 17.80 |
| Máquinas Pintura | 25min / 60 × R$62.50/h | R$ 26.04 |
| Indiretos (20%) | R$210.56 × 20% | R$ 42.11 |
| **Total** | | **R$ 252.67** |

---

## 10. Permission Matrix

| Cargo | Custos das Peças |
|-------|-----------------|
| Mecânica (admin) | ✅ Full — view + edit config + force snapshot |
| Operador Corte | — no access (blocked by PermissionGate) |
| PCP | 👁 View only |
| Engenharia | 👁 View only |
| Produção | — no access |
| Qualidade | — no access |
| Administrativo | ✅ Full — edit config + force snapshot |

Cost data is commercially sensitive — same permission matrix as Phase 5 Custos module.

---

## 11. Supabase Migration Strategy

### Tables required

```sql
-- Current computed breakdown (one row per piece, updated on recalculation)
CREATE TABLE peca_custos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peca_id UUID NOT NULL REFERENCES pecas(id) ON DELETE CASCADE,
  custo_material       NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo_engenharia     NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo_programacao    NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo_corte          NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo_dobra          NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo_solda          NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo_pintura        NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo_montagem       NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo_maquinas       NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo_indiretos      NUMERIC(10,2) NOT NULL DEFAULT 0,
  custo_total          NUMERIC(10,2) GENERATED ALWAYS AS (
    custo_material + custo_engenharia + custo_programacao +
    custo_corte + custo_dobra + custo_solda + custo_pintura + custo_montagem +
    custo_maquinas + custo_indiretos
  ) STORED,
  material_nome        TEXT,
  valor_kg_usado       NUMERIC(10,4),
  taxa_indiretos_usada NUMERIC(5,2),
  fator_waste_usado    NUMERIC(5,3),
  calculado_com_sucesso BOOLEAN DEFAULT FALSE,
  avisos               TEXT[],
  calculado_em         TIMESTAMPTZ DEFAULT NOW(),
  versao               INTEGER NOT NULL DEFAULT 1,
  empresa_id           UUID NOT NULL,
  UNIQUE(peca_id, empresa_id)
);

-- Immutable versioned snapshots (INSERT-only RLS)
CREATE TABLE peca_custo_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peca_id UUID NOT NULL REFERENCES pecas(id),
  versao INTEGER NOT NULL,
  motivo TEXT NOT NULL,
  custo_material       NUMERIC(10,2) NOT NULL,
  custo_engenharia     NUMERIC(10,2) NOT NULL,
  custo_programacao    NUMERIC(10,2) NOT NULL,
  custo_corte          NUMERIC(10,2) NOT NULL,
  custo_dobra          NUMERIC(10,2) NOT NULL,
  custo_solda          NUMERIC(10,2) NOT NULL,
  custo_pintura        NUMERIC(10,2) NOT NULL,
  custo_montagem       NUMERIC(10,2) NOT NULL,
  custo_maquinas       NUMERIC(10,2) NOT NULL,
  custo_indiretos      NUMERIC(10,2) NOT NULL,
  custo_total          NUMERIC(10,2) NOT NULL,
  valor_kg_snapshot    NUMERIC(10,4),
  taxa_indiretos_snapshot NUMERIC(5,2),
  material_nome        TEXT,
  criado_em            TIMESTAMPTZ DEFAULT NOW(),
  criado_por           TEXT NOT NULL,
  empresa_id           UUID NOT NULL
);

-- Recalculation event log (INSERT-only RLS)
CREATE TABLE peca_custo_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento TEXT NOT NULL,
  peca_id UUID REFERENCES pecas(id),
  custo_anterior NUMERIC(10,2) NOT NULL,
  custo_novo     NUMERIC(10,2) NOT NULL,
  descricao      TEXT NOT NULL,
  criado_em      TIMESTAMPTZ DEFAULT NOW(),
  criado_por     TEXT NOT NULL,
  empresa_id     UUID NOT NULL
);

-- Empresa-level configuration
CREATE TABLE custos_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  taxa_indiretos     NUMERIC(5,2) NOT NULL DEFAULT 20,
  fator_waste_default NUMERIC(5,3) NOT NULL DEFAULT 1.15,
  empresa_id         UUID NOT NULL UNIQUE
);

-- RLS
ALTER TABLE peca_custos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE peca_custo_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE peca_custo_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE custos_config        ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_peca_custos_peca ON peca_custos(peca_id);
CREATE INDEX idx_peca_custo_snapshots_peca ON peca_custo_snapshots(peca_id, versao);
CREATE INDEX idx_peca_custo_historico_ts ON peca_custo_historico(criado_em DESC);
```

### Context migration pattern

```typescript
// Current (Phase 6 — in-memory):
const initial = mockPecas.map(p => calcularCustoPecaCompleto(p, centros, materiais, ...))
setBreakdowns(initial)

// Future (Phase 7 — Supabase):
const { data: pecas } = await supabase.from('pecas').select('*').eq('empresa_id', empresaId)
const { data: custos } = await supabase.from('peca_custos').select('*').eq('empresa_id', empresaId)
// If peca_custos is empty or stale: trigger server-side recalculation via edge function
```

---

## 12. Future Phases (from Phase 6)

```
Phase 6.5 — Sheet Utilization Engine
  Calculate how many pieces fit on one sheet → utilization %
  custoMaterial refined: actualUsedArea / totalSheetArea × valorChapa
  Affects: CustoPecaBreakdown.custoMaterial (replaces weight-based calc)

Phase 7 — Automatic Conjunto Cost Engine
  [HOOK:CUSTO_CONJUNTO] activated
  For each PecaConjunto in Conjunto.pecas:
    cost += getBreakdown(pecaId).custoTotal × quantidade
  Result: CustoConjuntoAgregado (defined in types/custos-pecas.ts)

Phase 8 — Intelligent Budget Pricing
  [HOOK:CUSTO_ORCAMENTO] activated
  For each approved Orcamento item with conjuntoId:
    custoItem = CustoConjuntoAgregado.custoTotal × item.quantidade
  Display: "Custo Estimado" column in OrcamentoDetalheModal
  Compare: custoTotal vs valorTotal → margin visibility
```

---

## 13. Architecture Decisions

### Volatile breakdowns (no persistence in Phase 6)
**Decision:** `CustoPecaBreakdown` objects are computed in-memory and not persisted between page loads.
**Rationale:** Reduces complexity for Phase 6. Pieces are static (mockPecas), so recomputing on mount is cheap (<100ms). Phase 7 moves to Supabase `peca_custos` for persistence.

### pecasRef for config-change recalculation
**Decision:** `CustosPecasContext` stores a `useRef<Peca[]>` of the last known piece list.
**Rationale:** When `atualizarConfig` is called, the context needs to recompute all pieces with the new config. Without a ref, it would need all pieces as a state dependency, causing unnecessary re-renders. A ref breaks this cycle while keeping the last known list available.

### Closest-espessura material matching
**Decision:** If no exact espessura match, find the material with the smallest `|material.espessura - peca.espessura|` difference.
**Rationale:** Better than returning `null` for most pieces. Generates a clear warning so users know the approximation was used. The fix is always to add the correct material in the Materiais tab.

### Live preview in EditarPecaModal (read-only, not stored)
**Decision:** The cost card in EditarPecaModal computes a live `CustoPecaBreakdown` via `useMemo` without writing to context.
**Rationale:** The user is still editing — the piece hasn't been saved yet. Writing to context mid-edit would create phantom cost entries. The live preview is discarded if the user cancels; `recalcularPeca(updated)` is only called on successful save.

### CustosPecasProvider nested inside CustosProvider
**Decision:** Provider nesting order: `CustosProvider → CustosPecasProvider → TemposProvider`.
**Rationale:** `CustosPecasProvider` calls `useCustos()` to read rate data. It must be a descendant of `CustosProvider`. TemposProvider is placed inside so it remains adjacent to all production modules without cross-dependency.
