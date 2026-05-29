# Estoque (Inventory)

*Esync ERP — Inventory Management Module Reference*

---

## 1. Purpose

The Estoque module manages the finished parts inventory — tracking quantities, minimum stock levels, storage locations, and all stock movements. It acts as the downstream sink for the production flow: when Dobra confirms a completed batch, the quantity flows into Estoque.

**Route:** `/estoque`
**Module ID:** `estoque`

---

## 2. Core Types (`src/types/estoque.ts`)

### `EstoqueItem` — Inventory Record
```typescript
interface EstoqueItem {
  id: string
  codigoPeca: string        // references Peca.codigo
  descricao: string
  material: string
  espessura: number         // mm
  quantidade: number        // current stock quantity
  quantidadeMinima: number  // safety stock level
  localizacao: string       // shelf/bin location code
  status: StatusEstoque     // computed from quantidade vs. quantidadeMinima
  ultimaEntrada: Date       // last stock entry date
  origemPrograma: string    // CNC program that produced this stock
  unidade: string           // unit of measure (e.g. "un", "kg")
}
```

### `MovimentoEstoque` — Stock Movement Record
```typescript
interface MovimentoEstoque {
  id: string
  tipo: 'entrada' | 'saida' | 'ajuste'
  codigoPeca: string
  descricaoPeca: string
  quantidade: number
  programaOrigem: string    // CNC program reference
  os: string                // Service Order reference
  timestamp: Date
  operador: string
  observacao?: string
  tarefaDobraId?: string    // link to originating Dobra task
  programaCorteId?: string  // link to originating Corte program
}
```

### `EntradaEstoqueInput` — Stock Entry Form
```typescript
interface EntradaEstoqueInput {
  codigoPeca: string
  descricaoPeca: string
  quantidade: number
  material: string
  espessura: number
  programaOrigem: string
  os: string
  operador: string
  observacao?: string
  tarefaDobraId?: string
  programaCorteId?: string
}
```

---

## 3. Status Classification

`StatusEstoque` is computed dynamically from quantity vs. minimum:

| Status | Condition | Color | Meaning |
|--------|-----------|-------|---------|
| `normal` | `quantidade >= quantidadeMinima` | success | Adequate stock |
| `estoque_baixo` | `0 < quantidade < quantidadeMinima` | warning | Below safety stock |
| `critico` | `quantidade === 0` | destructive | Completely out of stock |

**Note:** `OS_ESTOQUE = 'OS:1508'` is a constant used in mock data to tie inventory movements to a reference service order.

---

## 4. Stock Movement Types

| Type | Direction | Trigger |
|------|-----------|---------|
| `entrada` | + (increase) | Dobra task confirmation, manual entry |
| `saida` | - (decrease) | Production consumption, manual removal |
| `ajuste` | ± (any) | Inventory count adjustment, correction |

Each movement preserves: origin program, OS number, operator, optional Dobra/Corte task link.

---

## 5. Production Flow Integration

### Entrada from Dobra
When `DobraContext` confirms a bending task quantity:
1. `EstoqueContext.entrada(input: EntradaEstoqueInput)` is called
2. Creates `MovimentoEstoque` with `tipo: 'entrada'` and `tarefaDobraId`
3. Updates `EstoqueItem.quantidade += input.quantidade`
4. Updates `EstoqueItem.ultimaEntrada`
5. Recomputes `status` based on new quantity vs. `quantidadeMinima`

### Saída for Production
When Conjuntos simulation runs and quantities are consumed from stock:
1. `EstoqueContext.saida(codigoPeca, quantidade, os)` is called
2. Creates `MovimentoEstoque` with `tipo: 'saida'`
3. Decrements `EstoqueItem.quantidade`
4. Status recomputed

---

## 6. Context (`src/contexts/EstoqueContext.tsx`)

Exposes:
- `itens: EstoqueItem[]` — full inventory list
- `movimentos: MovimentoEstoque[]` — full movement history
- `entrada(input: EntradaEstoqueInput)` — add stock
- `saida(codigoPeca, quantidade, os, operador)` — remove stock
- `ajuste(codigoPeca, novaQuantidade, motivo, operador)` — correct quantity
- `getMovimentos(codigoPeca)` — history for a specific part

---

## 7. Module Features

### Inventory Table
- All `EstoqueItem[]` in a sortable table
- Status column with color-coded badge
- Minimum quantity indicator (visual warning when approaching minimum)
- Last entry date column
- Location code display

### Movement History
- `MovimentoEstoque[]` chronological log
- Filter by tipo (entrada/saida/ajuste)
- Filter by codigoPeca
- OS reference visible per row

### Import (XLSX/CSV)
Full import pipeline with 10 field definitions:
- `codigoPeca`, `descricao`, `material`, `espessura`
- `quantidade`, `quantidadeMinima`, `localizacao`
- `status`, `unidade`, `origemPrograma`

### Export (XLSX/CSV/PDF)
Standard export with all inventory fields.

---

## 8. Import Field Aliases

| Field | Standard | Also Accepts |
|-------|----------|-------------|
| codigoPeca | codigoPeca | codigo, cod, code, sku, partnumber |
| descricao | descricao | nome, name, description, desc |
| quantidade | quantidade | qtd, qty, quantity, stock |
| quantidadeMinima | quantidadeMinima | qtdmin, minimo, safetystock |
| localizacao | localizacao | local, location |

*Full list in [import-export.md](./import-export.md)*

---

## 9. Esync IA Integration

The AI module references stock data in its analysis:
- Identifies `critico` items requiring urgent reorder
- Detects items with excess stock (>90 days without movement)
- Recommends safety stock level adjustments based on consumption patterns
- Flags production blocks due to zero-stock items

Example AI insight (from mock): *"LAT-E-001 — 4 un. · mínimo: 10 · demanda projetada: 18 un./5 dias"*

---

## 10. Permissions

| Action | Required Permission |
|--------|-------------------|
| View inventory | `estoque.visualizacao` |
| Export inventory | `estoque.visualizacao` |
| Manual entry/adjustment | `estoque.edicao` |
| Import inventory | `estoque.edicao` + security password |

Roles with full estoque access: `mecanica`, `producao`
Roles with view-only: `operador_corte`, `pcp`, `engenharia`, `qualidade`

---

## 11. Pending Improvements

| Feature | Priority |
|---------|---------|
| Automatic reorder alerts (when status → critico) | High |
| Stock reservation for OS (commit before production) | High |
| Real stock entry from Dobra confirmation | High |
| Multiple warehouse/location support | Medium |
| ABC curve analysis (with Esync IA) | Medium |
| Consumption forecast from production plan | Medium |
| Stock count (physical inventory reconciliation) | Medium |
| Supplier integration (auto-generate purchase orders) | Future |
