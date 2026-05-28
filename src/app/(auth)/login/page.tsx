'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Zap, Lock, User, ArrowRight, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function generateTicks(count: number, outerR: number, innerR: number, cx = 400, cy = 400) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i * 360) / count
    const o = polarToCartesian(cx, cy, outerR, angle)
    const inn = polarToCartesian(cx, cy, innerR, angle)
    return { x1: o.x, y1: o.y, x2: inn.x, y2: inn.y }
  })
}

function generateDots(count: number, r: number, cx = 400, cy = 400) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i * 360) / count
    return polarToCartesian(cx, cy, r, angle)
  })
}

// ─── Mechanical Dial ──────────────────────────────────────────────────────────

function MechanicalDial() {
  const majorTicks = generateTicks(36, 375, 360)
  const minorTicks = generateTicks(180, 375, 368)
  const orbitDots8 = generateDots(8, 245)
  const orbitDots12 = generateDots(12, 308)

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <svg
        viewBox="0 0 800 800"
        className="absolute w-full max-w-[900px] opacity-70"
        style={{ maxHeight: '900px' }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="glow-teal" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-blue" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="glow-soft" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="10" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="center-radial" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(15,76,92,0.25)" />
            <stop offset="60%" stopColor="rgba(15,76,92,0.06)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="outer-fade" cx="50%" cy="50%" r="50%">
            <stop offset="40%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(2,10,14,0.8)" />
          </radialGradient>
        </defs>

        {/* Background radial glow */}
        <circle cx="400" cy="400" r="390" fill="url(#center-radial)" />

        {/* ── Ring 1: Outer measurement ring (slow CW) ── */}
        <motion.g
          style={{ originX: '400px', originY: '400px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
        >
          <circle cx="400" cy="400" r="378" fill="none" stroke="rgba(15,76,92,0.18)" strokeWidth="0.5" />
          {majorTicks.map((t, i) => (
            <line
              key={`maj-${i}`}
              x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={i % 3 === 0 ? 'rgba(15,76,92,0.55)' : 'rgba(15,76,92,0.28)'}
              strokeWidth={i % 3 === 0 ? '1.5' : '0.8'}
            />
          ))}
          {minorTicks.map((t, i) => (
            <line key={`min-${i}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke="rgba(15,76,92,0.15)" strokeWidth="0.5" />
          ))}
        </motion.g>

        {/* ── Ring 2: Dashed outer ring (slow CCW) ── */}
        <motion.g
          style={{ originX: '400px', originY: '400px' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 80, repeat: Infinity, ease: 'linear' }}
        >
          <circle cx="400" cy="400" r="338" fill="none"
            stroke="rgba(15,76,92,0.5)" strokeWidth="1"
            strokeDasharray="18 6" />
          <circle cx="400" cy="400" r="325" fill="none"
            stroke="rgba(15,76,92,0.2)" strokeWidth="0.5"
            strokeDasharray="4 12" />
        </motion.g>

        {/* ── Ring 3: Orange accent arc (medium CW) ── */}
        <motion.g
          style={{ originX: '400px', originY: '400px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 55, repeat: Infinity, ease: 'linear' }}
          filter="url(#glow-teal)"
        >
          <circle cx="400" cy="400" r="308" fill="none"
            stroke="rgba(0,0,180,0.28)" strokeWidth="1.5"
            strokeDasharray="70 14" />
          {/* 12-dot orbit */}
          {orbitDots12.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={i % 3 === 0 ? 3 : 1.5}
              fill={i % 3 === 0 ? 'rgba(0,0,180,0.65)' : 'rgba(0,0,180,0.30)'} />
          ))}
        </motion.g>

        {/* ── Ring 4: Main structural ring (medium CCW) ── */}
        <motion.g
          style={{ originX: '400px', originY: '400px' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        >
          <circle cx="400" cy="400" r="270" fill="none"
            stroke="rgba(15,76,92,0.65)" strokeWidth="1.5"
            strokeDasharray="3 8" />
          <circle cx="400" cy="400" r="264" fill="none"
            stroke="rgba(15,76,92,0.2)" strokeWidth="0.5" />
        </motion.g>

        {/* ── Ring 5: Inner glow ring + 8-dot orbit (fast CW) ── */}
        <motion.g
          style={{ originX: '400px', originY: '400px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
          filter="url(#glow-teal)"
        >
          <circle cx="400" cy="400" r="245" fill="none"
            stroke="rgba(15,76,92,0.4)" strokeWidth="1" />
          {orbitDots8.map((d, i) => (
            <circle key={i} cx={d.x} cy={d.y} r={i % 2 === 0 ? 4 : 2.5}
              fill={i % 2 === 0 ? 'rgba(15,76,92,0.9)' : 'rgba(15,76,92,0.5)'}
            />
          ))}
        </motion.g>

        {/* ── Ring 6: Innermost precision ring (faster CCW) ── */}
        <motion.g
          style={{ originX: '400px', originY: '400px' }}
          animate={{ rotate: -360 }}
          transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        >
          <circle cx="400" cy="400" r="195" fill="none"
            stroke="rgba(0,0,180,0.35)" strokeWidth="2"
            strokeDasharray="40 8" />
        </motion.g>

        {/* ── Static crosshair ── */}
        <g opacity="0.25">
          <line x1="400" y1="100" x2="400" y2="700" stroke="rgba(15,76,92,1)" strokeWidth="0.5" strokeDasharray="2 6" />
          <line x1="100" y1="400" x2="700" y2="400" stroke="rgba(15,76,92,1)" strokeWidth="0.5" strokeDasharray="2 6" />
          <circle cx="400" cy="400" r="160" fill="none" stroke="rgba(15,76,92,0.3)" strokeWidth="0.5" />
        </g>

        {/* ── Sweeping scan arc (pulsing) ── */}
        <motion.g
          style={{ originX: '400px', originY: '400px' }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          filter="url(#glow-teal)"
        >
          <path
            d="M400,400 L400,205"
            stroke="rgba(0,0,180,0.55)" strokeWidth="1"
          />
          <path
            d={`M400,400 Q${400 + 195 * Math.cos(-70 * Math.PI / 180)},${400 + 195 * Math.sin(-70 * Math.PI / 180)} 400,205`}
            fill="rgba(0,0,180,0.05)" stroke="none"
          />
        </motion.g>

        {/* ── Center elements (pulsing) ── */}
        <motion.g
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          filter="url(#glow-blue)"
        >
          <circle cx="400" cy="400" r="6" fill="rgba(0,0,200,0.95)" />
        </motion.g>
        <circle cx="400" cy="400" r="14" fill="none" stroke="rgba(0,0,200,0.40)" strokeWidth="1" />
        <circle cx="400" cy="400" r="22" fill="none" stroke="rgba(15,76,92,0.4)" strokeWidth="0.5" />

        {/* Outer vignette */}
        <circle cx="400" cy="400" r="390" fill="url(#outer-fade)" />
      </svg>
    </div>
  )
}

// ─── Hex Grid Background ──────────────────────────────────────────────────────

function HexGrid() {
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]"
      xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="hexpattern" x="0" y="0" width="56" height="48" patternUnits="userSpaceOnUse">
          <polygon points="28,2 54,14 54,34 28,46 2,34 2,14"
            fill="none" stroke="rgba(15,76,92,1)" strokeWidth="0.8" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#hexpattern)" />
    </svg>
  )
}

// ─── Corner Brackets ──────────────────────────────────────────────────────────

function CornerBracket({ pos }: { pos: 'tl' | 'tr' | 'bl' | 'br' }) {
  const size = 18
  const d = {
    tl: `M${size},0 L0,0 L0,${size}`,
    tr: `M0,0 L${size},0 L${size},${size}`,
    bl: `M0,0 L0,${size} L${size},${size}`,
    br: `M0,${size} L${size},${size} L${size},0`,
  }[pos]

  const posClass = {
    tl: '-top-px -left-px',
    tr: '-top-px -right-px',
    bl: '-bottom-px -left-px',
    br: '-bottom-px -right-px',
  }[pos]

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      className={cn('absolute', posClass)}>
      <path d={d} fill="none" stroke="rgba(0,0,180,0.80)" strokeWidth="1.5" />
    </svg>
  )
}

// ─── Floating particles ───────────────────────────────────────────────────────

interface Particle {
  id: number
  x: number
  y: number
  size: number
  duration: number
  delay: number
}

function Particles() {
  const [particles, setParticles] = useState<Particle[]>([])

  useEffect(() => {
    setParticles(
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        duration: Math.random() * 20 + 15,
        delay: Math.random() * -20,
      }))
    )
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/20"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          animate={{
            y: [0, -60, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

// ─── Login Page ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loadingText, setLoadingText] = useState('Autenticando')
  const [systemTime, setSystemTime] = useState('')

  useEffect(() => {
    const tick = () =>
      setSystemTime(
        new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!isLoading) return
    const texts = ['Autenticando', 'Verificando credenciais', 'Carregando sistema']
    let i = 0
    const id = setInterval(() => {
      i = (i + 1) % texts.length
      setLoadingText(texts[i])
    }, 500)
    return () => clearInterval(id)
  }, [isLoading])

  useEffect(() => {
    if (isAuthenticated) router.replace('/dashboard')
  }, [isAuthenticated, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoginError('')
    setIsLoading(true)
    await new Promise((r) => setTimeout(r, 1500))
    const result = await login({ email: username, password })
    if (result.success) {
      router.replace('/dashboard')
    } else {
      setIsLoading(false)
      setLoginError(result.error ?? 'Credenciais inválidas')
    }
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden flex items-center justify-center"
      style={{
        background:
          'radial-gradient(ellipse at 40% 50%, rgba(15,76,92,0.28) 0%, transparent 65%), radial-gradient(ellipse at 65% 30%, rgba(0,0,128,0.08) 0%, transparent 50%), linear-gradient(160deg, #020c12 0%, #04121a 40%, #020c12 100%)',
      }}
    >
      {/* Hex grid */}
      <HexGrid />

      {/* Particles */}
      <Particles />

      {/* Mechanical dial — left-center */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:left-[38%]"
        style={{ width: 'min(90vw, 820px)', height: 'min(90vw, 820px)' }}
      >
        <MechanicalDial />
      </div>

      {/* ── Page content ── */}
      <div className="relative z-10 flex w-full max-w-6xl items-center justify-center gap-20 px-6 py-12 lg:justify-between lg:px-16">

        {/* ── Left branding ── */}
        <motion.div
          className="hidden lg:flex flex-col max-w-sm"
          initial={{ opacity: 0, x: -32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        >
          {/* Badge */}
          <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-sm">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
            <span className="text-xs font-medium tracking-widest text-white/50 uppercase">
              Sistema Online
            </span>
          </div>

          <h1 className="text-5xl font-bold leading-[1.08] tracking-tight">
            <span className="text-white">Sistema</span>
            <br />
            <span
              style={{
                background: 'linear-gradient(135deg, #000080 0%, #1a1ab3 50%, #000080 100%)',
                backgroundSize: '200% auto',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Industrial
            </span>
          </h1>

          <p className="mt-4 text-base leading-relaxed text-white/45">
            Gestão Inteligente de Produção. Controle total sobre suas
            operações industriais em tempo real.
          </p>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-3 gap-4">
            {[
              { value: '6', label: 'Máquinas' },
              { value: '247', label: 'Programas' },
              { value: '99.4%', label: 'Uptime' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-center backdrop-blur-sm"
              >
                <p
                  className="text-xl font-bold"
                  style={{
                    background: 'linear-gradient(135deg, #0f4c5c, #1a7a94)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: 'brightness(1.8)',
                  }}
                >
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[10px] text-white/35 uppercase tracking-wider">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Powered by */}
          <div className="mt-10 flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#000080]">
              <Zap size={13} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-bold tracking-wide text-white/80">Esync</span>
            <span className="text-xs text-white/25">Sistema Mecânico v1.0</span>
          </div>
        </motion.div>

        {/* ── Login Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="relative w-full max-w-[400px] flex-shrink-0"
        >
          {/* Corner brackets */}
          <CornerBracket pos="tl" />
          <CornerBracket pos="tr" />
          <CornerBracket pos="bl" />
          <CornerBracket pos="br" />

          {/* Top accent line */}
          <div
            className="absolute -top-px left-8 right-8 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(0,0,180,0.55), transparent)' }}
          />

          {/* Card body */}
          <div
            className="rounded-2xl p-8"
            style={{
              background: 'rgba(4, 18, 26, 0.75)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(15,76,92,0.25)',
              boxShadow: '0 0 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {/* Header */}
            <div className="mb-8 flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 260, damping: 20 }}
                className="relative mb-5"
              >
                {/* Logo glow */}
                <div
                  className="absolute inset-0 rounded-xl blur-xl"
                  style={{ background: 'rgba(0,0,128,0.35)', transform: 'scale(1.4)' }}
                />
                <div
                  className="relative flex h-14 w-14 items-center justify-center rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, #000080, #000060)',
                    boxShadow: '0 4px 20px rgba(0,0,128,0.45)',
                  }}
                >
                  <Zap size={24} className="text-white" strokeWidth={2.5} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Sistema Industrial
                </h2>
                <p className="mt-1 text-sm text-white/40">
                  Gestão Inteligente de Produção
                </p>
              </motion.div>
            </div>

            {/* Divider */}
            <div
              className="mb-7 h-px w-full"
              style={{
                background:
                  'linear-gradient(90deg, transparent, rgba(15,76,92,0.5), rgba(0,0,180,0.20), transparent)',
              }}
            />

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 }}
                className="group"
              >
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-white/35">
                  Usuário
                </label>
                <div className="relative">
                  <User
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 transition-colors group-focus-within:text-[#4466cc]"
                  />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="seu.usuario"
                    autoComplete="username"
                    required
                    className={cn(
                      'w-full rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder-white/20 outline-none',
                      'transition-all duration-200',
                      'bg-white/[0.05] border border-white/[0.08]',
                      'focus:border-[#000080]/50 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(0,0,128,0.12)]',
                    )}
                  />
                </div>
              </motion.div>

              {/* Password */}
              <motion.div
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="group"
              >
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-white/35">
                  Senha
                </label>
                <div className="relative">
                  <Lock
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/25 transition-colors group-focus-within:text-[#4466cc]"
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    autoComplete="current-password"
                    required
                    className={cn(
                      'w-full rounded-xl py-3 pl-10 pr-11 text-sm text-white placeholder-white/20 outline-none',
                      'transition-all duration-200',
                      'bg-white/[0.05] border border-white/[0.08]',
                      'focus:border-[#000080]/50 focus:bg-white/[0.08] focus:shadow-[0_0_0_3px_rgba(0,0,128,0.12)]',
                    )}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/25 transition-colors hover:text-white/60"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </motion.div>

              {/* Error message */}
              {loginError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400 text-center"
                >
                  {loginError}
                </motion.p>
              )}

              {/* Submit */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="pt-2"
              >
                <motion.button
                  type="submit"
                  disabled={isLoading}
                  whileHover={{ scale: isLoading ? 1 : 1.02 }}
                  whileTap={{ scale: isLoading ? 1 : 0.98 }}
                  className={cn(
                    'relative w-full overflow-hidden rounded-xl py-3.5 text-sm font-bold tracking-wide text-white transition-all duration-300',
                    'disabled:cursor-not-allowed',
                  )}
                  style={{
                    background: isLoading
                      ? 'rgba(0,0,128,0.5)'
                      : 'linear-gradient(135deg, #000080 0%, #000060 100%)',
                    boxShadow: isLoading ? 'none' : '0 4px 24px rgba(0,0,128,0.45)',
                  }}
                >
                  {/* Shimmer on hover */}
                  {!isLoading && (
                    <motion.div
                      className="absolute inset-0 -translate-x-full skew-x-12 bg-white/20"
                      whileHover={{ translateX: '200%' }}
                      transition={{ duration: 0.5 }}
                    />
                  )}

                  <AnimatePresence mode="wait">
                    {isLoading ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center gap-3"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
                          className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                        />
                        <span className="text-xs tracking-widest text-white/80">
                          {loadingText}...
                        </span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center justify-center gap-2"
                      >
                        <span>Entrar</span>
                        <ArrowRight size={15} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>
            </form>

            {/* Footer note */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="mt-6 flex items-center justify-center gap-2 text-center"
            >
              <Shield size={11} className="text-white/20" />
              <p className="text-[11px] text-white/25">
                Acesso restrito a usuários autorizados
              </p>
            </motion.div>
          </div>

          {/* Bottom accent line */}
          <div
            className="absolute -bottom-px left-12 right-12 h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(15,76,92,0.4), transparent)' }}
          />
        </motion.div>
      </div>

      {/* ── HUD — bottom bar ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="absolute bottom-0 left-0 right-0 flex items-center justify-between border-t border-white/[0.04] px-8 py-3"
      >
        <div className="flex items-center gap-4 text-[10px] text-white/20 font-mono tracking-wider uppercase">
          <span>Esync v1.0.0</span>
          <span className="text-white/10">|</span>
          <span>Sistema Mecânico de Gestão</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-white/20 font-mono tracking-wider">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500/70" />
            ONLINE
          </span>
          <span className="text-white/10">|</span>
          <span>{systemTime}</span>
        </div>
      </motion.div>
    </div>
  )
}
