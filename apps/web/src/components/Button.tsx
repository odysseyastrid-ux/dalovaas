import type { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

type Variant = 'primary' | 'secondary' | 'ghost'

export function Button({
  variant = 'primary',
  block,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean; children?: ReactNode }) {
  if (variant === 'primary') {
    return (
      <button
        className={clsx(
          'btn-gradient rounded-xl transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
          block && 'block w-full',
          className,
        )}
        {...props}
      >
        <span className="btn-gradient-inner flex items-center justify-center gap-1.5 rounded-[9px] px-5 py-3.5 [font-family:var(--font-heading)] text-sm font-bold tracking-wide">
          {children}
        </span>
      </button>
    )
  }
  return (
    <button
      className={clsx(
        'btn-shine rounded-xl px-5 py-3.5 text-left [font-family:var(--font-heading)] text-sm font-bold tracking-wide transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'secondary' && 'bg-[var(--color-surface)] text-[var(--color-ink)] border border-[var(--color-divider)] hover:border-[var(--color-accent)]',
        variant === 'ghost' && 'bg-transparent text-[var(--color-accent-700)] hover:underline',
        block && 'block w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
