import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useVendorById } from '@/hooks/useVendors'
import { useMenuItems } from '@/hooks/useMenuItems'
import { useCartStore } from '@/state/cartStore'
import { formatFcfa } from '@/lib/format'
import { Button } from '@/components/Button'

export function VendorMenu() {
  const { vendorId } = useParams<{ vendorId: string }>()
  const navigate = useNavigate()
  const { data: vendors, loading: vendorLoading } = useVendorById(vendorId ?? null)
  const vendor = vendors[0] ?? null
  const { data: items, loading: itemsLoading } = useMenuItems(vendorId ?? null)
  const addItem = useCartStore((s) => s.addItem)
  const cartVendorId = useCartStore((s) => s.vendorId)
  const cartCount = useCartStore((s) => s.itemCount())
  const clearCart = useCartStore((s) => s.clear)
  const [pendingSwitch, setPendingSwitch] = useState<{ itemId: string } | null>(null)

  const categories = useMemo(() => {
    const map = new Map<string, typeof items>()
    for (const item of items.filter((i) => i.available)) {
      if (!map.has(item.category)) map.set(item.category, [])
      map.get(item.category)!.push(item)
    }
    return Array.from(map.entries())
  }, [items])

  const handleAdd = (item: (typeof items)[number]) => {
    if (cartVendorId && cartVendorId !== item.vendor_id) {
      setPendingSwitch({ itemId: item.id })
      return
    }
    addItem(item, vendor?.name ?? '')
  }

  const confirmSwitch = () => {
    if (!pendingSwitch) return
    clearCart()
    const item = items.find((i) => i.id === pendingSwitch.itemId)
    if (item) addItem(item, vendor?.name ?? '')
    setPendingSwitch(null)
  }

  if (vendorLoading) return <div className="py-16 text-center text-sm text-[var(--color-ink)]/50">Chargement…</div>
  if (!vendor) return <div className="py-16 text-center text-sm text-[var(--color-ink)]/50">Restaurant introuvable.</div>

  return (
    <div className="pb-24">
      <div className="relative h-36 bg-[image:var(--gradient-sunset)]">
        <Link to="/customer" className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg">
          ←
        </Link>
      </div>
      <div className="px-5 pt-4">
        <div className="font-[var(--font-heading)] text-2xl font-extrabold">{vendor.name}</div>
        <div className="mt-1 text-sm text-[var(--color-ink)]/60">
          {vendor.cuisine_type || 'Restaurant'} · {vendor.city}
        </div>
        <div className="mt-1 flex items-center gap-1 text-xs font-bold text-amber-500">
          ★ {vendor.rating.toFixed(1)} <span className="font-normal text-[var(--color-ink)]/40">({vendor.rating_count} avis)</span>
        </div>
        {vendor.description && <div className="mt-3 text-sm text-[var(--color-ink)]/70">{vendor.description}</div>}
      </div>

      {itemsLoading && <div className="py-16 text-center text-sm text-[var(--color-ink)]/50">Chargement du menu…</div>}
      {!itemsLoading && categories.length === 0 && (
        <div className="mx-5 mt-6 rounded-2xl bg-white p-6 text-center text-sm text-[var(--color-ink)]/50 shadow-sm">
          Ce restaurant n'a pas encore de menu disponible.
        </div>
      )}

      {categories.map(([category, catItems]) => (
        <div key={category} className="mt-6 px-5">
          <div className="mb-3 font-[var(--font-heading)] text-sm font-bold uppercase tracking-wide text-[var(--color-ink)]/50">
            {category}
          </div>
          <div className="flex flex-col gap-3">
            {catItems!.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-surface)] text-xl">
                  {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : '🍔'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{item.name}</div>
                  {item.description && <div className="truncate text-xs text-[var(--color-ink)]/50">{item.description}</div>}
                  <div className="mt-1 text-sm font-bold text-[var(--color-accent-700)]">{formatFcfa(item.price)}</div>
                </div>
                <button
                  onClick={() => handleAdd(item)}
                  className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-ink)] text-lg font-bold text-white"
                >
                  +
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {cartCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 px-4 pb-4">
          <Button block onClick={() => navigate('/customer/cart')}>
            Voir le panier · {cartCount} article{cartCount > 1 ? 's' : ''}
          </Button>
        </div>
      )}

      {pendingSwitch && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 px-4 pb-6">
          <div className="w-full rounded-2xl bg-white p-5">
            <div className="mb-2 font-[var(--font-heading)] text-base font-bold">Nouveau panier ?</div>
            <div className="mb-4 text-sm text-[var(--color-ink)]/70">
              Votre panier contient des articles d'un autre restaurant. Le vider pour ajouter celui-ci ?
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" block onClick={() => setPendingSwitch(null)}>
                Annuler
              </Button>
              <Button block onClick={confirmSwitch}>
                Vider et ajouter
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
