'use client'

import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'

interface Props {
  columnKey: string
  columnLabel: string
  values: string[]
  selected: Set<string>
  onChange: (key: string, values: Set<string>) => void
  onClose: () => void
  anchorRect: DOMRect
}

const DROPDOWN_W = 224

export function ColumnFilterDropdown({
  columnKey,
  columnLabel,
  values,
  selected,
  onChange,
  onClose,
  anchorRect,
}: Props) {
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const vpW = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vpH = typeof window !== 'undefined' ? window.innerHeight : 800

  const left  = Math.min(Math.max(anchorRect.left, 8), vpW - DROPDOWN_W - 8)
  const below = vpH - anchorRect.bottom - 8
  const top   = below > 200 ? anchorRect.bottom + 4 : anchorRect.top - Math.min(320, vpH * 0.5) - 4

  const visible = query
    ? values.filter((v) => v.toLowerCase().includes(query.toLowerCase()))
    : values

  function toggle(val: string) {
    const next = new Set(selected)
    if (next.has(val)) { next.delete(val) } else { next.add(val) }
    onChange(columnKey, next)
  }

  function selectAll() {
    const next = new Set(selected)
    visible.forEach((v) => next.add(v))
    onChange(columnKey, next)
  }

  function clearAll() {
    onChange(columnKey, new Set())
  }

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div ref={ref} style={{ position: 'fixed', top, left, width: DROPDOWN_W, zIndex: 9999 }}>
      <motion.div
        initial={{ opacity: 0, y: -6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.97 }}
        transition={{ duration: 0.13, ease: 'easeOut' }}
        className="overflow-hidden rounded-xl border border-border bg-card shadow-xl"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'rgb(10,58,74)' }}>
          <span className="flex-1 truncate text-[11px] font-semibold uppercase tracking-wide text-white/90">
            {columnLabel}
          </span>
          {selected.size > 0 && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-bold leading-none text-white" style={{ background: 'rgb(224,115,25)' }}>
              {selected.size}
            </span>
          )}
          <button onClick={onClose} className="rounded p-0.5 text-white/60 transition-colors hover:text-white">
            <X size={12} />
          </button>
        </div>

        {/* Search */}
        <div className="relative border-b border-border px-2 py-1.5">
          <Search size={11} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar valor..."
            className="w-full rounded-md bg-muted py-1 pl-6 pr-2 text-[11px] text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary/40"
          />
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-1">
          <button onClick={selectAll} className="text-[10px] font-medium text-primary transition-colors hover:underline">
            Selecionar todos
          </button>
          <span className="text-[10px] text-muted-foreground">·</span>
          <button onClick={clearAll} className="text-[10px] text-muted-foreground transition-colors hover:text-foreground">
            Limpar
          </button>
        </div>

        {/* Values */}
        <div className="max-h-52 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="px-3 py-3 text-center text-[11px] text-muted-foreground">Nenhum valor encontrado</p>
          ) : (
            visible.map((val) => {
              const checked = selected.has(val)
              return (
                <label
                  key={val}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[11px] transition-colors hover:bg-muted/60 ${
                    checked ? 'bg-primary/5 font-medium text-primary' : 'text-foreground'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(val)}
                    className="h-3 w-3 flex-shrink-0 rounded accent-primary"
                  />
                  <span className="truncate">{val}</span>
                </label>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
          {selected.size > 0 ? (
            <><span className="font-semibold text-primary">{selected.size}</span>{' '}de {values.length} selecionados</>
          ) : (
            <>{values.length} {values.length === 1 ? 'valor disponível' : 'valores disponíveis'}</>
          )}
        </div>
      </motion.div>
    </div>
  )
}
