import { useState } from 'react'
import clsx from 'clsx'
import { useAllCouriers } from '@/hooks/useCouriers'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import { Button } from '@/components/Button'

const STATUS_LABELS: Record<string, string> = { offline: 'Hors ligne', online: 'En ligne', on_delivery: 'En livraison' }

const TABS = [
  { key: 'pending', label: 'À vérifier' },
  { key: 'verified', label: 'Vérifiés' },
  { key: 'all', label: 'Tous' },
] as const

export function CouriersManagement() {
  const { data: couriers, loading } = useAllCouriers(true)
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('pending')
  const showToast = useToastStore((s) => s.show)

  const visible = tab === 'all' ? couriers : couriers.filter((c) => (tab === 'verified' ? c.verified : !c.verified))
  const pendingCount = couriers.filter((c) => !c.verified).length

  const setActive = async (courierId: string, active: boolean) => {
    const { error } = await supabase.rpc('mk_admin_set_courier_active', { p_courier_id: courierId, p_active: active })
    if (error) showToast(error.message)
    else showToast(active ? 'Livreur réactivé' : 'Livreur désactivé')
  }

  const setVerified = async (courierId: string, verified: boolean) => {
    const { error } = await supabase.rpc('mk_admin_verify_courier', { p_courier_id: courierId, p_verified: verified })
    if (error) showToast(error.message)
    else showToast(verified ? 'Livreur vérifié' : 'Vérification retirée')
  }

  return (
    <div className="px-5 pt-8 pb-10">
      <div className="mb-6 font-[var(--font-heading)] text-2xl font-extrabold">Livreurs</div>

      <div className="mb-5 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'flex-shrink-0 rounded-full px-3.5 py-2 text-xs font-bold',
              tab === t.key ? 'bg-[var(--color-ink)] text-white' : 'bg-white text-[var(--color-ink)]/60',
            )}
          >
            {t.label} {t.key === 'pending' && pendingCount > 0 && `(${pendingCount})`}
          </button>
        ))}
      </div>

      {loading && <div className="py-16 text-center text-sm text-[var(--color-ink)]/50">Chargement…</div>}
      {!loading && visible.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-ink)]/50 shadow-sm">Aucun livreur ici.</div>
      )}

      <div className="flex flex-col gap-3">
        {visible.map((c) => (
          <div key={c.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-sm font-bold">{c.full_name}</div>
              <div className="flex gap-1.5">
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${c.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {c.verified ? '✓ Vérifié' : 'À vérifier'}
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${c.status === 'offline' ? 'bg-[var(--color-surface)] text-[var(--color-ink)]/50' : 'bg-blue-100 text-blue-700'}`}>
                  {STATUS_LABELS[c.status]}
                </span>
              </div>
            </div>
            <div className="mb-1 text-xs text-[var(--color-ink)]/50">
              📞 {c.phone} · {c.city} · {c.vehicle_type}
              {c.plate_number && ` · ${c.plate_number}`} · ★ {c.rating.toFixed(1)} ({c.rating_count})
            </div>
            <div className="mb-1 text-xs text-[var(--color-ink)]/50">🪪 CNI {c.id_number || '—'}</div>
            <div className="mb-1 text-xs text-[var(--color-ink)]/50">📍 {c.address || '—'}</div>
            {c.emergency_contact_phone && (
              <div className="mb-3 text-xs text-[var(--color-ink)]/50">🆘 Urgence : {c.emergency_contact_phone}</div>
            )}
            <div className="mt-3 flex gap-2">
              <Button variant={c.verified ? 'secondary' : 'teal'} className="flex-1" onClick={() => setVerified(c.id, !c.verified)}>
                {c.verified ? 'Retirer la vérification' : 'Vérifier'}
              </Button>
              <Button variant={c.active ? 'danger' : 'secondary'} className="flex-1" onClick={() => setActive(c.id, !c.active)}>
                {c.active ? 'Désactiver' : 'Réactiver'}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
