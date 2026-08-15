import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { BackHeader } from '@/components/AppShell'
import { useAuthStore } from '@/state/authStore'
import { supabase } from '@/lib/supabaseClient'
import { enablePushForAccount, disablePushForAccount, pushSupported } from '@/lib/push'
import { useToastStore } from '@/state/toastStore'
import type { Account } from '@/types/domain'

const ROWS: { key: keyof Pick<Account, 'notif_promos' | 'notif_order_updates' | 'notif_rewards'>; labelKey: 'notifPromos' | 'notifOrderUpdates' | 'notifRewards' }[] = [
  { key: 'notif_promos', labelKey: 'notifPromos' },
  { key: 'notif_order_updates', labelKey: 'notifOrderUpdates' },
  { key: 'notif_rewards', labelKey: 'notifRewards' },
]

export function NotificationsScreen() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const account = useAuthStore((s) => s.account)
  const refreshAccount = useAuthStore((s) => s.refreshAccount)
  const showToast = useToastStore((s) => s.show)

  const toggle = async (key: string, current: boolean) => {
    if (!account) return
    const next = !current
    await supabase.from('accounts').update({ [key]: next }).eq('id', account.id)

    // Order-update pushes need an actual browser subscription, not just the flag.
    if (key === 'notif_order_updates' && pushSupported()) {
      if (next) {
        const granted = await enablePushForAccount(account.id)
        if (!granted) showToast(lang === 'fr' ? 'Notifications refusées par le navigateur' : 'Notifications denied by browser')
      } else {
        await disablePushForAccount(account.id)
      }
    }

    await refreshAccount()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BackHeader title={t.notificationsTitle} onBack={() => navigate('/account')} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        {ROWS.map((row) => {
          const on = !!account?.[row.key]
          return (
            <div
              key={row.key}
              onClick={() => toggle(row.key, on)}
              className="flex cursor-pointer items-center justify-between border-b border-[var(--color-divider)] py-3"
            >
              <div className="text-sm">{t[row.labelKey]}</div>
              <div className="relative h-6 w-10 flex-none rounded-full" style={{ background: on ? 'var(--color-accent)' : 'var(--color-divider)' }}>
                <div
                  className="absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all"
                  style={{ left: on ? 19 : 3 }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
