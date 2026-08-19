import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 font-[var(--font-heading)] text-xs font-bold uppercase tracking-wide text-[var(--color-ink)]/70">
        {label}
      </div>
      {children}
    </label>
  )
}

const inputClass =
  'w-full rounded-lg border border-[var(--color-divider)] bg-white px-3.5 py-3 text-sm outline-none focus:border-[var(--color-accent)]'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={inputClass} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={inputClass} />
}
