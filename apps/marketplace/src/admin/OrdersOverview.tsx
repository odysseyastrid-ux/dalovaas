import { useState } from 'react'
import clsx from 'clsx'
import { useAllOrders } from '@/hooks/useOrders'
import { formatFcfa, formatDateTime } from '@/lib/format'
import { OrderStatusPill } from '@/components/StatusPill'
import type { OrderStatus } from '@/types/domain'

const TABS: { key: OrderStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'pending', label: 'Nouvelles' },
  { key: 'accepted', label: 'Préparation' },
  { key: 'ready_for_pickup', label: 'Prêtes' },
  { key: 'picked_up', label: 'Livraison' },
  { key: 'delivered', label: 'Livrées' },
  { key: 'cancelled', label: 'Annulées' },
]

export function OrdersOverview() {
  const { data: orders, loading } = useAllOrders(true)
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('all')

  const visible = tab === 'all' ? orders : orders.filter((o) => o.status === tab)

  return (
    <div className="px-5 pt-8 pb-10">
      <div className="mb-6 font-[var(--font-heading)] text-2xl font-extrabold">Commandes</div>

      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'flex-shrink-0 rounded-full px-3.5 py-2 text-xs font-bold',
              tab === t.key ? 'bg-[var(--color-ink)] text-white' : 'bg-white text-[var(--color-ink)]/60',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && <div className="py-16 text-center text-sm text-[var(--color-ink)]/50">Chargement…</div>}

      <div className="flex flex-col gap-2">
        {visible.map((order) => (
          <div key={order.id} className="rounded-xl bg-white p-3 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-sm font-bold">{order.ref}</div>
              <OrderStatusPill status={order.status} />
            </div>
            <div className="text-xs text-[var(--color-ink)]/50">
              {order.vendor_name} → {order.customer_name} · {formatDateTime(order.created_at)}
            </div>
            <div className="mt-1 flex justify-between text-xs">
              <div className="text-[var(--color-ink)]/50">Commission {formatFcfa(order.commission_amount)}</div>
              <div className="font-bold">{formatFcfa(order.total)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
