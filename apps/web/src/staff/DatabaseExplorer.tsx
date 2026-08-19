import { useMemo } from 'react'
import { useAllOrders } from '@/hooks/useOrders'
import { useAllAccounts } from '@/hooks/useAccounts'
import { useAllMenuItems } from '@/hooks/useMenu'
import { formatFCFA } from '@/lib/format'
import type { Order } from '@/types/domain'

function toCsv(header: string[], rows: (string | number)[][]): string {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  return [header.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n')
}

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function realOrders(orders: Order[]) {
  return orders.filter((o) => !o.deleted && !o.is_staff_meal)
}

function productStats(orders: Order[]) {
  const byName = new Map<string, { qty: number; revenue: number; cat: string }>()
  for (const o of realOrders(orders)) {
    for (const line of o.lines) {
      const entry = byName.get(line.name) ?? { qty: 0, revenue: 0, cat: line.cat }
      entry.qty += line.qty
      entry.revenue += line.lineTotal
      byName.set(line.name, entry)
    }
  }
  return Array.from(byName.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.qty - a.qty)
}

function customerStats(orders: Order[], accountsByEmail: Map<string, string>) {
  const byCustomer = new Map<string, { name: string; phone: string; email: string; count: number; total: number; first: string; last: string }>()
  for (const o of realOrders(orders)) {
    const key = o.customer_id ?? o.customer_phone
    const entry = byCustomer.get(key) ?? {
      name: o.customer_name,
      phone: o.customer_phone,
      email: (o.customer_id && accountsByEmail.get(o.customer_id)) || '',
      count: 0,
      total: 0,
      first: o.created_at,
      last: o.created_at,
    }
    entry.count += 1
    entry.total += o.total
    if (o.created_at < entry.first) entry.first = o.created_at
    if (o.created_at > entry.last) entry.last = o.created_at
    byCustomer.set(key, entry)
  }
  return Array.from(byCustomer.values())
    .map((c) => {
      const spanDays = (new Date(c.last).getTime() - new Date(c.first).getTime()) / 86400000
      const avgDaysBetween = c.count > 1 ? spanDays / (c.count - 1) : null
      return { ...c, avgDaysBetween }
    })
    .sort((a, b) => b.count - a.count)
}

export function DatabaseExplorer() {
  const { orders, loading: ordersLoading } = useAllOrders()
  const { accounts, loading: accountsLoading } = useAllAccounts()
  const { items: menuItems, loading: menuLoading } = useAllMenuItems()

  const accountsByEmail = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of accounts) if (a.email) m.set(a.id, a.email)
    return m
  }, [accounts])

  const products = useMemo(() => productStats(orders), [orders])
  const customers = useMemo(() => customerStats(orders, accountsByEmail), [orders, accountsByEmail])

  const exportProducts = () => {
    downloadCsv(
      `chez-sanji-produits-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        ['produit', 'categorie', 'quantite_vendue', 'revenu_fcfa'],
        products.map((p) => [p.name, p.cat, p.qty, p.revenue]),
      ),
    )
  }

  const exportCustomers = () => {
    downloadCsv(
      `chez-sanji-clients-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        ['nom', 'telephone', 'email', 'nb_commandes', 'total_depense_fcfa', 'premiere_commande', 'derniere_commande', 'jours_moyen_entre_commandes'],
        customers.map((c) => [
          c.name,
          c.phone,
          c.email,
          c.count,
          c.total,
          c.first,
          c.last,
          c.avgDaysBetween != null ? c.avgDaysBetween.toFixed(1) : '',
        ]),
      ),
    )
  }

  const exportCatalog = () => {
    downloadCsv(
      `chez-sanji-catalogue-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        ['nom', 'categorie', 'prix_fcfa', 'rupture_de_stock', 'supprime'],
        menuItems.map((i) => [i.name_fr, i.cat, i.price, i.out_of_stock ? 'oui' : 'non', i.deleted ? 'oui' : 'non']),
      ),
    )
  }

  const exportProfiles = () => {
    downloadCsv(
      `chez-sanji-profils-${new Date().toISOString().slice(0, 10)}.csv`,
      toCsv(
        ['pseudo', 'email', 'telephone', 'points_fidelite', 'cree_le'],
        accounts.map((a) => [a.profile_name, a.email ?? '', a.phone ?? '', a.loyalty_points, a.created_at]),
      ),
    )
  }

  const loading = ordersLoading || accountsLoading || menuLoading
  const mostSold = products.slice(0, 10)
  const leastSold = [...products].reverse().slice(0, 10)

  return (
    <div>
      <div className="mb-1 font-[var(--font-heading)] text-lg font-extrabold">Base de données</div>
      <div className="mb-4 text-xs text-[var(--color-ink)]/60">
        Produits, clients et profils, avec export CSV téléchargeable en un clic.
      </div>

      {loading && <div className="text-sm text-[var(--color-ink)]/50">…</div>}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">Produits distincts</div>
          <div className="mt-1 font-[var(--font-heading)] text-2xl font-extrabold">{products.length}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">Clients</div>
          <div className="mt-1 font-[var(--font-heading)] text-2xl font-extrabold">{customers.length}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">Profils enregistrés</div>
          <div className="mt-1 font-[var(--font-heading)] text-2xl font-extrabold">{accounts.length}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">Articles au menu</div>
          <div className="mt-1 font-[var(--font-heading)] text-2xl font-extrabold">{menuItems.length}</div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-[var(--color-divider)] bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-bold">🏆 Produits les plus vendus</div>
          <button onClick={exportProducts} className="rounded-lg border border-[var(--color-divider)] px-3 py-1.5 text-xs font-bold">
            Export CSV
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          {mostSold.map((p, i) => (
            <div key={p.name} className="flex items-center justify-between text-xs">
              <span>
                {i + 1}. {p.name}
              </span>
              <span className="text-[var(--color-ink)]/60">
                {p.qty}× · {formatFCFA(p.revenue)}
              </span>
            </div>
          ))}
          {mostSold.length === 0 && <div className="text-xs text-[var(--color-ink)]/50">Aucune donnée pour l'instant.</div>}
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-[var(--color-divider)] bg-white p-4">
        <div className="mb-3 text-sm font-bold">📉 Produits les moins vendus</div>
        <div className="flex flex-col gap-1.5">
          {leastSold.map((p) => (
            <div key={p.name} className="flex items-center justify-between text-xs">
              <span>{p.name}</span>
              <span className="text-[var(--color-ink)]/60">
                {p.qty}× · {formatFCFA(p.revenue)}
              </span>
            </div>
          ))}
          {leastSold.length === 0 && <div className="text-xs text-[var(--color-ink)]/50">Aucune donnée pour l'instant.</div>}
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-[var(--color-divider)] bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-bold">👥 Fréquence de commande par client</div>
          <button onClick={exportCustomers} className="rounded-lg border border-[var(--color-divider)] px-3 py-1.5 text-xs font-bold">
            Export CSV
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {customers.slice(0, 20).map((c) => (
            <div key={c.phone + c.name} className="flex items-center justify-between text-xs">
              <div>
                <div className="font-bold">{c.name || c.email || c.phone}</div>
                <div className="text-[var(--color-ink)]/50">
                  {c.count} commande{c.count > 1 ? 's' : ''}
                  {c.avgDaysBetween != null && ` · tous les ${c.avgDaysBetween.toFixed(1)} j en moyenne`}
                </div>
              </div>
              <span className="font-bold">{formatFCFA(c.total)}</span>
            </div>
          ))}
          {customers.length === 0 && <div className="text-xs text-[var(--color-ink)]/50">Aucune donnée pour l'instant.</div>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={exportProfiles} className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-bold">
          Exporter les profils clients (CSV)
        </button>
        <button onClick={exportCatalog} className="rounded-lg border border-[var(--color-divider)] bg-white px-4 py-2 text-sm font-bold">
          Exporter le catalogue produits (CSV)
        </button>
      </div>
    </div>
  )
}
