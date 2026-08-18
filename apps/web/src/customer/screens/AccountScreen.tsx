import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { useAuthStore } from '@/state/authStore'
import { useMyOrders } from '@/hooks/useOrders'

export function AccountScreen() {
  const { t, lang, toggleLang } = useI18n()
  const navigate = useNavigate()
  const account = useAuthStore((s) => s.account)
  const signOut = useAuthStore((s) => s.signOut)
  const orders = useMyOrders(account?.id ?? null)

  const initials = (account?.profile_name || account?.email || '??').slice(0, 2).toUpperCase()

  const rows = [
    { key: 'history', label: t.orderHistoryTitle, action: () => navigate('/account/history') },
    { key: 'payment', label: t.paymentMethodsTitle, action: () => navigate('/account/payment') },
    { key: 'addresses', label: t.addressesTitle, action: () => navigate('/account/addresses') },
    { key: 'notifications', label: t.notificationsTitle, action: () => navigate('/account/notifications') },
    { key: 'help', label: t.helpTitle, action: () => navigate('/account/help') },
    { key: 'about', label: t.aboutTitle, action: () => navigate('/account/about') },
    { key: 'logout', label: t.logout, action: signOut, danger: true },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-divider)] p-4">
        <div className="font-[var(--font-heading)] text-lg font-extrabold">{t.account}</div>
        <button
          onClick={toggleLang}
          className="rounded-full bg-[var(--color-surface)] px-3 py-1.5 font-[var(--font-heading)] text-[11px] font-bold"
        >
          {lang.toUpperCase()}
        </button>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <div
          onClick={() => navigate('/account/profile')}
          className="flex cursor-pointer items-center justify-between gap-4 border-b border-[var(--color-divider)] p-4"
        >
          <div className="flex items-center gap-4">
            {account?.avatar_url ? (
              <img src={account.avatar_url} alt="" className="h-14 w-14 flex-none rounded-full object-cover" />
            ) : (
              <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-[var(--color-accent)] font-[var(--font-heading)] text-lg font-bold">
                {initials}
              </div>
            )}
            <div>
              <div className="font-[var(--font-heading)] text-[15px] font-bold">{account?.profile_name || '—'}</div>
              <div className="mt-0.5 text-xs text-[var(--color-ink)]/60">{account?.email}</div>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-[var(--color-ink)]/30">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
        <div className="flex gap-3 border-b border-[var(--color-divider)] p-4">
          <div className="flex-1 rounded-xl border border-[var(--color-divider)] p-3 text-center">
            <div className="font-[var(--font-heading)] text-xl font-extrabold">{orders.length}</div>
            <div className="text-[11px] text-[var(--color-ink)]/60">{t.myOrders}</div>
          </div>
          <div className="flex-1 rounded-xl bg-[image:var(--gradient-gold)] p-3 text-center">
            <div className="font-[var(--font-heading)] text-xl font-extrabold">{account?.loyalty_points ?? 0}</div>
            <div className="text-[11px] opacity-70">{t.myPoints}</div>
          </div>
        </div>
        {rows.map((row) => (
          <div
            key={row.key}
            onClick={row.action}
            className="flex cursor-pointer items-center justify-between border-b border-[var(--color-divider)] p-4"
          >
            <div className="text-sm" style={{ color: row.danger ? '#dc2626' : undefined }}>
              {row.label}
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--color-ink)]/30">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  )
}
