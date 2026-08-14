import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { useCartStore } from '@/state/cartStore'
import clsx from 'clsx'

const ICONS: Record<string, ReactNode> = {
  home: (
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  ),
  loyalty: (
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
  ),
  cart: (
    <>
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  account: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
}

export function BottomTabs() {
  const { t } = useI18n()
  const cartCount = useCartStore((s) => s.lines.reduce((n, l) => n + l.qty, 0))

  const tabs = [
    { to: '/', icon: 'home', label: t.home, badge: 0 },
    { to: '/rewards', icon: 'loyalty', label: t.rewards, badge: 0 },
    { to: '/cart', icon: 'cart', label: t.cart, badge: cartCount },
    { to: '/account', icon: 'account', label: t.account, badge: 0 },
  ]

  return (
    <div className="flex border-t border-[var(--color-divider)] bg-[var(--color-bg)]">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) =>
            clsx(
              'flex flex-1 flex-col items-center gap-1 py-2.5 pb-3',
              isActive ? 'text-[var(--color-ink)]' : 'text-[var(--color-ink)]/40',
            )
          }
        >
          <div className="relative">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
              {ICONS[tab.icon]}
            </svg>
            {tab.badge > 0 && (
              <div className="absolute -right-2 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[9px] font-bold text-[var(--color-ink)]">
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
