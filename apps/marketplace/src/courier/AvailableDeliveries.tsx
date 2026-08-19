import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/state/authStore'
import { useAvailableDeliveries } from '@/hooks/useOrders'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import { formatFcfa, formatDateTime, timeAgo } from '@/lib/format'
import { Button } from '@/components/Button'
import type { DeliveryOption } from '@/types/domain'

const DELIVERY_LABELS: Record<DeliveryOption, string> = {
  priority: '⚡ Priorité — à domicile',
  standard: '🚦 Standard — au carrefour',
  scheduled: '🗓️ Planifiée',
}

export function AvailableDeliveries() {
  const courier = useAuthStore((s) => s.courier)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const showToast = useToastStore((s) => s.show)
  const navigate = useNavigate()
  const isOnline = courier?.status !== 'offline'
  const { data: deliveries, loading } = useAvailableDeliveries(isOnline)

  const toggleOnline = async () => {
    if (!courier) return
    const next = courier.status === 'offline' ? 'online' : 'offline'
    await supabase.from('mk_couriers').update({ status: next }).eq('id', courier.id)
    await refreshProfile()
  }

  const claim = async (orderId: string) => {
    const { error } = await supabase.rpc('mk_courier_claim_order', { p_order_id: orderId })
    if (error) {
      showToast(error.message)
      return
    }
    showToast('Course prise en charge')
    navigate('/courier/mes-courses')
  }

  return (
    <div className="px-5 pt-8 pb-10">
      <div className="mb-1 font-[var(--font-heading)] text-2xl font-extrabold">Salut {courier?.full_name?.split(' ')[0]} 👋</div>
      <div className="mb-6 text-sm text-[var(--color-ink)]/60">Courses disponibles</div>

      <button
        onClick={toggleOnline}
        className={`mb-6 flex w-full items-center justify-between rounded-2xl p-4 shadow-sm ${isOnline ? 'bg-emerald-500 text-white' : 'bg-white text-[var(--color-ink)]'}`}
      >
        <div className="text-left">
          <div className="font-[var(--font-heading)] text-base font-bold">{isOnline ? 'En ligne' : 'Hors ligne'}</div>
          <div className={`text-xs ${isOnline ? 'text-white/80' : 'text-[var(--color-ink)]/50'}`}>
            {isOnline ? 'Vous recevez les courses disponibles' : 'Passez en ligne pour voir les courses'}
          </div>
        </div>
        <div className={`h-7 w-12 rounded-full p-1 transition ${isOnline ? 'bg-white/30' : 'bg-[var(--color-surface)]'}`}>
          <div className={`h-5 w-5 rounded-full bg-white transition ${isOnline ? 'translate-x-5' : ''}`} />
        </div>
      </button>

      {!isOnline && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-ink)]/50 shadow-sm">
          Passez en ligne pour voir les courses disponibles.
        </div>
      )}

      {isOnline && loading && <div className="py-16 text-center text-sm text-[var(--color-ink)]/50">Chargement…</div>}
      {isOnline && !loading && deliveries.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-ink)]/50 shadow-sm">
          Aucune course disponible pour le moment.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {deliveries.map((order) => (
          <div key={order.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-bold">{order.vendor_name}</div>
              <div className="text-xs text-[var(--color-ink)]/50">{timeAgo(order.ready_at ?? order.created_at)}</div>
            </div>
            <div className="mb-1 text-xs font-bold text-[var(--color-ink)]/70">{DELIVERY_LABELS[order.delivery_option]}</div>
            {order.delivery_option === 'scheduled' ? (
              <>
                {order.scheduled_at && <div className="mb-0.5 text-xs text-[var(--color-ink)]/60">🗓️ {formatDateTime(order.scheduled_at)}</div>}
                {order.meeting_point && <div className="mb-1 text-xs text-[var(--color-ink)]/60">📍 {order.meeting_point}</div>}
              </>
            ) : (
              <div className="mb-1 text-xs text-[var(--color-ink)]/60">📍 {order.delivery_address}</div>
            )}
            <div className="mb-3 text-sm font-bold text-[var(--color-accent-700)]">{formatFcfa(order.delivery_fee)} de frais de livraison</div>
            <Button variant="teal" block onClick={() => claim(order.id)}>
              Prendre cette course
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
