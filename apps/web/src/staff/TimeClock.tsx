import { useState } from 'react'
import { useTimeClock, useOvertimeRequests } from '@/hooks/useTimeClock'
import { useAppSettings } from '@/hooks/useAppSettings'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import { ApprovalsPanel } from './ApprovalsPanel'
import { PayrollPanel } from './PayrollPanel'
import { TimeClockSettings } from './TimeClockSettings'
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

function getGpsPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 8000 },
    )
  })
}

function EquipeView({ canManage }: { canManage: boolean }) {
  const { employees, entries, loading } = useTimeClock()
  const { settings } = useAppSettings()
  const showToast = useToastStore((s) => s.show)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const openEntryFor = (employeeId: string) =>
    entries.find((e) => e.employee_id === employeeId && e.clock_out === null)
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
    setBusy(employee.id)
    const open = openEntryFor(employee.id)
    if (open) {
      const { error } = await supabase.rpc('clock_out', { p_employee_id: employee.id })
      if (error) showToast(error.message)
    } else {
      let coords: { lat: number; lng: number } | null = null
      if (settings.require_gps_checkin) {
        coords = await getGpsPosition()
        if (!coords) {
          setBusy(null)
          showToast('Position GPS requise pour pointer — activez la localisation')
          return
        }
      }
      const { error } = await supabase.rpc('clock_in', {
        p_employee_id: employee.id,
        p_lat: coords?.lat ?? null,
        p_lng: coords?.lng ?? null,
      })
      if (error) showToast(error.message)
    }
    setBusy(null)
  }

  const finishedToday = entries.filter((e) => e.clock_out !== null && new Date(e.clock_in).toDateString() === new Date().toDateString())

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="font-[var(--font-heading)] text-lg font-extrabold">Équipe</div>
        <div className="rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-bold">{onShiftCount} en service</div>
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
                  disabled={busy === employee.id}
                  className={`rounded-lg px-4 py-2 text-xs font-bold disabled:opacity-40 ${open ? 'bg-[var(--color-ink)] text-white' : 'bg-[var(--color-accent)]'}`}
                >
                  {busy === employee.id ? '…' : open ? 'Pointer le départ' : "Pointer l'arrivée"}
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
          <div className="mb-3 mt-8 text-xs font-bold uppercase tracking-wide text-[var(--color-ink)]/50">Journées terminées aujourd'hui</div>
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

type ManagerView = 'approbations' | 'paie' | 'reglages'

export function TimeClock({ canManage }: { canManage: boolean }) {
  const { employees } = useTimeClock()
  const { requests } = useOvertimeRequests()
  const { settings } = useAppSettings()
  const [unlocked, setUnlocked] = useState(false)
  const [view, setView] = useState<ManagerView | null>(null)

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  const unlock = () => {
    const pin = window.prompt('PIN manager requis :')
    if (pin === null) return
    if (pin !== settings.manager_pin) {
      window.alert('PIN incorrect.')
      return
    }
    setUnlocked(true)
    setView('approbations')
  }

  if (view && unlocked) {
    return (
      <div>
        <div className="mb-5 flex flex-wrap gap-1 border-b border-[var(--color-divider)]">
          {(
            [
              ['equipe', 'Équipe'],
              ['approbations', `Approbations${pendingCount > 0 ? ` (${pendingCount})` : ''}`],
              ['paie', 'Paie'],
              ['reglages', 'Réglages'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => (key === 'equipe' ? setView(null) : setView(key as ManagerView))}
              className={`border-b-2 px-3 py-2 text-sm font-medium ${
                view === key ? 'border-[var(--color-accent)] text-[var(--color-ink)]' : 'border-transparent text-[var(--color-ink)]/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {view === 'approbations' && <ApprovalsPanel employees={employees} />}
        {view === 'paie' && <PayrollPanel canEditRates={canManage} />}
        {view === 'reglages' && <TimeClockSettings employees={employees} />}
      </div>
    )
  }

  return (
    <div>
      <EquipeView canManage={canManage} />
      {canManage && (
        <div className="mt-8 border-t border-[var(--color-divider)] pt-6">
          <button onClick={unlock} className="rounded-lg border border-[var(--color-divider)] px-4 py-2 text-sm font-bold">
            🔒 Espace manager (Approbations, Paie, Réglages)
          </button>
        </div>
      )}
    </div>
  )
}
