# Programação (CNC Programming)

*Esync ERP — CNC Programming & Scheduling Module Reference*

---

## 1. Purpose

The Programação module manages the CNC programming workflow. It receives production requests from Desenvolvimento, transforms them into executable CNC programs, tracks material input (sheet vs. retalho), manages OS distribution per piece, and maintains a full execution history.

**Route:** `/programacao`
**Module ID:** `programacao`

---

## 2. Distinction: Programação vs. Programas

| Module | Route | Purpose |
|--------|-------|---------|
| **Programação** | `/programacao` | Active CNC programming workflow — `ProgramaCNC` entities with OS tracking, retalho control, execution lifecycle |
| **Programas** | `/programas` | Historical NC program library — `Programa` entities with version, execution count, archived G-code |

These are distinct modules. A `ProgramaCNC` may eventually link to a `Programa` in the library (future).

---

## 3. Production Flow Position

```
Desenvolvimento (SolicitacaoProducao)
    ↓ sends SolicitacaoFromDesenv
Programação (creates ProgramaCNC)
    ↓ produces pieces
Corte, Dobra (receive work)
    ↓ completes pieces
Estoque (receives finished parts)
```

---

## 4. Core Types (`src/types/programacao.ts`)

### `ProgramaCNC` — CNC Program Entity
```typescript
interface ProgramaCNC {
  id: string
  nome: string
  codigo: string
  dataCriacao: Date
  dataUltimaExecucao?: Date
  dataInicio?: Date
  dataConclusao?: Date
  programador: string
  pecas: PecaPrograma[]          // parts included in this program
  osGerais: string[]             // general OS numbers for this program
  retalhoUtilizado: RetalhoUtilizado
  retalhoGerado: RetalhoGerado
  observacoes: string
  status: ProgramacaoStatus      // pendente | em_programacao | finalizado | cancelado
  numeroExecucoes: number        // NEVER reset — increments on each reuse
  solicitacaoId?: string         // link to originating SolicitacaoProducao
  tempoEstimadoMin?: number
  tempoRealMin?: number
  historico: HistoricoEntradaProg[]
}
```

### `PecaPrograma` — Part in a CNC Program
```typescript
interface PecaPrograma {
  id: string
  codigo: string
  descricao: string
  quantidade: number
  material?: string
  espessura?: number
  observacoes?: string
  processos?: string[]
  osDistribuicao: OSDistribuicaoProg[]  // OS allocation per piece
}
```

### `OSDistribuicaoProg` — OS Allocation Row
```typescript
interface OSDistribuicaoProg {
  id: string
  os: string          // e.g. "OS:1508"
  quantidade: number  // quantity allocated to this OS
}
```

**Invariant:** `sum(PecaPrograma.osDistribuicao[].quantidade) === PecaPrograma.quantidade`
Enforced on "Concluir" action — cannot finalize if totals don't match.

---

## 5. Retalho Tracking

### `RetalhoUtilizado` — Input Material
```typescript
interface RetalhoUtilizado {
  tipo: RetalhoTipo     // 'chapa_inteira' | 'retalho'
  codigo?: string       // if tipo === 'retalho', which scrap is being used
  largura?: number      // mm
  comprimento?: number  // mm
  espessura?: number    // mm
}
```

### `RetalhoGerado` — Leftover Material
```typescript
interface RetalhoGerado {
  gerou: boolean        // did this program produce a usable remnant?
  codigo?: string       // new retalho code if gerou === true
  largura?: number      // mm
  comprimento?: number  // mm
  espessura?: number    // mm
}
```

This tracks the full material lifecycle: what went in (sheet or retalho) and what came out (new retalho or none).

---

## 6. History Log (`HistoricoEntradaProg`)

```typescript
interface HistoricoEntradaProg {
  id: string
  tipo: HistoricoTipoProg   // criacao | inicio | conclusao | reutilizacao | alteracao | cancelamento
  timestamp: Date
  operador: string
  descricao: string
  programaId: string
  programaNome?: string
  programaCodigo?: string
}
```

Every state change is logged with operator and timestamp. The history is immutable and append-only.

---

## 7. Status Flow

```
pendente ──→ em_programacao ──→ finalizado
                   ↓
               cancelado
```

| Status | Meaning |
|--------|---------|
| `pendente` | Request received from Desenvolvimento, not yet started |
| `em_programacao` | Programmer is actively working |
| `finalizado` | Program complete, ready for machine execution |
| `cancelado` | Request cancelled (preserves in history) |

---

## 8. Program Reuse

Programs can be reused for subsequent production runs:
1. User selects "Reutilizar" on a `finalizado` program
2. `ProgramaCNC.numeroExecucoes` increments (never resets)
3. New `HistoricoEntradaProg` entry with `tipo: 'reutilizacao'`
4. New OS distribution can be entered for the reuse run
5. `dataUltimaExecucao` updated

This preserves the complete execution history while enabling efficient reuse of proven programs.

---

## 9. Request Bridge from Desenvolvimento

```typescript
interface SolicitacaoFromDesenv {
  titulo: string
  cliente: string
  numeroOS: string
  prioridade: 'alta' | 'media' | 'baixa'
  observacoes: string
  responsavel: string
  pecas: {
    id: string
    codigo: string
    descricao: string
    quantidade: number
    material?: string
    espessura?: number
    observacoes?: string
    processos?: string[]
    osDistribuicao?: { id: string; numeroOS: string; quantidade: number }[]
  }[]
}
```

This loose type (no circular dependency) carries the essentials from Desenvolvimento → Programação context. Future: strict typing with shared reference types.

---

## 10. Analytics Types

```typescript
interface ProgramadorStats {
  nome: string
  programas: number        // programs created
  tempoMedio: number       // average program time
  eficiencia: number       // 0–100
}

interface OSTempoStat {
  os: string               // "OS:1508"
  tempoMin: number         // total programming time for this OS
  programas: number        // number of programs involved
}
```

---

## 11. Activity Feed (`AtividadeProg`)

```typescript
interface AtividadeProg {
  id: string
  mensagem: string
  tipo: AtividadeTipoProg   // novo_pendente | finalizado | retalho | reutilizacao | inicio_programacao | cancelamento
  timestamp: Date
}
```

Real-time feed shown on the Programação page sidebar, updating as programs change state.

---

## 12. Context (`src/contexts/ProgramacaoContext.tsx`)

Exposes:
- `programas: ProgramaCNC[]` — all CNC programs
- `solicitacoes: SolicitacaoProgramacao[]` — pending requests from Desenvolvimento
- `createFromSolicitacao(input: SolicitacaoFromDesenv)` — create program from request
- `createManual(input)` — create program without a request origin
- `start(id)` — transition to em_programacao
- `conclude(id)` — validates OS invariant, transitions to finalizado, generates retalho if applicable
- `cancel(id, motivo)` — cancel program
- `reuse(id, novoOS)` — increment executions counter

---

## 13. Permissions

| Action | Required Permission |
|--------|-------------------|
| View programs | `programacao.visualizacao` |
| Create/edit programs | `programacao.edicao` |
| Cancel programs | `programacao.edicao` |
| Reuse programs | `programacao.edicao` |

Roles with full access: `mecanica`, `pcp`, `engenharia`
Roles with view-only: `operador_corte`, `producao`, `qualidade`... *(see [permissions.md](./permissions.md))*

---

## 14. Pending Improvements

| Feature | Priority |
|---------|---------|
| Auto-create Corte tasks on program conclusion | High |
| Auto-generate Retalho in Retalhos module from retalhoGerado | High |
| G-code file upload and viewer | High |
| Real-time status sync with Corte module | Medium |
| Nesting optimization (2D sheet layout suggestions from AI) | Medium |
| Time tracking per program (tempoRealMin from machine) | Medium |
| Link ProgramaCNC → Programa library entry | Medium |
| Material waste calculation from areaPeca data | Low |
