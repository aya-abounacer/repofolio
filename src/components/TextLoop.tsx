import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import './TextLoop.css'

const VIEW_W = 3200
const VIEW_H = 240
const CX = VIEW_W / 2
const CY = VIEW_H / 2

function buildWavePath(curviness: number) {
  const amplitude = Math.min(Math.max(curviness, 0) * 2.2, 280)
  return `M -400 ${CY} Q -200 ${CY - amplitude} 0 ${CY} T 640 ${CY} T 1280 ${CY} T 1920 ${CY} T 2560 ${CY} T ${VIEW_W + 400} ${CY}`
}

type TextLoopProps = {
  text: string
  separator?: string
  speed?: number
  curviness?: number
  fontSize?: number
  fontWeight?: number
  letterSpacing?: number
  color?: string
  ribbonColor?: string
  ribbonWidth?: number
  mobileSpeed?: number
  mobileFontSize?: number
  pauseOnHover?: boolean
}

export default function TextLoop({
  text,
  separator = '✦',
  speed = 90,
  curviness = 38,
  fontSize = 34,
  fontWeight = 700,
  letterSpacing = 2,
  color = '#d7eaff',
  ribbonColor = '#14263a',
  ribbonWidth = 76,
  mobileSpeed,
  mobileFontSize,
  pauseOnHover = true,
}: TextLoopProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const measureRef = useRef<SVGTextElement>(null)
  const headRef = useRef<SVGTextPathElement>(null)
  const [metrics, setMetrics] = useState({ length: 0, unitWidth: 0, reps: 1 })
  const [effectiveSpeed, setEffectiveSpeed] = useState(speed)
  const [effectiveFontSize, setEffectiveFontSize] = useState(fontSize)
  const rawId = useId()
  const pathId = `audience-loop-${rawId.replace(/:/g, '')}`

  const path = useMemo(() => buildWavePath(curviness), [curviness])
  const unit = useMemo(() => `${text.toUpperCase()}\u00A0${separator}\u00A0`, [text, separator])
  const textStyle = useMemo(() => ({ fontSize: `${effectiveFontSize}px`, fontWeight, letterSpacing: `${letterSpacing}px` }), [effectiveFontSize, fontWeight, letterSpacing])

  useLayoutEffect(() => {
    const pathElement = pathRef.current
    const measureElement = measureRef.current
    if (!pathElement || !measureElement) return undefined

    let cancelled = false
    const measure = () => {
      if (cancelled) return
      const length = pathElement.getTotalLength()
      const unitWidth = measureElement.getComputedTextLength()
      if (length) setMetrics({ length, unitWidth, reps: unitWidth ? Math.ceil(length / unitWidth) + 8 : 9 })
    }

    measure()
    void document.fonts?.ready.then(measure).catch(() => undefined)
    return () => { cancelled = true }
  }, [path, unit, effectiveFontSize, fontWeight, letterSpacing])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 640px)')
    const updateResponsiveValues = () => {
      setEffectiveSpeed(mediaQuery.matches && mobileSpeed !== undefined ? mobileSpeed : speed)
      setEffectiveFontSize(mediaQuery.matches && mobileFontSize !== undefined ? mobileFontSize : fontSize)
    }
    updateResponsiveValues()
    mediaQuery.addEventListener('change', updateResponsiveValues)
    return () => mediaQuery.removeEventListener('change', updateResponsiveValues)
  }, [fontSize, mobileFontSize, mobileSpeed, speed])

  useEffect(() => {
    const length = metrics.length
    const head = headRef.current
    if (!length || !head || !metrics.unitWidth) return undefined

    const applyOffset = (offset: number) => {
      head.setAttribute('startOffset', String(offset))
    }
    applyOffset(0)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || effectiveSpeed <= 0) return undefined

    const state = { offset: 0 }
    const tween = gsap.to(state, {
      offset: -metrics.unitWidth,
      duration: metrics.unitWidth / effectiveSpeed,
      ease: 'none',
      repeat: -1,
      onUpdate: () => applyOffset(state.offset),
    })
    const root = rootRef.current
    const pause = () => tween.pause()
    const resume = () => tween.resume()
    if (pauseOnHover && root) {
      root.addEventListener('pointerenter', pause)
      root.addEventListener('pointerleave', resume)
    }

    return () => {
      tween.kill()
      if (pauseOnHover && root) {
        root.removeEventListener('pointerenter', pause)
        root.removeEventListener('pointerleave', resume)
      }
    }
  }, [metrics, effectiveSpeed, pauseOnHover])

  const loopText = unit.repeat(metrics.reps)

  return (
    <div ref={rootRef} className="text-loop" role="img" aria-label={text}>
      <svg className="text-loop-svg" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path ref={pathRef} id={pathId} d={path} fill="none" stroke={ribbonColor} strokeWidth={ribbonWidth} strokeLinecap="round" />
        <text ref={measureRef} className="text-loop-measure" style={textStyle}>{unit}</text>
        <text className="text-loop-text" style={textStyle} fill={color} dominantBaseline="central">
          <textPath ref={headRef} href={`#${pathId}`} startOffset={0}>{loopText}</textPath>
        </text>
      </svg>
    </div>
  )
}
