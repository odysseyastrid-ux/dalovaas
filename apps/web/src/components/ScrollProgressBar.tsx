import { useEffect, useState, type RefObject } from 'react'

export function ScrollProgressBar({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onScroll = () => {
      const max = el.scrollHeight - el.clientHeight
      setProgress(max > 0 ? el.scrollTop / max : 0)
    }
    onScroll()
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [containerRef])

  return (
    <div className="absolute left-0 top-0 z-10 h-[3px] w-full bg-transparent">
      <div
        className="h-full bg-[var(--color-accent)] transition-[width] duration-100"
        style={{ width: `${Math.round(progress * 100)}%` }}
      />
    </div>
  )
}
