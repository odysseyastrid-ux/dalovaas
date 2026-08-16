import { useMemo } from 'react'
import { useTimeClock } from '@/hooks/useTimeClock'
import { useAppSettings, type HourlyRates } from '@/hooks/useAppSettings'
import { formatFCFA } from '@/lib/format'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import type { TimeEntry } from '@/types/domain'

const CATEGORY_LABEL: Record<keyof HourlyRates, string> = {
  bar: 'Bar',
  counter: 'Comptoir',
  kitchen: 'Cuisine',
  dressing: 'Habillage',
  service: 'Service',
}

function hoursFor(employeeId: string, entries: TimeEntry[], periodStart: string) {
  const cutoff = new Date(periodStart).getTime()
  const ms = entries
    .filter((e) => e.employee_id === employeeId && new Date(e.clock_in).getTime() >= cutoff)
    .reduce((sum, e) => sum + ((e.clock_out ? new Date(e.clock_out).getTime() : Date.now()) - new Date(e.clock_in).getTime()), 0)
  return ms / 3600000
}

function periodLabel(periodStart: string) {
  const start = new Date(periodStart)
  const now = new Date()
  const fmt = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  return `${fmt(start)} – ${fmt(now)}`
}

function printDoc(title: string, bodyHtml: string) {
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;max-width:640px;margin:0 auto}
    h1{font-size:20px;margin-bottom:4px}.muted{color:#666;font-size:13px;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}th,td{padding:8px;border-bottom:1px solid #ddd;text-align:left;font-size:13px}
    th{text-transform:uppercase;font-size:11px;color:#666}
    .total{font-size:18px;font-weight:bold;text-align:right;margin-top:12px}</style></head><body>
    ${bodyHtml}
    </body></html>`)
  win.document.close()
  setTimeout(() => {
    try {
      win.print()
    } catch {
      /* pop-up blocked, user can print manually */
    }
  }, 300)
}

export function PayrollPanel({ canEditRates }: { canEditRates: boolean }) {
  const { employees, entries, loading } = useTimeClock()
  const { settings, reload } = useAppSettings()
  const showToast = useToastStore((s) => s.show)

  const rows = useMemo(
    () =>
      employees.map((emp) => {
        const hours = hoursFor(emp.id, entries, settings.payroll_period_start)
        const rate = settings.hourly_rates[emp.category]
        return { employee: emp, hours, rate, total: hours * rate }
      }),
    [employees, entries, settings.payroll_period_start, settings.hourly_rates],
  )

  const totalHours = rows.reduce((s, r) => s + r.hours, 0)
  const totalPayout = rows.reduce((s, r) => s + r.total, 0)

  const resetHours = async () => {
    if (!window.confirm('Démarrer une nouvelle période de paie ? Les heures déjà comptées resteront dans l\'historique mais ne compteront plus dans ce total.')) return
    const { error } = await supabase.rpc('set_app_setting', { p_key: 'payroll_period_start', p_value: new Date().toISOString() })
    if (error) showToast(error.message)
    else reload()
  }

  const setRate = async (category: keyof HourlyRates, value: string) => {
    const next = { ...settings.hourly_rates, [category]: Number(value) || 0 }
    const { error } = await supabase.rpc('set_app_setting', { p_key: 'hourly_rates', p_value: next })
    if (error) showToast(error.message)
  }

  const exportPayroll = () => {
    const tableRows = rows
      .map(
        (r) =>
          `<tr><td>${r.employee.name}</td><td>${CATEGORY_LABEL[r.employee.category]}</td><td>${r.hours.toFixed(1)} h</td><td>${formatFCFA(r.rate)}/h</td><td>${formatFCFA(r.total)}</td></tr>`,
      )
      .join('')
    printDoc(
      'Paie — Chez Sanji',
      `<h1>Chez Sanji — Paie</h1>
       <div class="muted">Période : ${periodLabel(settings.payroll_period_start)}</div>
       <table><thead><tr><th>Employé</th><th>Poste</th><th>Heures</th><th>Taux</th><th>Total</th></tr></thead><tbody>${tableRows}</tbody></table>
       <div class="total">Total à payer : ${formatFCFA(totalPayout)}</div>`,
    )
  }

  const exportPayslip = (row: (typeof rows)[number]) => {
    printDoc(
      `Fiche de paie — ${row.employee.name}`,
      `<h1>Fiche de paie</h1>
       <div class="muted">${row.employee.name} · ${CATEGORY_LABEL[row.employee.category]}</div>
       <div class="muted">Période : ${periodLabel(settings.payroll_period_start)}</div>
       <table><tbody>
         <tr><td>Heures travaillées</td><td>${row.hours.toFixed(1)} h</td></tr>
         <tr><td>Taux horaire</td><td>${formatFCFA(row.rate)}/h</td></tr>
       </tbody></table>
       <div class="total">Total : ${formatFCFA(row.total)}</div>`,
    )
  }

  return (
    <div>
      <div className="mb-1 font-[var(--font-heading)] text-lg font-extrabold">Paie</div>
      <div className="mb-4 text-xs text-[var(--color-ink)]/60">Période : {periodLabel(settings.payroll_period_start)}</div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">Heures</div>
          <div className="mt-1 font-[var(--font-heading)] text-2xl font-extrabold">{totalHours.toFixed(1)}h</div>
        </div>
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">Employés</div>
          <div className="mt-1 font-[var(--font-heading)] text-2xl font-extrabold">{employees.length}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">Total à payer</div>
          <div className="mt-1 font-[var(--font-heading)] text-xl font-extrabold">{formatFCFA(totalPayout)}</div>
        </div>
      </div>

      {canEditRates && (
        <div className="mb-6 rounded-xl border border-[var(--color-divider)] bg-white p-4">
          <div className="mb-3 text-sm font-bold">Taux horaires par poste</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {(Object.keys(CATEGORY_LABEL) as (keyof HourlyRates)[]).map((cat) => (
              <label key={cat} className="text-xs">
                <div className="mb-1 font-bold uppercase text-[var(--color-ink)]/60">{CATEGORY_LABEL[cat]}</div>
                <input
                  type="number"
                  defaultValue={settings.hourly_rates[cat]}
                  onBlur={(e) => Number(e.target.value) !== settings.hourly_rates[cat] && setRate(cat, e.target.value)}
                  className="w-full rounded-lg border border-[var(--color-divider)] px-2 py-1.5 text-sm"
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {loading && <div className="text-sm text-[var(--color-ink)]/50">…</div>}
      {!loading && rows.length === 0 && <div className="text-sm text-[var(--color-ink)]/50">Aucun employé pour calculer la paie.</div>}

      <div className="mb-4 flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.employee.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-divider)] bg-white p-4">
            <div>
              <div className="font-[var(--font-heading)] text-sm font-bold">{r.employee.name}</div>
              <div className="mt-0.5 text-xs text-[var(--color-ink)]/60">
                {CATEGORY_LABEL[r.employee.category]} · {r.hours.toFixed(1)} h × {formatFCFA(r.rate)}/h
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-[var(--font-heading)] text-sm font-bold">{formatFCFA(r.total)}</div>
              <button onClick={() => exportPayslip(r)} className="rounded-lg border border-[var(--color-divider)] px-3 py-1.5 text-xs font-bold">
                Fiche
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={exportPayroll} className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-bold">
          Exporter la paie (PDF)
        </button>
        {canEditRates && (
          <button onClick={resetHours} className="rounded-lg border border-[var(--color-divider)] px-4 py-2 text-sm font-bold text-red-600">
            Réinitialiser la période
          </button>
        )}
      </div>
    </div>
  )
}
