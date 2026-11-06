import * as React from 'react'

export interface Floating3DParticlesProps extends Omit<React.CanvasHTMLAttributes<HTMLCanvasElement>, 'width' | 'height'> {
  quantity?: number
  color?: string
  size?: number
  opacity?: number
  drift?: number
  depth?: number
}

interface Particle {
  angle: number
  radius: number
  y: number
  size: number
  angularSpeed: number
  opacity: number
  screenX: number
  screenY: number
  projectedScale: number
}

const MOBILE_BREAKPOINT = 768
const SPREAD_FACTOR = 1.2
const MAX_DPR = 2

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace('#', '').trim()
  const full = clean.length === 3 ? clean.split('').map(character => character + character).join('') : clean
  if (!/^[0-9a-f]{6}$/i.test(full)) return `rgba(124,221,91,${alpha})`
  const value = Number.parseInt(full, 16)
  return `rgba(${(value >> 16) & 0xff},${(value >> 8) & 0xff},${value & 0xff},${alpha})`
}

function deriveProjection(depth: number) {
  const value = Math.max(0, Math.min(1, depth))
  const fov = 800 - value * 600
  const perspectiveDistance = 100 + value * 700
  const depthRange = value * Math.min(400, fov + perspectiveDistance - 1)
  return { fov, perspectiveDistance, depthRange }
}

function spawnParticle(width: number, height: number, size: number, opacity: number): Particle {
  const sizeVariance = size * .4
  const opacityVariance = .2
  return {
    angle: Math.random() * Math.PI * 2,
    radius: Math.random() * Math.max(width, height) * SPREAD_FACTOR,
    y: (Math.random() - .5) * height * 2,
    size: Math.max(.5, size - sizeVariance + Math.random() * sizeVariance * 2),
    angularSpeed: .0015 + Math.random() * .001,
    opacity: Math.min(1, Math.max(0, opacity - opacityVariance + Math.random() * opacityVariance * 2)),
    screenX: 0,
    screenY: 0,
    projectedScale: 1,
  }
}

export function Floating3DParticles({
  quantity = 400,
  color = '#8B5CF6',
  size = 5,
  opacity = .3,
  drift = .8,
  depth = .5,
  className,
  style,
  ...canvasProps
}: Floating3DParticlesProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const observerRef = React.useRef<IntersectionObserver | null>(null)
  const stateRef = React.useRef({ mounted: false, paused: false, reducedMotion: false, frame: null as number | null })
  const colorRef = React.useRef(color)
  colorRef.current = color

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return

    const state = stateRef.current
    state.mounted = true
    state.paused = false
    let width = 0
    let height = 0
    let particles: Particle[] = []
    let staticDirty = true
    const { fov, perspectiveDistance, depthRange } = deriveProjection(depth)
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotionPreference = () => { state.reducedMotion = motionPreference.matches }
    syncMotionPreference()

    const draw = (particle: Particle) => {
      const radius = Math.max(0, particle.size * particle.projectedScale)
      if (radius <= 0) return
      context.beginPath()
      context.fillStyle = hexToRgba(colorRef.current, particle.opacity)
      context.arc(particle.screenX, particle.screenY, radius, 0, Math.PI * 2)
      context.fill()
    }

    const drawStaticFrame = () => {
      context.clearRect(0, 0, width, height)
      const centerX = width / 2
      const centerY = height / 2
      for (const particle of particles) {
        const scale = fov / Math.max(1, fov + perspectiveDistance)
        particle.screenX = centerX + Math.cos(particle.angle) * particle.radius * scale
        particle.screenY = centerY + particle.y * scale
        particle.projectedScale = scale
        draw(particle)
      }
    }

    const tick = () => {
      if (!state.mounted) return
      if (!state.paused) {
        if (state.reducedMotion) {
          if (staticDirty) {
            staticDirty = false
            drawStaticFrame()
          }
        } else {
          staticDirty = true
          context.clearRect(0, 0, width, height)
          const centerX = width / 2
          const centerY = height / 2

          for (const particle of particles) {
            particle.angle += particle.angularSpeed
            particle.y -= drift
            if (particle.y < -height) {
              particle.y = height
              particle.radius = Math.random() * Math.max(width, height) * SPREAD_FACTOR
            } else if (particle.y > height) {
              particle.y = -height
              particle.radius = Math.random() * Math.max(width, height) * SPREAD_FACTOR
            }
            const denominator = Math.max(1, fov + perspectiveDistance + Math.sin(particle.angle) * depthRange)
            const scale = fov / denominator
            particle.screenX = centerX + Math.cos(particle.angle) * particle.radius * scale
            particle.screenY = centerY + particle.y * scale
            particle.projectedScale = scale
          }

          particles.sort((first, second) => first.projectedScale - second.projectedScale)
          particles.forEach(draw)
        }
      }
      state.frame = window.requestAnimationFrame(tick)
    }

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      width = Math.max(1, Math.round(bounds.width))
      height = Math.max(1, Math.round(bounds.height))
      const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, MAX_DPR))
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      const count = window.innerWidth < MOBILE_BREAKPOINT ? Math.round(quantity * .2) : quantity
      particles = Array.from({ length: Math.max(0, count) }, () => spawnParticle(width, height, size, opacity))
      staticDirty = true
    }

    const syncVisibility = () => { state.paused = document.hidden }
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    if (resizeObserver) resizeObserver.observe(canvas)
    else window.addEventListener('resize', resize)

    if (typeof IntersectionObserver !== 'undefined') {
      observerRef.current = new IntersectionObserver(([entry]) => {
        if (entry) state.paused = document.hidden || !entry.isIntersecting
      })
      observerRef.current.observe(canvas)
    }

    document.addEventListener('visibilitychange', syncVisibility)
    motionPreference.addEventListener('change', syncMotionPreference)
    resize()
    state.frame = window.requestAnimationFrame(tick)

    return () => {
      state.mounted = false
      if (state.frame !== null) window.cancelAnimationFrame(state.frame)
      state.frame = null
      resizeObserver?.disconnect()
      if (!resizeObserver) window.removeEventListener('resize', resize)
      observerRef.current?.disconnect()
      observerRef.current = null
      document.removeEventListener('visibilitychange', syncVisibility)
      motionPreference.removeEventListener('change', syncMotionPreference)
    }
  }, [depth, drift, opacity, quantity, size])

  return <canvas
    ref={canvasRef}
    aria-hidden="true"
    className={`floating-3d-particles${className ? ` ${className}` : ''}`}
    style={style}
    {...canvasProps}
  />
}
