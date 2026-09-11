'use client'

import { motion, useScroll } from 'framer-motion'

interface ScrollProgressBarProps {
  color?: string
  height?: number
}

export function ScrollProgressBar({ color = 'linear-gradient(90deg, #4A9EFF, #6366f1)', height = 3 }: ScrollProgressBarProps) {
  const { scrollYProgress } = useScroll()

  return (
    <motion.div
      className="fixed top-0 left-0 z-50 origin-left"
      style={{
        scaleX: scrollYProgress,
        height,
        background: color,
        width: '100%',
      }}
    />
  )
}
