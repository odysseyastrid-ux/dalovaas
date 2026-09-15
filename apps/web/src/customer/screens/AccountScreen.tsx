import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { useAuthStore } from '@/state/authStore'
import { useThemeStore } from '@/state/themeStore'
import { useMyOrders } from '@/hooks/useOrders'
import { ConfirmModal } from '@/components/ConfirmModal'

export function AccountScreen() {
  const { t, lang, toggleLang } = useI18n()
  const navigate = useNavigate()
  const account = useAuthStore((s) => s.account)
  const signOut = useAuthStore((s) => s.signOut)
  const orders = useMyOrders(account?.id ?? null)
  const theme = useThemeStore((s) => s.theme)
  const toggleTheme = useThemeStore((s) => s.toggle)
  const [confirmLogout, setConfirmLogout] = useState(false)

  const initials = (account?.profile_name || account?.email || '??').slice(0, 2).toUpperCase()

  const rows = [
    { key: 'history', label: t.orderHistoryTitle, action: () => navigate('/account/history') },
    { key: 'payment', label: t.paymentMethodsTitle, action: () => navigate('/account/payment') },
    { key: 'addresses', label: t.addressesTitle, action: () => navigate('/account/addresses') },
    { key: 'notifications', label: t.notificationsTitle, action: () => navigate('/account/notifications') },
    { key: 'help', label: t.helpTitle, action: () => navigate('/account/help') },
    { key: 'about', label: t.aboutTitle, action: () => navigate('/account/about') },
    { key: 'logout', label: t.logout, action: () => setConfirmLogout(true), danger: true },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-divider)] p-4">
        <div className="[font-family:var(--font-heading)] text-lg font-extrabold">{t.account}</div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface)]"
          >
            {theme === 'dark' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <button
            onClick={toggleLang}
            className="rounded-full bg-[var(--color-surface)] px-3 py-1.5 [font-family:var(--font-heading)] text-[11px] font-bold"
          >
            {lang.toUpperCase()}
          </button>
        </div>
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        <div
          onClick={() => navigate('/account/profile')}
          className="mb-3 flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-[var(--color-card)] p-4 shadow-[0_2px_10px_rgba(26,21,18,0.06)]"
        >
          <div className="flex items-center gap-4">
            {account?.avatar_url ? (
              <img src={account.avatar_url} alt="" className="h-14 w-14 flex-none rounded-full object-cover" />
            ) : (
              <div className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-[var(--color-accent)] [font-family:var(--font-heading)] text-lg font-bold">
                {initials}
              </div>
            )}
            <div>
              <div className="[font-family:var(--font-heading)] text-[15px] font-bold">{account?.profile_name || '—'}</div>
              <div className="mt-0.5 text-xs text-[var(--color-ink)]/60">{account?.email}</div>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" className="flex-none text-[var(--color-ink)]/30">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
        <div className="mb-3 flex gap-3">
          <div className="flex-1 rounded-2xl bg-[var(--color-card)] p-3 text-center shadow-[0_2px_10px_rgba(26,21,18,0.06)]">
            <div className="[font-family:var(--font-heading)] text-xl font-extrabold">{orders.length}</div>
            <div className="text-[11px] text-[var(--color-ink)]/60">{t.myOrders}</div>
          </div>
          <div className="flex-1 rounded-2xl bg-pattern-gold p-3 text-center">
            <div className="[font-family:var(--font-heading)] text-xl font-extrabold">{account?.loyalty_points ?? 0}</div>
            <div className="text-[11px] opacity-70">{t.myPoints}</div>
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl bg-[var(--color-card)] shadow-[0_2px_10px_rgba(26,21,18,0.06)]">
          {rows.map((row, i) => (
            <div
              key={row.key}
              onClick={row.action}
              className={`flex cursor-pointer items-center justify-between p-4 ${i > 0 ? 'border-t border-[var(--color-divider)]' : ''}`}
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
      {confirmLogout && (
        <ConfirmModal
          title={lang === 'fr' ? 'Se déconnecter ?' : 'Log out?'}
          desc={lang === 'fr' ? 'Vous devrez vous reconnecter avec un code par email.' : "You'll need to sign in again with an email code."}
          confirmLabel={t.logout}
          cancelLabel={lang === 'fr' ? 'Annuler' : 'Cancel'}
          danger
          onConfirm={signOut}
          onCancel={() => setConfirmLogout(false)}
        />
      )}
    </div>
  )
}
