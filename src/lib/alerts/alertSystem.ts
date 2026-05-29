/**
 * System-wide alert aggregator.
 * Derives real alerts from every module's canonical mock data.
 * Future: replace mock imports with Supabase queries — callers unchanged.
 */

import { mockMaquinas, mockEventosMaquinas } from '@/mocks/maquinas'
import { mockEstoque }  from '@/mocks/estoque'
import { mockPecas }    from '@/mocks/pecas'
import { mockProgramas } from '@/mocks/programas'
import { mockRetalhos } from '@/mocks/retalhos'
import { getImportAuditLog, getActionAuditLog } from '@/lib/security/importSecurity'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'warning' | 'info'

export type AlertModuleKey =
  | 'maquinas' | 'estoque' | 'pecas' | 'programas'
  | 'retalhos' | 'seguranca' | 'sistema'

export const ALERT_MODULE_LABELS: Record<AlertModuleKey, string> = {
  maquinas:  'Máquinas',
  estoque:   'Estoque',
  pecas:     'Peças',
  programas: 'Programas',
  retalhos:  'Retalhos',
  seguranca: 'Segurança',
  sistema:   'Sistema',
}

export interface SystemAlert {
  id:          string
  severity:    AlertSeverity
  module:      AlertModuleKey
  title:       string
  description: string
  timestamp:   string
  sourceId?:   string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _idCounter = 0
function aid() { return `alert-${++_idCounter}` }

// ─── Aggregator ───────────────────────────────────────────────────────────────

export function getAllSystemAlerts(): SystemAlert[] {
  _idCounter = 0
  const alerts: SystemAlert[] = []

  // ── Máquinas ──────────────────────────────────────────────────────────────

  mockMaquinas.forEach((m) => {
    if (m.status === 'manutencao') {
      alerts.push({
        id: aid(), severity: 'critical', module: 'maquinas',
        title: `Máquina em Manutenção — ${m.codigo}`,
        description: m.motivoPausa ?? `${m.nome} fora de operação por manutenção corretiva`,
        timestamp: m.atualizadoEm, sourceId: m.id,
      })
    } else if (m.status === 'pausada') {
      alerts.push({
        id: aid(), severity: 'warning', module: 'maquinas',
        title: `Produção Pausada — ${m.codigo}`,
        description: m.motivoPausa ?? `Produção pausada na ${m.nome}`,
        timestamp: m.atualizadoEm, sourceId: m.id,
      })
    } else if (m.status === 'ociosa') {
      alerts.push({
        id: aid(), severity: 'info', module: 'maquinas',
        title: `Máquina Ociosa — ${m.codigo}`,
        description: m.motivoPausa ?? `${m.nome} sem tarefa pendente`,
        timestamp: m.atualizadoEm, sourceId: m.id,
      })
    }
    if (m.eficiencia > 0 && m.eficiencia < 40) {
      alerts.push({
        id: aid(), severity: 'warning', module: 'maquinas',
        title: `Eficiência Muito Baixa — ${m.codigo}`,
        description: `Eficiência atual: ${m.eficiencia}% (abaixo de 40%)`,
        timestamp: m.atualizadoEm, sourceId: m.id,
      })
    }
  })

  // Machine technical failures from event log
  mockEventosMaquinas
    .filter((e) => e.tipo === 'falha_tecnica')
    .forEach((e) => {
      alerts.push({
        id: aid(), severity: 'critical', module: 'maquinas',
        title: `Falha Técnica — ${e.maquinaCodigo}`,
        description: e.descricao + (e.observacoes ? ` — ${e.observacoes}` : ''),
        timestamp: e.timestamp, sourceId: e.maquinaId,
      })
    })

  // ── Estoque ───────────────────────────────────────────────────────────────

  mockEstoque.forEach((e) => {
    if (e.quantidade === 0) {
      alerts.push({
        id: aid(), severity: 'critical', module: 'estoque',
        title: `Sem Estoque — ${e.codigoPeca}`,
        description: `${e.descricao} · Estoque zerado (mínimo: ${e.quantidadeMinima} ${e.unidade})`,
        timestamp: e.ultimaEntrada instanceof Date
          ? e.ultimaEntrada.toISOString()
          : String(e.ultimaEntrada),
        sourceId: e.id,
      })
    } else if (e.quantidade < e.quantidadeMinima) {
      const sev: AlertSeverity = e.status === 'critico' ? 'critical' : 'warning'
      alerts.push({
        id: aid(), severity: sev, module: 'estoque',
        title: `Estoque Baixo — ${e.codigoPeca}`,
        description: `${e.descricao} · ${e.quantidade}/${e.quantidadeMinima} ${e.unidade} (${e.material})`,
        timestamp: e.ultimaEntrada instanceof Date
          ? e.ultimaEntrada.toISOString()
          : String(e.ultimaEntrada),
        sourceId: e.id,
      })
    }
  })

  // ── Peças ─────────────────────────────────────────────────────────────────

  const pecasSem3d    = mockPecas.filter((p) => !p.arquivo3d).length
  const pecasSemPlano = mockPecas.filter((p) => !p.planoDobra).length

  if (pecasSem3d > 0) {
    alerts.push({
      id: aid(), severity: 'info', module: 'pecas',
      title: 'Documentação 3D Incompleta',
      description: `${pecasSem3d} peça${pecasSem3d !== 1 ? 's' : ''} sem modelo 3D cadastrado no catálogo`,
      timestamp: new Date().toISOString(),
    })
  }
  if (pecasSemPlano > 0) {
    alerts.push({
      id: aid(), severity: 'info', module: 'pecas',
      title: 'Planos de Dobra Faltando',
      description: `${pecasSemPlano} peça${pecasSemPlano !== 1 ? 's' : ''} sem plano de dobra no catálogo`,
      timestamp: new Date().toISOString(),
    })
  }

  // ── Programas ─────────────────────────────────────────────────────────────

  mockProgramas.filter((p) => p.status === 'revisao').forEach((p) => {
    alerts.push({
      id: aid(), severity: 'warning', module: 'programas',
      title: `Programa em Revisão — ${p.codigo}`,
      description: `${p.nome} · versão ${p.versao} aguarda aprovação da engenharia`,
      timestamp: p.criadoEm, sourceId: p.id,
    })
  })

  // ── Retalhos ──────────────────────────────────────────────────────────────

  const descarte = mockRetalhos.filter((r) => r.status === 'descarte').length
  if (descarte > 0) {
    alerts.push({
      id: aid(), severity: 'info', module: 'retalhos',
      title: 'Retalhos para Descarte',
      description: `${descarte} retalho${descarte !== 1 ? 's' : ''} marcado${descarte !== 1 ? 's' : ''} para descarte — revisar aproveitamento`,
      timestamp: new Date().toISOString(),
    })
  }

  // ── Segurança — blocked import/action attempts ────────────────────────────

  const blockedImports  = getImportAuditLog().filter((e) => e.status === 'blocked')
  const blockedActions  = getActionAuditLog().filter((e) => e.status === 'blocked')
  const totalBlocked    = blockedImports.length + blockedActions.length

  if (totalBlocked > 0) {
    alerts.push({
      id: aid(), severity: 'warning', module: 'seguranca',
      title: 'Tentativas de Acesso Bloqueadas',
      description: `${totalBlocked} operação${totalBlocked !== 1 ? 'ões' : ''} bloqueada${totalBlocked !== 1 ? 's' : ''} por senha incorreta nesta sessão`,
      timestamp: new Date().toISOString(),
    })
  }

  // Sort: critical → warning → info, then by timestamp desc
  const SEV_ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 }
  return alerts.sort((a, b) => {
    const sevDiff = SEV_ORDER[a.severity] - SEV_ORDER[b.severity]
    if (sevDiff !== 0) return sevDiff
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })
}
