import { useEffect, useRef } from 'react'
import './text-animator.css'

type TextAnimatorProps = {
  samples: string[]
  className?: string
  titleClassName?: string
  enterDuration?: number
  exitDuration?: number
  stagger?: number
  holdMs?: number
  gapMs?: number
}

function splitWords(text: string) {
  return text.split(/(\s+)/).filter(Boolean)
}

export default function TextAnimator({
  samples,
  className = '',
  titleClassName = '',
  enterDuration = 700,
  exitDuration = 500,
  stagger = 70,
  holdMs = 2200,
  gapMs = 70,
}: TextAnimatorProps) {
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || samples.length === 0) return

    let cancelled = false
    let timer: number | undefined
    let currentIndex = 0
    let currentTitle: HTMLHeadingElement | undefined

    const animate = (element: HTMLElement, keyframes: Keyframe[], duration: number, delay = 0) => {
      const animation = element.animate(keyframes, {
        duration,
        delay,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
        fill: 'forwards',
      })
      return animation.finished.catch(() => undefined)
    }

    const makeTitle = (text: string) => {
      const title = document.createElement('h2')
      title.className = `text-animation-title ${titleClassName}`.trim()
      splitWords(text).forEach((part) => {
        const unit = document.createElement('span')
        unit.className = `text-animation-unit${/^\s+$/.test(part) ? ' whitespace' : ''}`
        unit.textContent = part
        title.appendChild(unit)
      })
      return title
    }

    const showNext = async () => {
      if (cancelled) return
      if (currentTitle) {
        const oldUnits = Array.from(currentTitle.querySelectorAll<HTMLElement>('.text-animation-unit:not(.whitespace)'))
        await Promise.all(oldUnits.map((unit, index) => animate(
          unit,
          [{ opacity: 1, transform: 'translate3d(0, 0, 0)' }, { opacity: 0, transform: 'translate3d(0, -6px, 0)' }],
          exitDuration,
          index * 40,
        )))
        currentTitle.remove()
        currentTitle = undefined
        if (gapMs > 0) {
          await new Promise<void>((resolve) => {
            timer = window.setTimeout(resolve, gapMs)
          })
          if (cancelled) return
        }
      }

      const nextTitle = makeTitle(samples[currentIndex])
      const units = Array.from(nextTitle.querySelectorAll<HTMLElement>('.text-animation-unit:not(.whitespace)'))
      nextTitle.style.opacity = '1'
      stage.appendChild(nextTitle)

      await Promise.all(units.map((unit, index) => animate(
        unit,
        [{ opacity: 0, transform: 'translate3d(0, 8px, 0)' }, { opacity: 1, transform: 'translate3d(0, 0, 0)' }],
        enterDuration,
        index * stagger,
      )))
      if (cancelled) return

      currentTitle = nextTitle
      currentIndex = (currentIndex + 1) % samples.length
      if (samples.length > 1) {
        timer = window.setTimeout(() => void showNext(), holdMs)
      }
    }

    void showNext()

    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
      stage.replaceChildren()
    }
  }, [samples, titleClassName, enterDuration, exitDuration, stagger, holdMs, gapMs])

  return <div ref={stageRef} className={`text-animation-stage ${className}`.trim()} aria-hidden="true" />
}
