# Peças (Parts)

*Esync ERP — Parts Catalog Module Reference*

---

## 1. Purpose

The Peças module is the master data catalog for all individual parts. Every part in the system — whether it appears in assemblies, production requests, NC programs, or inventory — is defined here first.

**Route:** `/pecas`
**Module ID:** `pecas`

---

## 2. Part Entity (`Peca` type)

Defined in `src/types/index.ts`:

```typescript
interface Peca {
  id: string
  codigo: string            // unique part code — auto-generated
  espessura: number         // sheet thickness in mm
  descricao: string         // part description
  grupo: string             // part group category
  familia: string           // family within group
  codigoSistema: string     // system-level code reference

  // ── Physical properties ──
  areaPeca: number          // part area in mm²
  desperdicio: number       // material waste in m²
  percFabricacao: number    // fabrication percentage (numeric, display with %)
  percPintura: number       // painting percentage (numeric, display with %)
  peso: number              // weight in kg
  cor: string               // color designation

  // ── File references (future integrations) ──
  arquivo3d: string         // path/URL — future Autodesk Inventor integration
  planoDobra: string        // path/URL — future PDF/DWG bend drawing

  // ── Metadata ──
  atualizadoEm: string      // ISO datetime — auto-updated on every edit
}
```

---

## 3. Status Types

The `StatusPeca` type exists for use in inventory and other modules:

```typescript
type StatusPeca =
  | 'disponivel'
  | 'reservado'
  | 'em_producao'
  | 'estoque_baixo'
  | 'indisponivel'
```

Note: The `Peca` entity itself does not carry status — status is tracked in `EstoqueItem` and `Conjunto` contexts.

---

## 4. Code Generation (`src/lib/pecas/codeGenerator.ts`)

**Function:** `generatePartCode(grupo, familia, espessura): string`

Produces structured, unique part codes from:
- Group prefix
- Family identifier
- Material thickness
- Auto-increment sequence

Ensures codes are consistent and machine-readable, supporting QR code and barcode scanning.

---

## 5. Gauge/Thickness Map (`src/lib/pecas/bitolaMap.ts`)

Provides a reference map of standard material gauges (bitolas) for:
- Aço Carbono
- Aço Inox
- Alumínio

Each material has its accepted standard thicknesses. Used as a validation reference in the part creation form to ensure `espessura` values are industry-standard.

---

## 6. Module Features

### Table View
- All parts in a sortable, filterable data table
- Columns: Código, Espessura, Descrição, Grupo, Família, Área, Peso, Atualizado Em
- `ColumnFilterDropdown` — toggle column visibility per user preference
- Search: text filter across código, descrição, grupo, família

### Create Part (`NovaPecaModal`)
- Full form with all `Peca` fields
- Auto-code generation via `generatePartCode()`
- Thickness validated against `bitolaMap`
- `atualizadoEm` set automatically to `new Date().toISOString()`

### Edit Part (`EditarPecaModal`)
- Same form as create — all fields editable
- `atualizadoEm` updated on every save
- `ActionAuditEvent` logged with `changedFields` list

### Delete Part (`DeleteConfirmModal`)
- Two-step confirmation dialog
- Requires item código confirmation
- `ActionAuditEvent` logged with `actionType: 'delete'`

### Import (XLSX/CSV)
- Full import pipeline (see [import-export.md](./import-export.md))
- 15 field definitions with extensive alias support
- Security password required
- Full validation with per-row error report

### Export (XLSX/CSV/PDF)
- Column selection
- All three formats supported
- PDF uses jsPDF-autotable with brand styling

---

## 7. Future Integrations

### Autodesk Inventor Integration
The `arquivo3d` field stores the path/URL to the 3D model. When integrated:
- Viewer embedded in part detail panel
- 3D model auto-linked from Inventor file system
- Mass properties synced (weight, area, volume)

### PDF/DWG Bend Drawing Integration
The `planoDobra` field stores the path/URL to the bend drawing. When integrated:
- PDF viewer embedded in part detail
- DWG viewer for engineering review
- Dimension and process verification

---

## 8. Import Field Aliases (Summary)

The import system recognizes these column names for each Peca field:

| Field | Standard | Also Accepts |
|-------|----------|-------------|
| codigo | codigo | cod, code, sku |
| espessura | espessura | esp, thickness, mm |
| descricao | descricao | desc, nome, name, peca |
| grupo | grupo | group, grp |
| familia | familia | family, fam |
| peso | peso | weight, kg |
| cor | cor | color, colour |

*Full alias list in [import-export.md](./import-export.md)*

---

## 9. Permissions

| Action | Required Permission |
|--------|-------------------|
| View parts list | `pecas.visualizacao` |
| Export parts | `pecas.visualizacao` (= canExport) |
| Create part | `pecas.edicao` |
| Edit part | `pecas.edicao` |
| Delete part | `pecas.edicao` |
| Import parts | `pecas.edicao` + security password |

Roles with full pecas access: `mecanica`, `engenharia`
Roles with view-only: `pcp`, `qualidade`

---

## 10. Relationships to Other Modules

| Module | Relationship |
|--------|-------------|
| Conjuntos | Peças are listed as `PecaConjunto[]` within each assembly |
| Desenvolvimento | `PecaSolicitacao.codigo` references `Peca.codigo` |
| Programação | `PecaPrograma.codigo` references `Peca.codigo` |
| Estoque | `EstoqueItem.codigoPeca` references `Peca.codigo` |
| Retalhos | `Retalho.pecaOrigem` may reference `Peca.codigo` |

---

## 11. Pending Improvements

| Feature | Priority |
|---------|---------|
| 3D model viewer (Autodesk Inventor) | High |
| Bend drawing viewer (PDF/DWG) | High |
| Part revision history | High |
| Link to current stock quantity | Medium |
| Cost tracking per part (material cost) | Medium |
| Part family browser/tree view | Medium |
| Mass properties auto-sync from 3D model | Future |
