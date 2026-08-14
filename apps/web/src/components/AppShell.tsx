import type { ReactNode } from 'react'
import { Toast } from './Toast'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center bg-[var(--color-surface)] sm:py-6">
      <div className="relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[var(--color-bg)] text-[var(--color-ink)] sm:h-[min(900px,calc(100dvh-48px))] sm:rounded-[36px] sm:shadow-2xl">
        {children}
        <Toast />
      </div>
    </div>
  )
}

export function BackHeader({
  title,
  onBack,
  right,
}: {
  title: string
  onBack: () => void
  right?: ReactNode
}) {
  return (
    <div className="flex items-center gap-3 border-b border-[var(--color-divider)] p-4">
      <button
        onClick={onBack}
        aria-label="Back"
        className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--color-surface)]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="flex-1 font-[var(--font-heading)] text-lg font-extrabold">{title}</div>
      {right}
    </div>
  )
}
