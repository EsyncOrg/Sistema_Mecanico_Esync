# Desenvolvimento (Production Requests)

*Esync ERP — Production Development Module Reference*

---

## 1. Purpose

Desenvolvimento is the entry point of the industrial production flow. It manages production requests — each representing a client order that needs one or more parts manufactured. A request defines what to make, for whom, with what priority, and how quantities are distributed across Service Orders (OS).

**Route:** `/desenvolvimento`
**Module ID:** `desenvolvimento`

---

## 2. Position in the Production Flow

```
Desenvolvimento ──→ Programação ──→ Corte ──→ Dobra ──→ Solda ──→ Estoque
      ↑
(Client order / project)
```

Desenvolvimento is where the journey begins: client request → production routing.

---

## 3. Core Types (`src/types/desenvolvimento.ts`)

### `SolicitacaoProducao` — Production Request
```typescript
interface SolicitacaoProducao {
  id: string
  titulo: string                        // e.g. "Painel Elétrico Cliente X"
  cliente: string
  numeroOS: string                      // primary OS for this request
  descricao: string
  prioridade: PrioridadeDesenvolvimento // alta | media | baixa
  observacoes: string
  responsavel: string
  status: StatusDesenvolvimento
  pecas: PecaSolicitacao[]             // parts to be produced
  conjuntos: ConjuntoRef[]             // future: auto-fill from Conjunto
  criadoEm: Date
  iniciadoEm: Date | null
  finalizadoEm: Date | null
  pausas: PausaDesenvolvimento[]       // pause history
  // Future integration points:
  // programacaoId?: string
  // corteIds?: string[]
  // dobraIds?: string[]
  // soldaIds?: string[]
}
```

### `PecaSolicitacao` — Part Within a Request
```typescript
interface PecaSolicitacao {
  id: string
  codigo: string
  descricao: string
  quantidade: number                 // total quantity (sum of all OS allocations)
  material: string
  espessura: number
  observacoes: string
  processos: SetorProcesso[]         // sectors this piece must pass through
  osDistribuicao: OsDistribuicao[]  // quantity split per OS number
}
```

### `OsDistribuicao` — OS Quantity Allocation
```typescript
interface OsDistribuicao {
  id: string
  numeroOS: string     // e.g. "OS:1540"
  quantidade: number   // quantity allocated to this OS
}
```

**Business Invariant:** `sum(PecaSolicitacao.osDistribuicao[].quantidade) === PecaSolicitacao.quantidade`

This invariant is enforced at save time. It enables:
- Time distribution by OS (analytics)
- Stock allocation per OS
- Production tracking per order
- Manufacturing cost calculations
- AI efficiency analysis per OS

### `TarefaDesenvolvimento` — Individual Development Task
```typescript
interface TarefaDesenvolvimento {
  id: string
  codigoPeca: string
  descricao: string
  cliente: string
  numeroOS: string
  prioridade: PrioridadeDesenvolvimento
  responsavel: string
  observacoesTecnicas: string
  status: StatusDesenvolvimento
  criadoEm: Date
  iniciadoEm: Date | null
  finalizadoEm: Date | null
  pausas: PausaDesenvolvimento[]
  processos: SetorProcesso[]
  solicitacaoId?: string   // link back to originating SolicitacaoProducao
}
```

### `PausaDesenvolvimento` — Pause Record
```typescript
interface PausaDesenvolvimento {
  id: string
  motivo: string
  inicio: Date
  fim: Date | null       // null while pause is still active
  duracao: number | null // seconds; null while open
}
```

---

## 4. Status Flow

```
pendente
    ↓
em_desenvolvimento
    ↓         ↕ (pause/resume)
pausado ──────┘
    ↓
aguardando_aprovacao   ← optional approval gate
    ↓
finalizado
```

| Status | Meaning |
|--------|---------|
| `pendente` | Created, not yet started |
| `em_desenvolvimento` | Work actively in progress |
| `pausado` | Paused — reason recorded |
| `aguardando_aprovacao` | Submitted for review/approval |
| `finalizado` | Complete — can be sent to Programação |

---

## 5. Production Sectors (`SetorProcesso`)

```typescript
type SetorProcesso = 'corte' | 'dobra' | 'solda' | 'pintura' | 'montagem'
```

Each `PecaSolicitacao` carries `processos: SetorProcesso[]` defining the ordered route the part must travel through production. This routing information is passed through to Programação and subsequent sectors.

**Typical routes:**
- Laser/CNC only: `['corte']`
- Sheet metal part: `['corte', 'dobra']`
- Structural: `['corte', 'dobra', 'solda']`
- Finished assembly: `['corte', 'dobra', 'solda', 'pintura', 'montagem']`

---

## 6. Conjuntos Integration (Planned)

```typescript
interface ConjuntoRef {
  id: string
  codigo: string
  descricao: string
  quantidadeBase: number
  // Future:
  // quantidadeMultiplier?: number
  // pecasCarregadas?: PecaSolicitacao[]
  // estoqueVerificado?: boolean
}
```

When implemented:
1. User selects a Conjunto in a Nova Solicitação form
2. `ConjuntoRef` auto-populates `SolicitacaoProducao.pecas` with all parts × quantity
3. Stock is checked; only `quantidadeProduzir > 0` items appear in production routing

---

## 7. Sending to Programação

When a `SolicitacaoProducao` reaches `finalizado` status:
1. User clicks "Enviar para Programação"
2. `DesenvolvimentoContext` constructs `SolicitacaoFromDesenv` bridge type
3. `ProgramacaoContext.createFromSolicitacao(input)` is called
4. A `SolicitacaoProgramacao` is created in Programação with `origemDesenvolvimentoId` reference
5. Status in Desenvolvimento updated (future: add `programacaoId` link)

---

## 8. Context (`src/contexts/DesenvolvimentoContext.tsx`)

Exposes:
- `solicitacoes: SolicitacaoProducao[]`
- `tarefas: TarefaDesenvolvimento[]`
- `createSolicitacao(input)` — new production request
- `updateSolicitacao(id, changes)` — edit request
- `deleteSolicitacao(id)` — remove request
- `startSolicitacao(id)` — transition to em_desenvolvimento
- `pauseSolicitacao(id, motivo)` — pause with reason
- `resumeSolicitacao(id)` — resume from pause
- `finalizeSolicitacao(id)` — mark complete
- `sendToProgramacao(id)` — bridge to ProgramacaoContext
- `createTarefa(input: NovaTarefaDevInput)` — individual task
- `updateTarefa(id, changes)` — edit task

---

## 9. Permissions

| Action | Required Permission |
|--------|-------------------|
| View requests | `desenvolvimento.visualizacao` |
| Create request | `desenvolvimento.edicao` |
| Edit/pause/finalize | `desenvolvimento.edicao` |
| Send to Programação | `desenvolvimento.edicao` |

Roles with full access: `mecanica`, `engenharia`
Roles with view-only: `operador_corte`, `pcp`, `producao`

---

## 10. Pending Improvements

| Feature | Priority |
|---------|---------|
| Auto-fill parts from Conjunto selection | High |
| Stock check before creating request | High |
| Approval workflow for `aguardando_aprovacao` | High |
| Auto-set `programacaoId` after sending | Medium |
| Link display (→ Programação → Corte → Dobra) on request detail | Medium |
| Timeline view showing request progression | Medium |
| Priority escalation alerts | Medium |
| Client management (link to CRM) | Future |
