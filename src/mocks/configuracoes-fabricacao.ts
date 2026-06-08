// ─── Manufacturing Configurations — Seed Data (Phase 6.1) ─────────────────────
//
// Demonstrates the Piece → Configuration → Cost architecture.
// Uses pecaIds from mockPecas and materialIds from mockCustosMateriais.
//
// Cost preview (taxaIndiretos=20%, fatorWaste=1.15):
//
//  PCA-0001 (Flange, 2.10kg, 12mm)
//    CFG-0001 Aço Carbono 12mm, pintado=false, dobra=false  → ~R$ 120,90
//    CFG-0002 Aço Inox 304 3mm,  pintado=false, dobra=false  → ~R$ 146,00
//
//  PCA-0002 (Suporte Fixação, 0.80kg, 6mm)
//    CFG-0003 Aço Carbono 6mm,    pintado=true,  dobra=true  → ~R$ 252,67
//    CFG-0004 Aço Inox 304 6mm,   pintado=false, dobra=true  → ~R$ 218,00
//    CFG-0005 Aço Galv. Z275 6mm, pintado=false, dobra=true  → ~R$ 189,73
//
//  PCA-0007 (Perfil Dobrado U, 5.20kg, 4mm)
//    CFG-0006 Aço Carbono 3mm, pintado=true,  dobra=true    → ~R$ 135,00
//    CFG-0007 Aço Galv. Z275 3mm, pintado=false, dobra=true → ~R$ 106,00

import type { ConfiguracaoFabricacao } from '@/types/configuracoes-fabricacao'

const now = new Date()
const ago = (d: number) => new Date(now.getTime() - d * 86_400_000)

export const mockConfiguracoesFabricacao: ConfiguracaoFabricacao[] = [

  // ── PCA-0001 — Flange de Conexão Ø150mm (12mm, 2.10kg) ────────────────────

  {
    id:          'cfg-0001',
    codigo:      'CFG-0001',
    pecaId:      '1',           // PCA-0001
    materialId:  'mat-004',     // Aço Carbono 1020 12mm (MAT-004, exact match)
    dobra:       false,
    solda:       false,
    pintura:     false,
    montagem:    true,
    observacoes: 'Configuração padrão — aço carbono sem pintura',
    ativo:       true,
    criadoEm:    ago(7),
    atualizadoEm:ago(7),
  },
  {
    id:          'cfg-0002',
    codigo:      'CFG-0002',
    pecaId:      '1',           // PCA-0001
    materialId:  'mat-006',     // Aço Inox 304 3mm
    dobra:       false,
    solda:       false,
    pintura:     false,
    montagem:    true,
    observacoes: 'Inox 304 — ambientes corrosivos',
    ativo:       true,
    criadoEm:    ago(7),
    atualizadoEm:ago(7),
  },

  // ── PCA-0002 — Suporte de Fixação (6mm, 0.80kg) ───────────────────────────

  {
    id:          'cfg-0003',
    codigo:      'CFG-0003',
    pecaId:      '2',           // PCA-0002
    materialId:  'mat-002',     // Aço Carbono 1020 6mm (exact match)
    dobra:       true,
    solda:       false,
    pintura:     true,
    montagem:    true,
    observacoes: 'Configuração padrão — aço carbono + pintura eletrostática',
    ativo:       true,
    criadoEm:    ago(5),
    atualizadoEm:ago(5),
  },
  {
    id:          'cfg-0004',
    codigo:      'CFG-0004',
    pecaId:      '2',           // PCA-0002
    materialId:  'mat-007',     // Aço Inox 304 6mm
    dobra:       true,
    solda:       false,
    pintura:     false,
    montagem:    true,
    observacoes: 'Inox — sem pintura, para ambientes agressivos',
    ativo:       true,
    criadoEm:    ago(5),
    atualizadoEm:ago(5),
  },
  {
    id:          'cfg-0005',
    codigo:      'CFG-0005',
    pecaId:      '2',           // PCA-0002
    materialId:  'mat-010',     // Aço Galvanizado Z275 6mm
    dobra:       true,
    solda:       false,
    pintura:     false,
    montagem:    true,
    observacoes: 'Galvanizado Z275 — sem pintura (já protegido contra corrosão)',
    ativo:       true,
    criadoEm:    ago(5),
    atualizadoEm:ago(5),
  },

  // ── PCA-0007 — Perfil Dobrado U 80x40mm (4mm, 5.20kg) ─────────────────────

  {
    id:          'cfg-0006',
    codigo:      'CFG-0006',
    pecaId:      '7',           // PCA-0007
    materialId:  'mat-001',     // Aço Carbono 1020 3mm (closest to 4mm)
    dobra:       true,
    solda:       false,
    pintura:     true,
    montagem:    true,
    observacoes: 'Perfil padrão — aço carbono pintado',
    ativo:       true,
    criadoEm:    ago(3),
    atualizadoEm:ago(3),
  },
  {
    id:          'cfg-0007',
    codigo:      'CFG-0007',
    pecaId:      '7',           // PCA-0007
    materialId:  'mat-009',     // Aço Galvanizado Z275 3mm
    dobra:       true,
    solda:       false,
    pintura:     false,
    montagem:    false,
    observacoes: 'Galvanizado — sem pintura e sem montagem final',
    ativo:       true,
    criadoEm:    ago(3),
    atualizadoEm:ago(3),
  },
]
