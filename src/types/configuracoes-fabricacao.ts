// ─── Manufacturing Configurations — Phase 6.1 ────────────────────────────────
//
// A ConfiguracaoFabricacao links a Peca to a specific CustoMaterial and defines
// which optional processes are active for that material choice.
//
// Business rule:
//   The same piece can be manufactured with different materials and different
//   process combinations. Each combination is one ConfiguracaoFabricacao.
//
// Example:
//   PCA-0002 (Suporte de Fixação)
//   ├── CFG-0003: Aço Carbono 6mm  + pintura=true  + dobra=true  → R$ 252,67
//   ├── CFG-0004: Aço Inox 304 3mm + pintura=false + dobra=true  → R$ 219,54
//   └── CFG-0005: Aço Galv. 6mm   + pintura=false + dobra=true  → R$ 189,73
//
// Architecture notes:
//   - pecaId  → FK → pecas.id
//   - materialId → FK → materiais.id (CustoMaterial.id)
//   - Base processes (Corte, Engenharia, Programação) are always included
//   - Optional processes (Dobra, Solda, Pintura, Montagem) are controlled by flags
//
// Future Supabase table: `configuracoes_fabricacao`
//   id, codigo, peca_id, material_id, pintura, solda, dobra, montagem,
//   observacoes, ativo, criado_em, atualizado_em, empresa_id

// ─── Core entity ─────────────────────────────────────────────────────────────

export interface ConfiguracaoFabricacao {
  id:     string
  /** Auto-generated: "CFG-0001", "CFG-0002" */
  codigo: string
  /** FK → pecas.id */
  pecaId: string
  /** FK → CustoMaterial.id (future: → materiais.id) */
  materialId: string

  // ── Process inclusion flags ─────────────────────────────────────────────────
  // Corte, Desenvolvimento, and Programação are ALWAYS included (base processes).
  // These flags control optional downstream processes:
  /** Include bending (Dobra) in cost calculation */
  dobra:    boolean
  /** Include welding (Solda) in cost calculation */
  solda:    boolean
  /** Include painting (Pintura) in cost calculation */
  pintura:  boolean
  /** Include assembly (Montagem) in cost calculation */
  montagem: boolean

  observacoes?: string
  ativo:        boolean
  criadoEm:     Date
  atualizadoEm: Date
}

// ─── Input for creating a new configuration ───────────────────────────────────

export interface NovaConfiguracaoInput {
  pecaId:    string
  materialId:string
  dobra:     boolean
  solda:     boolean
  pintura:   boolean
  montagem:  boolean
  observacoes?: string
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface ConfiguracoesAnalytics {
  /** Total number of configurations (active + inactive) */
  total:               number
  /** Active configurations */
  ativas:              number
  /** Number of distinct pieces that have at least one configuration */
  pecasComConfiguracao:number
  /** Total pieces in catalog minus pieces with configuration */
  pecasSemConfiguracao:number
  /** Top 3 most-used materials across configurations */
  materiaisMaisUsados: { materialId: string; count: number }[]
}
