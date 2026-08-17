import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { StaffMember } from '@/types/domain'

export function StaffManager() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'cashier' | 'manager'>('cashier')
  const [result, setResult] = useState<{ email: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inviting, setInviting] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('staff').select('id, name, role, active').order('name')
    setStaff((data as StaffMember[]) ?? [])
  }

  useEffect(() => {
    load()
  }, [])

  const invite = async () => {
    setInviting(true)
    setError(null)
    setResult(null)
    const { data, error: err } = await supabase.functions.invoke('create-staff', {
      body: { email, name, role },
    })
    setInviting(false)
    if (err) {
      setError(err.message)
      return
    }
    setResult(data)
    setEmail('')
    setName('')
    load()
  }

  return (
    <div>
      <div className="mb-4 font-[var(--font-heading)] text-lg font-extrabold">Staff</div>

      <div className="mb-6 rounded-xl border-2 border-[var(--color-ink)] bg-white p-4">
        <div className="mb-3 text-sm font-bold">Invite staff member</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
          <label className="text-xs">
            <div className="mb-1 font-bold uppercase text-[var(--color-ink)]/60">Name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-[var(--color-divider)] px-3 py-2 text-sm" />
          </label>
          <label className="text-xs">
            <div className="mb-1 font-bold uppercase text-[var(--color-ink)]/60">Email</div>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-lg border border-[var(--color-divider)] px-3 py-2 text-sm" />
          </label>
          <label className="text-xs">
            <div className="mb-1 font-bold uppercase text-[var(--color-ink)]/60">Role</div>
            <select value={role} onChange={(e) => setRole(e.target.value as 'cashier' | 'manager')} className="w-full rounded-lg border border-[var(--color-divider)] px-3 py-2 text-sm">
              <option value="cashier">Cashier</option>
              <option value="manager">Manager</option>
            </select>
          </label>
          <button disabled={inviting || !email || !name} onClick={invite} className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-bold disabled:opacity-40">
            {inviting ? '…' : 'Invite'}
          </button>
        </div>
        {error && <div className="mt-3 text-xs text-red-600">{error}</div>}
        {result && (
          <div className="mt-3 rounded-lg bg-[var(--color-surface)] p-3 text-xs">
            Invitation email sent to <strong>{result.email}</strong>. They'll get a link to set their own password and sign in.
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {staff.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-[var(--color-divider)] bg-white p-3.5">
            <div className="text-sm font-medium">{s.name}</div>
            <div className="flex items-center gap-2 text-xs text-[var(--color-ink)]/60">
              <span>{s.role}</span>
              {!s.active && <span className="text-red-600">inactive</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
