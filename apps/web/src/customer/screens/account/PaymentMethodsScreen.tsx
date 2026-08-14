import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { BackHeader } from '@/components/AppShell'
import { useAuthStore } from '@/state/authStore'
import { supabase } from '@/lib/supabaseClient'
import type { PaymentMethod } from '@/types/domain'

const OPTIONS: PaymentMethod[] = ['orange_money', 'mtn_momo', 'cash']

export function PaymentMethodsScreen() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const account = useAuthStore((s) => s.account)
  const refreshAccount = useAuthStore((s) => s.refreshAccount)

  const select = async (method: PaymentMethod) => {
    if (!account) return
    await supabase.from('accounts').update({ default_payment_method: method }).eq('id', account.id)
    await refreshAccount()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BackHeader title={t.paymentMethodsTitle} onBack={() => navigate('/account')} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mb-4 text-xs text-[var(--color-ink)]/60">{t.defaultPaymentDesc}</div>
        {OPTIONS.map((p) => (
          <div
            key={p}
            onClick={() => select(p)}
            className="flex cursor-pointer items-center gap-3 border-b border-[var(--color-divider)] py-3"
          >
            <div
              className="h-[18px] w-[18px] flex-none rounded-full border-[1.5px] border-[var(--color-ink)]/60"
              style={{ background: account?.default_payment_method === p ? 'var(--color-accent)' : 'transparent' }}
            />
            <div className="flex-1 text-sm">
              {p === 'orange_money' ? t.paymentOrangeMoney : p === 'mtn_momo' ? t.paymentMtnMomo : t.paymentCash}
            </div>
            {account?.default_payment_method === p && (
              <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[9px] font-bold">
                {t.defaultLabel}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
