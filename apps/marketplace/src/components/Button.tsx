import type { ButtonHTMLAttributes } from 'react'
import clsx from 'clsx'

type Variant = 'primary' | 'teal' | 'secondary' | 'ghost' | 'danger'

export function Button({
  variant = 'primary',
  block,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean }) {
  return (
    <button
      className={clsx(
        'rounded-xl px-5 py-3.5 text-center font-[var(--font-heading)] text-sm font-bold tracking-wide transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'primary' && 'bg-[image:var(--gradient-sunset)] text-white shadow-sm',
        variant === 'teal' && 'bg-[image:var(--gradient-teal)] text-white shadow-sm',
        variant === 'secondary' && 'bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-divider)]',
        variant === 'ghost' && 'bg-transparent text-[var(--color-accent-700)]',
        variant === 'danger' && 'bg-red-50 text-red-600 border border-red-200',
        block && 'block w-full',
        className,
      )}
      {...props}
    />
  )
}
