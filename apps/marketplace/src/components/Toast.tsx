import { useToastStore } from '@/state/toastStore'

export function Toast() {
  const message = useToastStore((s) => s.message)
  if (!message) return null
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex justify-center">
      <div className="rounded-lg bg-[var(--color-ink)] px-4 py-3 text-center text-sm text-white shadow-lg">{message}</div>
    </div>
  )
}
