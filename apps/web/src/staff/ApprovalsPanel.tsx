import { useState } from 'react'
import { useOvertimeRequests } from '@/hooks/useTimeClock'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import type { Employee } from '@/types/domain'

export function ApprovalsPanel({ employees }: { employees: Employee[] }) {
  const { requests, loading } = useOvertimeRequests()
  const showToast = useToastStore((s) => s.show)
  const [empId, setEmpId] = useState('')
  const [hours, setHours] = useState('')
  const [note, setNote] = useState('')

  const pending = requests.filter((r) => r.status === 'pending')
  const resolved = requests.filter((r) => r.status !== 'pending')

  const nameFor = (id: string) => employees.find((e) => e.id === id)?.name ?? '—'

  const resolve = async (id: number, status: 'approved' | 'dismissed') => {
    const { error } = await supabase.rpc('resolve_overtime_request', { p_id: id, p_status: status })
    if (error) showToast(error.message)
  }

  const addRequest = async () => {
    if (!empId || !hours) return
    const { error } = await supabase.rpc('add_overtime_request', {
      p_employee_id: empId,
      p_hours: Number(hours),
      p_note: note.trim() || null,
    })
    if (error) {
      showToast(error.message)
      return
    }
    setHours('')
    setNote('')
  }

  return (
    <div>
      <div className="mb-4 font-[var(--font-heading)] text-lg font-extrabold">Approbations</div>

      <div className="mb-6 rounded-xl border-2 border-[var(--color-ink)] bg-white p-4">
        <div className="mb-3 text-sm font-bold">+ Ajouter une demande d'heures supplémentaires</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
          <label className="text-xs">
            <div className="mb-1 font-bold uppercase text-[var(--color-ink)]/60">Employé</div>
            <select value={empId} onChange={(e) => setEmpId(e.target.value)} className="w-full rounded-lg border border-[var(--color-divider)] px-3 py-2 text-sm">
              <option value="">—</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            <div className="mb-1 font-bold uppercase text-[var(--color-ink)]/60">Heures</div>
            <input type="number" value={hours} onChange={(e) => setHours(e.target.value)} className="w-full rounded-lg border border-[var(--color-divider)] px-3 py-2 text-sm" />
          </label>
          <label className="text-xs">
            <div className="mb-1 font-bold uppercase text-[var(--color-ink)]/60">Note</div>
            <input value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-[var(--color-divider)] px-3 py-2 text-sm" />
          </label>
          <button onClick={addRequest} className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-bold">Ajouter</button>
        </div>
      </div>

      {loading && <div className="text-sm text-[var(--color-ink)]/50">…</div>}

      <div className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--color-ink)]/50">En attente</div>
      {pending.length === 0 && <div className="mb-6 text-sm text-[var(--color-ink)]/50">Tout est à jour — aucune approbation en attente.</div>}
      <div className="mb-6 flex flex-col gap-3">
        {pending.map((r) => (
          <div key={r.id} className="rounded-xl border-2 border-[var(--color-accent)] bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-[var(--font-heading)] text-sm font-bold">{nameFor(r.employee_id)}</div>
                <div className="mt-0.5 text-xs text-[var(--color-ink)]/60">
                  {r.hours ?? '—'} h {r.auto && '· alerte automatique'}
                </div>
                {r.note && <div className="mt-1 text-xs text-[var(--color-ink)]/70">{r.note}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => resolve(r.id, 'approved')} className="rounded-lg bg-[var(--color-ink)] px-3 py-1.5 text-xs font-bold text-white">
                  Approuver
                </button>
                <button onClick={() => resolve(r.id, 'dismissed')} className="rounded-lg border border-[var(--color-divider)] px-3 py-1.5 text-xs font-bold">
                  Ignorer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {resolved.length > 0 && (
        <>
          <div className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--color-ink)]/50">Traitées</div>
          <div className="flex flex-col gap-2">
            {resolved.slice(0, 20).map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-[var(--color-divider)] bg-white p-3.5 text-sm">
                <span>{nameFor(r.employee_id)} · {r.hours ?? '—'} h</span>
                <span className={`text-xs font-bold ${r.status === 'approved' ? 'text-[var(--color-accent-700)]' : 'text-[var(--color-ink)]/50'}`}>
                  {r.status === 'approved' ? 'Approuvée' : 'Ignorée'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
