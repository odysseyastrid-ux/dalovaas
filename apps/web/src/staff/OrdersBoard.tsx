import { useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { useActiveOrders } from '@/hooks/useOrders'
import { formatFCFA } from '@/lib/format'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import type { Order } from '@/types/domain'

const FULFILLMENT_LABEL: Record<string, string> = { pickup: 'À emporter', delivery: 'Livraison', dine_in: 'Sur place' }

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

export function OrdersBoard() {
  const { t } = useI18n()
  const { orders, loading } = useActiveOrders()
  const showToast = useToastStore((s) => s.show)
  const [refInput, setRefInput] = useState('')
  const [refError, setRefError] = useState(false)
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({})

  const pendingCount = orders.filter((o) => o.pending_validation).length

  const validate = async (ref: string) => {
    const { error } = await supabase.rpc('validate_order_payment', { p_ref: ref })
    if (error) showToast(error.message)
    else showToast(`${ref} validée`)
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
      <div className="mb-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">{t.activeOrders}</div>
          <div className="mt-1 font-[var(--font-heading)] text-3xl font-extrabold">{orders.length}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">{t.staffPendingValidation}</div>
          <div className="mt-1 font-[var(--font-heading)] text-3xl font-extrabold text-[var(--color-accent-700)]">
            {pendingCount}
          </div>
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

      <div className="mb-3 font-[var(--font-heading)] text-sm font-bold uppercase tracking-wide">{t.activeOrdersList}</div>
      {loading && <div className="text-sm text-[var(--color-ink)]/50">…</div>}
      {!loading && orders.length === 0 && <div className="text-sm text-[var(--color-ink)]/50">—</div>}
      <div className="flex flex-col gap-3">
        {orders.map((order) => (
          <div key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-divider)] bg-white p-4">
            <div>
              <div className="font-[var(--font-heading)] text-sm font-bold">{order.ref}</div>
              <div className="text-xs text-[var(--color-ink)]/60">
                {t.pickupCodeLabel}: {order.pickup_code} · {order.customer_name} — {order.customer_phone}
              </div>
              <div className="mt-0.5 text-xs text-[var(--color-ink)]/60">
                {FULFILLMENT_LABEL[order.fulfillment]} · {formatFCFA(order.total)}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {order.pending_validation && (
                <span className="rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-[11px] font-bold">
                  {t.staffPendingValidation}
                </span>
              )}
              <a
                href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener"
                className="rounded-lg border border-[var(--color-divider)] px-3 py-1.5 text-xs font-bold"
              >
                WhatsApp
              </a>
              {order.payment_proof_url && (
                <button onClick={() => viewProof(order)} className="rounded-lg border border-[var(--color-divider)] px-3 py-1.5 text-xs font-bold">
                  {order.payment_method === 'cash' ? '' : 'Reçu'}
                </button>
              )}
              <button onClick={() => openReceipt(order)} className="rounded-lg border border-[var(--color-divider)] px-3 py-1.5 text-xs font-bold">
                {t.receiptPdf}
              </button>
              {order.pending_validation && (
                <button onClick={() => validate(order.ref)} className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-bold">
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
