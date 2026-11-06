import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type Matter from 'matter-js'
import './folder-float.css'

type FolderItem = string | { label: string; value: string }

interface FolderFloatProps {
  items: FolderItem[]
  label?: string
  sublabel?: string
  trigger?: 'hover' | 'click'
  defaultOpen?: boolean
  closeOnSelect?: boolean
  physics?: boolean
  drift?: number
  onSelect?: (value: string, index: number) => void
  onOpenChange?: (open: boolean) => void
  folderColor?: string
  frontColor?: string
  paperColor?: string
  itemColor?: string
  itemTextColor?: string
  labelColor?: string
  width?: number
  height?: number
  radius?: number
  spread?: number
  lift?: number
  tilt?: number
  flapAngle?: number
  restAngle?: number
  openDuration?: number
  stagger?: number
  bounce?: number
  className?: string
}

interface ItemSize { w: number; h: number }
interface ItemPosition { x: number; y: number; r: number }
interface DragState { i: number; id: number; dx: number; dy: number; sx: number; sy: number; moved: boolean }
interface Zone { left: number; right: number; top: number; bottom: number }
type FolderStyle = CSSProperties & Record<`--${string}`, string | number>
interface MatterRuntime {
  applyForce: (body: Matter.Body, position: Matter.Vector, force: Matter.Vector) => void
  setVelocity: (body: Matter.Body, velocity: Matter.Vector) => void
  setPosition: (body: Matter.Body, position: Matter.Vector) => void
  update: (engine: Matter.Engine, delta: number) => void
}

const PAD = 34
const CHAR = 7.1
const GAP = 10
const ROW = 48
const DRAG_MIN = 4
const ZONE_PAD = 8

const jitter = (index: number) => {
  const value = Math.sin(index * 12.9898 + 4.1414) * 43758.5453
  return value - Math.floor(value)
}

function buildLayout(list: { label: string; value: string }[], spread: number, lift: number, tilt: number, sizes: ItemSize[]) {
  const rows: { items: { i: number; width: number }[]; width: number }[] = []
  let row: { i: number; width: number }[] = []
  let rowWidth = 0

  list.forEach((item, index) => {
    const width = sizes[index]?.w ?? PAD + item.label.length * CHAR
    if (row.length && rowWidth + GAP + width > spread * 2) {
      rows.push({ items: row, width: rowWidth })
      row = []
      rowWidth = 0
    }
    row.push({ i: index, width })
    rowWidth += (row.length > 1 ? GAP : 0) + width
  })
  if (row.length) rows.push({ items: row, width: rowWidth })

  const positions: ItemPosition[] = []
  rows.forEach((currentRow, rowIndex) => {
    let x = -currentRow.width / 2
    const shift = (rowIndex % 2 ? 1 : -1) * Math.min(14, spread * .08)
    currentRow.items.forEach(({ i, width }) => {
      const variation = jitter(i)
      positions[i] = {
        x: x + width / 2 + shift + (variation - .5) * 5,
        y: -lift - rowIndex * ROW - variation * 5,
        r: tilt * (variation * 2 - 1),
      }
      x += width + GAP
    })
  })
  return positions
}

export function FolderFloat({
  items,
  label = 'skills/',
  sublabel = '',
  trigger = 'click',
  defaultOpen = false,
  closeOnSelect = false,
  physics = true,
  drift = .42,
  onSelect,
  onOpenChange,
  folderColor = '#202a35',
  frontColor = '#273442',
  paperColor = '#edf1f5',
  itemColor = '#edf1f5',
  itemTextColor = '#17202a',
  labelColor = '#edf1f5',
  width = 210,
  height = 142,
  radius = 3,
  spread = 170,
  lift = 30,
  tilt = 5,
  flapAngle = 31,
  restAngle = 13,
  openDuration = 520,
  stagger = 42,
  bounce = .24,
  className = '',
}: FolderFloatProps) {
  const [open, setOpen] = useState(defaultOpen)
  const [popped, setPopped] = useState(-1)
  const [live, setLive] = useState(false)
  const [inViewport, setInViewport] = useState(false)
  const [sizes, setSizes] = useState<ItemSize[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const pillRefs = useRef<Array<HTMLButtonElement | null>>([])
  const popTimer = useRef<number | undefined>(undefined)
  const liveTimer = useRef<number | undefined>(undefined)
  const world = useRef<{
    engine: Matter.Engine | null
    bodies: Matter.Body[]
    sizes: ItemSize[]
    frame: number
    last: number
    startedAt: number
    drag: DragState | null
    zone: Zone | null
    live: boolean
    generation: number
    runtime: MatterRuntime | null
    destroyEngine: (() => void) | null
  }>({ engine: null, bodies: [], sizes: [], frame: 0, last: 0, startedAt: 0, drag: null, zone: null, live: false, generation: 0, runtime: null, destroyEngine: null })
  const latest = useRef({ onSelect, onOpenChange, drift, reduce: false })
  latest.current = { ...latest.current, onSelect, onOpenChange, drift }

  const list = items.map(item => typeof item === 'string' ? { label: item, value: item } : item)
  const count = list.length
  const subtitle = sublabel || `${count} ${count === 1 ? 'capability' : 'capabilities'}`
  const positions = buildLayout(list, spread, lift, tilt, sizes)
  const labelsKey = list.map(item => item.label).join('|')
  const positionsKey = positions.map(position => `${position.x},${position.y}`).join('|')

  useLayoutEffect(() => {
    const measure = () => {
      const next = pillRefs.current.slice(0, count).map(element => element ? { w: element.offsetWidth, h: element.offsetHeight } : null)
      if (next.some(size => !size)) return
      const measured = next as ItemSize[]
      setSizes(previous => previous.length === measured.length && previous.every((size, index) => size.w === measured[index].w && size.h === measured[index].h) ? previous : measured)
    }
    measure()
    void document.fonts?.ready.then(measure)
  }, [count, labelsKey])

  const stopPhysics = useCallback(() => {
    const current = world.current
    current.generation += 1
    window.clearTimeout(liveTimer.current)
    window.cancelAnimationFrame(current.frame)
    current.frame = 0
    if (current.engine) {
      current.bodies.forEach((body, index) => {
        const element = pillRefs.current[index]
        const size = current.sizes[index]
        if (!element || !size) return
        element.style.setProperty('--x', `${body.position.x.toFixed(1)}px`)
        element.style.setProperty('--y', `${(body.position.y - size.h / 2).toFixed(1)}px`)
      })
      current.destroyEngine?.()
      current.engine = null
    }
    current.bodies = []
    current.drag = null
    current.live = false
    current.runtime = null
    current.destroyEngine = null
    setLive(false)
  }, [])

  const startPhysics = useCallback(async () => {
    const current = world.current
    if (current.engine || !count) return
    const elements = pillRefs.current.slice(0, count)
    if (elements.some(element => !element)) return

    const generation = current.generation + 1
    current.generation = generation
    const matterModule = await import('matter-js')
    if (world.current.generation !== generation || world.current.engine) return
    const { Bodies, Body, Composite, Engine } = matterModule.default

    const engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0 } })
    engine.enableSleeping = false
    current.engine = engine
    current.runtime = {
      applyForce: Body.applyForce,
      setVelocity: Body.setVelocity,
      setPosition: Body.setPosition,
      update: Engine.update,
    }
    current.destroyEngine = () => {
      Composite.clear(engine.world, false, true)
      Engine.clear(engine)
    }
    current.sizes = elements.map(element => ({ w: element?.offsetWidth ?? 0, h: element?.offsetHeight ?? 0 }))
    const ys = positions.map(position => position.y)
    const zone: Zone = {
      left: -spread - ZONE_PAD,
      right: spread + ZONE_PAD,
      top: Math.min(...ys) - ZONE_PAD,
      bottom: -lift + Math.max(...current.sizes.map(size => size.h)),
    }
    current.zone = zone
    current.bodies = elements.map((_, index) => {
      const size = current.sizes[index]
      const position = positions[index]
      const body = Bodies.rectangle(position.x, position.y + size.h / 2, size.w, size.h, {
        chamfer: { radius: Math.min(size.h / 2 - 1, 4) },
        restitution: .58,
        friction: 0,
        frictionAir: .075,
        inertia: Infinity,
      })
      body.plugin.phase = jitter(index) * Math.PI * 2
      return body
    })

    const wallSize = 80
    const walls = [
      Bodies.rectangle((zone.left + zone.right) / 2, zone.top - wallSize / 2, zone.right - zone.left + 2 * wallSize, wallSize, { isStatic: true }),
      Bodies.rectangle((zone.left + zone.right) / 2, zone.bottom + wallSize / 2, zone.right - zone.left + 2 * wallSize, wallSize, { isStatic: true }),
      Bodies.rectangle(zone.left - wallSize / 2, (zone.top + zone.bottom) / 2, wallSize, zone.bottom - zone.top + 2 * wallSize, { isStatic: true }),
      Bodies.rectangle(zone.right + wallSize / 2, (zone.top + zone.bottom) / 2, wallSize, zone.bottom - zone.top + 2 * wallSize, { isStatic: true }),
    ]
    Composite.add(engine.world, [...current.bodies, ...walls])
    current.live = true
    current.last = 0
    current.startedAt = performance.now()
    setLive(true)

    const tick = (now: number) => {
      const active = world.current
      if (!active.engine) return
      const delta = active.last ? Math.min(32, now - active.last) : 16
      active.last = now
      const elapsed = (now - active.startedAt) / 1000
      const strength = latest.current.drift * .00005 * Math.min(1, elapsed / 2)
      active.bodies.forEach((body, index) => {
        if (active.drag?.i === index) return
        const phase = Number(body.plugin.phase ?? 0)
        active.runtime?.applyForce(body, body.position, {
          x: Math.sin(elapsed * .9 + phase) * strength * body.mass,
          y: Math.cos(elapsed * 1.3 + phase * 1.7) * strength * body.mass,
        })
      })
      active.runtime?.update(active.engine, delta)
      active.bodies.forEach((body, index) => {
        const element = pillRefs.current[index]
        const size = active.sizes[index]
        if (!element || !size) return
        element.style.setProperty('--x', `${body.position.x.toFixed(1)}px`)
        element.style.setProperty('--y', `${(body.position.y - size.h / 2).toFixed(1)}px`)
      })
      active.frame = window.requestAnimationFrame(tick)
    }
    current.frame = window.requestAnimationFrame(tick)
  }, [count, lift, positionsKey, spread])

  const setFolderOpen = useCallback((next: boolean) => {
    if (!next) stopPhysics()
    setOpen(previous => {
      if (previous === next) return previous
      latest.current.onOpenChange?.(next)
      return next
    })
  }, [stopPhysics])

  useEffect(() => {
    window.clearTimeout(liveTimer.current)
    if (!open || !physics || !inViewport || latest.current.reduce) {
      stopPhysics()
      return
    }
    liveTimer.current = window.setTimeout(startPhysics, openDuration + Math.max(0, count - 1) * stagger + 80)
    return () => window.clearTimeout(liveTimer.current)
  }, [count, inViewport, open, openDuration, physics, stagger, startPhysics, stopPhysics])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => { latest.current.reduce = media.matches }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root || !('IntersectionObserver' in window)) {
      setInViewport(true)
      return
    }
    const observer = new IntersectionObserver(([entry]) => setInViewport(entry.isIntersecting), { rootMargin: '80px' })
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  useEffect(() => () => {
    window.clearTimeout(popTimer.current)
    stopPhysics()
  }, [stopPhysics])

  const selectItem = (item: { label: string; value: string }, index: number) => {
    latest.current.onSelect?.(item.value, index)
    window.clearTimeout(popTimer.current)
    setPopped(index)
    popTimer.current = window.setTimeout(() => setPopped(-1), 320)
    if (closeOnSelect) setFolderOpen(false)
  }

  const pointerAt = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const bounds = anchorRef.current?.getBoundingClientRect()
    return bounds ? { x: event.clientX - bounds.left, y: event.clientY - bounds.top } : { x: 0, y: 0 }
  }
  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>, index: number) => {
    const current = world.current
    if (!current.live || event.button !== 0) return
    const body = current.bodies[index]
    if (!body) return
    const pointer = pointerAt(event)
    current.drag = { i: index, id: event.pointerId, dx: body.position.x - pointer.x, dy: body.position.y - pointer.y, sx: event.clientX, sy: event.clientY, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const drag = (event: ReactPointerEvent<HTMLButtonElement>, index: number) => {
    const current = world.current
    const activeDrag = current.drag
    const zone = current.zone
    if (!activeDrag || !zone || activeDrag.i !== index || activeDrag.id !== event.pointerId) return
    if (!activeDrag.moved && Math.hypot(event.clientX - activeDrag.sx, event.clientY - activeDrag.sy) >= DRAG_MIN) {
      activeDrag.moved = true
      event.currentTarget.setAttribute('data-drag', '')
    }
    if (!activeDrag.moved) return
    const body = current.bodies[index]
    const size = current.sizes[index]
    const pointer = pointerAt(event)
    const x = Math.min(zone.right - size.w / 2, Math.max(zone.left + size.w / 2, pointer.x + activeDrag.dx))
    const y = Math.min(zone.bottom - size.h / 2, Math.max(zone.top + size.h / 2, pointer.y + activeDrag.dy))
    current.runtime?.setVelocity(body, { x: (x - body.position.x) * .6, y: (y - body.position.y) * .6 })
    current.runtime?.setPosition(body, { x, y })
  }
  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>, index: number, item: { label: string; value: string }) => {
    const activeDrag = world.current.drag
    if (!activeDrag || activeDrag.i !== index || activeDrag.id !== event.pointerId) return
    world.current.drag = null
    event.currentTarget.removeAttribute('data-drag')
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (!activeDrag.moved && event.type === 'pointerup') selectItem(item, index)
  }

  const hover = trigger === 'hover'
  const style: FolderStyle = {
    '--ff-w': `${width}px`, '--ff-h': `${height}px`, '--ff-r': `${radius}px`, '--ff-back': folderColor,
    '--ff-front': frontColor, '--ff-paper': paperColor, '--ff-item': itemColor, '--ff-item-ink': itemTextColor,
    '--ff-label': labelColor, '--ff-spread': `${spread}px`, '--ff-lift': `${lift}px`, '--ff-angle': `${flapAngle}deg`,
    '--ff-rest': `${restAngle}deg`, '--ff-open': `${openDuration}ms`, '--ff-close': `${Math.round(openDuration * .6)}ms`,
    '--ff-stagger': `${stagger}ms`, '--ff-n': count, '--ff-spring': `cubic-bezier(.34, ${(1 + bounce * 1.9).toFixed(2)}, .64, 1)`,
  }

  return <div
    ref={rootRef}
    className={`folder-float${className ? ` ${className}` : ''}`}
    data-open={open ? '' : undefined}
    data-live={live ? '' : undefined}
    data-physics={physics ? '' : undefined}
    data-trigger={trigger}
    onPointerEnter={hover ? () => setFolderOpen(true) : undefined}
    onPointerLeave={hover ? () => { if (!world.current.drag) setFolderOpen(false) } : undefined}
    onKeyDown={event => { if (event.key === 'Escape' && open) setFolderOpen(false) }}
    style={style}
  >
    <div ref={anchorRef} className="folder-float__items">
      {list.map((item, index) => {
        const position = positions[index]
        return <button
          key={`${item.value}-${index}`}
          ref={element => { pillRefs.current[index] = element }}
          type="button"
          className="folder-float__item"
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          data-pop={popped === index ? '' : undefined}
          style={{ '--i': index, '--x': `${position.x.toFixed(1)}px`, '--y': `${position.y.toFixed(1)}px`, '--r': `${position.r.toFixed(2)}deg` } as FolderStyle}
          onPointerDown={event => startDrag(event, index)}
          onPointerMove={event => drag(event, index)}
          onPointerUp={event => endDrag(event, index, item)}
          onPointerCancel={event => endDrag(event, index, item)}
          onClick={event => { if (!world.current.live || event.detail === 0) selectItem(item, index) }}
        >
          <span className="folder-float__drift"><i aria-hidden="true" />{item.label}</span>
        </button>
      })}
    </div>
    <div className="folder-float__folder">
      <span className="folder-float__back" aria-hidden="true" />
      <span className="folder-float__paper" aria-hidden="true" />
      <span className="folder-float__front" aria-hidden="true">
        <span className="folder-float__label">{label}</span>
        <span className="folder-float__sub">{subtitle}</span>
      </span>
      <button type="button" className="folder-float__trigger" aria-expanded={open} aria-label={`${label}, ${subtitle}`} onClick={() => setFolderOpen(!open)} />
    </div>
  </div>
}
