import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { BackHeader } from '@/components/AppShell'
import { Button } from '@/components/Button'
import { useOrderByRef } from '@/hooks/useOrders'
import { formatFCFA, formatCountdown } from '@/lib/format'
import { downloadReceipt } from '@/lib/receipt'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'

export function TrackingScreen() {
  const { ref } = useParams()
  const navigate = useNavigate()
  const { t, lang } = useI18n()
  const showToast = useToastStore((s) => s.show)
  const { order, loading } = useOrderByRef(ref ?? null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  if (loading) return <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-ink)]/50">…</div>
  if (!order) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="text-sm text-[var(--color-ink)]/60">404</div>
        <Button onClick={() => navigate('/')}>{t.backHome}</Button>
      </div>
    )
  }

  const STEP_LABELS = [t.stepReceived, t.stepPreparing, t.stepReady, t.stepDelivered]
  const remainingMs = order.step_deadline ? new Date(order.step_deadline).getTime() - now : 0

  const shareLocation = () => {
    if (!navigator.geolocation) {
      showToast(lang === 'fr' ? 'Géolocalisation indisponible' : 'Geolocation unavailable')
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await supabase.rpc('share_order_location', {
          p_ref: order.ref,
          p_lat: pos.coords.latitude,
          p_lng: pos.coords.longitude,
        })
        showToast(lang === 'fr' ? 'Position partagée' : 'Location shared')
      },
      () => showToast(lang === 'fr' ? 'Impossible d’obtenir la position' : 'Could not get location'),
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BackHeader title={t.orderStatus} onBack={() => navigate('/')} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex items-center justify-between border-b border-[var(--color-divider)] pb-4">
          <div>
            <div className="font-[var(--font-heading)] text-[15px] font-bold">{order.ref}</div>
            <div className="mt-0.5 text-xs text-[var(--color-ink)]/60">
              {order.lines.length} {lang === 'fr' ? 'article(s)' : 'item(s)'} · {formatFCFA(order.total)}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <span className="rounded-full border border-[var(--color-divider)] px-2 py-0.5 text-[10px]">
              {order.fulfillment === 'pickup' ? t.fulfillmentPickup : order.fulfillment === 'delivery' ? t.fulfillmentDelivery : t.fulfillmentDineIn}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px]"
              style={{ background: order.paid ? 'var(--color-accent)' : 'var(--color-surface)' }}
            >
              {order.paid ? (lang === 'fr' ? 'Payé' : 'Paid') : (lang === 'fr' ? 'Non payé' : 'Unpaid')}
            </span>
          </div>
        </div>

        {order.donation_amount > 0 && (
          <div className="mb-4 rounded-xl border border-[var(--color-divider)] bg-[var(--color-surface)] p-3 text-center text-xs">
            🤍 {lang === 'fr'
              ? `Merci ! ${formatFCFA(order.donation_amount)} de votre commande ira à une association caritative.`
              : `Thank you! ${formatFCFA(order.donation_amount)} from your order will go to a charity.`}
          </div>
        )}

        {order.pending_validation ? (
          <div className="rounded-xl border-2 border-[var(--color-accent)] p-4 text-center">
            <div className="font-[var(--font-heading)] text-sm font-extrabold">{t.pendingValidationTitle}</div>
            <div className="mt-1 text-xs text-[var(--color-ink)]/70">{t.pendingValidationDesc}</div>
          </div>
        ) : (
          <>
            {STEP_LABELS.map((label, i) => {
              const done = i <= order.order_status_index
              return (
                <div key={label} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-white"
                      style={{ background: done ? 'var(--color-accent)' : 'var(--color-divider)' }}
                    >
                      {done && '✓'}
                    </div>
                    {i < 3 && <div className="min-h-8 w-0.5 flex-1" style={{ background: done ? 'var(--color-accent)' : 'var(--color-divider)' }} />}
                  </div>
                  <div className="pb-6">
                    <div className="font-[var(--font-heading)] text-sm font-bold" style={{ color: done ? 'var(--color-ink)' : 'var(--color-ink)/40' }}>
                      {label}
                    </div>
                  </div>
                </div>
              )
            })}

            {order.order_status_index === 1 && order.step_deadline && (
              <div className="mt-1 rounded-xl border border-[var(--color-divider)] p-4">
                <div className="text-xs text-[var(--color-ink)]/60">{t.estimated}</div>
                <div className="mt-1.5 font-[var(--font-heading)] text-xl font-extrabold text-[var(--color-accent-700)]">
                  {formatCountdown(remainingMs)}
                </div>
              </div>
            )}

            <div className="mt-3 rounded-xl border-2 border-[var(--color-accent)] p-4 text-center">
              <div className="text-xs text-[var(--color-ink)]/60">{t.pickupCodeLabel}</div>
              <div className="mt-1 font-[var(--font-heading)] text-3xl font-extrabold tracking-widest">{order.pickup_code}</div>
              <div className="mt-1 text-xs text-[var(--color-ink)]/60">{t.pickupCodeDesc}</div>
            </div>

            {order.fulfillment === 'delivery' && !order.location && (
              <div className="mt-3">
                <Button block variant="secondary" onClick={shareLocation}>
                  {lang === 'fr' ? 'Partager ma position' : 'Share my location'}
                </Button>
              </div>
            )}
          </>
        )}

        <div className="mt-3 flex flex-col gap-2">
          <Button block variant="secondary" onClick={() => downloadReceipt(order, lang)}>
            {lang === 'fr' ? 'Télécharger le reçu' : 'Download receipt'}
          </Button>
          <Button block variant="secondary" onClick={() => navigate('/')}>
            {t.backHome}
          </Button>
        </div>
      </div>
    </div>
  )
}
