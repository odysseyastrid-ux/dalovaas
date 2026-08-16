import { useState } from 'react'
import { useTimeClock } from '@/hooks/useTimeClock'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import type { Employee } from '@/types/domain'

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function fmtDuration(startIso: string, endIso: string | null) {
  const ms = (endIso ? new Date(endIso).getTime() : Date.now()) - new Date(startIso).getTime()
  const totalMin = Math.max(0, Math.round(ms / 60000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`
}

export function TimeClock({ canManage }: { canManage: boolean }) {
  const { employees, entries, loading } = useTimeClock()
  const showToast = useToastStore((s) => s.show)
  const [newName, setNewName] = useState('')

  const openEntryFor = (employeeId: string) => entries.find((e) => e.employee_id === employeeId && e.clock_out === null)
  const onShiftCount = employees.filter((e) => openEntryFor(e.id)).length

  const addEmployee = async () => {
    if (!newName.trim()) return
    const { error } = await supabase.rpc('add_employee', { p_name: newName.trim() })
    if (error) {
      showToast(error.message)
      return
    }
    setNewName('')
  }

  const removeEmployee = async (employee: Employee) => {
    if (!window.confirm(`Retirer ${employee.name} de la liste ?`)) return
    const { error } = await supabase.rpc('set_employee_active', { p_id: employee.id, p_active: false })
    if (error) showToast(error.message)
  }

  const toggleClock = async (employee: Employee) => {
    const open = openEntryFor(employee.id)
    const { error } = open
      ? await supabase.rpc('clock_out', { p_employee_id: employee.id })
      : await supabase.rpc('clock_in', { p_employee_id: employee.id })
    if (error) showToast(error.message)
  }

  const finishedToday = entries.filter((e) => e.clock_out !== null)

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="font-[var(--font-heading)] text-lg font-extrabold">Pointage</div>
        <div className="rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-bold">
          {onShiftCount} en service
        </div>
      </div>

      {canManage && (
        <div className="mb-6 rounded-xl border-2 border-[var(--color-ink)] bg-white p-4">
          <div className="mb-3 text-sm font-bold">Ajouter un employé</div>
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEmployee()}
              placeholder="Nom de l'employé"
              className="flex-1 rounded-lg border border-[var(--color-divider)] px-3 py-2 text-sm"
            />
            <button onClick={addEmployee} className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-bold">
              Ajouter
            </button>
          </div>
        </div>
      )}

      {loading && <div className="text-sm text-[var(--color-ink)]/50">…</div>}
      {!loading && employees.length === 0 && (
        <div className="text-sm text-[var(--color-ink)]/50">
          Aucun employé — {canManage ? 'ajoutez votre équipe ci-dessus.' : 'demandez à un manager de vous ajouter.'}
        </div>
      )}

      <div className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--color-ink)]/50">Équipe</div>
      <div className="flex flex-col gap-3">
        {employees.map((employee) => {
          const open = openEntryFor(employee.id)
          return (
            <div key={employee.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-divider)] bg-white p-4">
              <div>
                <div className="font-[var(--font-heading)] text-sm font-bold">{employee.name}</div>
                {open ? (
                  <div className="mt-0.5 text-xs text-[var(--color-accent-700)]">
                    En service depuis {fmtTime(open.clock_in)} · {fmtDuration(open.clock_in, null)}
                  </div>
                ) : (
                  <div className="mt-0.5 text-xs text-[var(--color-ink)]/50">Hors service</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleClock(employee)}
                  className={`rounded-lg px-4 py-2 text-xs font-bold ${
                    open ? 'bg-[var(--color-ink)] text-white' : 'bg-[var(--color-accent)]'
                  }`}
                >
                  {open ? 'Pointer le départ' : "Pointer l'arrivée"}
                </button>
                {canManage && (
                  <button onClick={() => removeEmployee(employee)} className="px-2 text-xs text-red-600">
                    ✕
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {finishedToday.length > 0 && (
        <>
          <div className="mb-3 mt-8 text-xs font-bold uppercase tracking-wide text-[var(--color-ink)]/50">
            Journées terminées aujourd'hui
          </div>
          <div className="flex flex-col gap-2">
            {finishedToday.map((entry) => {
              const employee = employees.find((e) => e.id === entry.employee_id)
              return (
                <div key={entry.id} className="flex items-center justify-between rounded-xl border border-[var(--color-divider)] bg-white p-3.5 text-sm">
                  <span>{employee?.name ?? '—'}</span>
                  <span className="text-xs text-[var(--color-ink)]/60">
                    {fmtTime(entry.clock_in)} – {fmtTime(entry.clock_out!)} · {fmtDuration(entry.clock_in, entry.clock_out)}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
