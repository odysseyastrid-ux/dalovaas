import { useI18n } from '@/i18n/I18nContext'
import { useAllOrders } from '@/hooks/useOrders'
import { useTodayStats } from '@/hooks/useTodayStats'
import { formatFCFA } from '@/lib/format'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/state/authStore'
import { useToastStore } from '@/state/toastStore'
import type { Order } from '@/types/domain'

const DELETE_PIN = '1910'

function toCsv(orders: Order[]): string {
  const header = ['ref', 'pickup_code', 'customer_name', 'customer_phone', 'fulfillment', 'total', 'payment_method', 'paid', 'status', 'created_at']
  const rows = orders.map((o) =>
    [o.ref, o.pickup_code, o.customer_name, o.customer_phone, o.fulfillment, o.total, o.payment_method, o.paid, o.status, o.created_at]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(','),
  )
  return [header.join(','), ...rows].join('\n')
}

function downloadCsv(orders: Order[]) {
  const blob = new Blob(['﻿' + toCsv(orders)], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `chez-sanji-orders-${new Date().toISOString().slice(0, 10)}.csv`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function Reports() {
  const { t } = useI18n()
  const { orders, loading } = useAllOrders()
  const todayStats = useTodayStats()
  const staff = useAuthStore((s) => s.staff)
  const showToast = useToastStore((s) => s.show)

  const deleteOrder = async (ref: string) => {
    const pin = window.prompt(`Code PIN requis pour supprimer ${ref} :`)
    if (pin === null) return
    if (pin !== DELETE_PIN) {
      showToast('Code PIN incorrect')
      return
    }
    const { error } = await supabase.rpc('delete_order', { p_ref: ref })
    if (error) {
      showToast(error.message)
      return
    }
    showToast(`${ref} supprimée`)
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="[font-family:var(--font-heading)] text-lg font-extrabold">{t.allOrdersRecap}</div>
        <button
          onClick={() => {
            if (orders.length === 0) {
              showToast('Aucune donnée à exporter pour l\'instant')
              return
            }
            downloadCsv(orders)
            showToast('Fichier téléchargé, consultez vos téléchargements')
          }}
          className="rounded-lg border border-[var(--color-divider)] bg-white px-3 py-1.5 text-xs font-bold"
        >
          {t.downloadAllCsv}
        </button>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">{t.totalOrders}</div>
          <div className="mt-1 [font-family:var(--font-heading)] text-3xl font-extrabold">{orders.length}</div>
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
          <div className="flex items-center justify-center gap-1 text-xs uppercase text-[var(--color-ink)]/50">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
            Dons aujourd'hui
          </div>
          <div className="mt-1 [font-family:var(--font-heading)] text-xl font-extrabold">{formatFCFA(todayStats.donations)}</div>
        </div>
      </div>
      {loading && <div className="text-sm text-[var(--color-ink)]/50">…</div>}
      <div className="flex flex-col gap-3">
        {orders.map((o) => (
          <div key={o.id} className="rounded-xl border border-[var(--color-divider)] bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="[font-family:var(--font-heading)] text-sm font-bold">{o.ref}</div>
                <div className="text-xs text-[var(--color-ink)]/60">{o.customer_name} · {o.customer_phone}</div>
              </div>
              <span className="rounded-full border border-[var(--color-divider)] px-2 py-0.5 text-[10px]">
                {o.status === 'done' ? 'Livrée' : o.pending_validation ? 'En attente' : 'En cours'}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-[var(--color-ink)]/60">
              <span>{o.fulfillment} · {t.pickupCodeLabel}: {o.pickup_code}</span>
              <span className="[font-family:var(--font-heading)] text-sm font-bold text-[var(--color-ink)]">{formatFCFA(o.total)}</span>
            </div>
            {staff?.role === 'manager' && (
              <button onClick={() => deleteOrder(o.ref)} className="mt-2 text-xs font-bold text-red-600">
                {t.deleteOrder}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
