// ─── PecaConfiguracaoDisponivel — Seed Data (Phase 7.1) ──────────────────────
//
// Formalizes which manufacturing configurations are available for quotation
// per catalog piece. Links Peca (catalog) → ConfiguracaoFabricacao.
//
// Data matches mockConfiguracoesFabricacao (cfg-0001..cfg-0007):
//   PCA-0001 (id='1') → cfg-0001, cfg-0002
//   PCA-0002 (id='2') → cfg-0003, cfg-0004, cfg-0005
//   PCA-0007 (id='7') → cfg-0006, cfg-0007

import type { PecaConfiguracaoDisponivel } from '@/types/peca-configuracoes-disponiveis'

const now = new Date()

export const mockPecaConfiguracoesDisponiveis: PecaConfiguracaoDisponivel[] = [
  // ── PCA-0001 — Flange de Conexão Ø150mm ─────────────────────────────────
  {
    id:                      'pcd-001',
    pecaId:                  '1',
    configuracaoFabricacaoId:'cfg-0001',
    ativo:                   true,
    criadoEm:                now,
    atualizadoEm:            now,
  },
  {
    id:                      'pcd-002',
    pecaId:                  '1',
    configuracaoFabricacaoId:'cfg-0002',
    ativo:                   true,
    criadoEm:                now,
    atualizadoEm:            now,
  },

  // ── PCA-0002 — Suporte de Fixação ────────────────────────────────────────
  {
    id:                      'pcd-003',
    pecaId:                  '2',
    configuracaoFabricacaoId:'cfg-0003',
    ativo:                   true,
    criadoEm:                now,
    atualizadoEm:            now,
  },
  {
    id:                      'pcd-004',
    pecaId:                  '2',
    configuracaoFabricacaoId:'cfg-0004',
    ativo:                   true,
    criadoEm:                now,
    atualizadoEm:            now,
  },
  {
    id:                      'pcd-005',
    pecaId:                  '2',
    configuracaoFabricacaoId:'cfg-0005',
    ativo:                   true,
    criadoEm:                now,
    atualizadoEm:            now,
  },

  // ── PCA-0007 — Perfil Dobrado U 80x40mm ─────────────────────────────────
  {
    id:                      'pcd-006',
    pecaId:                  '7',
    configuracaoFabricacaoId:'cfg-0006',
    ativo:                   true,
    criadoEm:                now,
    atualizadoEm:            now,
  },
  {
    id:                      'pcd-007',
    pecaId:                  '7',
    configuracaoFabricacaoId:'cfg-0007',
    ativo:                   true,
    criadoEm:                now,
    atualizadoEm:            now,
  },
]
