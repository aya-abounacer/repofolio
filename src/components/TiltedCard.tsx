import { motion, useMotionValue, useSpring } from 'framer-motion'
import type { MouseEvent, ReactNode } from 'react'
import { useRef } from 'react'

const springValues = {
  damping: 30,
  stiffness: 100,
  mass: 2,
}

type TiltedCardProps = {
  children: ReactNode
  captionText?: string
  className?: string
  rotateAmplitude?: number
  scaleOnHover?: number
  showTooltip?: boolean
}

export function TiltedCard({
  children,
  captionText = '',
  className = '',
  rotateAmplitude = 8,
  scaleOnHover = 1.025,
  showTooltip = true,
}: TiltedCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const lastY = useRef(0)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(0, springValues)
  const rotateY = useSpring(0, springValues)
  const scale = useSpring(1, springValues)
  const opacity = useSpring(0, springValues)
  const rotateCaption = useSpring(0, { stiffness: 350, damping: 30, mass: 1 })

  function handleMouseMove(event: MouseEvent<HTMLDivElement>) {
    if (!ref.current) return

    const rect = ref.current.getBoundingClientRect()
    const offsetX = event.clientX - rect.left - rect.width / 2
    const offsetY = event.clientY - rect.top - rect.height / 2
    const rotationX = (offsetY / (rect.height / 2)) * -rotateAmplitude
    const rotationY = (offsetX / (rect.width / 2)) * rotateAmplitude

    rotateX.set(rotationX)
    rotateY.set(rotationY)
    x.set(event.clientX - rect.left)
    y.set(event.clientY - rect.top)
    rotateCaption.set(-(offsetY - lastY.current) * 0.6)
    lastY.current = offsetY
  }

  function handleMouseEnter() {
    scale.set(scaleOnHover)
    opacity.set(1)
  }

  function handleMouseLeave() {
    scale.set(1)
    opacity.set(0)
    rotateX.set(0)
    rotateY.set(0)
    rotateCaption.set(0)
  }

  return (
    <div
      ref={ref}
      className={`tilted-card-figure ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="tilted-card-inner"
        style={{ rotateX, rotateY, scale }}
      >
        {children}
      </motion.div>
      {showTooltip && captionText ? (
        <motion.div
          className="tilted-card-caption"
          style={{ x, y, opacity, rotate: rotateCaption }}
          aria-hidden="true"
        >
          {captionText}
        </motion.div>
      ) : null}
    </div>
  )
}
