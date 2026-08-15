import { useEffect, useState } from 'react'
import type { PromoSlide } from '@/hooks/useAppSettings'

export function PromoCarousel({ slides }: { slides: PromoSlide[] }) {
  const [index, setIndex] = useState(0)
  const ordered = [...slides].sort((a, b) => a.sort_order - b.sort_order)

  useEffect(() => {
    if (ordered.length < 2) return
    const id = setInterval(() => setIndex((i) => (i + 1) % ordered.length), 4000)
    return () => clearInterval(id)
  }, [ordered.length])

  if (ordered.length === 0) return null

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--color-surface)]">
      {ordered.map((slide, i) => (
        <img
          key={slide.image_url + i}
          src={slide.image_url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
          style={{ opacity: i === index ? 1 : 0, pointerEvents: i === index ? 'auto' : 'none' }}
        />
      ))}
      {ordered.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {ordered.map((slide, i) => (
            <button
              key={slide.image_url + i}
              onClick={() => setIndex(i)}
              className="h-2 w-2 rounded-full border border-black/30"
              style={{ background: i === index ? '#fff' : 'rgba(255,255,255,0.5)' }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
