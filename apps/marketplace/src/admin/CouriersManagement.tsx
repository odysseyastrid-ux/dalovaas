import { useAllCouriers } from '@/hooks/useCouriers'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import { Button } from '@/components/Button'

const STATUS_LABELS: Record<string, string> = { offline: 'Hors ligne', online: 'En ligne', on_delivery: 'En livraison' }

export function CouriersManagement() {
  const { data: couriers, loading } = useAllCouriers(true)
  const showToast = useToastStore((s) => s.show)

  const setActive = async (courierId: string, active: boolean) => {
    const { error } = await supabase.rpc('mk_admin_set_courier_active', { p_courier_id: courierId, p_active: active })
    if (error) showToast(error.message)
    else showToast(active ? 'Livreur réactivé' : 'Livreur désactivé')
  }

  return (
    <div className="px-5 pt-8 pb-10">
      <div className="mb-6 font-[var(--font-heading)] text-2xl font-extrabold">Livreurs</div>

      {loading && <div className="py-16 text-center text-sm text-[var(--color-ink)]/50">Chargement…</div>}
      {!loading && couriers.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-ink)]/50 shadow-sm">Aucun livreur inscrit.</div>
      )}

      <div className="flex flex-col gap-3">
        {couriers.map((c) => (
          <div key={c.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-sm font-bold">{c.full_name}</div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${c.status === 'offline' ? 'bg-[var(--color-surface)] text-[var(--color-ink)]/50' : 'bg-emerald-100 text-emerald-700'}`}>
                {STATUS_LABELS[c.status]}
              </span>
            </div>
            <div className="mb-3 text-xs text-[var(--color-ink)]/50">
              {c.phone} · {c.city} · {c.vehicle_type} · ★ {c.rating.toFixed(1)} ({c.rating_count})
            </div>
            <Button variant={c.active ? 'danger' : 'teal'} block onClick={() => setActive(c.id, !c.active)}>
              {c.active ? 'Désactiver' : 'Réactiver'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
