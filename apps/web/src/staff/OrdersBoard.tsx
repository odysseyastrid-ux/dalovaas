import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { useActiveOrders } from '@/hooks/useOrders'
import { useOtpRelayQueue } from '@/hooks/useOtpRelayQueue'
import { useTodayStats } from '@/hooks/useTodayStats'
import { formatFCFA } from '@/lib/format'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import { playOrderAlert, playOtpAlert } from '@/lib/sound'
import type { Order } from '@/types/domain'

const FULFILLMENT_LABEL: Record<string, string> = { pickup: 'À emporter', delivery: 'Livraison', dine_in: 'Sur place' }
const STAFF_GROUP_LINK = import.meta.env.VITE_STAFF_WHATSAPP_GROUP_LINK as string | undefined

function buildStaffGroupMessage(order: Order, kind: 'created' | 'validated') {
  const grouped: Record<string, string[]> = {}
  for (const line of order.lines) {
    const cat = line.cat || 'Autre'
    ;(grouped[cat] ??= []).push(`${line.qty}x ${line.name}`)
  }
  const itemsText = Object.entries(grouped).map(([cat, items]) => `${cat}: ${items.join(', ')}`).join('\n')
  const header = kind === 'validated' ? '✅ Commande validée' : '🆕 Nouvelle commande'
  return [
    `${header} ${order.ref}`,
    `${order.customer_name} — ${order.customer_phone}`,
    `${FULFILLMENT_LABEL[order.fulfillment]} · Retrait: ${order.pickup_code}`,
    itemsText,
    `Total: ${formatFCFA(order.total)}`,
  ].join('\n')
}

async function sendToStaffGroup(order: Order, kind: 'created' | 'validated', showToast: (m: string) => void) {
  if (!STAFF_GROUP_LINK) return
  const msg = buildStaffGroupMessage(order, kind)
  try {
    await navigator.clipboard.writeText(msg)
    showToast('Message copié — collez-le dans le groupe WhatsApp')
  } catch {
    showToast('Impossible de copier — copiez le message manuellement')
  }
  window.open(STAFF_GROUP_LINK, '_blank', 'noopener')
}

function buildReceiptHtml(order: Order) {
  const rows = order.lines
    .map((l) => `<tr><td>${l.cat}</td><td>${l.name}</td><td style="text-align:center">${l.qty}</td></tr>`)
    .join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Reçu ${order.ref}</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;max-width:480px;margin:0 auto}
    h1{font-size:20px;margin-bottom:4px}.muted{color:#666;font-size:13px;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;font-size:13px}
    .total{font-size:18px;font-weight:bold;text-align:right;margin-top:12px}</style></head><body>
    <h1>Chez Sanji — Reçu</h1>
    <div class="muted">Commande ${order.ref} &middot; Code de retrait: ${order.pickup_code}</div>
    <div class="muted">Client: ${order.customer_name} &middot; ${order.customer_phone}</div>
    <div class="muted">${FULFILLMENT_LABEL[order.fulfillment]}</div>
    <table><thead><tr><th>Catégorie</th><th>Article</th><th>Qté</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="total">Total: ${formatFCFA(order.total)}</div>
    </body></html>`
}

function openReceipt(order: Order) {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(buildReceiptHtml(order))
  win.document.close()
  setTimeout(() => {
    try {
      win.print()
    } catch {
      /* pop-up blocked, user can print manually */
    }
  }, 300)
}

const ONE_MINUTE_MS = 60000

export function OrdersBoard() {
  const { t } = useI18n()
  const { orders, loading } = useActiveOrders()
  const otpQueue = useOtpRelayQueue()
  const todayStats = useTodayStats()
  const showToast = useToastStore((s) => s.show)
  const [refInput, setRefInput] = useState('')
  const [refError, setRefError] = useState(false)
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({})
  const [now, setNow] = useState(Date.now())

  const pendingCount = orders.filter((o) => o.pending_validation).length

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Alert sound for anything a staff member needs to act on, so a busy fair
  // booth doesn't have to keep staring at the screen: new orders, orders
  // about to blow their prep deadline, payments awaiting validation, and
  // OTP codes waiting to be relayed. All four ring loudly and continuously
  // until a staff member explicitly silences them with "Arrêter l'alarme"
  // -- previously that button only stopped the new-order/deadline alarm,
  // leaving pending-payment and OTP nags ringing forever with no way to
  // silence them, which looked like the button was broken.
  const knownOrderIds = useRef<Set<string> | null>(null)
  const knownPendingIds = useRef<Set<string> | null>(null)
  const knownOtpIds = useRef<Set<number> | null>(null)
  const deadlineFlagged = useRef<Set<string>>(new Set())

  // Each order/OTP id, once flagged, only rings once per event (arriving /
  // crossing the 1-minute mark); "Arrêter l'alarme" clears the currently-
  // ringing sets without suppressing future genuinely-new events.
  const [ringingNew, setRingingNew] = useState<Set<string>>(new Set())
  const [ringingDeadline, setRingingDeadline] = useState<Set<string>>(new Set())
  const [ringingPending, setRingingPending] = useState<Set<string>>(new Set())
  const [ringingOtp, setRingingOtp] = useState<Set<number>>(new Set())

  useEffect(() => {
    const ids = new Set(orders.map((o) => o.id))
    if (knownOrderIds.current) {
      const arrived = [...ids].filter((id) => !knownOrderIds.current!.has(id))
      if (arrived.length > 0) {
        setRingingNew((prev) => new Set([...prev, ...arrived]))
      }
    }
    knownOrderIds.current = ids
    // An order that left the active list (delivered, deleted) shouldn't
    // keep counting toward a ringing alarm.
    setRingingNew((prev) => new Set([...prev].filter((id) => ids.has(id))))
    setRingingDeadline((prev) => new Set([...prev].filter((id) => ids.has(id))))

    const pendingIds = new Set(orders.filter((o) => o.pending_validation).map((o) => o.id))
    if (knownPendingIds.current) {
      const newlyPending = [...pendingIds].filter((id) => !knownPendingIds.current!.has(id))
      if (newlyPending.length > 0) {
        setRingingPending((prev) => new Set([...prev, ...newlyPending]))
      }
    }
    knownPendingIds.current = pendingIds
    setRingingPending((prev) => new Set([...prev].filter((id) => pendingIds.has(id))))
  }, [orders])

  useEffect(() => {
    const ids = new Set(otpQueue.map((r) => r.id))
    if (knownOtpIds.current) {
      const arrived = [...ids].filter((id) => !knownOtpIds.current!.has(id))
      if (arrived.length > 0) {
        setRingingOtp((prev) => new Set([...prev, ...arrived]))
      }
    }
    knownOtpIds.current = ids
    setRingingOtp((prev) => new Set([...prev].filter((id) => ids.has(id))))
  }, [otpQueue])

  // Scan for orders that just crossed the "1 minute left" mark on their
  // prep countdown.
  useEffect(() => {
    const justCrossed: string[] = []
    for (const order of orders) {
      if (order.order_status_index !== 1 || !order.step_deadline) continue
      const remaining = new Date(order.step_deadline).getTime() - now
      if (remaining <= ONE_MINUTE_MS && remaining > -ONE_MINUTE_MS * 5 && !deadlineFlagged.current.has(order.id)) {
        deadlineFlagged.current.add(order.id)
        justCrossed.push(order.id)
      }
    }
    if (justCrossed.length > 0) {
      setRingingDeadline((prev) => new Set([...prev, ...justCrossed]))
    }
  }, [orders, now])

  const isRinging = ringingNew.size > 0 || ringingDeadline.size > 0 || ringingPending.size > 0 || ringingOtp.size > 0
  useEffect(() => {
    if (!isRinging) return
    playOrderAlert()
    const id = setInterval(() => {
      if (ringingNew.size > 0 || ringingPending.size > 0) playOrderAlert()
      if (ringingDeadline.size > 0 || ringingOtp.size > 0) playOtpAlert()
    }, 4000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRinging])

  const stopAlarm = () => {
    setRingingNew(new Set())
    setRingingDeadline(new Set())
    setRingingPending(new Set())
    setRingingOtp(new Set())
  }

  const validate = async (ref: string) => {
    const { data, error } = await supabase.rpc('validate_order_payment', { p_ref: ref })
    if (error) {
      showToast(error.message)
      return
    }
    showToast(`${ref} validée`)
    if (data) sendToStaffGroup(data as Order, 'validated', showToast)
  }

  const markOtpSent = async (id: number) => {
    await supabase.rpc('mark_otp_relayed', { p_id: id })
  }

  const markDelivered = async (ref: string) => {
    const { error } = await supabase.rpc('mark_order_delivered', { p_ref: ref })
    if (error) showToast(error.message)
  }

  const validateByRef = async () => {
    const match = orders.find((o) => o.ref.slice(-4) === refInput.trim())
    if (!match) {
      setRefError(true)
      return
    }
    setRefError(false)
    setRefInput('')
    await validate(match.ref)
  }

  const viewProof = async (order: Order) => {
    if (!order.payment_proof_url) return
    if (proofUrls[order.ref]) {
      window.open(proofUrls[order.ref], '_blank')
      return
    }
    const { data } = await supabase.storage.from('payment-proofs').createSignedUrl(order.payment_proof_url, 3600)
    if (data?.signedUrl) {
      setProofUrls((prev) => ({ ...prev, [order.ref]: data.signedUrl }))
      window.open(data.signedUrl, '_blank')
    }
  }

  return (
    <div>
      {isRinging && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-red-600 bg-red-50 p-4">
          <div className="text-sm font-bold text-red-700">
            🔔{' '}
            {[
              ringingNew.size > 0 && `${ringingNew.size} nouvelle(s) commande(s)`,
              ringingDeadline.size > 0 && `${ringingDeadline.size} à moins d'1 minute du délai`,
              ringingPending.size > 0 && `${ringingPending.size} paiement(s) à valider`,
              ringingOtp.size > 0 && `${ringingOtp.size} code(s) OTP à relayer`,
            ]
              .filter(Boolean)
              .join(' · ')}
            !
          </div>
          <button onClick={stopAlarm} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white">
            Arrêter l'alarme
          </button>
        </div>
      )}

      {otpQueue.length > 0 && (
        <div className="mb-6 rounded-xl border-2 border-red-600 bg-red-50 p-4">
          <div className="mb-2 text-sm font-bold text-red-700">
            🔴 Codes OTP en attente — envoyez-les vite (valides 30 min)
          </div>
          <div className="flex flex-col gap-2">
            {otpQueue.map((row) => (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white p-2.5">
                <div className="text-xs">
                  <span className="font-mono text-base font-bold">{row.code}</span> → {row.phone}
                </div>
                <div className="flex gap-2">
                  <a
                    href={`https://wa.me/${row.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Votre code Chez Sanji : ${row.code}`)}`}
                    target="_blank"
                    rel="noopener"
                    onClick={() => markOtpSent(row.id)}
                    className="rounded-lg bg-[var(--color-accent)] px-2.5 py-1 text-[11px] font-bold"
                  >
                    Envoyer via WhatsApp
                  </a>
                  <button onClick={() => markOtpSent(row.id)} className="rounded-lg border border-[var(--color-divider)] px-2.5 py-1 text-[11px] font-bold">
                    Marquer envoyé
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">{t.activeOrders}</div>
          <div className="mt-1 [font-family:var(--font-heading)] text-3xl font-extrabold">{orders.length}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">{t.staffPendingValidation}</div>
          <div className="mt-1 [font-family:var(--font-heading)] text-3xl font-extrabold text-[var(--color-accent-700)]">
            {pendingCount}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">Commandes aujourd'hui</div>
          <div className="mt-1 [font-family:var(--font-heading)] text-3xl font-extrabold">{todayStats.orderCount}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">Ventes aujourd'hui</div>
          <div className="mt-1 [font-family:var(--font-heading)] text-xl font-extrabold">{formatFCFA(todayStats.revenue)}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">🤍 Dons aujourd'hui</div>
          <div className="mt-1 [font-family:var(--font-heading)] text-xl font-extrabold">{formatFCFA(todayStats.donations)}</div>
        </div>
      </div>

      <div className="mb-6 rounded-xl border-2 border-[var(--color-accent)] bg-white p-4">
        <div className="mb-2 text-sm font-bold">{t.validateByRefTitle}</div>
        <div className="flex gap-2">
          <input
            value={refInput}
            onChange={(e) => {
              setRefInput(e.target.value)
              setRefError(false)
            }}
            maxLength={4}
            placeholder="1234"
            className="flex-1 rounded-lg border border-[var(--color-divider)] px-3 py-2 text-sm outline-none"
          />
          <button onClick={validateByRef} className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-bold">
            {t.validate}
          </button>
        </div>
        {refError && <div className="mt-2 text-xs text-red-600">{t.validateRefError}</div>}
      </div>

      <div className="mb-3 [font-family:var(--font-heading)] text-sm font-bold uppercase tracking-wide">{t.activeOrdersList}</div>
      {loading && <div className="text-sm text-[var(--color-ink)]/50">…</div>}
      {!loading && orders.length === 0 && <div className="text-sm text-[var(--color-ink)]/50">—</div>}
      <div className="flex flex-col gap-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4"
            style={{ borderColor: ringingNew.has(order.id) || ringingDeadline.has(order.id) ? '#dc2626' : 'var(--color-divider)', borderWidth: ringingNew.has(order.id) || ringingDeadline.has(order.id) ? 2 : 1 }}
          >
            <div>
              <div className="[font-family:var(--font-heading)] text-sm font-bold">
                {order.is_staff_meal ? order.customer_name : order.ref}
              </div>
              <div className="text-xs text-[var(--color-ink)]/60">
                {t.pickupCodeLabel}: {order.pickup_code}
                {!order.is_staff_meal && ` · ${order.customer_name} — ${order.customer_phone}`}
              </div>
              <div className="mt-0.5 text-xs text-[var(--color-ink)]/60">
                {FULFILLMENT_LABEL[order.fulfillment]} · {formatFCFA(order.total)}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {order.is_staff_meal && (
                <span className="rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-[11px] font-bold">
                  🍽️ Repas staff
                </span>
              )}
              {order.pending_validation && (
                <span className="rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-[11px] font-bold">
                  {t.staffPendingValidation}
                </span>
              )}
              {order.pending_validation && order.payment_method !== 'cash' && !order.payment_proof_url && (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700">
                  Reçu manquant
                </span>
              )}
              {!order.is_staff_meal && (
                <a
                  href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener"
                  className="rounded-lg border border-[var(--color-divider)] px-3 py-1.5 text-xs font-bold"
                >
                  WhatsApp
                </a>
              )}
              {order.payment_proof_url && (
                <button onClick={() => viewProof(order)} className="rounded-lg border border-[var(--color-divider)] px-3 py-1.5 text-xs font-bold">
                  {order.payment_method === 'cash' ? '' : 'Reçu'}
                </button>
              )}
              <button onClick={() => openReceipt(order)} className="rounded-lg border border-[var(--color-divider)] px-3 py-1.5 text-xs font-bold">
                {t.receiptPdf}
              </button>
              {STAFF_GROUP_LINK && !order.is_staff_meal && (
                <button
                  onClick={() => sendToStaffGroup(order, order.pending_validation ? 'created' : 'validated', showToast)}
                  className="rounded-lg border border-[var(--color-divider)] px-3 py-1.5 text-xs font-bold"
                >
                  {t.sendToStaffGroup}
                </button>
              )}
              {order.pending_validation && (
                <button
                  disabled={order.payment_method !== 'cash' && !order.payment_proof_url}
                  onClick={() => validate(order.ref)}
                  className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-bold disabled:opacity-30"
                >
                  {t.validate}
                </button>
              )}
              <button
                disabled={order.pending_validation}
                onClick={() => markDelivered(order.ref)}
                className="rounded-lg bg-[var(--color-ink)] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-30"
              >
                {t.markDelivered}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
