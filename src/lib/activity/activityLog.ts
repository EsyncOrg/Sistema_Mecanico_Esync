/**
 * Activity log aggregator.
 * Combines module mock events + security audit log into a unified feed.
 * Future: replace with Supabase realtime subscription.
 */

import { mockAtividades }       from '@/mocks/dashboard'
import { mockEventosMaquinas }  from '@/mocks/maquinas'
import { getImportAuditLog, getActionAuditLog } from '@/lib/security/importSecurity'

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityAction =
  | 'criado' | 'editado' | 'excluido'
  | 'importado' | 'exportado'
  | 'estado' | 'seguranca' | 'sistema'

export type ActivityModuleKey =
  | 'maquinas' | 'estoque' | 'pecas' | 'programas'
  | 'retalhos' | 'usuarios' | 'seguranca' | 'sistema'
  | 'desenvolvimento' | 'programacao'

export const ACTIVITY_MODULE_LABELS: Record<ActivityModuleKey, string> = {
  maquinas:      'Máquinas',
  estoque:       'Estoque',
  pecas:         'Peças',
  programas:     'Programas',
  retalhos:      'Retalhos',
  usuarios:      'Usuários',
  seguranca:     'Segurança',
  sistema:       'Sistema',
  desenvolvimento: 'Desenvolvimento',
  programacao:   'Programação',
}

export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  criado:    'Criado',
  editado:   'Editado',
  excluido:  'Excluído',
  importado: 'Importado',
  exportado: 'Exportado',
  estado:    'Estado alterado',
  seguranca: 'Segurança',
  sistema:   'Sistema',
}

export interface ActivityEvent {
  id:          string
  action:      ActivityAction
  module:      ActivityModuleKey
  title:       string
  description: string
  user:        string
  timestamp:   string
}

// ─── Tipo → Action/color mapping ─────────────────────────────────────────────

const TIPO_EVENTO_MAP: Record<string, { action: ActivityAction; verb: string }> = {
  inicio_producao:    { action: 'estado',    verb: 'Iniciou produção'         },
  fim_producao:       { action: 'estado',    verb: 'Finalizou produção'       },
  inicio_setup:       { action: 'estado',    verb: 'Iniciou setup'            },
  fim_setup:          { action: 'estado',    verb: 'Concluiu setup'           },
  pausa:              { action: 'estado',    verb: 'Pausou produção'          },
  retomada:           { action: 'estado',    verb: 'Retomou produção'         },
  inicio_ociosidade:  { action: 'estado',    verb: 'Máquina entrou em ociosidade' },
  troca_operador:     { action: 'estado',    verb: 'Trocou operador'          },
  manutencao:         { action: 'estado',    verb: 'Iniciou manutenção'       },
  falha_tecnica:      { action: 'sistema',   verb: 'Falha técnica detectada'  },
}

// Legacy tipo → module mapping for mockAtividades
const LEGACY_TIPO_MODULE: Record<string, ActivityModuleKey> = {
  peca:     'pecas',
  retalho:  'retalhos',
  programa: 'programas',
  usuario:  'usuarios',
  sistema:  'sistema',
}

// ─── Aggregator ───────────────────────────────────────────────────────────────

export function getRecentActivities(): ActivityEvent[] {
  const events: ActivityEvent[] = []

  // ── Dashboard mock activities (legacy system events) ──────────────────────
  mockAtividades.forEach((a) => {
    events.push({
      id:          `legacy-${a.id}`,
      action:      'sistema',
      module:      LEGACY_TIPO_MODULE[a.tipo] ?? 'sistema',
      title:       a.titulo,
      description: a.descricao,
      user:        a.usuario,
      timestamp:   a.tempo,
    })
  })

  // ── Machine events from mockEventosMaquinas ────────────────────────────────
  mockEventosMaquinas.forEach((e) => {
    const map = TIPO_EVENTO_MAP[e.tipo] ?? { action: 'estado', verb: e.tipo }
    events.push({
      id:          `maq-${e.id}`,
      action:      map.action,
      module:      'maquinas',
      title:       `${map.verb} — ${e.maquinaCodigo}`,
      description: e.descricao + (e.os ? ` · ${e.os}` : ''),
      user:        e.operador,
      timestamp:   e.timestamp,
    })
  })

  // ── Import audit log ───────────────────────────────────────────────────────
  getImportAuditLog().forEach((e, i) => {
    events.push({
      id:          `imp-${i}`,
      action:      e.status === 'success' ? 'importado' : 'seguranca',
      module:      (e.moduleName as ActivityModuleKey) ?? 'sistema',
      title:       e.status === 'success'
        ? `Importação concluída — ${e.moduleTitle}`
        : `Importação bloqueada — ${e.moduleTitle}`,
      description: e.filename || '',
      user:        e.userName,
      timestamp:   e.timestamp,
    })
  })

  // ── Action audit log (edit/delete operations) ─────────────────────────────
  getActionAuditLog().forEach((e, i) => {
    const actionMap: Record<string, ActivityAction> = {
      edit:   'editado',
      delete: 'excluido',
      import: 'importado',
    }
    events.push({
      id:          `act-${i}`,
      action:      actionMap[e.actionType] ?? 'sistema',
      module:      (e.moduleName as ActivityModuleKey) ?? 'sistema',
      title:       `${e.actionType === 'edit' ? 'Editou' : 'Excluiu'} — ${e.targetSummary}`,
      description: e.changedFields?.length
        ? `Campos alterados: ${e.changedFields.join(', ')}`
        : `${e.targetIds.length} registro${e.targetIds.length !== 1 ? 's' : ''} afetado${e.targetIds.length !== 1 ? 's' : ''}`,
      user:        e.userName,
      timestamp:   e.timestamp,
    })
  })

  // Sort newest first
  return events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
}
