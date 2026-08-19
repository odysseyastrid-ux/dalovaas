import { Link } from 'react-router-dom'
import { useActiveVendors } from '@/hooks/useVendors'

export function VendorList() {
  const { data: vendors, loading } = useActiveVendors()

  return (
    <div className="px-5 pt-8">
      <div className="mb-1 font-[var(--font-heading)] text-2xl font-extrabold">Dalovaas</div>
      <div className="mb-6 text-sm text-[var(--color-ink)]/60">Que voulez-vous manger aujourd'hui ?</div>

      {loading && <div className="py-16 text-center text-sm text-[var(--color-ink)]/50">Chargement…</div>}

      {!loading && vendors.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-ink)]/50 shadow-sm">
          Aucun restaurant actif pour le moment. Revenez bientôt !
        </div>
      )}

      <div className="flex flex-col gap-3">
        {vendors.map((v) => (
          <Link
            key={v.id}
            to={`/customer/vendor/${v.id}`}
            className="flex items-center gap-4 rounded-2xl bg-white p-3 shadow-sm transition active:scale-[0.98]"
          >
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-surface)] text-2xl">
              {v.logo_url ? <img src={v.logo_url} alt="" className="h-full w-full object-cover" /> : '🍽️'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-[var(--font-heading)] text-base font-bold">{v.name}</div>
              <div className="truncate text-xs text-[var(--color-ink)]/60">{v.cuisine_type || 'Restaurant'} · {v.city}</div>
              <div className="mt-1 flex items-center gap-1 text-xs font-bold text-amber-500">
                ★ {v.rating.toFixed(1)}
                <span className="font-normal text-[var(--color-ink)]/40">({v.rating_count})</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
