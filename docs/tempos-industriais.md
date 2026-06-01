# Tempos Industriais

*Esync ERP — Industrial Time Architecture*
*Phase 5.5 implemented: 2026-06-01*

---

## 1. Purpose

The Tempos Industriais module creates the **complete time structure** required for future automatic costing. It does NOT calculate costs — it records how many minutes each process takes per piece, which the Phase 6 cost engine will consume via `calcularCustoPeca()`.

**Position in the ERP flow:**

```
ProcessoIndustrial (catalog — 7 canonical processes)
       ↓
TemplateTempos (reusable defaults — 5 seed templates)
       ↓
TemposPecaValues → Peca.tempoXxxMin fields (per-piece time data)
       ↓
[HOOK:CUSTO_PECA] — Phase 6: calcularProcessos(tempos, centros) → process cost
```

---

## 2. Data Model

### 2.1 `ProcessoIndustrial` (process catalog)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | Future: Supabase UUID |
| `nome` | `ProcessoNome` | One of 7 typed processes |
| `descricao` | `string` | |
| `ativo` | `boolean` | Inactive processes hidden from UI |
| `icone` | `string` | Lucide icon name |
| `ordem` | `number` | Display order |

**The 7 canonical processes:** Desenvolvimento · Programação · Corte · Dobra · Solda · Pintura · Montagem

Architecture supports unlimited future processes (add entries to the catalog, UI renders dynamically).

### 2.2 `TemposPecaValues` (time values for a piece)

| Field | Type | Notes |
|-------|------|-------|
| `tempoDesenvolvimentoMin` | `number` | Minutes |
| `tempoProgramacaoMin`     | `number` | |
| `tempoCorteMin`           | `number` | |
| `tempoDobraMin`           | `number` | |
| `tempoSoldaMin`           | `number` | |
| `tempoPinturaMin`         | `number` | |
| `tempoMontagemMin`        | `number` | |

`calcularTempoTotal(t)` = sum of all 7 fields. Used for the "Tempo Total da Peça" display.

These values are stored as **optional fields on the `Peca` type** (`tempoXxxMin?: number`). Zero = not set, stored as `undefined` to keep the field clean.

### 2.3 `TemplateTempos` (reusable template)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | |
| `nome` | `string` | "Painel Simples", etc. |
| `descricao` | `string?` | |
| `tempos` | `TemposPecaValues` | Default minutes per process |
| `totalMinutos` | `number` | **Auto-calculated:** `calcularTempoTotal(tempos)` |

**Seed templates:**

| Template | Total |
|----------|-------|
| Painel Simples | 88 min |
| Painel Médio | 179 min |
| Painel Complexo | 310 min |
| Estrutura Soldada | 250 min |
| Peça Usinada Simples | 145 min |

### 2.4 `HistoricoTempo` (audit trail)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | |
| `pecaId` | `string` | FK → pecas.id |
| `pecaCodigo` | `string` | Human ref |
| `processo` | `ProcessoNome` | Which process changed |
| `valorAnteriorMin` | `number` | |
| `valorNovoMin` | `number` | |
| `usuario` | `string` | Future: UUID → auth.users |
| `timestamp` | `Date` | |
| `motivo` | `string?` | |

**Append-only.** Same pattern as `OrcamentoHistorico` and `HistoricoCusto`. Future Supabase: INSERT-only policy on `historico_tempos`.

---

## 3. Mapping: ProcessoNome → Peca field

| ProcessoNome | TemposPecaValues field | Peca field (optional) |
|---|---|---|
| Desenvolvimento | `tempoDesenvolvimentoMin` | `peca.tempoDesenvolvimentoMin?` |
| Programação | `tempoProgramacaoMin` | `peca.tempoProgramacaoMin?` |
| Corte | `tempoCorteMin` | `peca.tempoCorteMin?` |
| Dobra | `tempoDobraMin` | `peca.tempoDobraMin?` |
| Solda | `tempoSoldaMin` | `peca.tempoSoldaMin?` |
| Pintura | `tempoPinturaMin` | `peca.tempoPinturaMin?` |
| Montagem | `tempoMontagemMin` | `peca.tempoMontagemMin?` |

`PROCESSO_FIELD: Record<ProcessoNome, keyof TemposPecaValues>` provides the programmatic mapping.

---

## 4. Context API (`TemposContext`)

### State
- `processos: ProcessoIndustrial[]` — read-only in Phase 5.5
- `templates: TemplateTempos[]`
- `historico: HistoricoTempo[]` — append-only

### Actions

```typescript
// Templates
criarTemplate(input): TemplateTempos      // auto-recalculates totalMinutos
atualizarTemplate(id, changes): void
excluirTemplate(id): void

// Apply template to a form
aplicarTemplate(templateId): TemposPecaValues | null

// Audit (called by EditarPecaModal on each changed time field)
registrarAlteracaoTempo({ pecaId, pecaCodigo, processo, valorAnteriorMin, valorNovoMin }): void
```

---

## 5. Files Structure

```
src/
├── types/
│   └── tempos.ts               # All domain types + PROCESSO_FIELD map + helpers
├── mocks/
│   └── tempos.ts               # 7 processes + 5 templates + initial history
├── contexts/
│   └── TemposContext.tsx        # Provider + useTempos hook
├── lib/
│   └── tempos/
│       └── analytics.ts        # Pure: pecaToTempos, tempoTotalPeca, calcularTemposAnalytics, calcularBreakdown
└── components/
    └── shared/
        └── TemposIndustriaisSection.tsx  # Reusable form section (used in NovaPecaModal + EditarPecaModal)
```

**Modified files (Phase 5.5):**
- `src/types/index.ts` — already had optional time fields from Phase 5; they are now actively used
- `src/mocks/pecas.ts` — 4 of 8 pieces have realistic time values seeded
- `src/components/shared/NovaPecaModal.tsx` — adds TemposIndustriaisSection; time fields included in new Peca
- `src/components/shared/EditarPecaModal.tsx` — adds TemposIndustriaisSection + breakdown; audit entries on save
- `src/lib/dashboard/metrics.ts` — 4 new time KPI cards
- `src/app/layout.tsx` — TemposProvider registered in provider tree

---

## 6. `TemposIndustriaisSection` Component

Reusable self-contained section rendered inside the Peça modals.

**Props:**
```typescript
interface TemposIndustriaisSectionProps {
  tempos:        TemposPecaValues
  onChange:      (tempos: TemposPecaValues) => void
  readonly?:     boolean          // hides inputs, shows read-only values
  showBreakdown?: boolean         // shows breakdown visualization (EditarPecaModal only)
}
```

**Layout:**

```
Template selector: [Painel Simples — 88min total ▾] [Aplicar]

┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 💡 Desenvolv.│ │ ⌨️ Programação│ │ ✂️ Corte      │ │ ⬇️ Dobra      │
│  [  20  ] min│ │ [  15  ] min │ │ [  8   ] min │ │ [ 15  ] min  │
│  ▓▓░░░░░░░░ │ │ ▓▓░░░░░░░░  │ │ ▓░░░░░░░░░░ │ │ ▓▓░░░░░░░░  │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 🔥 Solda     │ │ 🎨 Pintura    │ │ 🔧 Montagem  │
│  [   0  ] min│ │ [ 25  ] min  │ │ [ 10  ] min  │
└──────────────┘ └──────────────┘ └──────────────┘

  ⏱ Tempo Total da Peça:  73 min  (1h 13min)

  ── Distribuição por processo ─────────────────────────
  💡 Desenvolvimento   ████████░░░░░  27.4%   20min
  ⌨️  Programação       ██████░░░░░░░  20.5%   15min
  ✂️  Corte             ███░░░░░░░░░░  11.0%    8min
  ⬇️  Dobra             █████░░░░░░░░  20.5%   15min
  🎨 Pintura           ████████░░░░░  34.2%   25min   ← breakdown only in EditarPecaModal
```

---

## 7. Analytics

### `calcularTemposAnalytics(pecas: Peca[]): TemposAnalytics`

Pure function in `src/lib/tempos/analytics.ts`. Used by `computeDashboardData()` and future Custos/Tempos dashboards.

| Field | Computation |
|-------|-------------|
| `tempoMedioPorPeca` | avg totalMin across pieces with ≥ 1 non-zero time |
| `tempoMedioPorProcesso` | avg minutes per process across pieces where that process > 0 |
| `processoMaisDemorado` | process with highest average minutes |
| `pecasSemTempos` | pieces where all time fields = 0 |
| `pecasComTempos` | pieces with ≥ 1 non-zero time |
| `tempoTotalCatalogado` | sum of all piece totals (minutes) |

### `calcularBreakdown(tempos: TemposPecaValues): ProcessoBreakdownItem[]`

Returns per-process share for the EditarPecaModal visualization. Filters out zero-time processes.

---

## 8. Dashboard Integration

4 KPI cards added to `computeDashboardData()`:

| Card | Source |
|------|--------|
| **Tempo Médio por Peça** | `temposAn.tempoMedioPorPeca` |
| **Processo Mais Lento** | `temposAn.processoMaisDemorado` |
| **Peças sem Tempos** | `temposAn.pecasSemTempos` |
| **Tempo Total Catalogado** | `temposAn.tempoTotalCatalogado` (converted to hours) |

---

## 9. Audit Integration

`EditarPecaModal.handleSave()` iterates all 7 `ProcessoNome` values. For each field where `tempos[field] !== oldTempos[field]`, it calls `registrarAlteracaoTempo()` which appends an immutable `HistoricoTempo` entry to `TemposContext.historico`.

The same append-only guarantee applies: no entry is ever mutated or deleted.

---

## 10. Machine Relationship Hooks (Phase 6)

The `ProcessoIndustrial` type already contains commented hooks for future machine FK relationships:

| Process | Future default machine(s) | Máquinas IDs |
|---------|--------------------------|--------------|
| Corte | Laser Fiber 3015 | `m2` (LASER-001) |
| Dobra | Dobradeira CNC Amada | `m3` (DOBRA-001), `m4` (DOBRA-002) |
| Solda | Robô Lincoln Power Wave | `m7` (SOLDA-001) |
| Pintura | Cabine Eletrostática Graco | `m8` (PINTURA-001) |
| Desenvolvimento | — | none |
| Programação | — | none |
| Montagem | — | none |

When Phase 6 activates `maquinaIds`:
```typescript
// processoIndustrial.maquinaIds: string[]  — FK → maquinas.id
// Used by: calcularCustoMaquina(maquina, tempoProcesso / 60)
```

---

## 11. Conjunto Time Hook (Phase 6)

`TempoConjuntoParams` type is defined in `src/types/tempos.ts`:

```typescript
// [HOOK:TEMPO_CONJUNTO] — Phase 6
function calcularTempoConjunto(
  conjunto: Conjunto,
  qty: number,
  getPecaTempo: (pecaId: string) => TemposPecaValues
): number {
  return conjunto.pecas.reduce((sum, p) => {
    const tempos = getPecaTempo(p.id ?? p.codigo)
    return sum + calcularTempoTotal(tempos) * p.quantidade * qty
  }, 0)
}
```

---

## 12. Orçamento Time Hook (Phase 6)

`TempoOrcamentoParams` type is defined in `src/types/tempos.ts`:

```typescript
// [HOOK:TEMPO_ORCAMENTO] — Phase 6
// For each OrcamentoItem with a linked pecaId:
//   totalMinutos += tempoTotalPeca(peca) × item.quantidade
// Used for: capacity planning, production simulation, lead time estimation
```

---

## 13. Supabase Migration

```sql
-- Process catalog
CREATE TABLE processos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN DEFAULT TRUE,
  icone TEXT,
  ordem INTEGER NOT NULL,
  empresa_id UUID NOT NULL
);

-- Reusable time templates
CREATE TABLE processo_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  tempo_desenvolvimento_min INTEGER DEFAULT 0,
  tempo_programacao_min INTEGER DEFAULT 0,
  tempo_corte_min INTEGER DEFAULT 0,
  tempo_dobra_min INTEGER DEFAULT 0,
  tempo_solda_min INTEGER DEFAULT 0,
  tempo_pintura_min INTEGER DEFAULT 0,
  tempo_montagem_min INTEGER DEFAULT 0,
  total_minutos INTEGER GENERATED ALWAYS AS (
    tempo_desenvolvimento_min + tempo_programacao_min + tempo_corte_min +
    tempo_dobra_min + tempo_solda_min + tempo_pintura_min + tempo_montagem_min
  ) STORED,
  empresa_id UUID NOT NULL
);

-- Time values per piece (normalised alternative to columns on pecas table)
-- Phase 6 will evaluate whether to use columns on `pecas` or this join table
CREATE TABLE peca_tempos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peca_id UUID NOT NULL REFERENCES pecas(id) ON DELETE CASCADE,
  processo_id UUID NOT NULL REFERENCES processos(id),
  tempo_min INTEGER NOT NULL DEFAULT 0,
  empresa_id UUID NOT NULL,
  UNIQUE(peca_id, processo_id)
);

-- Alternatively (simpler, used in Phase 5.5 client-side model):
-- ALTER TABLE pecas ADD COLUMN tempo_desenvolvimento_min INTEGER;
-- ALTER TABLE pecas ADD COLUMN tempo_programacao_min INTEGER;
-- ALTER TABLE pecas ADD COLUMN tempo_corte_min INTEGER;
-- ALTER TABLE pecas ADD COLUMN tempo_dobra_min INTEGER;
-- ALTER TABLE pecas ADD COLUMN tempo_solda_min INTEGER;
-- ALTER TABLE pecas ADD COLUMN tempo_pintura_min INTEGER;
-- ALTER TABLE pecas ADD COLUMN tempo_montagem_min INTEGER;

-- Immutable audit log
CREATE TABLE historico_tempos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peca_id UUID NOT NULL REFERENCES pecas(id),
  peca_codigo TEXT NOT NULL,
  processo TEXT NOT NULL,
  valor_anterior_min INTEGER NOT NULL,
  valor_novo_min INTEGER NOT NULL,
  usuario TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  motivo TEXT,
  empresa_id UUID NOT NULL
);

-- Indexes
CREATE INDEX idx_historico_tempos_peca ON historico_tempos(peca_id);
CREATE INDEX idx_historico_tempos_timestamp ON historico_tempos(timestamp DESC);
CREATE INDEX idx_peca_tempos_peca ON peca_tempos(peca_id);

-- RLS (same pattern as other modules)
ALTER TABLE processos ENABLE ROW LEVEL SECURITY;
ALTER TABLE processo_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE peca_tempos ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_tempos ENABLE ROW LEVEL SECURITY;
```

---

## 14. Future Production Integration (Phase 6+)

```
Phase 6: Real-time time tracking
  TarefaDesenvolvimento gains sector timers
  → Actual time captured per piece per sector
  → Actual vs. standard comparison (variance analysis)
  → peca_tempos updated with real measured times

Phase 7: Cost calculation
  calcularCustoPeca(temposPeca, material, centros, mob)
  → Each process: centro.custoHora × (tempo / 60)
  → Material: valorKg × peso × fatorWaste
  → Total: material + processos + maoDeObra + indiretos

Phase 8: Conjunction time
  calcularTempoConjunto(conjunto, qty) → minutes
  → Used for: production schedule, capacity planning
  → Displayed in: Conjuntos detail modal

Phase 9: Quote time
  OrcamentoItem links to pecaId → loads temposPeca
  → tempoTotalOrcamento for lead time display
  → Comparison: quoted delivery vs. production capacity
```
