import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '@/state/cartStore'
import { useAuthStore } from '@/state/authStore'
import { supabase } from '@/lib/supabaseClient'
import { formatFcfa } from '@/lib/format'
import { Field, Input, Textarea } from '@/components/Field'
import { Button } from '@/components/Button'
import type { MkOrder, PaymentMethod } from '@/types/domain'
import clsx from 'clsx'

const DELIVERY_FEE = 1000

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; emoji: string }[] = [
  { value: 'mtn_momo', label: 'MTN MoMo', emoji: '📱' },
  { value: 'orange_money', label: 'Orange Money', emoji: '🧡' },
  { value: 'cash', label: 'Espèces à la livraison', emoji: '💵' },
]

export function Checkout() {
  const navigate = useNavigate()
  const lines = useCartStore((s) => s.lines)
  const vendorId = useCartStore((s) => s.vendorId)
  const subtotal = useCartStore((s) => s.subtotal())
  const clearCart = useCartStore((s) => s.clear)
  const customer = useAuthStore((s) => s.customer)

  const [name, setName] = useState(customer?.full_name ?? '')
  const [address, setAddress] = useState(customer?.default_address ?? '')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const placeOrder = async () => {
    if (!vendorId || lines.length === 0 || !address.trim() || !name.trim()) return
    setPlacing(true)
    setError(null)

    const { data, error: err } = await supabase.rpc('mk_create_order', {
      p_vendor_id: vendorId,
      p_items: lines.map((l) => ({ item_id: l.item.id, qty: l.qty })),
      p_delivery_address: address.trim(),
      p_delivery_lat: null,
      p_delivery_lng: null,
      p_payment_method: paymentMethod,
      p_customer_name: name.trim(),
      p_customer_phone: customer?.phone ?? '',
      p_notes: notes.trim() || null,
    })

    setPlacing(false)
    if (err) {
      setError(err.message)
      return
    }
    const order = data as MkOrder
    clearCart()
    navigate(`/customer/orders/${order.ref}`, { replace: true })
  }

  useEffect(() => {
    if (lines.length === 0) navigate('/customer/cart', { replace: true })
  }, [lines.length, navigate])

  if (lines.length === 0) return null

  return (
    <div className="px-5 pt-8 pb-32">
      <div className="mb-6 font-[var(--font-heading)] text-2xl font-extrabold">Livraison</div>

      <div className="flex flex-col gap-4">
        <Field label="Nom complet">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Votre nom" />
        </Field>
        <Field label="Adresse de livraison">
          <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Quartier, rue, repère…" rows={2} />
        </Field>
        <Field label="Note pour le livreur (optionnel)">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex : portail bleu" />
        </Field>

        <div>
          <div className="mb-1.5 font-[var(--font-heading)] text-xs font-bold uppercase tracking-wide text-[var(--color-ink)]/70">
            Paiement
          </div>
          <div className="flex flex-col gap-2">
            {PAYMENT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setPaymentMethod(opt.value)}
                className={clsx(
                  'flex items-center gap-3 rounded-xl border p-3 text-left text-sm font-bold',
                  paymentMethod === opt.value ? 'border-[var(--color-accent)] bg-orange-50' : 'border-[var(--color-divider)] bg-white',
                )}
              >
                <span className="text-lg">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex justify-between text-sm">
            <div className="text-[var(--color-ink)]/60">Sous-total</div>
            <div>{formatFcfa(subtotal)}</div>
          </div>
          <div className="mt-1.5 flex justify-between text-sm">
            <div className="text-[var(--color-ink)]/60">Livraison</div>
            <div>{formatFcfa(DELIVERY_FEE)}</div>
          </div>
          <div className="mt-2 flex justify-between border-t border-[var(--color-divider)] pt-2 text-base font-bold">
            <div>Total</div>
            <div>{formatFcfa(subtotal + DELIVERY_FEE)}</div>
          </div>
        </div>

        {error && <div className="text-xs text-red-600">{error}</div>}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-[var(--color-divider)] bg-[var(--color-bg)] px-4 py-4">
        <Button block disabled={placing || !address.trim() || !name.trim()} onClick={placeOrder}>
          {placing ? '…' : `Payer ${formatFcfa(subtotal + DELIVERY_FEE)}`}
        </Button>
      </div>
    </div>
  )
}
