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
  if (variant === 'primary' || variant === 'secondary') {
    return (
      <button
        className={clsx(
          'btn-gradient rounded-xl transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
          block && 'block w-full',
          className,
        )}
        {...props}
      >
        <span
          className={clsx(
            'btn-gradient-inner flex items-center justify-center gap-1.5 rounded-[9px] px-5 py-3.5 [font-family:var(--font-heading)] text-sm font-bold tracking-wide',
            variant === 'secondary' && 'btn-gradient-inner--light',
          )}
        >
          {children}
        </span>
      </button>
    )
  }
  return (
    <button
      className={clsx(
        'btn-shine rounded-xl px-5 py-3.5 text-left [font-family:var(--font-heading)] text-sm font-bold tracking-wide transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 bg-transparent text-[var(--color-accent-700)] hover:underline',
        block && 'block w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
