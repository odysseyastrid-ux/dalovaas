import { Link, useNavigate } from 'react-router-dom'
import { useCartStore } from '@/state/cartStore'
import { formatFcfa } from '@/lib/format'
import { Button } from '@/components/Button'

export function Cart() {
  const lines = useCartStore((s) => s.lines)
  const vendorName = useCartStore((s) => s.vendorName)
  const incrementQty = useCartStore((s) => s.incrementQty)
  const decrementQty = useCartStore((s) => s.decrementQty)
  const subtotal = useCartStore((s) => s.subtotal())
  const navigate = useNavigate()

  if (lines.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="mb-3 text-4xl">🛒</div>
        <div className="mb-2 font-[var(--font-heading)] text-lg font-bold">Panier vide</div>
        <div className="mb-6 text-sm text-[var(--color-ink)]/60">Parcourez les restaurants pour commencer.</div>
        <Link to="/customer" className="text-sm font-bold text-[var(--color-accent-700)] underline">
          Voir les restaurants
        </Link>
      </div>
    )
  }

  return (
    <div className="px-5 pt-8 pb-32">
      <div className="mb-1 font-[var(--font-heading)] text-2xl font-extrabold">Panier</div>
      <div className="mb-6 text-sm text-[var(--color-ink)]/60">{vendorName}</div>

      <div className="flex flex-col gap-3">
        {lines.map(({ item, qty }) => (
          <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-bold">{item.name}</div>
              <div className="text-xs text-[var(--color-ink)]/50">{formatFcfa(item.price)}</div>
            </div>
            <div className="flex items-center gap-3 rounded-full bg-[var(--color-surface)] px-3 py-1.5">
              <button onClick={() => decrementQty(item.id)} className="text-lg font-bold text-[var(--color-ink)]/60">
                −
              </button>
              <div className="w-4 text-center text-sm font-bold">{qty}</div>
              <button onClick={() => incrementQty(item.id)} className="text-lg font-bold text-[var(--color-ink)]/60">
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-[var(--color-divider)] bg-[var(--color-bg)] px-4 py-4">
        <div className="mb-3 flex justify-between text-sm">
          <div className="text-[var(--color-ink)]/60">Sous-total</div>
          <div className="font-bold">{formatFcfa(subtotal)}</div>
        </div>
        <Button block onClick={() => navigate('/customer/checkout')}>
          Commander
        </Button>
      </div>
    </div>
  )
}
