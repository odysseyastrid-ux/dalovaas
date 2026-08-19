import { useState } from 'react'
import clsx from 'clsx'
import { useAuthStore } from '@/state/authStore'
import { useVendorOrders } from '@/hooks/useOrders'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import { formatFcfa, timeAgo } from '@/lib/format'
import { OrderStatusPill } from '@/components/StatusPill'
import { Button } from '@/components/Button'
import type { MkOrder, OrderStatus } from '@/types/domain'

const TABS: { key: OrderStatus | 'history'; label: string }[] = [
  { key: 'pending', label: 'Nouvelles' },
  { key: 'accepted', label: 'En préparation' },
  { key: 'ready_for_pickup', label: 'Prêtes' },
  { key: 'picked_up', label: 'En livraison' },
  { key: 'history', label: 'Historique' },
]

export function OrdersBoard() {
  const vendor = useAuthStore((s) => s.vendor)
  const { data: orders, loading } = useVendorOrders(vendor?.id ?? null)
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('pending')
  const showToast = useToastStore((s) => s.show)

  const visible = orders.filter((o) => (tab === 'history' ? o.status === 'delivered' || o.status === 'cancelled' : o.status === tab))

  const act = async (fn: string, order: MkOrder, okMsg: string) => {
    const { error } = await supabase.rpc(fn, { p_order_id: order.id })
    if (error) showToast(error.message)
    else showToast(okMsg)
  }

  return (
    <div className="px-5 pt-8">
      <div className="mb-1 font-[var(--font-heading)] text-2xl font-extrabold">{vendor?.name}</div>
      <div className="mb-6 text-sm text-[var(--color-ink)]/60">Commandes</div>

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
            {t.label} {t.key !== 'history' && `(${orders.filter((o) => o.status === t.key).length})`}
          </button>
        ))}
      </div>

      {loading && <div className="py-16 text-center text-sm text-[var(--color-ink)]/50">Chargement…</div>}
      {!loading && visible.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-ink)]/50 shadow-sm">Aucune commande ici.</div>
      )}

      <div className="flex flex-col gap-3">
        {visible.map((order) => (
          <div key={order.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-bold">{order.ref}</div>
              <OrderStatusPill status={order.status} />
            </div>
            <div className="mb-2 text-xs text-[var(--color-ink)]/50">
              {order.customer_name} · {order.customer_phone} · {timeAgo(order.created_at)}
            </div>
            {order.items.map((line, i) => (
              <div key={i} className="flex justify-between text-sm">
                <div>
                  {line.qty}× {line.name}
                </div>
                <div>{formatFcfa(line.line_total)}</div>
              </div>
            ))}
            <div className="mt-2 flex justify-between border-t border-[var(--color-divider)] pt-2 text-sm font-bold">
              <div>Total</div>
              <div>{formatFcfa(order.total)}</div>
            </div>
            <div className="mt-1 text-xs text-[var(--color-ink)]/50">📍 {order.delivery_address}</div>
            {order.notes && <div className="mt-1 text-xs italic text-[var(--color-ink)]/50">"{order.notes}"</div>}

            {order.status === 'pending' && (
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => act('mk_cancel_order', order, 'Commande annulée')}>
                  Refuser
                </Button>
                <Button className="flex-1" onClick={() => act('mk_vendor_accept_order', order, 'Commande acceptée')}>
                  Accepter
                </Button>
              </div>
            )}
            {order.status === 'accepted' && (
              <Button block className="mt-3" onClick={() => act('mk_vendor_mark_ready', order, 'Marquée prête pour livraison')}>
                Prête pour le livreur
              </Button>
            )}
            {order.status === 'ready_for_pickup' && (
              <div className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-center text-xs font-bold text-teal-700">
                En attente qu'un livreur la récupère…
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
