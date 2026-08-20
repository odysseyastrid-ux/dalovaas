import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { BackHeader } from '@/components/AppShell'
import { useAuthStore } from '@/state/authStore'
import { useMyOrders } from '@/hooks/useOrders'
import { downloadReceipt } from '@/lib/receipt'
import { formatFCFA } from '@/lib/format'
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
          <div key={o.id} className="mb-3 flex items-center justify-between rounded-xl border border-[var(--color-divider)] p-3.5">
            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => navigate(`/tracking/${o.ref}`)}>
              <div className="[font-family:var(--font-heading)] text-sm font-bold">{o.ref}</div>
              <div className="mt-0.5 text-xs text-[var(--color-ink)]/60">
                {t.pickupCodeLabel}: {o.pickup_code} · {formatFCFA(o.total)}
              </div>
            </div>
            <div className="flex flex-none items-center gap-2">
              <span className="rounded-full border border-[var(--color-divider)] px-2 py-0.5 text-[10px]">
                {statusLabel(o, lang)}
              </span>
              {!o.pending_validation && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    downloadReceipt(o, lang)
                  }}
                  title={lang === 'fr' ? 'Télécharger le reçu' : 'Download receipt'}
                  className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-[var(--color-divider)] text-[var(--color-ink)]/70"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 19h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
