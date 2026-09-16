import type { MenuCategory } from '@/types/domain'

// Custom-designed line icons for each menu category, in the site's
// established stroke style (stroke-width 2.5, 24x24 viewBox). Used on the
// home screen category chips.
const PATHS: Record<MenuCategory, React.ReactNode> = {
  combo: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 10h16" />
    </>
  ),
  burgers: (
    <>
      <path d="M4 10c0-3 3.6-5.5 8-5.5S20 7 20 10" />
      <path d="M3.5 10h17" />
      <path d="M4 13.5h16" />
      <path d="M3.5 17h17" />
      <path d="M5 17c0 1.5 1.5 2.5 7 2.5s7-1 7-2.5" />
    </>
  ),
  fries: (
    <>
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
      <path d="M5 10h14l-1-3H6z" />
      <path d="M10 7V5M12 7V4M14 7V5" strokeLinecap="round" />
    </>
  ),
  poutine: (
    <>
      <path d="M4 11h16l-1.4 7.2a2 2 0 0 1-2 1.8H7.4a2 2 0 0 1-2-1.8z" />
      <path d="M9 11V8M12 11V7M15 11V8" strokeLinecap="round" />
    </>
  ),
  poisson: (
    <>
      <path d="M3 12c3-4 8-6 12-4 2 1 4 2.5 6 4-2 1.5-4 3-6 4-4 2-9 0-12-4z" />
      <circle cx="16" cy="10.5" r="0.8" fill="currentColor" stroke="none" />
      <path d="M3 12c-1 1-1.5 2.2-1.5 3M3 12c-1-1-1.5-2.2-1.5-3" strokeLinecap="round" />
    </>
  ),
  shakes: (
    <>
      <path d="M8 3h8l-1 3H9z" />
      <path d="M7 6h10l-1.3 13.2a2 2 0 0 1-2 1.8h-3.4a2 2 0 0 1-2-1.8z" />
      <path d="M17 8l3-1" strokeLinecap="round" />
    </>
  ),
  cocktails: (
    <>
      <path d="M5 5h14l-7 8z" />
      <path d="M12 13v6M9 19h6" strokeLinecap="round" />
    </>
  ),
  soft_drinks: (
    <>
      <path d="M7 7h10l-1 12.2a2 2 0 0 1-2 1.8h-4a2 2 0 0 1-2-1.8z" />
      <path d="M6.3 7h11.4" />
      <path d="M9.5 4.5c.5 1 1.5 1 2 0M12.5 4.5c.5 1 1.5 1 2 0" strokeLinecap="round" />
    </>
  ),
}

export function CategoryIcon({ cat, className }: { cat: MenuCategory; className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {PATHS[cat]}
    </svg>
  )
}
