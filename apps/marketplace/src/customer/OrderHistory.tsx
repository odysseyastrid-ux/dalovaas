import { Link } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { useMyOrders } from '@/hooks/useOrders'
import { formatFcfa, formatDateTime } from '@/lib/format'
import { OrderStatusPill } from '@/components/StatusPill'

export function OrderHistory() {
  const customerId = useAuthStore((s) => s.session?.user?.id ?? null)
  const { data: orders, loading } = useMyOrders(customerId)

  return (
    <div className="px-5 pt-8">
      <div className="mb-6 font-[var(--font-heading)] text-2xl font-extrabold">Mes commandes</div>

      {loading && <div className="py-16 text-center text-sm text-[var(--color-ink)]/50">Chargement…</div>}
      {!loading && orders.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-ink)]/50 shadow-sm">
          Aucune commande pour le moment.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {orders.map((order) => (
          <Link
            key={order.id}
            to={`/customer/orders/${order.ref}`}
            className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm transition active:scale-[0.98]"
          >
            <div>
              <div className="text-sm font-bold">{order.vendor_name}</div>
              <div className="text-xs text-[var(--color-ink)]/50">
                {order.ref} · {formatDateTime(order.created_at)}
              </div>
              <div className="mt-1 text-sm font-bold text-[var(--color-accent-700)]">{formatFcfa(order.total)}</div>
            </div>
            <OrderStatusPill status={order.status} />
          </Link>
        ))}
      </div>
    </div>
  )
}
