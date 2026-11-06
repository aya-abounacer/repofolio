import { useCallback, useEffect, useRef, useState } from 'react'

const codeGlyphs = '01{}[]<>/_*#'

export function DecryptedName({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState(text)
  const timerRef = useRef<number | null>(null)
  const runningRef = useRef(false)

  const stop = useCallback(() => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current)
    timerRef.current = null
    runningRef.current = false
  }, [])

  const play = useCallback(() => {
    if (typeof window === 'undefined' || runningRef.current || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    stop()
    runningRef.current = true
    const letterPositions = [...text].map((character, index) => character === ' ' ? -1 : index).filter(index => index >= 0)
    const totalFrames = Math.max(12, Math.min(22, letterPositions.length + 4))
    let frame = 0

    const renderFrame = () => {
      frame += 1
      const revealed = Math.floor((frame / totalFrames) * letterPositions.length)
      const revealedPositions = new Set(letterPositions.slice(0, revealed))
      setDisplayText([...text].map((character, index) => {
        if (character === ' ' || revealedPositions.has(index)) return character
        return codeGlyphs[(frame * 5 + index * 3) % codeGlyphs.length]
      }).join(''))

      if (frame >= totalFrames) {
        stop()
        setDisplayText(text)
      }
    }

    renderFrame()
    timerRef.current = window.setInterval(renderFrame, 38)
  }, [stop, text])

  useEffect(() => {
    setDisplayText(text)
    const startTimer = window.setTimeout(play, 160)
    return () => {
      window.clearTimeout(startTimer)
      stop()
    }
  }, [play, stop, text])

  return <span className="technical-decrypted-name" aria-label={text} onPointerEnter={play}>
    <span aria-hidden="true">{displayText}</span>
  </span>
}
