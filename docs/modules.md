# Modules

*Complete reference for every implemented module in Esync ERP*

---

## Production Flow Overview

The industrial flow runs left-to-right:

```
Desenvolvimento → Programação → Corte → Dobra → Solda → Estoque
                                    ↑
                              (Retalhos feed back)
```

Support modules: Dashboard, Máquinas, Peças, Retalhos, Programas, Relatórios, Esync IA, Usuários, Configurações.

---

## 1. Dashboard

**Route:** `/dashboard` | **Module ID:** `dashboard`

### Purpose
Central operations overview. Aggregates KPIs, machine status, alerts, and activity from all other modules.

### Implemented Features
- **KPI Stat Cards** — computed by `src/lib/dashboard/metrics.ts`; displays value + variation % + trend type
- **Production Chart** — Recharts BarChart showing production data from `src/mocks/dashboard.ts`
- **Machine Status Panel** — quick status cards for all 8 machines
- **Alert Panel** — active alerts from `src/lib/alerts/alertSystem.ts`
- **Activity Feed** — recent events from `src/lib/activity/activityLog.ts`
- **Notification Dropdown** — in Topbar; `Notificacao[]` with `tipo` and `lida` flag

### Modals
- `DashboardAlertsModal` — full alert list with severity badges
- `DashboardAtividadesModal` — full activity timeline
- `DashboardMaquinasModal` — machine status cards with efficiency

### Dependencies
- `src/lib/dashboard/metrics.ts`
- `src/lib/alerts/alertSystem.ts`
- `src/lib/activity/activityLog.ts`
- `src/mocks/dashboard.ts`, `src/mocks/maquinas.ts`
- Recharts

### Relationships
Aggregates read-only views from: Máquinas, Peças, Estoque, Programas

### Pending Improvements
- Connect KPIs to real data from Supabase
- Realtime machine status updates
- Customizable KPI card selection per user
- Date range filter for production chart

---

## 2. Desenvolvimento

**Route:** `/desenvolvimento` | **Module ID:** `desenvolvimento`

### Purpose
Entry point of the production flow. Manages production requests (Solicitações) and individual part development tasks.

### Implemented Features
- **Solicitações list** — all production requests with status, priority, OS number
- **Nova Solicitação** — form to create production request with:
  - Client, OS number, priority, description
  - Parts list (`PecaSolicitacao[]`) with per-part OS distribution (`OsDistribuicao[]`)
  - Process routing per part (`SetorProcesso[]`)
- **Task management** — individual `TarefaDesenvolvimento` per part
- **Pause/Resume** — start/pause development tasks with reason tracking
- **Send to Programação** — routes completed request to `ProgramacaoContext`
- **Status tracking** — pendente → em_desenvolvimento → pausado → aguardando_aprovacao → finalizado

### Business Invariant
`sum(PecaSolicitacao.osDistribuicao[].quantidade) === PecaSolicitacao.quantidade` — enforced on save.

### Key Types
- `SolicitacaoProducao` — main production request
- `PecaSolicitacao` — part within a request with OS distribution
- `OsDistribuicao` — OS allocation row
- `TarefaDesenvolvimento` — individual dev task
- `PausaDesenvolvimento` — pause record with start/end/duration

### Context
`src/contexts/DesenvolvimentoContext.tsx`

### Dependencies
- `src/types/desenvolvimento.ts`
- `src/mocks/desenvolvimento.ts`
- `DesenvolvimentoContext`
- Feeds into: `ProgramacaoContext`

### Relationships
- Receives input from: `ConjuntosContext` (future — auto-fill from assembly)
- Sends to: `ProgramacaoContext` via `SolicitacaoFromDesenv` bridge type

### Pending Improvements
- Auto-fill parts from Conjunto selection
- Stock check before creating request
- Approval workflow for `aguardando_aprovacao` status
- Link to resulting Programacao/Corte/Dobra IDs

---

## 3. Programação

**Route:** `/programacao` | **Module ID:** `programacao`

### Purpose
CNC programming management. Receives requests from Desenvolvimento, creates `ProgramaCNC` entries, tracks reuse and OS distribution.

### Implemented Features
- **Program list** — all CNC programs with status, programmer, OS numbers
- **Nova Programação** — create `ProgramaCNC` from `SolicitacaoProgramacao` or manually
  - Parts with quantities and per-part OS distribution
  - Material/retalho input (new plate vs. scrap/remnant)
  - Retalho generated tracking
- **Reuse** — increment `numeroExecucoes` counter; full history preserved
- **Conclude** — validates OS distribution invariant before closing
- **Status flow** — pendente → em_programacao → finalizado / cancelado
- **History log** — `HistoricoEntradaProg[]` per program (criacao, inicio, conclusao, reutilizacao, alteracao, cancelamento)
- **Activity feed** — `AtividadeProg[]` for recent events

### Business Invariants
- `sum(PecaPrograma.osDistribuicao[].quantidade) === PecaPrograma.quantidade`
- `ProgramaCNC.numeroExecucoes` is NEVER reset on reuse

### Key Types
- `ProgramaCNC` — main CNC program entity
- `PecaPrograma` — part within a program
- `OSDistribuicaoProg` — OS allocation per piece
- `RetalhoUtilizado` / `RetalhoGerado` — scrap tracking
- `SolicitacaoProgramacao` — request bridge from Desenvolvimento

### Context
`src/contexts/ProgramacaoContext.tsx`

### Dependencies
- `src/types/programacao.ts`
- `src/mocks/programacao.ts`
- Receives from: `DesenvolvimentoContext`
- Feeds into: Corte operations, Retalhos module

### Pending Improvements
- Auto-create Corte tasks from concluded programs
- Nesting optimization recommendations from Esync IA
- Program file attachment (G-code upload)
- Integration with real CNC machine APIs

---

## 4. Produtos (Conjuntos)

**Route:** `/conjuntos` | **Module ID:** `conjuntos`

### Purpose
Assembly and product catalog. Each Conjunto is a complete industrial product composed of multiple parts with defined production routes.

### Implemented Features
- **Assembly catalog** — searchable, filterable list of all conjuntos
- **Assembly detail** — parts list with quantities, materials, processes
- **Production simulation** (`ResultadoSimulacao`) — given a Conjunto + quantity:
  - Checks stock for each part
  - Computes `quantidadeDisponivel` (from stock) vs. `quantidadeProduzir` (needs manufacturing)
  - Shows `percentualAproveitamento` (stock coverage %)
  - Estimates `tempoEstimadoMinutos` and `pesoEstimadoTotal`
- **History** — `HistoricoConjunto[]` tracking all past production runs
- **QR Code** — generate QR linking to `/produto/[codigo]`
- **Analytics** — charts for: top assemblies by usage, most-used parts, category distribution, sector involvement

### Simulation Invariant
`quantidadeDisponivel + quantidadeProduzir === quantidadeNecessaria` (enforced in `SimulacaoItemEstoque`)

### Key Types
- `Conjunto` — assembly entity
- `PecaConjunto` — part reference within assembly (with `processos: SetorProcesso[]`)
- `SimulacaoItemEstoque` — per-part simulation result
- `ResultadoSimulacao` — full simulation result with aggregated totals
- `HistoricoConjunto` — production run record
- `ConjuntoParaProducao` — bridge to Desenvolvimento

### Context
`src/contexts/ConjuntosContext.tsx`

### Dynamic Route
`/produto/[codigo]` — public-accessible product detail for QR code scans.

### Pending Improvements
- Auto-fill `Desenvolvimento` from Conjunto selection (bridge partially typed)
- Bill of Materials (BOM) export
- Revision comparison (current vs. past revision)
- Cost estimation per assembly

---

## 5. Corte

**Route:** `/corte` | **Module ID:** `corte`

### Purpose
Cutting sector operations. Manages tasks for laser, plasma, and CNC cutting machines.

### Implemented Features
- Cutting task list with machine, material, status
- Task status tracking (pendente → em_producao → finalizado)
- Machine assignment
- Link to originating CNC program

### Key Types
- Uses subset of `TarefaDesenvolvimento` / cutting-specific task types

### Dependencies
- Receives work from: Programação (CNC programs)
- Feeds into: Dobra (next sector)

### Pending Improvements
- Machine availability real-time status
- Setup time tracking (like Dobra module)
- Scrap/retalho generation recording
- Nesting visualization

---

## 6. Dobra

**Route:** `/dobra` | **Module ID:** `dobra`

### Purpose
Sheet metal bending sector. Most operationally detailed sector with full setup, production, and pause lifecycle.

### Implemented Features
- **Task list** — all bending tasks with priority, machine, operator, status
- **Start setup** — records `setupInicio`; transitions to `em_setup`
- **Start production** — records `setupFim` + `producaoInicio`; transitions to `produzindo`
- **Pause** — records pause with reason (`PausaRegistroDobra`); transitions to `pausado`
- **Resume** — resumes production; calculates pause duration
- **Confirm quantity** — `quantidadeConfirmada`; triggers `EstoqueContext.entrada()`
- **Status flow** — pendente → em_setup → produzindo → pausado → finalizado

### Time Tracking
Full setup/production/pause timestamps preserved on `TarefaDobra`:
- `setupInicio`, `setupFim` — setup window
- `producaoInicio`, `producaoFim` — production window
- `pausas: PausaRegistroDobra[]` — all pause records with duration

### Key Types (`src/types/dobra.ts`)
- `TarefaDobra` — main bending task with full lifecycle timestamps
- `PausaRegistroDobra` — pause record (id, motivo, inicio, fim, duracao)
- `NovaTarefaDobraInput` — creation input type

### Context
`src/contexts/DobraContext.tsx`

### Dependencies
- Receives from: Programação (via `programaOrigemId`)
- Feeds into: `EstoqueContext` on quantity confirmation

### Pending Improvements
- Machine setup time analytics
- Tooling/die change tracking
- Per-operator efficiency reports
- Integration with Máquinas module for real machine status

---

## 7. Máquinas

**Route:** `/maquinas` | **Module ID:** `maquinas`

### Purpose
Equipment management and monitoring. Tracks status, efficiency, timeline, and events for all production machines.

### Implemented Features
- **Machine cards** — all 8 machines with status, sector, efficiency gauge
- **Status tracking** — operando / setup / pausada / ociosa / manutencao
- **Time tracking** — `tempoOperacionalHoje`, `tempoSetupHoje`, `tempoOciosoHoje`, `tempoPausadoHoje` (seconds)
- **Timeline** — `MaquinaTimelineSegmento[]` — hourly segments showing machine state across the day
- **Weekly productivity** — `produtividadeSemanal: number[]` — 7-day operational hours
- **Event log** — `EventoMaquina[]` — typed events (inicio_producao, fim_producao, inicio_setup, fim_setup, pausa, retomada, troca_operador, manutencao, falha_tecnica)
- **OS time data** — `OsTimeData` — time distribution by Service Order

### Key Types (`src/types/index.ts`)
- `Maquina` — full machine record (status, sector, efficiency, time tracking, timeline, weekly productivity)
- `MaquinaTimelineSegmento` — timeline block (tipo, inicio as decimal hour, duracao in hours)
- `EventoMaquina` — event log entry with operator, OS reference, duration
- `OsTimeData` — per-OS time distribution (totalSegundos, tempoSetupSeg, tempoProdSeg, eficiencia)

### 8 Defined Machines
`CNC-001`, `CNC-002`, `CNC-003`, `LASER-001`, `LASER-002`, `PLASMA-001`, `TORNO-001`, `FRESA-001`

### Sectors
`corte`, `dobra`, `solda`, `pintura`, `desenvolvimento`, `outros`

### Dashboard Integration
`DashboardMaquinasModal` shows abbreviated machine status from the same data.

### Pending Improvements
- Real-time sensor data ingestion
- Machine maintenance scheduling
- OEE (Overall Equipment Effectiveness) calculation
- Integration with Dobra/Corte for live status updates
- Alert generation on machine downtime

---

## 8. Peças

**Route:** `/pecas` | **Module ID:** `pecas`

### Purpose
Parts catalog and master data. Central reference for all parts used in assemblies and production.

### Implemented Features
- **Parts table** — sortable, filterable table of all parts
- **Column visibility** — `ColumnFilterDropdown` to show/hide columns
- **Create part** — `NovaPecaModal` with auto-code generation
- **Edit part** — `EditarPecaModal` with all fields
- **Delete part** — `DeleteConfirmModal` with confirmation
- **Import** — XLSX/CSV import with field alias mapping
- **Export** — XLSX/CSV/PDF export
- **Search** — text search across code, description, group, family

### Part Fields (`Peca` type)
- `codigo` — unique part code (auto-generated)
- `espessura` — thickness in mm
- `descricao` — description
- `grupo` — part group
- `familia` — family within group
- `codigoSistema` — system code
- `areaPeca` — area in mm²
- `desperdicio` — waste in m²
- `percFabricacao` — fabrication % (numeric)
- `percPintura` — painting % (numeric)
- `peso` — weight in kg
- `cor` — color
- `arquivo3d` — 3D model path (future: Autodesk Inventor)
- `planoDobra` — bend drawing path (future: PDF/DWG)
- `atualizadoEm` — last update ISO datetime

### Code Generation
`src/lib/pecas/codeGenerator.ts` — `generatePartCode(grupo, familia, espessura)` produces structured codes.

### Import Aliases
See `src/lib/import-export/modules.ts` for full field alias map (15 fields with multiple accepted column names).

### Pending Improvements
- 3D model viewer (Autodesk Inventor integration)
- Bend drawing viewer (PDF/DWG)
- Part revision history
- Cost tracking per part
- Link to Estoque quantity

---

## 9. Retalhos

**Route:** `/retalhos` | **Module ID:** `retalhos`

### Purpose
Material remnants and scraps tracking. When a CNC program uses only part of a sheet, the remainder becomes a Retalho and is tracked for reuse.

### Implemented Features
- **Retalho card grid** — cards showing material, dimensions, weight, location, status
- **Import/Export** — XLSX/CSV import with field aliases
- **Status** — disponivel / reservado / descarte
- **Origin tracking** — `pecaOrigem` links back to the part that generated the scrap

### Key Fields (`Retalho` type)
- `codigo`, `material`
- `dimensoes: { largura, altura, espessura }` (mm)
- `peso` (kg), `localizacao`, `status`
- `pecaOrigem` — source part reference

### Programação Integration
- When a CNC program uses a retalho, `ProgramaCNC.retalhoUtilizado` records it
- When a program generates a new retalho, `ProgramaCNC.retalhoGerado` records it

### Pending Improvements
- Auto-generate retalho from CNC program completion
- Location scanner integration
- Optimization suggestions (which programs can use available retalhos)

---

## 10. Programas

**Route:** `/programas` | **Module ID:** `programas`

### Purpose
NC program library. Stores all historical CNC/laser/plasma programs with versioning and execution tracking.

### Implemented Features
- **Program list** — all programs with machine, material, status, version
- **Execution tracking** — `execucoes` counter, `ultimaExecucao` timestamp
- **Status** — ativo / em_teste / arquivado / revisao
- **Import/Export** — XLSX/CSV import with field aliases

### Distinction from Programação
- `Programas` = historical library of NC programs (G-code files, parameters)
- `Programação` = active CNC programming workflow (`ProgramaCNC` entities)

### Key Fields (`Programa` type)
- `codigo`, `nome`, `maquina`, `material`
- `status: StatusPrograma`
- `versao` — revision identifier
- `operador` — programmer
- `tempoEstimado` — estimated run time (minutes)
- `execucoes` — total executions
- `ultimaExecucao` — last execution datetime

### Pending Improvements
- G-code file attachment and viewer
- Version comparison
- Performance tracking per program
- Link from `ProgramaCNC` to `Programa` library entries

---

## 11. Estoque

**Route:** `/estoque` | **Module ID:** `estoque`

### Purpose
Parts inventory management. Tracks quantities, minimum levels, locations, and movement history.

### Implemented Features
- **Inventory table** — all items with code, description, quantity, minimum, status
- **Status classification** — normal / estoque_baixo / critico (computed from `quantidade` vs. `quantidadeMinima`)
- **Movement log** — `MovimentoEstoque[]` with tipo (entrada/saida/ajuste), OS, operator, origin
- **Stock entries** — triggered by Dobra on quantity confirmation
- **Import/Export** — XLSX/CSV import with field aliases

### Stock Status Logic
- `normal` — `quantidade >= quantidadeMinima`
- `estoque_baixo` — `quantidade > 0 AND quantidade < quantidadeMinima`
- `critico` — `quantidade === 0`

### Key Types (`src/types/estoque.ts`)
- `EstoqueItem` — inventory item (codigoPeca, descricao, material, espessura, quantidade, quantidadeMinima, localizacao, status, ultimaEntrada, origemPrograma, unidade)
- `MovimentoEstoque` — movement record (tipo, codigoPeca, quantidade, programaOrigem, os, timestamp, operador, tarefaDobraId, programaCorteId)
- `EntradaEstoqueInput` — entry form input

### Context
`src/contexts/EstoqueContext.tsx` — receives entries from `DobraContext`

### Pending Improvements
- Multiple warehouse locations
- Stock reservation for OS
- Automatic reorder alerts
- Consumption forecast from production plan
- ABC curve analysis integration with Esync IA

---

## 12. Relatórios

**Route:** `/relatorios` | **Module ID:** `relatorios`

### Purpose
Analytics and reporting. Provides charts and report downloads across all modules.

### Implemented Features
- **Bar charts** — production data visualization (Recharts)
- **Pie charts** — distribution charts (Recharts)
- **Report list** — predefined report types (producao, estoque, financeiro, operacional)
- **Export** — jsPDF + autotable for PDF generation

### Report Types (`RelatorioItem.tipo`)
- `producao` — production metrics
- `estoque` — inventory analysis
- `financeiro` — financial overview
- `operacional` — operational efficiency

### Pending Improvements
- Date range filters
- Custom report builder
- Scheduled report email delivery
- Dashboard KPI drill-down
- Real data from Supabase aggregations

---

## 13. Esync IA

**Route:** `/esync-ia` | **Module ID:** `esync_ia`

*See [esync-ia.md](./esync-ia.md) for full documentation.*

---

## 14. Usuários

**Route:** `/usuarios` | **Module ID:** `usuarios`

### Purpose
User management and role assignment. Admin-only module.

### Implemented Features
- **User table** — all users with avatar, name, email, role, department, status, last access
- **Cargo management** — create/edit roles with per-module permission toggles
- **Preset colors** — 9 defined cargo colors for visual differentiation

### Key Types (`src/types/index.ts`)
- `Usuario` — user entity (id, nome, email, cargo, cargoId, departamento, avatar, status, criadoEm, ultimoAcesso)
- `UserRole` — `'admin' | 'supervisor' | 'operador' | 'visualizador'` (legacy type, `Cargo.id` used operationally)

### Mock Data
- `src/mocks/usuarios.ts` — sample user accounts
- `src/mocks/cargos.ts` — 7 preset roles with full permission maps

### Pending Improvements
- Real user creation with Supabase Auth
- Password management
- Invitation via email
- Activity log per user
- 2FA/MFA support

---

## 15. Configurações

**Route:** `/configuracoes` | **Module ID:** `configuracoes`

### Purpose
System configuration. Currently accessible to Mecânica (admin) and Administrativo roles.

### Implemented Features
- Settings sidebar menu
- General system settings panel

### Pending Improvements
- Company profile (logo, name, address)
- Integration settings (Supabase, OpenAI API key)
- Notification preferences
- Backup and data export
- SaaS billing management (future)
