import React from 'react'
import { cn } from '@/lib/utils'
import { STATUS_LABELS } from '@/lib/constants'

type StatusVariant =
  | 'ativo'
  | 'inativo'
  | 'pendente'
  | 'erro'
  | 'concluido'
  | 'em_progresso'
  | 'disponivel'
  | 'reservado'
  | 'descarte'
  | 'em_producao'
  | 'estoque_baixo'
  | 'indisponivel'
  | 'em_teste'
  | 'arquivado'
  | 'revisao'
  | 'operando'
  | 'parado'
  | 'manutencao'

const variantStyles: Record<string, string> = {
  ativo: 'bg-success/10 text-success',
  inativo: 'bg-muted text-muted-foreground',
  pendente: 'bg-warning/10 text-warning',
  erro: 'bg-destructive/10 text-destructive',
  concluido: 'bg-success/10 text-success',
  em_progresso: 'bg-primary/10 text-primary',
  disponivel: 'bg-success/10 text-success',
  reservado: 'bg-primary/10 text-primary',
  descarte: 'bg-destructive/10 text-destructive',
  em_producao: 'bg-accent/10 text-accent',
  estoque_baixo: 'bg-warning/10 text-warning',
  indisponivel: 'bg-destructive/10 text-destructive',
  em_teste: 'bg-warning/10 text-warning',
  arquivado: 'bg-muted text-muted-foreground',
  revisao: 'bg-accent/10 text-accent',
  operando: 'bg-success/10 text-success',
  parado: 'bg-muted text-muted-foreground',
  manutencao: 'bg-warning/10 text-warning',
}

const dotColors: Record<string, string> = {
  ativo: 'bg-success',
  inativo: 'bg-muted-foreground',
  pendente: 'bg-warning',
  erro: 'bg-destructive',
  concluido: 'bg-success',
  em_progresso: 'bg-primary',
  disponivel: 'bg-success',
  reservado: 'bg-primary',
  descarte: 'bg-destructive',
  em_producao: 'bg-accent',
  estoque_baixo: 'bg-warning',
  indisponivel: 'bg-destructive',
  em_teste: 'bg-warning',
  arquivado: 'bg-muted-foreground',
  revisao: 'bg-accent',
  operando: 'bg-success',
  parado: 'bg-muted-foreground',
  manutencao: 'bg-warning',
}

interface StatusBadgeProps {
  status: StatusVariant
  pulse?: boolean
  className?: string
}

export function StatusBadge({ status, pulse = false, className }: StatusBadgeProps) {
  const label = STATUS_LABELS[status] ?? status

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium',
        variantStyles[status] ?? 'bg-muted text-muted-foreground',
        className
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 flex-shrink-0 rounded-full',
          dotColors[status] ?? 'bg-muted-foreground',
          pulse && status === 'operando' && 'animate-pulse'
        )}
      />
      {label}
    </span>
  )
}
