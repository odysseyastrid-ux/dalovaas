import type { InputHTMLAttributes, ReactNode } from 'react'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 [font-family:var(--font-heading)] text-xs font-bold uppercase tracking-wide text-[var(--color-ink)]/70">
        {label}
      </div>
      {children}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-lg border border-[var(--color-divider)] bg-white px-3.5 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
    />
  )
}
