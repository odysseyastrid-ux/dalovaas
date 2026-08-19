import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useOrderByRef } from '@/hooks/useOrders'
import { formatFcfa } from '@/lib/format'
import { OrderStatusPill } from '@/components/StatusPill'
import { Button } from '@/components/Button'
import { supabase } from '@/lib/supabaseClient'
import { formatDateTime } from '@/lib/format'
import type { DeliveryOption, OrderStatus } from '@/types/domain'

const DELIVERY_LABELS: Record<DeliveryOption, string> = {
  priority: '⚡ Priorité — livré chez vous',
  standard: '🚦 Standard — rendez-vous au carrefour',
  scheduled: '🗓️ Planifiée',
}

const STEPS: { status: OrderStatus; label: string; emoji: string }[] = [
  { status: 'pending', label: 'Commande envoyée', emoji: '📨' },
  { status: 'accepted', label: 'En préparation', emoji: '👨‍🍳' },
  { status: 'ready_for_pickup', label: 'Prête, en attente du livreur', emoji: '📦' },
  { status: 'picked_up', label: 'En route vers vous', emoji: '🏍️' },
  { status: 'delivered', label: 'Livrée', emoji: '✅' },
]

export function OrderTracking() {
  const { ref } = useParams<{ ref: string }>()
  const { data, loading } = useOrderByRef(ref ?? null)
  const order = data[0] ?? null
  const [ratingSent, setRatingSent] = useState(false)
  const [rating, setRating] = useState(5)

  if (loading) return <div className="py-16 text-center text-sm text-[var(--color-ink)]/50">Chargement…</div>
  if (!order) return <div className="py-16 text-center text-sm text-[var(--color-ink)]/50">Commande introuvable.</div>

  const stepIndex = order.status === 'cancelled' ? -1 : STEPS.findIndex((s) => s.status === order.status)

  const submitRating = async () => {
    await supabase.rpc('mk_rate_order', { p_order_id: order.id, p_vendor_rating: rating, p_courier_rating: order.courier_id ? rating : null })
    setRatingSent(true)
  }

  return (
    <div className="px-5 pt-8 pb-10">
      <Link to="/customer/orders" className="mb-6 block text-sm text-[var(--color-ink)]/50">
        ← Mes commandes
      </Link>

      <div className="mb-1 flex items-center justify-between">
        <div className="font-[var(--font-heading)] text-xl font-bold">Commande {order.ref}</div>
        <OrderStatusPill status={order.status} />
      </div>
      <div className="mb-1 text-sm text-[var(--color-ink)]/60">{order.vendor_name}</div>
      <div className="mb-6 text-xs font-bold text-[var(--color-ink)]/70">{DELIVERY_LABELS[order.delivery_option]}</div>

      {order.delivery_option === 'scheduled' && (order.scheduled_at || order.meeting_point) && (
        <div className="mb-6 rounded-2xl bg-orange-50 p-4 text-sm">
          {order.scheduled_at && <div className="font-bold">🗓️ {formatDateTime(order.scheduled_at)}</div>}
          {order.meeting_point && <div className="mt-0.5 text-[var(--color-ink)]/70">📍 {order.meeting_point}</div>}
        </div>
      )}

      {order.status === 'cancelled' ? (
        <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
          Commande annulée{order.cancel_reason ? ` — ${order.cancel_reason}` : ''}.
        </div>
      ) : (
        <div className="mb-6 flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <div key={step.status} className={`flex items-center gap-3 ${i <= stepIndex ? '' : 'opacity-35'}`}>
              <div className="text-xl">{step.emoji}</div>
              <div className={`text-sm ${i <= stepIndex ? 'font-bold' : ''}`}>{step.label}</div>
            </div>
          ))}
        </div>
      )}

      {order.courier_name && (
        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wide text-[var(--color-ink)]/50">Votre livreur</div>
          <div className="mt-1 text-sm font-bold">{order.courier_name}</div>
          {order.courier_phone && <div className="text-xs text-[var(--color-ink)]/60">{order.courier_phone}</div>}
        </div>
      )}

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--color-ink)]/50">Détail</div>
        {order.items.map((line, i) => (
          <div key={i} className="flex justify-between py-1 text-sm">
            <div>
              {line.qty}× {line.name}
            </div>
            <div>{formatFcfa(line.line_total)}</div>
          </div>
        ))}
        {order.donation_amount > 0 && (
          <div className="flex justify-between py-1 text-sm">
            <div>🤍 Don caritatif</div>
            <div>{formatFcfa(order.donation_amount)}</div>
          </div>
        )}
        <div className="mt-2 flex justify-between border-t border-[var(--color-divider)] pt-2 text-sm font-bold">
          <div>Total</div>
          <div>{formatFcfa(order.total)}</div>
        </div>
        <div className="mt-2 text-xs text-[var(--color-ink)]/50">📍 {order.delivery_address}</div>
      </div>

      {order.status === 'delivered' && !ratingSent && (
        <div className="mt-6 rounded-2xl bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm font-bold">Notez votre expérience</div>
          <div className="mb-4 flex gap-2 text-2xl">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} className={n <= rating ? 'text-amber-400' : 'text-[var(--color-divider)]'}>
                ★
              </button>
            ))}
          </div>
          <Button block onClick={submitRating}>
            Envoyer
          </Button>
        </div>
      )}
      {ratingSent && <div className="mt-6 text-center text-sm text-[var(--color-ink)]/60">Merci pour votre avis !</div>}
    </div>
  )
}
