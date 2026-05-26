'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Lock, ShieldOff, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BlockedAccessProps {
  moduleName?: string
  className?: string
}

export function BlockedAccess({ moduleName, className }: BlockedAccessProps) {
  const router = useRouter()

  return (
    <div className={cn('flex min-h-[70vh] flex-col items-center justify-center px-6', className)}>
      {/* Animated background rings */}
      <div className="relative mb-8 flex items-center justify-center">
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.08, 0.14, 0.08] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute h-48 w-48 rounded-full bg-destructive"
        />
        <motion.div
          animate={{ scale: [1, 1.12, 1], opacity: [0.05, 0.10, 0.05] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          className="absolute h-64 w-64 rounded-full bg-destructive"
        />

        {/* Shield icon container */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
          className="relative flex h-28 w-28 items-center justify-center rounded-3xl border-2 border-destructive/20 bg-destructive/10"
        >
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Lock size={48} className="text-destructive" strokeWidth={1.5} />
          </motion.div>

          {/* Corner badge */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 400 }}
            className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-background bg-destructive"
          >
            <ShieldOff size={13} className="text-white" />
          </motion.div>
        </motion.div>
      </div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="max-w-md text-center"
      >
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          Acesso Bloqueado
        </h2>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          {moduleName
            ? `Você não tem permissão para acessar o módulo de ${moduleName}.`
            : 'Você não tem permissão para acessar este módulo.'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Entre em contato com o administrador do sistema para solicitar acesso.
        </p>
      </motion.div>

      {/* Detail card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-3"
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-destructive/10">
          <Lock size={14} className="text-destructive" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">Permissão de Visualização Necessária</p>
          <p className="text-xs text-muted-foreground">
            Cargo atual não possui acesso a este módulo
          </p>
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-8 flex items-center gap-3"
      >
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          <ArrowLeft size={14} />
          Voltar
        </Button>
        <Button variant="default" size="sm" onClick={() => router.push('/dashboard')}>
          Ir ao Dashboard
        </Button>
      </motion.div>
    </div>
  )
}
