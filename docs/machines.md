# Machines (Máquinas)

*Esync ERP — Equipment Management Module Reference*

---

## 1. Purpose

The Máquinas module tracks all production equipment: operational status, efficiency, daily time breakdown, event history, and weekly productivity trends. It provides the operational visibility needed to detect downtime, optimize setup, and identify maintenance needs.

**Route:** `/maquinas`
**Module ID:** `maquinas`
**Access:** `mecanica` only (admin) — most restrictive module

---

## 2. Machine Entity (`Maquina` type)

Defined in `src/types/index.ts`:

```typescript
interface Maquina {
  id: string
  nome: string
  codigo: string              // e.g. "CNC-001"
  setor: SetorMaquina         // 'corte' | 'dobra' | 'solda' | 'pintura' | 'desenvolvimento' | 'outros'
  fabricante: string
  modelo: string
  ano: number
  capacidade?: string
  observacoes?: string

  // ── Live status ──
  status: StatusMaquina       // 'operando' | 'setup' | 'pausada' | 'ociosa' | 'manutencao'
  operadorAtual?: string
  tarefaAtual?: string
  osAtual?: string

  // ── Efficiency ──
  eficiencia: number          // 0–100

  // ── Daily time tracking (seconds) ──
  tempoOperacionalHoje: number
  tempoSetupHoje: number
  tempoOciosoHoje: number
  tempoPausadoHoje: number

  // ── Cumulative ──
  totalHorasTrabalhadas: number
  producoesFinalizadas: number

  // ── Metadata ──
  ultimaAtividade: string     // ISO datetime
  atualizadoEm: string        // ISO datetime
  motivoPausa?: string

  // ── Visualization ──
  timeline: MaquinaTimelineSegmento[]
  produtividadeSemanal: number[]  // last 7 days operational hours (array of 7)
}
```

---

## 3. Status Types

### Machine Status (`StatusMaquina`)
| Status | Color | Meaning |
|--------|-------|---------|
| `operando` | success | Currently in active production |
| `setup` | accent | Machine being configured for next job |
| `pausada` | warning | Operator-initiated pause |
| `ociosa` | muted | Available but no task assigned |
| `manutencao` | destructive | Under maintenance or repair |

### Sectors (`SetorMaquina`)
`'corte' | 'dobra' | 'solda' | 'pintura' | 'desenvolvimento' | 'outros'`

---

## 4. Timeline System

### `MaquinaTimelineSegmento`
```typescript
interface MaquinaTimelineSegmento {
  tipo: StatusMaquina     // which state this segment represents
  inicio: number          // decimal hour from midnight (e.g. 6.5 = 06:30)
  duracao: number         // hours (e.g. 1.5 = 1h30m)
  label?: string          // optional OS or task label
}
```

Timeline shows the machine's state progression across a working day. Each segment is a colored bar showing which state the machine was in, for how long, starting at what time.

**Example for CNC-001:**
```
06:00 ──[setup 30min]──[operando 2h]──[pausado 15min]──[operando 3h]──[ociosa]── current
```

---

## 5. Event Log (`EventoMaquina`)

```typescript
interface EventoMaquina {
  id: string
  maquinaId: string
  maquinaNome: string
  maquinaCodigo: string
  tipo: TipoEventoMaquina
  descricao: string
  operador: string
  os?: string             // Service Order reference
  duracao?: number        // seconds (filled on end events)
  observacoes?: string
  timestamp: string       // ISO datetime
}
```

### Event Types (`TipoEventoMaquina`)
| Event | Description |
|-------|-------------|
| `inicio_producao` | Production started |
| `fim_producao` | Production completed |
| `inicio_setup` | Setup phase started |
| `fim_setup` | Setup phase completed |
| `pausa` | Operator paused |
| `retomada` | Operator resumed |
| `inicio_ociosidade` | Machine became idle |
| `troca_operador` | Operator changed |
| `manutencao` | Maintenance event |
| `falha_tecnica` | Technical failure |

---

## 6. OS Time Distribution (`OsTimeData`)

```typescript
interface OsTimeData {
  numero: string            // OS number e.g. "OS:1508"
  maquinaCodigo: string
  totalSegundos: number
  tempoSetupSeg: number
  tempoProdSeg: number
  eficiencia: number        // 0–100
  participacaoPct: number   // % of machine's total time (computed)
}
```

Used for per-OS efficiency analysis — how much of a machine's time was consumed by each Service Order.

---

## 7. Weekly Productivity

`Maquina.produtividadeSemanal: number[]` — array of 7 values, one per day (Mon–Sun), representing operational hours per day.

Used to render the 7-day trend sparkline on machine cards.

---

## 8. Defined Machines (Mock)

8 machines defined in `src/mocks/maquinas.ts` and `src/lib/constants.ts`:

| Code | Sector | Type |
|------|--------|------|
| `CNC-001` | corte | CNC router |
| `CNC-002` | corte | CNC router |
| `CNC-003` | corte | CNC router |
| `LASER-001` | corte | Laser cutter |
| `LASER-002` | corte | Laser cutter |
| `PLASMA-001` | corte | Plasma cutter |
| `TORNO-001` | outros | Lathe |
| `FRESA-001` | outros | Milling machine |

---

## 9. Efficiency Calculation

`eficiencia` (0–100) represents the ratio of productive time to total available time:

```
eficiencia = (tempoOperacionalHoje / totalWorkingSeconds) × 100
```

In future Supabase integration, this will be computed from real event log timestamps rather than stored as a static field.

---

## 10. Dashboard Integration

`DashboardMaquinasModal` shows a condensed view of all machines:
- Status badge
- Efficiency gauge bar
- Current operator
- Last activity time

The dashboard machine panel reads from `src/mocks/maquinas.ts` — same data source as the full module.

---

## 11. Pending Improvements

| Feature | Priority |
|---------|---------|
| Real-time status updates (Supabase Realtime) | High |
| Actual event logging (trigger from Dobra/Corte) | High |
| Maintenance scheduling and calendar | High |
| OEE (Overall Equipment Effectiveness) calculation | Medium |
| Machine downtime alerts (auto-generate to alert system) | Medium |
| Per-machine efficiency trend over weeks/months | Medium |
| Sensor data integration (IoT) | Future |
| Predictive maintenance via Esync IA | Future |
