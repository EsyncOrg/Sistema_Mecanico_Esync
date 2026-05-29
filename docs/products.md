# Products (Conjuntos)

*Esync ERP — Assembly & Product Catalog Module Reference*

---

## 1. Purpose

The Conjuntos module manages the assembly and product catalog — the highest-level definition of what the company manufactures. A Conjunto is a complete industrial product (panel, structure, cabinet, machine section) composed of multiple Peças with defined production routes.

**Core value proposition:** Instead of creating production tasks piece-by-piece, a user selects a Conjunto + quantity. The ERP simulates stock coverage and sends only missing quantities to production.

**Route:** `/conjuntos`
**Module ID:** `conjuntos`
**Dynamic detail:** `/produto/[codigo]` (public — QR scannable)

---

## 2. Integration Chain

```
Conjuntos (product definition)
    ↓
Simulation (stock check per piece)
    ↓
ConjuntoParaProducao bridge
    ↓
Desenvolvimento (production request — partially implemented)
    ↓
Programação → Corte → Dobra → Solda
```

---

## 3. Core Types

### `Conjunto` — Assembly Entity
```typescript
interface Conjunto {
  id: string
  codigo: string                    // e.g. "PAINEL-800", "EST-L04"
  nome: string
  cliente: string
  categoria: CategoriaConjunto      // painel | estrutura | gabinete | maquina | suporte | montagem | outro
  revisao: string                   // e.g. "Rev. 03"
  prioridade: PrioridadeConjunto    // alta | media | baixa
  observacoesTecnicas: string
  responsavel: string
  status: StatusConjunto            // ativo | inativo | em_revisao | descontinuado
  pecas: PecaConjunto[]             // all parts required to build one complete assembly
  criadoEm: Date
  atualizadoEm: Date
  vezesProduzido: number            // distinct production runs
  quantidadeTotalProduzida: number  // total units produced across all runs
}
```

### `PecaConjunto` — Part within Assembly
```typescript
interface PecaConjunto {
  id: string
  codigo: string
  descricao: string
  quantidade: number           // units required to build ONE complete assembly
  material: string
  espessura: number            // mm
  pesoEstimado: number         // kg per unit
  observacoes: string
  processos: SetorProcesso[]   // ['corte', 'dobra', 'solda', ...] — production route
}
```

---

## 4. Production Simulation

The simulation engine computes what needs to be manufactured vs. what can be sourced from existing stock.

### `SimulacaoItemEstoque` — Per-Part Simulation Result
```typescript
interface SimulacaoItemEstoque {
  pecaId: string
  codigo: string
  descricao: string
  material: string
  processos: SetorProcesso[]
  espessura: number
  pesoEstimado: number
  quantidadeNecessaria: number   // peca.quantidade × numberOfConjuntos
  quantidadeEstoque: number      // mock stock level at simulation time
  quantidadeDisponivel: number   // min(necessaria, estoque) — from stock
  quantidadeProduzir: number     // max(0, necessaria - estoque) — needs manufacturing
  percentualEstoque: number      // (disponivel / necessaria) × 100
}
```

**Invariant:** `quantidadeDisponivel + quantidadeProduzir === quantidadeNecessaria`

### `ResultadoSimulacao` — Full Simulation Result
```typescript
interface ResultadoSimulacao {
  conjuntoId: string
  conjuntoCodigo: string
  conjuntoNome: string
  quantidadeConjuntos: number
  itens: SimulacaoItemEstoque[]
  totalPecasDistintas: number
  totalUnidadesNecessarias: number
  totalUnidadesEstoque: number        // satisfied from stock
  totalUnidadesProduzir: number       // needs manufacturing
  percentualAproveitamento: number    // stock coverage %
  setoresEnvolvidos: SetorProcesso[]  // deduplicated list of all sectors
  tempoEstimadoMinutos: number        // rough estimate: 15 min per production unit
  pesoEstimadoTotal: number           // kg: sum(pesoEstimado × quantidadeProduzir)
  criadoEm: Date
}
```

---

## 5. Production History

```typescript
interface HistoricoConjunto {
  id: string
  conjuntoId: string
  codigo: string
  nome: string
  cliente: string
  revisao: string
  quantidadeProduzida: number
  quantidadeEconomizadaEstoque: number  // units from stock (no manufacturing needed)
  responsavel: string
  status: 'concluido' | 'em_producao' | 'cancelado'
  data: Date
  observacoes: string
}
```

Tracks every production run of a Conjunto — how many were produced, how many came from stock, who was responsible.

---

## 6. Integration Bridge to Desenvolvimento

```typescript
interface ConjuntoParaProducao {
  conjuntoId: string
  codigo: string
  nome: string
  quantidade: number            // how many complete assemblies requested
  simulacao?: ResultadoSimulacao  // populated after simulation
}
```

This bridge type connects the Conjuntos module to Desenvolvimento. When implemented fully:
1. User selects Conjunto + quantity in Desenvolvimento
2. `ConjuntoParaProducao` auto-fills `SolicitacaoProducao.pecas` with multiplied quantities
3. Stock is checked; only `quantidadeProduzir > 0` items go to production routing

---

## 7. Analytics

```typescript
interface AnalyticsConjuntos {
  usoPorConjunto: { nome: string; usos: number; fill?: string }[]
  pecasMaisUsadas: { codigo: string; descricao: string; usos: number }[]
  economiaEstoqueMensal: { mes: string; economizadas: number; produzidas: number }[]
  distribuicaoCategoria: { categoria: string; count: number; fill: string }[]
  setoresMaisUsados: { setor: string; count: number; fill: string }[]
}
```

Analytics powered by Recharts charts on the Conjuntos page:
- Top assemblies by production frequency
- Most-used parts across assemblies
- Monthly stock savings (stock vs. production split)
- Category distribution pie chart
- Sector involvement bar chart

---

## 8. QR System

Each Conjunto can generate a QR code (via `ProductQRModal`) that resolves to `/produto/[codigo]`.

The `/produto/[codigo]` route is:
- **Public** — no authentication required
- **Static-renderable** — suitable for printing on assembly sheets
- Displays: code, name, parts list, revision, specifications

QR generation via `src/lib/qr/index.ts` using the `qrcode` library.

---

## 9. Status Types

| Status | Meaning |
|--------|---------|
| `ativo` | In active use — can be selected for production |
| `inativo` | Temporarily disabled |
| `em_revisao` | Being revised — use with caution |
| `descontinuado` | No longer produced |

### Categories (`CategoriaConjunto`)
`painel | estrutura | gabinete | maquina | suporte | montagem | outro`

### Priorities (`PrioridadeConjunto`)
`alta | media | baixa`

---

## 10. Context (`src/contexts/ConjuntosContext.tsx`)

Exposes:
- `conjuntos: Conjunto[]` — full assembly catalog
- `historico: HistoricoConjunto[]` — production run history
- `add(input: NovoConjuntoInput)` — create new assembly
- `update(id, changes)` — edit assembly
- `remove(id)` — delete assembly
- `getById(id)` — find single assembly
- `simulate(conjuntoId, quantidade)` — run production simulation

---

## 11. Pending Improvements

| Feature | Priority |
|---------|---------|
| Auto-fill Desenvolvimento from Conjunto selection | High |
| Full Conjuntos → Desenvolvimento integration | High |
| Bill of Materials (BOM) PDF export | Medium |
| Revision comparison (current vs. previous Rev.) | Medium |
| Cost estimation per assembly (material + labor) | Medium |
| Assembly image/drawing attachment | Medium |
| Bulk production order from multiple Conjuntos | Medium |
| Stock auto-reservation on simulation | Low |
