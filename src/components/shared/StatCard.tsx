'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { StatCard as StatCardType } from '@/types'

const colorMap = {
  primary: {
    bg: 'bg-primary/8',
    icon: 'bg-primary/10 text-primary',
    ring: 'ring-primary/20',
  },
  accent: {
    bg: 'bg-accent/8',
    icon: 'bg-accent/10 text-accent',
    ring: 'ring-accent/20',
  },
  success: {
    bg: 'bg-success/8',
    icon: 'bg-success/10 text-success',
    ring: 'ring-success/20',
  },
  warning: {
    bg: 'bg-warning/8',
    icon: 'bg-warning/10 text-warning',
    ring: 'ring-warning/20',
  },
}

interface StatCardProps {
  stat: StatCardType
  index?: number
  icon: React.ReactNode
}

export function StatCard({ stat, index = 0, icon }: StatCardProps) {
  const colors = colorMap[stat.cor]

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: 'easeOut' }}
      className="group rounded-xl border border-border bg-card p-5 shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between">
        {/* Icon */}
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl ring-4 transition-transform duration-200 group-hover:scale-105',
            colors.icon,
            colors.ring
          )}
        >
          {icon}
        </div>

        {/* Trend */}
        <div
          className={cn(
            'flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold',
            stat.tipo === 'aumento' && 'bg-success/10 text-success',
            stat.tipo === 'queda' && 'bg-destructive/10 text-destructive',
            stat.tipo === 'neutro' && 'bg-muted text-muted-foreground'
          )}
        >
          {stat.tipo === 'aumento' && <TrendingUp size={11} strokeWidth={2.5} />}
          {stat.tipo === 'queda' && <TrendingDown size={11} strokeWidth={2.5} />}
          {stat.tipo === 'neutro' && <Minus size={11} strokeWidth={2.5} />}
          <span>
            {stat.tipo !== 'neutro' && (stat.tipo === 'aumento' ? '+' : '-')}
            {Math.abs(stat.variacao)}%
          </span>
        </div>
      </div>

      <div className="mt-4">
        <p className="text-2xl font-bold tracking-tight text-foreground">
          {stat.valor}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">{stat.titulo}</p>
        {stat.sufixo && (
          <p className="mt-1 text-xs text-muted-foreground/60">{stat.sufixo}</p>
        )}
      </div>

      {/* Subtle bottom accent line */}
      <div
        className={cn(
          'mt-4 h-0.5 w-0 rounded-full transition-all duration-300 group-hover:w-full',
          stat.cor === 'primary' && 'bg-primary/30',
          stat.cor === 'accent' && 'bg-accent/40',
          stat.cor === 'success' && 'bg-success/30',
          stat.cor === 'warning' && 'bg-warning/30'
        )}
      />
    </motion.div>
  )
}
