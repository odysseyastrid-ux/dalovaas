import { useMemo } from 'react'
import { useTimeClock, usePayrollAdjustments } from '@/hooks/useTimeClock'
import { useAppSettings, type HourlyRates } from '@/hooks/useAppSettings'
import { formatFCFA } from '@/lib/format'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import type { PayrollAdjustment, ShiftBreak, TimeEntry } from '@/types/domain'

const CATEGORY_LABEL: Record<keyof HourlyRates, string> = {
  bar: 'Bar',
  counter: 'Comptoir',
  kitchen: 'Cuisine',
  dressing: 'Habillage',
  service: 'Service',
}

// Breaks are unpaid, so payroll hours are shift duration minus any break
// time taken during that shift.
function hoursFor(employeeId: string, entries: TimeEntry[], breaks: ShiftBreak[], periodStart: string) {
  const cutoff = new Date(periodStart).getTime()
  const ms = entries
    .filter((e) => e.employee_id === employeeId && new Date(e.clock_in).getTime() >= cutoff)
    .reduce((sum, e) => {
      const shiftMs = (e.clock_out ? new Date(e.clock_out).getTime() : Date.now()) - new Date(e.clock_in).getTime()
      const breakMs = breaks
        .filter((b) => b.time_entry_id === e.id)
        .reduce((bSum, b) => bSum + ((b.break_end ? new Date(b.break_end).getTime() : Date.now()) - new Date(b.break_start).getTime()), 0)
      return sum + Math.max(0, shiftMs - breakMs)
    }, 0)
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
    .total{font-size:18px;font-weight:bold;text-align:right;margin-top:12px}
    .letterhead{display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #111}
    .letterhead img{height:48px;width:48px;border-radius:50%;object-fit:cover}
    .letterhead .name{font-size:18px;font-weight:bold}
    .letterhead .tagline{font-size:11px;color:#666}
    .legal-footer{margin-top:32px;padding-top:16px;border-top:1px solid #ddd;font-size:10px;color:#888;line-height:1.6}
    .signatures{display:flex;justify-content:space-between;margin-top:48px;gap:24px}
    .signatures div{flex:1;border-top:1px solid #999;padding-top:6px;font-size:11px;color:#666;text-align:center}
    </style></head><body>
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

function letterheadHtml(logoUrl: string | null) {
  return `<div class="letterhead">
    ${logoUrl ? `<img src="${logoUrl}" alt="Chez Sanji" />` : ''}
    <div><div class="name">Chez Sanji</div><div class="tagline">Restauration rapide</div></div>
  </div>`
}

function legalFooterHtml() {
  return `<div class="legal-footer">
    Chez Sanji : entreprise de restauration rapide canadienne implantée au Cameroun. Fondateur : Dama Louis Vanell Astrid.<br />
    © ${new Date().getFullYear()} Chez Sanji. Tous droits réservés. Document généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}.
  </div>`
}

function findAdjustment(adjustments: PayrollAdjustment[], employeeId: string, periodStart: string) {
  const periodMs = new Date(periodStart).getTime()
  return adjustments.find((a) => a.employee_id === employeeId && new Date(a.period_start).getTime() === periodMs)
}

export function PayrollPanel({ canEditRates }: { canEditRates: boolean }) {
  const { employees, entries, breaks, loading } = useTimeClock()
  const { adjustments } = usePayrollAdjustments()
  const { settings, reload } = useAppSettings()
  const showToast = useToastStore((s) => s.show)

  const rows = useMemo(
    () =>
      employees.map((emp) => {
        const computedHours = hoursFor(emp.id, entries, breaks, settings.payroll_period_start)
        const adjustment = findAdjustment(adjustments, emp.id, settings.payroll_period_start)
        const hours = adjustment?.hours_override ?? computedHours
        const adjusted = adjustment?.hours_override != null
        const rate = settings.hourly_rates[emp.category]
        return { employee: emp, hours, computedHours, adjusted, rate, total: hours * rate }
      }),
    [employees, entries, breaks, adjustments, settings.payroll_period_start, settings.hourly_rates],
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

  // Manual correction for when the time-clock wasn't used properly during a
  // shift and the computed hours are wrong -- the manager sets the real
  // number directly for this pay period.
  const setHoursOverride = async (employeeId: string, value: string) => {
    const trimmed = value.trim()
    if (trimmed === '') {
      const { error } = await supabase.rpc('clear_payroll_adjustment', {
        p_employee_id: employeeId,
        p_period_start: settings.payroll_period_start,
      })
      if (error) showToast(error.message)
      return
    }
    const { error } = await supabase.rpc('set_payroll_adjustment', {
      p_employee_id: employeeId,
      p_period_start: settings.payroll_period_start,
      p_hours_override: Number(trimmed) || 0,
    })
    if (error) showToast(error.message)
  }

  const exportPayroll = () => {
    const tableRows = rows
      .map(
        (r) =>
          `<tr><td>${r.employee.name}</td><td>${CATEGORY_LABEL[r.employee.category]}</td><td>${r.hours.toFixed(1)} h${r.adjusted ? ' *' : ''}</td><td>${formatFCFA(r.rate)}/h</td><td>${formatFCFA(r.total)}</td></tr>`,
      )
      .join('')
    printDoc(
      'Paie · Chez Sanji',
      `${letterheadHtml(settings.logo_url)}
       <h1>Bulletin de paie collectif</h1>
       <div class="muted">Période : ${periodLabel(settings.payroll_period_start)}</div>
       <table><thead><tr><th>Employé</th><th>Poste</th><th>Heures</th><th>Taux</th><th>Total</th></tr></thead><tbody>${tableRows}</tbody></table>
       ${rows.some((r) => r.adjusted) ? '<div class="muted">* Heures corrigées manuellement par le manager.</div>' : ''}
       <div class="total">Total à payer : ${formatFCFA(totalPayout)}</div>
       ${legalFooterHtml()}`,
    )
  }

  const exportPayslip = (row: (typeof rows)[number]) => {
    printDoc(
      `Fiche de paie · ${row.employee.name}`,
      `${letterheadHtml(settings.logo_url)}
       <h1>Fiche de paie</h1>
       <div class="muted">Employé : <strong>${row.employee.name}</strong> · Poste : ${CATEGORY_LABEL[row.employee.category]}</div>
       <div class="muted">Période : ${periodLabel(settings.payroll_period_start)}</div>
       <table><tbody>
         <tr><td>Heures travaillées</td><td>${row.hours.toFixed(1)} h${row.adjusted ? ' (corrigées manuellement)' : ''}</td></tr>
         <tr><td>Taux horaire</td><td>${formatFCFA(row.rate)}/h</td></tr>
       </tbody></table>
       <div class="total">Total net à payer : ${formatFCFA(row.total)}</div>
       <div class="signatures">
         <div>Signature employé</div>
         <div>Signature employeur</div>
       </div>
       ${legalFooterHtml()}`,
    )
  }

  return (
    <div>
      <div className="mb-1 [font-family:var(--font-heading)] text-lg font-extrabold">Paie</div>
      <div className="mb-4 text-xs text-[var(--color-ink)]/60">Période : {periodLabel(settings.payroll_period_start)}</div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">Heures</div>
          <div className="mt-1 [font-family:var(--font-heading)] text-2xl font-extrabold">{totalHours.toFixed(1)}h</div>
        </div>
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">Employés</div>
          <div className="mt-1 [font-family:var(--font-heading)] text-2xl font-extrabold">{employees.length}</div>
        </div>
        <div className="rounded-xl border border-[var(--color-divider)] bg-white p-4 text-center">
          <div className="text-xs uppercase text-[var(--color-ink)]/50">Total à payer</div>
          <div className="mt-1 [font-family:var(--font-heading)] text-xl font-extrabold">{formatFCFA(totalPayout)}</div>
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
              <div className="flex items-center gap-2">
                <div className="[font-family:var(--font-heading)] text-sm font-bold">{r.employee.name}</div>
                {r.adjusted && (
                  <span className="rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[9px] font-bold">CORRIGÉ</span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-[var(--color-ink)]/60">
                {CATEGORY_LABEL[r.employee.category]} ·{' '}
                {canEditRates ? (
                  <input
                    type="number"
                    step="0.1"
                    placeholder={r.computedHours.toFixed(1)}
                    defaultValue={r.adjusted ? r.hours : ''}
                    onBlur={(e) => e.target.value !== (r.adjusted ? String(r.hours) : '') && setHoursOverride(r.employee.id, e.target.value)}
                    className="w-16 rounded-md border border-[var(--color-divider)] px-1.5 py-0.5 text-xs"
                    title="Corriger les heures (laisser vide pour revenir au calcul automatique)"
                  />
                ) : (
                  <>{r.hours.toFixed(1)}</>
                )}{' '}
                h × {formatFCFA(r.rate)}/h
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="[font-family:var(--font-heading)] text-sm font-bold">{formatFCFA(r.total)}</div>
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
