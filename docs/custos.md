# Custos Module

*Esync ERP — Industrial Cost & Pricing Engine*
*Phase 5 implemented: 2026-06-01 | Phase 5.5 (Tempos Industriais) implemented: 2026-06-01*

---

## 1. Purpose

The Custos module is the **pricing and cost foundation** of the ERP. It does not yet calculate real project costs — it establishes the data model, calculation engine, and UI that every future production and commercial module will consume.

**Position in the ERP flow:**

```
Custos (Phase 5)
  ├── CentroCusto  ──► calcularProcessos()   ──► Future: CustoPeca
  ├── CustoMaterial ──► calcularMateriaPrima() ──► Future: CustoOrcamento
  ├── CustoMaoDeObra ──► calcularMaoDeObra()  ──► Future: CustoConjunto
  ├── MaquinaCustos  ──► calcularCustoMaquina()
  └── PerfilPrecificacao ──► calcularPrecoVenda() ──► Orçamentos price simulation
```

**Route:** `/custos`
**Module ID:** `custos`
**Nav position:** Between Relatórios and Esync IA

---

## 2. Data Model

### 2.1 `CentroCusto`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Future: Supabase UUID |
| `nome` | `CentroCustoNome` | One of 9 typed sectors |
| `descricao` | `string` | |
| `ativo` | `boolean` | |
| `custoHora` | `number` | R$/h — editable inline |
| `ultimaAtualizacao` | `Date` | Auto-updated on every change |

**Sectors:** Engenharia · Programação · Corte · Dobra · Solda · Pintura · Montagem · Administrativo · Indiretos

### 2.2 `CustoMaterial`

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | |
| `material` | `string` | e.g. "Aço Carbono 1020" |
| `bitola` | `string?` | e.g. "3mm" |
| `espessura` | `number` | mm |
| `pesoChapa` | `number` | kg — full sheet weight |
| `valorChapa` | `number` | R$ — full sheet purchase price |
| `valorKg` | `number` | **Auto-calculated:** `valorChapa / pesoChapa` |
| `fornecedor` | `string?` | |
| `dataAtualizacao` | `Date` | Auto-updated on valorChapa change |
| `ativo` | `boolean` | |

**Auto-calculation invariant:** `valorKg = valorChapa / pesoChapa`. Enforced in `CustosContext.atualizarMaterial()` and the engine's `derivarValorKg()` helper. Never stored without recalculation.

### 2.3 `CustoMaoDeObra`

| Field | Type | Notes |
|-------|------|-------|
| `cargo` | `CargoCustoMaoDeObra` | One of 7 typed profiles |
| `custoHora` | `number` | Base hourly wage in R$ |
| `encargosPercentual` | `number` | Social charges % (typical 70–75%) |
| `custoHoraTotal` | `number` | **Auto-calculated:** `custoHora × (1 + encargos/100)` |
| `ativo` | `boolean` | |
| `ultimaAtualizacao` | `Date` | |

**Cargo profiles:** Engenharia · Programação · Operador Laser · Operador Dobra · Soldador · Pintor · Montador

### 2.4 `MaquinaCustos`

| Field | Type | Notes |
|-------|------|-------|
| `maquinaId` | `string` | FK → Máquinas module |
| `maquinaNome` | `string` | Copied for display |
| `energiaHora` | `number` | R$/h |
| `custoManutencaoHora` | `number` | R$/h |
| `custoHora` | `number` | Operator cost contribution |
| `custoTotalHora` | `number` | **Auto-calculated:** sum of three above |

**Non-invasive:** stored as a separate entity indexed by `maquinaId`. The Máquinas module is untouched.

### 2.5 `PerfilPrecificacao`

| Field | Type | Notes |
|-------|------|-------|
| `nome` | `string` | "Conservador", "Padrão", "Agressivo" |
| `margemLucroPercentual` | `number` | % |
| `comissaoPercentual` | `number` | % |
| `impostosPercentual` | `number` | % |
| `ativo` | `boolean` | |

**Seed profiles:**

| Perfil | Margem | Impostos | Comissão | Markup |
|--------|--------|----------|----------|--------|
| Conservador | 15% | 12% | 3% | 30% |
| Padrão | 25% | 12% | 5% | 42% |
| Agressivo | 35% | 12% | 7% | 54% |

### 2.6 `HistoricoCusto` (audit trail)

| Field | Type | Notes |
|-------|------|-------|
| `entidade` | `EntidadeCusto` | `material \| mao_obra \| centro_custo \| maquina \| perfil` |
| `entidadeId` | `string` | |
| `entidadeNome` | `string` | Human label |
| `campo` | `string` | Which field changed |
| `valorAnterior` | `string` | Serialized previous value |
| `valorNovo` | `string` | Serialized new value |
| `usuario` | `string` | Future: `userId` FK |
| `timestamp` | `Date` | |
| `motivo` | `string?` | Optional justification |

**Append-only:** same pattern as `OrcamentoHistorico`. No entry is ever deleted or overwritten. Future Supabase: INSERT-only policy on `custos_historico`.

---

## 3. Calculation Engine

### File
`src/lib/custos/engine.ts`

### Functions

```typescript
// Raw material cost for a piece
calcularMateriaPrima(material: CustoMaterial, pesoKg: number, fatorWaste = 1.15): number

// Process cost: sum over (setor × minutos/60 × custoHora)
calcularProcessos(tempos: TemposProcesso[], centros: CentroCusto[]): number

// Labor cost: custoHoraTotal × horas
calcularMaoDeObra(maoDeObra: CustoMaoDeObra, horas: number): number

// Machine running cost: custoTotalHora × horas
calcularCustoMaquina(maquina: MaquinaCustos, horas: number): number

// Indirect overhead on direct costs
calcularCustosIndiretos(custosDiretos: number, percentualIndiretos: number): number

// Total cost from all components
calcularCustoTotal(input: CustoTotalInput): CustoTotalResult

// Selling price from cost + pricing profile
calcularPrecoVenda(custoTotal: number, perfil: PerfilPrecificacao): SimulacaoPrecoResult

// Phase 6 hook — full per-piece calculation (returns zeros until time data is available)
calcularCustoPeca(params, material, pesoKg, centros, mobPerfil, indPct): CustoTotalResult

// Auto-derivation helpers (used in forms and context)
derivarValorKg(valorChapa, pesoChapa): number
derivarCustoHoraTotal(custoHora, encargosPercentual): number
derivarCustoTotalHoraMaquina(energiaHora, custoManutencaoHora, custoHora): number
```

### Price simulation formula

```
precoSugerido = custoTotal × (1 + margem% + impostos% + comissao%) / 100
```

Where each component is applied to `custoTotal` (not to the selling price) to avoid circular dependency. Phase 6 will add an iterative price-inclusion variant if tax-on-price semantics are required.

### Waste factor

`calcularMateriaPrima` defaults to `fatorWaste = 1.15` (15% nesting/cutting waste). Future: derive from `Peca.desperdicio` field (already exists on the `Peca` type).

---

## 4. Context API (`CustosContext`)

### State
- `centros: CentroCusto[]`
- `materiais: CustoMaterial[]`
- `maoDeObra: CustoMaoDeObra[]`
- `maquinasCustos: MaquinaCustos[]`
- `perfis: PerfilPrecificacao[]`
- `historico: HistoricoCusto[]` — append-only
- `analytics: CustosAnalytics` — computed via `useMemo`

### Actions

```typescript
// Centros
atualizarCentro(id, changes, motivo?): void

// Materiais
criarMaterial(input): CustoMaterial     // auto-derives valorKg
atualizarMaterial(id, changes, motivo?): void  // auto-recalculates valorKg
excluirMaterial(id): void

// Mão de Obra
criarMaoDeObra(input): CustoMaoDeObra   // auto-derives custoHoraTotal
atualizarMaoDeObra(id, changes, motivo?): void
excluirMaoDeObra(id): void

// Máquinas
atualizarCustoMaquina(id, changes, motivo?): void  // auto-recalculates custoTotalHora

// Perfis
criarPerfil(input): PerfilPrecificacao
atualizarPerfil(id, changes, motivo?): void
excluirPerfil(id): void

// Simulation (pure, no state mutation)
simularPreco(input: SimulacaoPrecoInput): SimulacaoPrecoResult | null
```

### Auto-calculation guarantees

Every mutation that changes a derived field triggers recalculation **within the same state update** — the derived field is never stale:

| Action | Derived field recalculated |
|--------|---------------------------|
| `atualizarMaterial({ valorChapa })` | `valorKg = valorChapa / pesoChapa` |
| `atualizarMaterial({ pesoChapa })` | `valorKg` |
| `atualizarMaoDeObra({ custoHora })` | `custoHoraTotal` |
| `atualizarMaoDeObra({ encargosPercentual })` | `custoHoraTotal` |
| `atualizarCustoMaquina({ energiaHora\|custoManutencaoHora\|custoHora })` | `custoTotalHora` |

### Analytics (`CustosAnalytics`)

| Field | Computation |
|-------|-------------|
| `custoMedioProjetado` | avg `custoHora` across active centros |
| `margemMedia` | avg `margemLucroPercentual` across active profiles |
| `materiaisDesatualizados` | active materials where `dataAtualizacao < now − 30d` |
| `ultimaAtualizacaoCustos` | `historico[0].timestamp` (most recent entry) |

---

## 5. Files Structure

```
src/
├── types/
│   └── custos.ts                     # All domain types + architecture hooks
├── mocks/
│   └── custos.ts                     # 9 centros + 6 materiais + 7 cargos + 3 máquinas + 3 perfis
├── contexts/
│   └── CustosContext.tsx             # Provider + useCustos hook
├── lib/
│   └── custos/
│       └── engine.ts                 # Pure calculation functions
└── app/(dashboard)/
    └── custos/
        └── page.tsx                  # Full tabbed UI
```

**Modified files (Phase 5):**
- `src/types/permissions.ts` — added `'custos'` to `ModuleId` and `ALL_MODULES`
- `src/types/index.ts` — added optional time fields to `Peca` (architecture hooks)
- `src/lib/constants.ts` — added `Custos` nav item (`Calculator` icon)
- `src/components/layout/Sidebar.tsx` — added `Calculator` to iconMap + `'/custos': 'custos'` route
- `src/mocks/cargos.ts` — added `custos` permissions (full for Mecânica + Administrativo; view for PCP + Engenharia)
- `src/app/layout.tsx` — registered `CustosProvider` in provider tree
- `src/lib/dashboard/metrics.ts` — added 3 cost KPI cards + mock imports

---

## 6. Permission Matrix

| Cargo | custos |
|-------|--------|
| Mecânica (admin) | ✅ full |
| Operador Corte | — no access |
| PCP | 👁 view |
| Engenharia | 👁 view |
| Produção | — no access |
| Qualidade | — no access |
| Administrativo | ✅ full (pricing authority) |

**Rationale:** Cost data is commercially sensitive. Only management (Mecânica) and the financial team (Administrativo) can edit it. PCP and Engineering need view access for production planning and quoting support.

---

## 7. Dashboard Integration

Three KPI cards added to the main dashboard via `computeDashboardData()`:

| KPI | Source |
|-----|--------|
| **Custo Médio / Hora** | avg `custoHora` across active `mockCentrosCusto` |
| **Margem Média** | avg `margemLucroPercentual` across active `mockPerfisPrecificacao` |
| **Materiais Desatualizados** | `mockCustosMateriais.filter(m => m.dataAtualizacao < now − 30d).length` |

Additionally, the Custos page itself exposes a 4th KPI: **Última Atualização de Custos** (most recent `HistoricoCusto.timestamp`).

---

## 8. UI — Page Structure

```
/custos

KPI Row: [Custo Médio/h] [Margem Média] [Materiais Desatualizados] [Última Atualização]

Tabs:
  Centros de Custo  — table + inline cell editing
  Materiais         — table + new-material form + inline valorChapa edit
  Mão de Obra       — table + inline custoHora / encargos edit
  Máquinas          — table + inline energia / manutenção / operador edit
  Precificação      — pricing profile table + price simulator panel
  Histórico         — immutable audit trail table
```

**Inline edit pattern:**
- Clicking a value cell activates an `<Input>` in place (keyboard: Enter = save, Escape = cancel)
- Every save writes a `HistoricoCusto` entry and shows a toast
- Edit is hidden for view-only roles (checked via `canEdit('custos')`)

---

## 9. Architecture Hooks

### Phase 5.5 — Industrial Times (time data is now live)

See **docs/tempos-industriais.md** for full specification. `TemposPecaValues` are now populated on 4 of 8 seed pieces. The engine's `calcularCustoPeca()` is ready to consume them when Phase 6 activates real time tracking.

### Piece cost (Phase 6)

`CustoTemposPeca` type is defined and `calcularCustoPeca()` is implemented in the engine. Currently returns zeros because piece time tracking doesn't exist yet.

Activation path:
1. Phase 6 adds time-tracking to `TarefaDesenvolvimento`
2. `calcularCustoPeca(params, material, peso, centros, mob)` returns a full `CustoTotalResult`
3. `Peca` already has `tempoCorteMin`, `tempoDobraMin`, etc. as optional fields (added in Phase 5)

```typescript
// [HOOK:CUSTO_PECA] — Phase 6
const custo = calcularCustoPeca(temposPeca, material, peca.peso, centros, operadorPerfil)
// → { materiaPrima, processos, maoDeObra, maquinas, indiretos, total }
```

### Assembly cost (Phase 6)

`CustoConjuntoParams` type prepared. Future implementation:

```typescript
// [HOOK:CUSTO_CONJUNTO] — Phase 6
function calcularCustoConjunto(conjunto: Conjunto, qty: number, custos: CustosContextValue): number {
  return conjunto.pecas.reduce((sum, p) => {
    return sum + calcularCustoPeca(...).total * p.quantidade * qty
  }, 0)
}
```

### Quote cost simulation (Phase 6)

```typescript
// [HOOK:CUSTO_ORCAMENTO] — Phase 6
// For each OrcamentoItem that has a linked pecaId:
//   1. Load CustoTemposPeca from tracking data
//   2. calcularCustoPeca() × item.quantidade
//   3. calcularPrecoVenda(custoTotal, perfilSelecionado)
// Display as an additional "Custo Estimado" column in OrcamentoDetalheModal
```

---

## 10. Supabase Migration

### Tables

```sql
-- Cost centers
CREATE TABLE custos_centros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  custo_hora NUMERIC(10,2) NOT NULL,
  ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
  empresa_id UUID NOT NULL  -- RLS isolation
);

-- Raw material costs
CREATE TABLE custos_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material TEXT NOT NULL,
  bitola TEXT,
  espessura NUMERIC(8,2),
  peso_chapa NUMERIC(10,3) NOT NULL,
  valor_chapa NUMERIC(10,2) NOT NULL,
  valor_kg NUMERIC(10,4) GENERATED ALWAYS AS (valor_chapa / NULLIF(peso_chapa, 0)) STORED,
  fornecedor TEXT,
  data_atualizacao TIMESTAMPTZ DEFAULT NOW(),
  ativo BOOLEAN DEFAULT TRUE,
  empresa_id UUID NOT NULL
);

-- Labor cost profiles
CREATE TABLE custos_mao_obra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo TEXT NOT NULL,
  custo_hora NUMERIC(10,2) NOT NULL,
  encargos_percentual NUMERIC(5,2) NOT NULL,
  custo_hora_total NUMERIC(10,2) GENERATED ALWAYS AS
    (custo_hora * (1 + encargos_percentual / 100)) STORED,
  ativo BOOLEAN DEFAULT TRUE,
  ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
  empresa_id UUID NOT NULL
);

-- Machine cost profiles (extension, no FK change on maquinas)
CREATE TABLE custos_maquinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maquina_id UUID REFERENCES maquinas(id) ON DELETE CASCADE,
  energia_hora NUMERIC(10,2) DEFAULT 0,
  custo_manutencao_hora NUMERIC(10,2) DEFAULT 0,
  custo_hora NUMERIC(10,2) DEFAULT 0,
  custo_total_hora NUMERIC(10,2) GENERATED ALWAYS AS
    (energia_hora + custo_manutencao_hora + custo_hora) STORED,
  ultima_atualizacao TIMESTAMPTZ DEFAULT NOW(),
  empresa_id UUID NOT NULL
);

-- Pricing profiles
CREATE TABLE pricing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  margem_lucro_percentual NUMERIC(5,2) NOT NULL,
  comissao_percentual NUMERIC(5,2) NOT NULL,
  impostos_percentual NUMERIC(5,2) NOT NULL,
  ativo BOOLEAN DEFAULT TRUE,
  empresa_id UUID NOT NULL
);

-- Immutable audit log
CREATE TABLE custos_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidade TEXT NOT NULL,
  entidade_id UUID NOT NULL,
  entidade_nome TEXT NOT NULL,
  campo TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT NOT NULL,
  usuario TEXT NOT NULL,   -- Future: UUID references auth.users(id)
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  motivo TEXT,
  empresa_id UUID NOT NULL
);

-- RLS policies (same pattern as orcamentos)
ALTER TABLE custos_centros     ENABLE ROW LEVEL SECURITY;
ALTER TABLE custos_materiais   ENABLE ROW LEVEL SECURITY;
ALTER TABLE custos_mao_obra    ENABLE ROW LEVEL SECURITY;
ALTER TABLE custos_maquinas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE custos_historico   ENABLE ROW LEVEL SECURITY;
```

### Generated columns

PostgreSQL `GENERATED ALWAYS AS ... STORED` columns enforce the same auto-calculation invariants that the TypeScript context enforces client-side:
- `valor_kg` in `custos_materiais`
- `custo_hora_total` in `custos_mao_obra`
- `custo_total_hora` in `custos_maquinas`

This means the auto-calculation is enforced at the database level regardless of how the data is inserted (direct SQL, API, or the ERP frontend).

---

## 11. Future Production Integration (Phase 6+)

```
Phase 6: Per-Piece Cost Tracking
  TarefaDesenvolvimento gains real-time sector timers
  → tempoCorteMin, tempoDobraMin… populated from tracking
  → calcularCustoPeca() returns real numbers
  → CustoPeca table: INSERT per piece per production run

Phase 7: Quote Cost Display
  OrcamentoDetalheModal gains "Custo Estimado" column
  → Per-item cost from engine.calcularCustoPeca()
  → Total cost vs. quoted price = margin visibility
  → Export cost breakdown in PDF [HOOK:COST_BREAKDOWN]

Phase 8: Machine Telemetry
  MaquinaCustos.custoHora updated from real shift logs
  → Actual vs. standard cost per machine per day
  → Variance alerts when actual > standard by configurable %
  [HOOK:MAQUINA_ALLOC] activated

Phase 9: Commercial Intelligence
  CustoOrcamento computed on approval
  → Win rate vs. margin by pricing profile
  → Optimal margin recommendation from Esync IA
  → Alert: quote margin < floor threshold
```
