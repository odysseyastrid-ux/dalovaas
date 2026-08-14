import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { BackHeader } from '@/components/AppShell'
import { useAuthStore } from '@/state/authStore'
import { useMyOrders } from '@/hooks/useOrders'
import type { Order } from '@/types/domain'

function statusLabel(order: Order, lang: 'fr' | 'en') {
  if (order.pending_validation) return lang === 'fr' ? 'En attente' : 'Pending'
  if (order.status === 'done') return lang === 'fr' ? 'Livrée' : 'Delivered'
  return lang === 'fr' ? 'En cours' : 'In progress'
}

export function OrderHistoryScreen() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const account = useAuthStore((s) => s.account)
  const orders = useMyOrders(account?.id ?? null)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BackHeader title={t.orderHistoryTitle} onBack={() => navigate('/account')} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        {orders.length === 0 && <div className="text-sm text-[var(--color-ink)]/60">{t.noOrdersYet}</div>}
        {orders.map((o) => (
          <div
            key={o.id}
            onClick={() => navigate(`/tracking/${o.ref}`)}
            className="mb-3 flex cursor-pointer items-center justify-between rounded-xl border border-[var(--color-divider)] p-3.5"
          >
            <div>
              <div className="font-[var(--font-heading)] text-sm font-bold">{o.ref}</div>
              <div className="mt-0.5 text-xs text-[var(--color-ink)]/60">
                {t.pickupCodeLabel}: {o.pickup_code}
              </div>
            </div>
            <span className="rounded-full border border-[var(--color-divider)] px-2 py-0.5 text-[10px]">
              {statusLabel(o, lang)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
