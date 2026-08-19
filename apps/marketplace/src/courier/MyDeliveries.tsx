import { useAuthStore } from '@/state/authStore'
import { useCourierDeliveries } from '@/hooks/useOrders'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import { formatFcfa, formatDateTime } from '@/lib/format'
import { OrderStatusPill } from '@/components/StatusPill'
import { Button } from '@/components/Button'

export function MyDeliveries() {
  const courier = useAuthStore((s) => s.courier)
  const { data: orders, loading } = useCourierDeliveries(courier?.id ?? null)
  const showToast = useToastStore((s) => s.show)

  const active = orders.filter((o) => o.status === 'picked_up')
  const past = orders.filter((o) => o.status === 'delivered' || o.status === 'cancelled')

  const markDelivered = async (orderId: string) => {
    const { error } = await supabase.rpc('mk_courier_mark_delivered', { p_order_id: orderId })
    if (error) showToast(error.message)
    else showToast('Commande livrée !')
  }

  return (
    <div className="px-5 pt-8 pb-10">
      <div className="mb-6 font-[var(--font-heading)] text-2xl font-extrabold">Mes courses</div>

      {loading && <div className="py-16 text-center text-sm text-[var(--color-ink)]/50">Chargement…</div>}

      {active.length > 0 && (
        <div className="mb-6">
          <div className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--color-ink)]/50">En cours</div>
          <div className="flex flex-col gap-3">
            {active.map((order) => (
              <div key={order.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-1 flex items-center justify-between">
                  <div className="text-sm font-bold">{order.vendor_name} → {order.customer_name}</div>
                  <OrderStatusPill status={order.status} />
                </div>
                <div className="mb-1 text-xs text-[var(--color-ink)]/60">📍 {order.delivery_address}</div>
                <div className="mb-3 text-xs text-[var(--color-ink)]/60">📞 {order.customer_phone}</div>
                <Button block onClick={() => markDelivered(order.id)}>
                  Marquer comme livrée
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && !loading && (
        <div className="mb-6 rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-ink)]/50 shadow-sm">
          Aucune course en cours. Consultez l'onglet Disponibles.
        </div>
      )}

      {past.length > 0 && (
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--color-ink)]/50">Historique</div>
          <div className="flex flex-col gap-2">
            {past.map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-xl bg-white p-3 shadow-sm">
                <div>
                  <div className="text-sm font-bold">{order.vendor_name}</div>
                  <div className="text-xs text-[var(--color-ink)]/50">{formatDateTime(order.created_at)}</div>
                </div>
                <div className="text-sm font-bold text-[var(--color-accent-700)]">{formatFcfa(order.delivery_fee)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
