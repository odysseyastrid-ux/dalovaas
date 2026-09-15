import { useState } from 'react'

interface FaqItem {
  q: string
  a: string
}

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => {
        const isOpen = open === i
        return (
          <div key={i} className="overflow-hidden rounded-xl border border-[var(--color-divider)]">
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-3 p-3.5 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-sm font-bold">{item.q}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`flex-none text-[var(--color-ink)]/50 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {isOpen && <div className="px-3.5 pb-3.5 text-xs text-[var(--color-ink)]/70">{item.a}</div>}
          </div>
        )
      })}
    </div>
  )
}
