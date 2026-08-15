import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { BackHeader } from '@/components/AppShell'
import { Button } from '@/components/Button'
import { Field, Input } from '@/components/Field'
import { useCartStore, cartSubtotal } from '@/state/cartStore'
import { useAuthStore } from '@/state/authStore'
import { useAppSettings } from '@/hooks/useAppSettings'
import { formatFCFA } from '@/lib/format'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import type { Fulfillment, PaymentMethod } from '@/types/domain'

type Step = 'summary' | 'payment' | 'result'

const FULFILLMENTS: Fulfillment[] = ['pickup', 'delivery', 'dine_in']
const PAYMENTS: PaymentMethod[] = ['orange_money', 'mtn_momo', 'cash']

export function CheckoutScreen() {
  const { t, lang, toggleLang } = useI18n()
  const navigate = useNavigate()
  const showToast = useToastStore((s) => s.show)
  const account = useAuthStore((s) => s.account)
  const { settings } = useAppSettings()

  const lines = useCartStore((s) => s.lines)
  const fulfillment = useCartStore((s) => s.fulfillment)
  const setFulfillment = useCartStore((s) => s.setFulfillment)
  const address = useCartStore((s) => s.address)
  const setAddress = useCartStore((s) => s.setAddress)
  const paymentMethod = useCartStore((s) => s.paymentMethod)
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod)
  const promoCode = useCartStore((s) => s.promoCode)
  const setPromoCode = useCartStore((s) => s.setPromoCode)
  const promoApplied = useCartStore((s) => s.promoApplied)
  const setPromoApplied = useCartStore((s) => s.setPromoApplied)
  const roundUpDonation = useCartStore((s) => s.roundUpDonation)
  const setRoundUpDonation = useCartStore((s) => s.setRoundUpDonation)
  const clearCart = useCartStore((s) => s.clear)

  const [step, setStep] = useState<Step>('summary')
  const [customerName, setCustomerName] = useState(account?.profile_name ?? '')
  const [customerPhone, setCustomerPhone] = useState(account?.phone ?? '')
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [placing, setPlacing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const subtotal = cartSubtotal(lines)
  const deliveryFee = fulfillment === 'delivery' ? 1500 : 0
  const discount = promoApplied ? Math.round(subtotal * 0.1) : 0
  const preDonationTotal = Math.max(0, subtotal + deliveryFee - discount)
  // Preview only -- the server recomputes this from the real total when the
  // order is created, same as every other price on the order.
  const donationPreview = roundUpDonation && preDonationTotal > 0 ? Math.ceil(preDonationTotal / 100) * 100 - preDonationTotal : 0
  const total = preDonationTotal + donationPreview
  const needsProof = paymentMethod !== 'cash'
  const payAccount = paymentMethod === 'orange_money' ? settings.payment_orange_money : settings.payment_mtn_momo

  const copyPayNumber = async () => {
    try {
      await navigator.clipboard.writeText(payAccount.number)
      showToast(lang === 'fr' ? 'Numéro copié' : 'Number copied')
    } catch {
      showToast(lang === 'fr' ? 'Impossible de copier' : 'Could not copy')
    }
  }

  const applyPromo = () => {
    if (promoCode.trim().toUpperCase() === 'SANJ10') {
      setPromoApplied(true)
      showToast(lang === 'fr' ? 'Promo appliquée : -10%' : 'Promo applied: 10% off')
    } else {
      showToast(lang === 'fr' ? 'Code promo invalide' : 'Invalid promo code')
    }
  }

  const cartLinesPayload = useMemo(
    () =>
      lines.map((l) => ({
        item_id: l.itemId,
        qty: l.qty,
        add_on_labels: l.addOns.map((a) => a.label),
        redemption_id: l.redemptionId ?? null,
      })),
    [lines],
  )

  const placeOrder = async () => {
    // The customer must not be able to place a non-cash order without a
    // receipt attached -- staff validation depends on being able to check it.
    if (needsProof && !proofFile) {
      showToast(lang === 'fr' ? 'Envoyez votre reçu avant de confirmer' : 'Upload your receipt before confirming')
      return
    }

    setPlacing(true)

    // Upload the receipt first, before creating the order, so a failed
    // upload blocks the order instead of silently leaving it unproven.
    let proofPath: string | null = null
    if (proofFile) {
      const uid = (await supabase.auth.getUser()).data.user?.id
      proofPath = `${uid}/${Date.now()}-${proofFile.name}`
      const { error: uploadErr } = await supabase.storage.from('payment-proofs').upload(proofPath, proofFile)
      if (uploadErr) {
        setPlacing(false)
        showToast(lang === 'fr' ? "Échec de l'envoi du reçu — réessayez" : 'Receipt upload failed — try again')
        return
      }
    }

    const { data: order, error } = await supabase.rpc('create_order', {
      p_customer_name: customerName,
      p_customer_phone: customerPhone,
      p_fulfillment: fulfillment,
      p_delivery_address: fulfillment === 'delivery' ? address : null,
      p_lines: cartLinesPayload,
      p_payment_method: paymentMethod,
      p_promo_code: promoApplied ? promoCode.trim().toUpperCase() : null,
      p_round_up_donation: roundUpDonation,
    })

    if (error || !order) {
      setPlacing(false)
      showToast(error?.message ?? 'Error')
      return
    }

    if (proofPath) {
      const { error: attachErr } = await supabase.rpc('attach_payment_proof', { p_ref: order.ref, p_proof_url: proofPath })
      if (attachErr) {
        // Order already exists at this point; surface it so the customer
        // knows to show staff their receipt manually rather than assume it's linked.
        showToast(lang === 'fr' ? 'Commande créée mais le reçu n’a pas pu être lié — montrez-le au staff' : 'Order created but receipt could not be linked — show it to staff')
      }
    }

    clearCart()
    setPlacing(false)
    navigate(`/tracking/${order.ref}`, { replace: true })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BackHeader
        title={t.checkoutTitle}
        onBack={() => (step === 'summary' ? navigate('/cart') : setStep(step === 'result' ? 'payment' : 'summary'))}
        right={
          <button
            onClick={toggleLang}
            className="rounded-full bg-[var(--color-surface)] px-3 py-1.5 font-[var(--font-heading)] text-[11px] font-bold"
          >
            {lang.toUpperCase()}
          </button>
        }
      />

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        {step === 'summary' && (
          <div className="rounded-xl border border-[var(--color-divider)] p-4">
            <div className="mb-3 font-[var(--font-heading)] text-sm font-bold">{t.orderSummary}</div>
            {lines.map((l) => (
              <div key={l.key} className="flex justify-between border-b border-[var(--color-divider)] py-1 text-xs">
                <span>
                  {l.qty}× {lang === 'fr' ? l.nameFr : l.name}
                </span>
                <span>{formatFCFA(l.unitPrice * l.qty)}</span>
              </div>
            ))}

            <div className="my-4 flex rounded-lg border border-[var(--color-divider)] p-1">
              {FULFILLMENTS.map((f) => (
                <button
                  key={f}
                  onClick={() => setFulfillment(f)}
                  className="flex-1 rounded-md py-2 text-[11px] font-bold"
                  style={{ background: fulfillment === f ? 'var(--color-accent)' : 'transparent' }}
                >
                  {f === 'pickup' ? t.fulfillmentPickup : f === 'delivery' ? t.fulfillmentDelivery : t.fulfillmentDineIn}
                </button>
              ))}
            </div>

            {fulfillment === 'delivery' && (
              <div className="mb-3">
                <Field label={t.deliveryAddress}>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Market Street" />
                </Field>
              </div>
            )}

            <div className="mb-3 flex gap-2">
              <input
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Promo: SANJ10"
                className="flex-1 rounded-lg border border-[var(--color-divider)] px-3 py-2 text-xs outline-none"
              />
              <button onClick={applyPromo} className="rounded-lg border border-[var(--color-divider)] px-3 py-2 text-xs font-bold">
                {t.apply}
              </button>
            </div>

            {preDonationTotal % 100 !== 0 && (
              <div
                onClick={() => setRoundUpDonation(!roundUpDonation)}
                className="mb-3 flex cursor-pointer items-center gap-3 rounded-lg border border-[var(--color-divider)] p-3"
              >
                {settings.charity_logo_url && (
                  <img
                    src={settings.charity_logo_url}
                    alt="Je lis, je m'épanouis"
                    className="h-9 w-9 flex-none rounded-lg border border-[var(--color-divider)] object-contain bg-white p-1"
                  />
                )}
                <div className="flex-1 text-xs">
                  <div className="font-bold">
                    {!settings.charity_logo_url && '🤍 '}{lang === 'fr' ? 'Arrondir pour la charité' : 'Round up for charity'}
                  </div>
                  <div className="mt-0.5 text-[var(--color-ink)]/60">
                    {lang === 'fr'
                      ? `Arrondir à ${formatFCFA(Math.ceil(preDonationTotal / 100) * 100)} et donner la différence à « Je lis, je m'épanouis ».`
                      : `Round up to ${formatFCFA(Math.ceil(preDonationTotal / 100) * 100)} and give the difference to "Je lis, je m'épanouis".`}
                  </div>
                </div>
                <div
                  className="h-[18px] w-[18px] flex-none rounded-full border-[1.5px] border-[var(--color-ink)]/60"
                  style={{ background: roundUpDonation ? 'var(--color-accent)' : 'transparent' }}
                />
              </div>
            )}

            <div className="border-t border-[var(--color-divider)] pt-3 text-xs text-[var(--color-ink)]/70">
              <div className="mb-1 flex justify-between">
                <span>{t.subtotal}</span>
                <span>{formatFCFA(subtotal)}</span>
              </div>
              <div className="mb-1 flex justify-between">
                <span>{t.deliveryFee}</span>
                <span>{formatFCFA(deliveryFee)}</span>
              </div>
              {promoApplied && (
                <div className="mb-1 flex justify-between text-[var(--color-accent-700)]">
                  <span>{t.promoLabel}</span>
                  <span>-{formatFCFA(discount)}</span>
                </div>
              )}
              {donationPreview > 0 && (
                <div className="mb-1 flex justify-between text-[var(--color-accent-700)]">
                  <span>🤍 {lang === 'fr' ? 'Don caritatif' : 'Charity donation'}</span>
                  <span>+{formatFCFA(donationPreview)}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between font-[var(--font-heading)] text-sm font-extrabold text-[var(--color-ink)]">
                <span>{t.total}</span>
                <span>{formatFCFA(total)}</span>
              </div>
            </div>

            <div className="mt-4">
              <Button block onClick={() => setStep('payment')}>
                {t.continuePayment}
              </Button>
            </div>
          </div>
        )}

        {step === 'payment' && (
          <div className="rounded-xl border border-[var(--color-divider)] p-4">
            <div className="mb-3">
              <Field label={t.customerName}>
                <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
              </Field>
            </div>
            <div className="mb-4">
              <Field label={t.customerPhone}>
                <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="6XX XX XX XX" />
              </Field>
            </div>
            <div className="mb-3 text-sm">
              {t.totalDue} {formatFCFA(total)}. {t.choosePayment}
            </div>
            {PAYMENTS.map((p) => (
              <div
                key={p}
                onClick={() => setPaymentMethod(p)}
                className="flex cursor-pointer items-center gap-3 border-b border-[var(--color-divider)] py-3"
              >
                {settings.payment_icons[p] && (
                  <img src={settings.payment_icons[p]} alt="" className="h-8 w-8 flex-none rounded-md object-cover" />
                )}
                <div className="flex-1 text-sm">
                  {p === 'orange_money' ? t.paymentOrangeMoney : p === 'mtn_momo' ? t.paymentMtnMomo : t.paymentCash}
                </div>
                <div
                  className="h-[18px] w-[18px] flex-none rounded-full border-[1.5px] border-[var(--color-ink)]/60"
                  style={{ background: paymentMethod === p ? 'var(--color-accent)' : 'transparent' }}
                />
              </div>
            ))}
            <div className="mt-4">
              <Button block disabled={!customerName || !customerPhone} onClick={() => setStep('result')}>
                {t.continuePayment}
              </Button>
            </div>
          </div>
        )}

        {step === 'result' && (
          <div className="rounded-xl border border-[var(--color-divider)] p-4">
            {needsProof && (
              <>
                <div className="mb-3 text-sm">{t.scanTransfer}</div>
                <div className="mb-3 rounded-lg bg-[var(--color-surface)] p-4">
                  <div className="flex items-center gap-3">
                    {settings.payment_icons[paymentMethod] && (
                      <img src={settings.payment_icons[paymentMethod]} alt="" className="h-8 w-8 rounded-md object-cover" />
                    )}
                    <div className="font-[var(--font-heading)] text-sm font-bold">
                      {paymentMethod === 'orange_money' ? 'Orange Money' : 'MTN MoMo'}
                    </div>
                  </div>
                  <div className="mt-2 text-lg font-bold tracking-wide">{payAccount.number || '—'}</div>
                  <div className="mt-1 text-xs text-[var(--color-ink)]/60">{payAccount.name || 'Chez Sanji'}</div>
                </div>
                <div className="mb-3 flex gap-2">
                  <button
                    onClick={copyPayNumber}
                    disabled={!payAccount.number}
                    className="flex-1 rounded-lg border border-[var(--color-divider)] px-3 py-2.5 text-xs font-bold disabled:opacity-40"
                  >
                    {t.copyNumber}
                  </button>
                  <a
                    href={`tel:${encodeURIComponent(payAccount.ussd)}`}
                    className="flex-1 rounded-lg border border-[var(--color-divider)] px-3 py-2.5 text-center text-xs font-bold"
                  >
                    {t.dialUssd} {payAccount.ussd}
                  </a>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                />
                <Button block variant="secondary" onClick={() => fileInputRef.current?.click()}>
                  {proofFile ? t.proofUploaded : t.uploadProof}
                </Button>
                {proofFile && <div className="mt-2 text-[11px] text-[var(--color-ink)]/60">{proofFile.name}</div>}
                {!proofFile && (
                  <div className="mt-2 text-[11px] text-[var(--color-accent-700)]">
                    {lang === 'fr' ? 'Envoyez votre reçu pour pouvoir confirmer' : 'Upload your receipt to confirm'}
                  </div>
                )}
                <div className="my-3" />
              </>
            )}
            <Button block disabled={placing || (needsProof && !proofFile)} onClick={placeOrder}>
              {placing ? '…' : t.placeOrder}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
