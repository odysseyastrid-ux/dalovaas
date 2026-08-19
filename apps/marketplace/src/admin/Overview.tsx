import { useMemo } from 'react'
import { useAllVendors } from '@/hooks/useVendors'
import { useAllCouriers } from '@/hooks/useCouriers'
import { useAllOrders } from '@/hooks/useOrders'
import { formatFcfa } from '@/lib/format'
import { useAuthStore } from '@/state/authStore'
import { Button } from '@/components/Button'

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-[var(--color-ink)]/50">{label}</div>
      <div className="mt-1 font-[var(--font-heading)] text-xl font-extrabold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[var(--color-ink)]/50">{sub}</div>}
    </div>
  )
}

export function Overview() {
  const { data: vendors } = useAllVendors()
  const { data: couriers } = useAllCouriers(true)
  const { data: orders } = useAllOrders(true)
  const signOut = useAuthStore((s) => s.signOut)

  const stats = useMemo(() => {
    const delivered = orders.filter((o) => o.status === 'delivered')
    const gmv = delivered.reduce((sum, o) => sum + o.total, 0)
    const commission = delivered.reduce((sum, o) => sum + o.commission_amount, 0)
    return {
      vendorsActive: vendors.filter((v) => v.status === 'active').length,
      vendorsPending: vendors.filter((v) => v.status === 'pending').length,
      couriersOnline: couriers.filter((c) => c.status !== 'offline').length,
      couriersTotal: couriers.length,
      ordersToday: orders.filter((o) => new Date(o.created_at).toDateString() === new Date().toDateString()).length,
      deliveredCount: delivered.length,
      gmv,
      commission,
    }
  }, [vendors, couriers, orders])

  return (
    <div className="px-5 pt-8 pb-10">
      <div className="mb-1 font-[var(--font-heading)] text-2xl font-extrabold">Tableau de bord</div>
      <div className="mb-6 text-sm text-[var(--color-ink)]/60">Dalovaas — vue plateforme</div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="GMV livré" value={formatFcfa(stats.gmv)} sub={`${stats.deliveredCount} commandes livrées`} />
        <StatCard label="Revenu plateforme" value={formatFcfa(stats.commission)} sub="commissions cumulées" />
        <StatCard label="Restaurants actifs" value={String(stats.vendorsActive)} sub={stats.vendorsPending > 0 ? `${stats.vendorsPending} en attente` : 'aucun en attente'} />
        <StatCard label="Livreurs en ligne" value={`${stats.couriersOnline} / ${stats.couriersTotal}`} />
        <StatCard label="Commandes aujourd'hui" value={String(stats.ordersToday)} />
      </div>

      <Button variant="secondary" block onClick={signOut} className="mt-10">
        Se déconnecter
      </Button>
    </div>
  )
}
