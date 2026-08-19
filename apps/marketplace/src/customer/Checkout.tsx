import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '@/state/cartStore'
import { useAuthStore } from '@/state/authStore'
import { useVendorById } from '@/hooks/useVendors'
import { supabase } from '@/lib/supabaseClient'
import { formatFcfa } from '@/lib/format'
import { haversineKm, estimateDeliveryFee } from '@/lib/geo'
import { Field, Input, Textarea } from '@/components/Field'
import { Button } from '@/components/Button'
import type { DeliveryOption, MkOrder, PaymentMethod } from '@/types/domain'
import clsx from 'clsx'

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string; emoji: string }[] = [
  { value: 'mtn_momo', label: 'MTN MoMo', emoji: '📱' },
  { value: 'orange_money', label: 'Orange Money', emoji: '🧡' },
  { value: 'cash', label: 'Espèces à la livraison', emoji: '💵' },
]

const DELIVERY_OPTIONS: { value: DeliveryOption; label: string; emoji: string; desc: string }[] = [
  { value: 'priority', label: 'Priorité', emoji: '⚡', desc: 'Livré directement chez vous, au plus vite.' },
  { value: 'standard', label: 'Standard', emoji: '🚦', desc: 'Rendez-vous avec le livreur au carrefour le plus proche.' },
  { value: 'scheduled', label: 'Planifier', emoji: '🗓️', desc: 'Vous choisissez l\'heure et le lieu de rendez-vous.' },
]

type GeoStatus = 'locating' | 'ok' | 'denied'

export function Checkout() {
  const navigate = useNavigate()
  const lines = useCartStore((s) => s.lines)
  const vendorId = useCartStore((s) => s.vendorId)
  const subtotal = useCartStore((s) => s.subtotal())
  const clearCart = useCartStore((s) => s.clear)
  const customer = useAuthStore((s) => s.customer)
  const { data: vendors } = useVendorById(vendorId)
  const vendor = vendors[0] ?? null

  const [name, setName] = useState(customer?.full_name ?? '')
  const [address, setAddress] = useState(customer?.default_address ?? '')
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('standard')
  const [scheduledAt, setScheduledAt] = useState('')
  const [meetingPoint, setMeetingPoint] = useState('')
  const [roundUp, setRoundUp] = useState(false)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('locating')

  const locate = () => {
    if (!navigator.geolocation) {
      setGeoStatus('denied')
      return
    }
    setGeoStatus('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoStatus('ok')
      },
      () => setGeoStatus('denied'),
      { timeout: 8000 },
    )
  }

  useEffect(() => {
    locate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const distanceKm = useMemo(() => {
    if (!coords || vendor?.lat == null || vendor?.lng == null) return null
    return haversineKm(vendor.lat, vendor.lng, coords.lat, coords.lng)
  }, [coords, vendor])

  const deliveryFeeEstimate = estimateDeliveryFee(deliveryOption, distanceKm)
  const preDonationTotal = subtotal + deliveryFeeEstimate
  const donationEstimate = roundUp ? Math.ceil(preDonationTotal / 100) * 100 - preDonationTotal : 0
  const total = preDonationTotal + donationEstimate

  const scheduledValid = deliveryOption !== 'scheduled' || (!!scheduledAt && !!meetingPoint.trim())

  const placeOrder = async () => {
    if (!vendorId || lines.length === 0 || !address.trim() || !name.trim() || !scheduledValid) return
    setPlacing(true)
    setError(null)

    const { data, error: err } = await supabase.rpc('mk_create_order', {
      p_vendor_id: vendorId,
      p_items: lines.map((l) => ({ item_id: l.item.id, qty: l.qty })),
      p_delivery_address: address.trim(),
      p_delivery_lat: coords?.lat ?? null,
      p_delivery_lng: coords?.lng ?? null,
      p_payment_method: paymentMethod,
      p_customer_name: name.trim(),
      p_customer_phone: customer?.phone ?? '',
      p_delivery_option: deliveryOption,
      p_scheduled_at: deliveryOption === 'scheduled' ? new Date(scheduledAt).toISOString() : null,
      p_meeting_point: deliveryOption === 'scheduled' ? meetingPoint.trim() : null,
      p_round_up_donation: roundUp,
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
        <Field label="Adresse / quartier">
          <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Quartier, rue, repère…" rows={2} />
        </Field>

        <div className="rounded-xl bg-white px-3.5 py-3 text-xs">
          {geoStatus === 'locating' && <span className="text-[var(--color-ink)]/50">📍 Localisation en cours…</span>}
          {geoStatus === 'ok' && <span className="text-emerald-600 font-bold">📍 Position détectée — tarifs calculés selon la distance</span>}
          {geoStatus === 'denied' && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[var(--color-ink)]/50">📍 Position indisponible — tarif estimé par défaut</span>
              <button onClick={locate} className="font-bold text-[var(--color-accent-700)] underline flex-shrink-0">
                Réessayer
              </button>
            </div>
          )}
        </div>

        <div>
          <div className="mb-1.5 font-[var(--font-heading)] text-xs font-bold uppercase tracking-wide text-[var(--color-ink)]/70">
            Mode de livraison
          </div>
          <div className="flex flex-col gap-2">
            {DELIVERY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDeliveryOption(opt.value)}
                className={clsx(
                  'flex items-start gap-3 rounded-xl border p-3 text-left',
                  deliveryOption === opt.value ? 'border-[var(--color-accent)] bg-orange-50' : 'border-[var(--color-divider)] bg-white',
                )}
              >
                <span className="text-lg">{opt.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold">{opt.label}</span>
                    <span className="text-sm font-bold text-[var(--color-accent-700)]">
                      {formatFcfa(estimateDeliveryFee(opt.value, distanceKm))}
                    </span>
                  </div>
                  <div className="text-xs text-[var(--color-ink)]/60">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {deliveryOption === 'scheduled' && (
          <div className="flex flex-col gap-3 rounded-xl bg-white p-3 shadow-sm">
            <Field label="Date et heure du rendez-vous">
              <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </Field>
            <Field label="Lieu de rendez-vous">
              <Input value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} placeholder="Ex : Carrefour Warda, devant la pharmacie" />
            </Field>
          </div>
        )}

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

        <button
          onClick={() => setRoundUp((v) => !v)}
          className={clsx(
            'flex items-center justify-between gap-3 rounded-xl border p-3 text-left',
            roundUp ? 'border-[var(--color-accent)] bg-orange-50' : 'border-[var(--color-divider)] bg-white',
          )}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🤍</span>
            <span className="text-sm font-bold">Arrondir pour la charité</span>
          </div>
          <span className={clsx('h-5 w-9 flex-shrink-0 rounded-full p-0.5 transition', roundUp ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-divider)]')}>
            <span className={clsx('block h-4 w-4 rounded-full bg-white transition', roundUp && 'translate-x-4')} />
          </span>
        </button>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex justify-between text-sm">
            <div className="text-[var(--color-ink)]/60">Sous-total</div>
            <div>{formatFcfa(subtotal)}</div>
          </div>
          <div className="mt-1.5 flex justify-between text-sm">
            <div className="text-[var(--color-ink)]/60">Livraison ({DELIVERY_OPTIONS.find((o) => o.value === deliveryOption)?.label})</div>
            <div>{formatFcfa(deliveryFeeEstimate)}</div>
          </div>
          {roundUp && donationEstimate > 0 && (
            <div className="mt-1.5 flex justify-between text-sm">
              <div className="text-[var(--color-ink)]/60">🤍 Don caritatif</div>
              <div>{formatFcfa(donationEstimate)}</div>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-[var(--color-divider)] pt-2 text-base font-bold">
            <div>Total</div>
            <div>{formatFcfa(total)}</div>
          </div>
        </div>

        {error && <div className="text-xs text-red-600">{error}</div>}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-[var(--color-divider)] bg-[var(--color-bg)] px-4 py-4">
        <Button block disabled={placing || !address.trim() || !name.trim() || !scheduledValid} onClick={placeOrder}>
          {placing ? '…' : `Payer ${formatFcfa(total)}`}
        </Button>
      </div>
    </div>
  )
}
