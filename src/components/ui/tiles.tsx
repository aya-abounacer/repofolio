"use client"

import React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface TilesProps {
  className?: string
  rows?: number
  cols?: number
  tileClassName?: string
  tileSize?: "sm" | "md" | "lg"
}

const tileSizes = {
  sm: "w-8 h-8",
  md: "w-9 h-9 md:w-12 md:h-12",
  lg: "w-12 h-12 md:w-16 md:h-16",
}

export function Tiles({
  className,
  rows = 100,
  cols = 10,
  tileClassName,
  tileSize = "md",
}: TilesProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const lastTileRef = React.useRef(-1)
  const rowsArray = new Array(rows).fill(1)
  const colsArray = new Array(cols).fill(1)

  React.useEffect(() => {
    let frame = 0

    const paintTile = (event: PointerEvent) => {
      cancelAnimationFrame(frame)
      const { clientX, clientY } = event

      frame = requestAnimationFrame(() => {
        const root = rootRef.current
        const firstTile = root?.querySelector<HTMLElement>('[data-tile]')
        if (!root || !firstTile) return

        const rootRect = root.getBoundingClientRect()
        if (clientX < rootRect.left || clientX > rootRect.right || clientY < rootRect.top || clientY > rootRect.bottom) {
          lastTileRef.current = -1
          return
        }

        const tileRect = firstTile.getBoundingClientRect()
        const column = Math.floor((clientX - rootRect.left) / tileRect.width)
        const row = Math.floor((clientY - rootRect.top) / tileRect.height)
        const tileIndex = column * cols + row
        if (column < 0 || column >= rows || row < 0 || row >= cols || tileIndex === lastTileRef.current) return

        lastTileRef.current = tileIndex
        const tile = root.querySelector<HTMLElement>(`[data-tile="${tileIndex}"]`)
        const color = getComputedStyle(root).getPropertyValue('--tile').trim() || '#000000'
        tile?.animate(
          [{ backgroundColor: color }, { backgroundColor: 'transparent' }],
          { duration: 1400, easing: 'cubic-bezier(.16, 1, .3, 1)' },
        )
      })
    }

    window.addEventListener('pointermove', paintTile, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', paintTile)
    }
  }, [cols, rows])

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative z-0 flex h-full w-full justify-center",
        className,
      )}
    >
      {rowsArray.map((_, i) => (
        <motion.div
          key={`row-${i}`}
          className={cn(
            tileSizes[tileSize],
            "relative shrink-0 border-l border-neutral-200 dark:border-neutral-900",
            tileClassName,
          )}
        >
          {colsArray.map((_, j) => (
            <motion.div
              whileHover={{
                backgroundColor: "var(--tile)",
                transition: { duration: 0 },
              }}
              animate={{
                backgroundColor: "transparent",
                transition: { duration: 1.4 },
              }}
              key={`col-${j}`}
              data-tile={i * cols + j}
              className={cn(
                tileSizes[tileSize],
                "relative border-r border-t border-neutral-200 dark:border-neutral-900",
                tileClassName,
              )}
            />
          ))}
        </motion.div>
      ))}
    </div>
  )
}
