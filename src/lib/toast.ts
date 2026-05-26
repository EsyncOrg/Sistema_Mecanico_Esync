'use client'

import { useState, useEffect } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

type Listener = (toasts: Toast[]) => void

let _toasts: Toast[] = []
const _listeners = new Set<Listener>()

function _notify() {
  _listeners.forEach((l) => l([..._toasts]))
}

export function toast(type: ToastType, title: string, message?: string, duration = 4500) {
  const id = Math.random().toString(36).slice(2, 9)
  _toasts = [..._toasts, { id, type, title, message }]
  _notify()
  setTimeout(() => {
    _toasts = _toasts.filter((t) => t.id !== id)
    _notify()
  }, duration)
}

export function dismissToast(id: string) {
  _toasts = _toasts.filter((t) => t.id !== id)
  _notify()
}

export function useToasts(): Toast[] {
  const [state, setState] = useState<Toast[]>([])
  useEffect(() => {
    setState([..._toasts])
    _listeners.add(setState)
    return () => {
      _listeners.delete(setState)
    }
  }, [])
  return state
}
