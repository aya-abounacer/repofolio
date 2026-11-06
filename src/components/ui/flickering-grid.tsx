import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

interface FlickeringGridProps {
  className?: string
  squareSize?: number
  gridGap?: number
  flickerChance?: number
  color?: string
  maxOpacity?: number
}

export function FlickeringGrid({
  className = '',
  squareSize = 3,
  gridGap = 12,
  flickerChance = .08,
  color = '#000000',
  maxOpacity = .12,
}: FlickeringGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isInView, setIsInView] = useState(false)

  const colorPrefix = useMemo(() => {
    const match = color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)
    if (!match) return 'rgba(0, 0, 0,'
    return `rgba(${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)},`
  }, [color])

  const setupCanvas = useCallback((canvas: HTMLCanvasElement, width: number, height: number) => {
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.floor(width * dpr))
    canvas.height = Math.max(1, Math.floor(height * dpr))
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
    const cols = Math.ceil(width / (squareSize + gridGap))
    const rows = Math.ceil(height / (squareSize + gridGap))
    const squares = new Float32Array(cols * rows)
    for (let index = 0; index < squares.length; index += 1) squares[index] = Math.random() * maxOpacity
    return { cols, rows, squares, dpr }
  }, [gridGap, maxOpacity, squareSize])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !container || !context) return

    let frame = 0
    let lastTime = 0
    let grid = setupCanvas(canvas, container.clientWidth, container.clientHeight)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const draw = () => {
      context.clearRect(0, 0, canvas.width, canvas.height)
      for (let column = 0; column < grid.cols; column += 1) {
        for (let row = 0; row < grid.rows; row += 1) {
          const opacity = grid.squares[column * grid.rows + row]
          context.fillStyle = `${colorPrefix}${opacity})`
          context.fillRect(
            column * (squareSize + gridGap) * grid.dpr,
            row * (squareSize + gridGap) * grid.dpr,
            squareSize * grid.dpr,
            squareSize * grid.dpr,
          )
        }
      }
    }

    const animate = (time: number) => {
      if (!isInView) return
      const delta = Math.min(.05, (time - lastTime) / 1000)
      lastTime = time
      for (let index = 0; index < grid.squares.length; index += 1) {
        if (Math.random() < flickerChance * delta) grid.squares[index] = Math.random() * maxOpacity
      }
      draw()
      frame = requestAnimationFrame(animate)
    }

    const resizeObserver = new ResizeObserver(() => {
      grid = setupCanvas(canvas, container.clientWidth, container.clientHeight)
      draw()
    })
    const intersectionObserver = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting))
    resizeObserver.observe(container)
    intersectionObserver.observe(canvas)
    draw()
    if (isInView && !reduceMotion) frame = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
    }
  }, [colorPrefix, flickerChance, gridGap, isInView, maxOpacity, setupCanvas, squareSize])

  return <div ref={containerRef} className={className}><canvas ref={canvasRef} /></div>
}
