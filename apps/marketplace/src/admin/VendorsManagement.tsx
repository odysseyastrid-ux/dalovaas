import { useState } from 'react'
import clsx from 'clsx'
import { useAllVendors } from '@/hooks/useVendors'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import { VendorStatusPill } from '@/components/StatusPill'
import { Button } from '@/components/Button'
import type { VendorStatus } from '@/types/domain'

const TABS: { key: VendorStatus | 'all'; label: string }[] = [
  { key: 'pending', label: 'En attente' },
  { key: 'active', label: 'Actifs' },
  { key: 'suspended', label: 'Suspendus' },
  { key: 'all', label: 'Tous' },
]

export function VendorsManagement() {
  const { data: vendors, loading } = useAllVendors()
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('pending')
  const showToast = useToastStore((s) => s.show)

  const visible = tab === 'all' ? vendors : vendors.filter((v) => v.status === tab)

  const setStatus = async (vendorId: string, status: VendorStatus) => {
    const { error } = await supabase.rpc('mk_admin_set_vendor_status', { p_vendor_id: vendorId, p_status: status })
    if (error) showToast(error.message)
    else showToast('Statut mis à jour')
  }

  return (
    <div className="px-5 pt-8 pb-10">
      <div className="mb-6 font-[var(--font-heading)] text-2xl font-extrabold">Restaurants</div>

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
      {!loading && visible.length === 0 && (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-[var(--color-ink)]/50 shadow-sm">Aucun restaurant ici.</div>
      )}

      <div className="flex flex-col gap-3">
        {visible.map((v) => (
          <div key={v.id} className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-1 flex items-center justify-between">
              <div className="text-sm font-bold">{v.name}</div>
              <VendorStatusPill status={v.status} />
            </div>
            <div className="mb-3 text-xs text-[var(--color-ink)]/50">
              {v.cuisine_type || 'Restaurant'} · {v.city} · {v.phone}
            </div>
            <div className="flex gap-2">
              {v.status !== 'active' && (
                <Button variant="teal" className="flex-1" onClick={() => setStatus(v.id, 'active')}>
                  Activer
                </Button>
              )}
              {v.status !== 'suspended' && (
                <Button variant="danger" className="flex-1" onClick={() => setStatus(v.id, 'suspended')}>
                  Suspendre
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
