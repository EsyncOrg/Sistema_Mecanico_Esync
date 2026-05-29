# Permissions & RBAC

*Esync ERP — Role-Based Access Control Reference*

---

## 1. Permission Model

The permission system is built on three layers:

1. **Module-level access** — `visualizacao` and `edicao` per module per cargo
2. **RBAC gate component** — `PermissionGate` wraps any UI block
3. **Admin override** — `isAdmin: true` on `Cargo` bypasses all checks

### Type Definitions (`src/types/permissions.ts`)

```typescript
type ModuleId =
  | 'dashboard' | 'desenvolvimento' | 'programacao' | 'conjuntos'
  | 'corte' | 'dobra' | 'solda' | 'maquinas' | 'pecas' | 'retalhos'
  | 'programas' | 'estoque' | 'relatorios' | 'esync_ia'
  | 'usuarios' | 'configuracoes'

interface ModulePermission {
  visualizacao: boolean
  edicao: boolean
}

type PermissionsMap = Record<ModuleId, ModulePermission>

interface Cargo {
  id: string
  nome: string
  descricao: string
  cor: string           // hex color for UI badge
  permissoes: PermissionsMap
  isAdmin?: boolean     // bypasses all permission checks
}
```

---

## 2. Roles (Cargos)

Defined in `src/mocks/cargos.ts`. Future: stored in Supabase `cargos` table.

### Mecânica (`id: 'mecanica'`)
- **Admin:** yes — bypasses all permission checks
- **Color:** #0f4c5c (teal)
- **Access:** Full read + write on ALL 16 modules
- **Use case:** System administrators, company owners

### Operador Corte (`id: 'operador_corte'`)
- **Admin:** no
- **Color:** #000080 (navy)
- **Full access:** corte
- **View only:** dashboard, desenvolvimento, programacao, conjuntos, dobra, estoque
- **No access:** maquinas, pecas, retalhos, programas, relatorios, esync_ia, usuarios, configuracoes
- **Use case:** Machine operators focused on cutting sector

### PCP (`id: 'pcp'`)
- **Admin:** no
- **Color:** #10b981 (green)
- **Full access:** programacao, conjuntos, programas
- **View only:** dashboard, desenvolvimento, pecas, corte, dobra, estoque, relatorios
- **No access:** maquinas, retalhos, solda, esync_ia, usuarios, configuracoes
- **Use case:** Production planning and control team

### Engenharia (`id: 'engenharia'`)
- **Admin:** no
- **Color:** #f59e0b (amber)
- **Full access:** desenvolvimento, programacao, conjuntos, pecas, programas
- **View only:** dashboard, retalhos, dobra, estoque, relatorios
- **No access:** corte, solda, maquinas, esync_ia, usuarios, configuracoes
- **Use case:** Engineers managing parts, programs, and development requests

### Produção (`id: 'producao'`)
- **Admin:** no
- **Color:** #8b5cf6 (purple)
- **Full access:** corte, dobra, solda, estoque
- **View only:** dashboard, desenvolvimento, programacao, conjuntos, programas, relatorios
- **No access:** maquinas, pecas, retalhos, esync_ia, usuarios, configuracoes
- **Use case:** Shop floor operators covering all production sectors

### Qualidade (`id: 'qualidade'`)
- **Admin:** no
- **Color:** #ef4444 (red)
- **Full access:** relatorios
- **View only:** dashboard, pecas, retalhos, dobra, estoque
- **No access:** corte, solda, maquinas, desenvolvimento, programacao, conjuntos, programas, esync_ia, usuarios, configuracoes
- **Use case:** Quality inspection and control team

### Administrativo (`id: 'administrativo'`)
- **Admin:** no
- **Color:** #6b7280 (gray)
- **Full access:** configuracoes
- **View only:** dashboard, relatorios
- **No access:** all production modules
- **Use case:** Administrative staff, HR, finance (no production floor access)

---

## 3. Permission Matrix

| Module | Mecânica | Op.Corte | PCP | Engenharia | Produção | Qualidade | Admin |
|--------|----------|----------|-----|------------|----------|-----------|-------|
| dashboard | ✅ full | 👁 view | 👁 view | 👁 view | 👁 view | 👁 view | 👁 view |
| desenvolvimento | ✅ full | 👁 view | 👁 view | ✅ full | 👁 view | — | — |
| programacao | ✅ full | 👁 view | ✅ full | ✅ full | 👁 view | — | — |
| conjuntos | ✅ full | 👁 view | ✅ full | ✅ full | 👁 view | — | — |
| corte | ✅ full | ✅ full | 👁 view | — | ✅ full | — | — |
| dobra | ✅ full | 👁 view | 👁 view | 👁 view | ✅ full | 👁 view | — |
| solda | ✅ full | — | — | — | ✅ full | — | — |
| maquinas | ✅ full | — | — | — | — | — | — |
| pecas | ✅ full | — | 👁 view | ✅ full | — | 👁 view | — |
| retalhos | ✅ full | — | — | 👁 view | — | 👁 view | — |
| programas | ✅ full | — | ✅ full | ✅ full | 👁 view | — | — |
| estoque | ✅ full | 👁 view | 👁 view | 👁 view | ✅ full | 👁 view | — |
| relatorios | ✅ full | — | 👁 view | 👁 view | 👁 view | ✅ full | 👁 view |
| esync_ia | ✅ full | — | — | — | — | — | — |
| usuarios | ✅ full | — | — | — | — | — | — |
| configuracoes | ✅ full | — | — | — | — | — | ✅ full |

Legend: ✅ full (visualizacao + edicao) | 👁 view (visualizacao only) | — no access

---

## 4. RBAC Enforcement

### AuthContext API (`src/contexts/AuthContext.tsx`)

```typescript
canView(module: ModuleId): boolean
  // currentCargo.isAdmin OR currentCargo.permissoes[module].visualizacao

canEdit(module: ModuleId): boolean
  // currentCargo.isAdmin OR currentCargo.permissoes[module].edicao

canExport(module: ModuleId): boolean
  // Currently equals canView — decoupled for future fine-grained control

isAdmin(): boolean
  // currentCargo.isAdmin === true
```

### PermissionGate Component (`src/components/shared/PermissionGate.tsx`)

```tsx
<PermissionGate module="pecas" action="edicao">
  <EditButton />
</PermissionGate>
```

If `canEdit('pecas')` returns false → renders `<BlockedAccess />` instead.

### BlockedAccess Component (`src/components/shared/BlockedAccess.tsx`)

Renders a styled denied screen showing the user's current role and a message to contact the administrator. Used as fallback by `PermissionGate`.

---

## 5. Action-Level Permissions

Beyond page access, specific actions require `edicao: true`:

| Action | Module Required | Notes |
|--------|----------------|-------|
| Create new part | `pecas` edicao | Via `NovaPecaModal` |
| Edit part | `pecas` edicao | Via `EditarPecaModal` |
| Delete part | `pecas` edicao | Via `DeleteConfirmModal` |
| Import data | Per module edicao | + import password required |
| Export data | Per module visualizacao | canExport() check |
| Create OS | `desenvolvimento` edicao | Via Nova Solicitação form |
| Start/pause production | `dobra` / `corte` edicao | Sector-specific |
| Create CNC program | `programacao` edicao | Via Programação form |
| Manage users | `usuarios` edicao | Admin only effectively |
| Change settings | `configuracoes` edicao | Admin or Administrativo |

---

## 6. Import/Export Permissions

### Import
- Requires `edicao: true` on the module being imported
- Additionally requires `NEXT_PUBLIC_IMPORT_SECURITY_PASSWORD` to match
- Audit log entry written on every attempt (success or blocked)

### Export
- Requires `canExport(module)` = `canView(module)` currently
- No additional password required
- Future: may decouple from view permission for sensitive exports

---

## 7. Authentication Flow

### Login
1. User submits email + password on `/login`
2. `AuthContext.login()` validates non-empty fields
3. Creates hardcoded `AuthUser = { id: 'user-001', nome: 'João Dias', cargoId: 'mecanica', empresaId: 'empresa-001' }`
4. Stores `SessionData` in `sessionStorage['forge-erp-session']`
5. Sets `forge_erp_session=1` cookie (used only by middleware)
6. Sets `isAuthenticated = true`, loads `currentCargo` from `mockCargos`

**Current limitation:** Any email/password combination logs in as the same admin user.

### Session Restoration
- On app load, `AuthContext` reads `sessionStorage['forge-erp-session']`
- If found and parseable → restores user + cargo + sets `isAuthenticated = true`
- If missing or corrupt → clears cookie, sets `isAuthenticated = false`

### Logout
1. Removes `sessionStorage['forge-erp-session']`
2. Clears `forge_erp_session` cookie
3. Sets `isAuthenticated = false`
4. Redirects to `/login`

### Middleware Behavior
- Only intercepts `/login` when cookie exists → redirect to `/dashboard`
- Does NOT protect dashboard routes — that's client-side
- Matcher: all paths except `_next/static`, `_next/image`, favicon, static files

---

## 8. Future Security Improvements

| Current | Planned |
|---------|---------|
| Any credentials log in as admin | Supabase `signInWithPassword()` with real users |
| `sessionStorage` session | Supabase-managed HttpOnly cookies |
| Import password in browser bundle (`NEXT_PUBLIC_`) | Server-side `supabase.rpc('validate_import_password')` |
| No server-side auth validation | JWT verification in middleware |
| In-memory audit log | Supabase `import_audit_log` + `action_audit_log` tables |
| No rate limiting | Rate limiting on `/api/ai/chat` and auth endpoints |
| Single company | `empresaId` on all records + RLS policies |
