import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import clsx from 'clsx'

export interface TabDef {
  to: string
  end?: boolean
  label: string
  icon: ReactNode
  badge?: number
}

export function BottomTabs({ tabs }: { tabs: TabDef[] }) {
  return (
    <div className="flex border-t border-[var(--color-divider)] bg-[var(--color-bg)]">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            clsx(
              'flex flex-1 flex-col items-center gap-1 py-2.5 pb-3',
              isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink)]/40',
            )
          }
        >
          <div className="relative">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
              {tab.icon}
            </svg>
            {!!tab.badge && tab.badge > 0 && (
              <div className="absolute -right-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[9px] font-bold text-white">
                {tab.badge}
              </div>
            )}
          </div>
          <div className="text-[10px]">{tab.label}</div>
        </NavLink>
      ))}
    </div>
  )
}

export const ICONS = {
  home: <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  cart: (
    <>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </>
  ),
  account: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
  bike: (
    <>
      <circle cx="5.5" cy="17.5" r="3.5" />
      <circle cx="18.5" cy="17.5" r="3.5" />
      <path d="M15 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" />
      <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
    </>
  ),
  store: (
    <>
      <path d="M3 9l1-5h16l1 5" />
      <path d="M3 9a2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0 2 2 0 0 0 4 0" />
      <path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
    </>
  ),
  gauge: (
    <>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M12 3v2" />
      <path d="M4.2 10l1.7 1" />
      <path d="M18.1 11l1.7-1" />
      <path d="M12 15l3-2" />
    </>
  ),
}
