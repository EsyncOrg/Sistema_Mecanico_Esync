# Import / Export System

*Esync ERP — Complete Data Exchange Reference*

---

## 1. Overview

The import/export system handles structured data exchange for 4 modules. It is designed to be flexible (accepts varied column names from different spreadsheet sources), secure (password-gated imports), and auditable (all operations logged).

**Supported modules:** `pecas`, `programas`, `retalhos`, `estoque`

**Export formats:** XLSX, CSV, PDF

**Import formats:** XLSX (.xlsx), CSV (.csv)

---

## 2. Architecture

```
src/lib/import-export/
├── types.ts       # Shared interfaces
├── modules.ts     # Per-module field alias maps
├── parser.ts      # XLSX/CSV file parser
├── validator.ts   # Auto-mapping + row validation
└── template.ts    # Downloadable import templates

src/lib/
├── exportUtils.ts        # XLSX, CSV, PDF generators
└── security/
    └── importSecurity.ts # Password validation + audit log

src/components/shared/
├── ImportModal.tsx        # Import UI + file drag-drop
├── ImportPasswordModal.tsx# Password gate
└── ExportModal.tsx        # Export format selector
```

---

## 3. Type System (`src/lib/import-export/types.ts`)

```typescript
type ExportFormat = 'xlsx' | 'csv' | 'pdf'

interface ExportColumn {
  key: string
  label: string
}

interface FieldConfig {
  key: string           // field name in the domain type
  label: string         // display label (also used as column header)
  required: boolean     // validation enforced if true
  aliases?: string[]    // additional accepted column names
  validate?: (value: string) => string | null  // custom validator
}

interface ParseResult {
  headers: string[]
  rows: Record<string, string>[]
  totalRows: number
}

interface ValidationError {
  linha: number         // row number (2-indexed; row 1 = header)
  campo: string         // field label
  erro: string          // error description in PT-BR
}

interface ValidationResult {
  valid: Record<string, unknown>[]
  errors: ValidationError[]
  totalRows: number
}

interface TemplateField {
  label: string
  required: boolean
  example?: string
  note?: string
}
```

---

## 4. Field Alias Maps (`src/lib/import-export/modules.ts`)

Enables flexible column matching — the parser recognizes many common column naming variations without requiring exact field names.

### `pecas` module — 15 fields
| Field | Accepted Aliases |
|-------|----------------|
| `codigo` | cod, code, sku |
| `espessura` | esp, thickness, espessuramm, mm |
| `descricao` | desc, nome, name, description, peca, item |
| `grupo` | group, grp |
| `familia` | family, fam |
| `codigoSistema` | codigosistema, systemcode, syscode, codigosist |
| `areaPeca` | area, areapeca, areamm2, area_mm2 |
| `desperdicio` | scrap, waste, desperdiciom2 |
| `percFabricacao` | fabricacao, fab, percfab, fabricacaopercent |
| `percPintura` | pintura, paint, percpintura, pinturapercent |
| `peso` | weight, kg, massakg, pesokg |
| `cor` | color, colour |
| `arquivo3d` | model3d, arquivo3d, ipt, 3d |
| `planoDobra` | plano, dobra, pdf, dwg, benddrawing |
| `atualizadoEm` | atualizadoem, updatedat, updated |

### `programas` module — 8 fields
| Field | Accepted Aliases |
|-------|----------------|
| `codigo` | cod, code, programcode, id |
| `nome` | name, description, desc, programa |
| `maquina` | machine, equipamento, cnc, equipment |
| `material` | mat, materia |
| `versao` | version, ver, rev, revision |
| `status` | situacao, state |
| `tempoEstimado` | tempo, timemin, tempominutos, estimatedtime, duracao |
| `operador` | operator, responsavel, programador, programmer |

### `retalhos` module — 9 fields
| Field | Accepted Aliases |
|-------|----------------|
| `codigo` | cod, code, scrapcode |
| `material` | mat, materia |
| `largura` | width, w, larguramm, widthmm |
| `altura` | height, h, alturamm, heightmm |
| `espessura` | esp, thickness, e |
| `peso` | weight, kg |
| `localizacao` | local, location, prateleira |
| `status` | situacao, state |
| `pecaOrigem` | origem, source, origempeca, pecadeorigem, sourcepartnumber |

### `estoque` module — 10 fields
| Field | Accepted Aliases |
|-------|----------------|
| `codigoPeca` | codigo, cod, code, sku, partnumber |
| `descricao` | nome, name, description, desc |
| `material` | mat |
| `espessura` | esp, thickness |
| `quantidade` | qtd, qty, quantity, stock |
| `quantidadeMinima` | qtdmin, minimo, safetystock |
| `localizacao` | local, location |
| `status` | situacao |
| `unidade` | unit, un |
| `origemPrograma` | programa, origin, source |

---

## 5. Parser (`src/lib/import-export/parser.ts`)

Handles both XLSX and CSV file formats.

**XLSX parsing:** Uses `xlsx` library (`XLSX.read(buffer)` → `XLSX.utils.sheet_to_json()`). Returns normalized headers and rows.

**CSV parsing:** Flexible delimiter detection (comma, semicolon, tab). Returns same `ParseResult` structure.

```typescript
function parseFile(file: File): Promise<ParseResult>
// Returns: { headers: string[], rows: Record<string,string>[], totalRows: number }
```

---

## 6. Auto-Mapping & Validation (`src/lib/import-export/validator.ts`)

### `buildAutoMapping(fileHeaders, fields)`
Maps file column headers to schema field keys. Algorithm:
1. For each `FieldConfig`, build candidate list: `[field.key, field.label, ...field.aliases]`
2. Normalize all strings: lowercase → strip accents → remove non-alphanumeric
3. Find first file header that matches any candidate
4. Returns `Record<fieldKey, fileColumnName>` (empty string if not found)

**Normalization** strips PT-BR accents and punctuation, enabling matches like:
- `"Código"` → `"codigo"`
- `"Espessura (mm)"` → `"espessuramm"` → matches alias `espessuramm`

### `validateRows(rows, fields, mapping)`
Row-by-row validation:
- For each field: reads raw value via mapping, trims whitespace
- If `field.required && !value` → `ValidationError { linha, campo, erro: 'Campo obrigatório vazio' }`
- If `value && field.validate` → runs custom validator; error if returns string
- Rows with any error are excluded from `valid[]` and added to `errors[]`
- Returns `{ valid: Record<string,unknown>[], errors: ValidationError[], totalRows: number }`

Row numbers are 2-indexed (header = row 1, data starts at row 2).

---

## 7. Import Flow (Step by Step)

```
1. User clicks "Importar" in PageHeader
   → PermissionGate checks canEdit(module)

2. ImportPasswordModal opens
   → User enters security password
   → validateImportPassword(password) called (500ms simulated latency)
   → If wrong: shows error, logImportAudit({ status: 'blocked' })
   → If correct: proceed

3. ImportModal opens
   → Module selection (if not pre-set)
   → Drag-drop or click to select file (.xlsx or .csv)
   → parser.ts → ParseResult { headers, rows }

4. Auto-mapping
   → buildAutoMapping(headers, moduleFields)
   → Shows mapping preview to user (which file column → which field)
   → User can adjust unmapped fields

5. Validation
   → validateRows(rows, fields, mapping)
   → ValidationResult { valid[], errors[] }
   → Shows error list (line number, field, error message)
   → User sees count: "847 válidos, 3 com erro"

6. Confirmation
   → User clicks "Importar X registros"
   → Context.addMany(valid) called → updates in-memory state
   → logImportAudit({ status: 'success', rowsImported, errorCount })

7. Feedback
   → Modal closes
   → Toast: "847 peças importadas com sucesso"
   → Page re-renders with new data
```

---

## 8. Export Flow (Step by Step)

```
1. User clicks "Exportar" in PageHeader
   → PermissionGate checks canExport(module) = canView(module)

2. ExportModal opens
   → Format selection: XLSX / CSV / PDF
   → Column selection (which fields to include)

3. Export generation
   → XLSX: xlsx library generates workbook → downloadable .xlsx
   → CSV: string builder → Blob → downloadable .csv
   → PDF: jsPDF + jsPDF-autotable → downloadable .pdf

4. File download
   → Browser download triggered via temporary <a> with object URL
   → Toast: "Exportação concluída"
```

---

## 9. Template System (`src/lib/import-export/template.ts`)

Provides downloadable template files for each import module.

Template files include:
- All required and optional column headers (using standard field labels)
- 1-2 example data rows showing correct format
- Notes column (if `TemplateField.note` set) for field-specific guidance

Users download the template, fill it in their spreadsheet software, and import. The alias system handles variations in column naming.

---

## 10. Security System (`src/lib/security/importSecurity.ts`)

### Password Validation
```typescript
async function validateImportPassword(password: string): Promise<boolean>
```
- Reads `process.env.NEXT_PUBLIC_IMPORT_SECURITY_PASSWORD`
- Adds 500ms async delay (placeholder for future network round-trip)
- Returns `password === expected`
- Warns in console if env var is not configured

**Current limitation:** Password is in a `NEXT_PUBLIC_` env var — visible in the browser bundle. **Must** move to a server-side RPC call before production.

**Planned fix:**
```typescript
// Future implementation:
const { data } = await supabase.rpc('validate_import_password', {
  pwd: password,
  empresa_id: user.empresaId
})
```

### Import Audit Log
```typescript
function logImportAudit(event: Omit<ImportAuditEvent, 'id' | 'timestamp'>): void
function getImportAuditLog(): ImportAuditEvent[]
```

`ImportAuditEvent` fields:
- `id` — auto-generated random ID
- `userId`, `userName` — from AuthContext
- `moduleName`, `moduleTitle` — which module was imported
- `filename` — original file name
- `timestamp` — ISO datetime
- `status: 'success' | 'blocked' | 'failure'`
- `rowsImported?` — count of successfully imported rows
- `errorCount?` — count of validation errors

### Action Audit Log
```typescript
function logActionAudit(event: Omit<ActionAuditEvent, 'id' | 'timestamp'>): void
function getActionAuditLog(): ActionAuditEvent[]
```

`ActionAuditEvent` fields:
- `actionType: 'import' | 'edit' | 'delete'`
- `targetIds: string[]` — record IDs affected
- `targetSummary: string` — human-readable summary
- `changedFields?: string[]` — for edits, which fields changed
- `status: 'success' | 'blocked' | 'failure'`

Both logs are **in-memory only** — reset on server restart. Future: persist to Supabase tables.

---

## 11. Export Libraries

### XLSX (`xlsx` library)
- Generates `.xlsx` workbook from data arrays
- Handles column widths, header formatting
- Used for both import parsing and export generation

### jsPDF + jsPDF-autotable
- `jsPDF` — PDF document generation
- `jsPDF-autotable` — automatic table rendering from data arrays
- Supports column widths, alternating row colors, header styling
- Export uses brand colors (primary teal for header, muted for alternating rows)

### CSV
- Plain string builder — no library dependency
- Semicolon delimiter (standard for PT-BR locales)
- UTF-8 BOM prepended for Excel compatibility

---

## 12. Error Handling

| Error Type | Handling |
|-----------|---------|
| Wrong password | Modal shows error, blocks proceed, logs blocked event |
| File format not supported | Modal shows file type error |
| Parse error | Modal shows "Erro ao ler arquivo" with file name |
| Required field empty | Error listed per row; valid rows still imported |
| Custom validation failed | Error listed per row with specific message |
| Zero valid rows | Import blocked; user sees full error list |
| Partial import | Valid rows imported; error summary shown in toast |

---

## 13. Future Improvements

| Improvement | Priority |
|-----------|---------|
| Move import password to server-side RPC | Critical (security) |
| Persist audit log to Supabase | High |
| Add JSON export format | Medium |
| Column mapping UI (drag to rearrange) | Medium |
| Large file handling (streaming parser) | Medium |
| Duplicate detection on import | Medium |
| Preview diff before confirming import | Low |
| Scheduled auto-export to email | Low |
