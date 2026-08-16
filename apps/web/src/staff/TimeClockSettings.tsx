import { useState } from 'react'
import { useTimeClock } from '@/hooks/useTimeClock'
import { useAppSettings } from '@/hooks/useAppSettings'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import type { Employee, EmployeeCategory } from '@/types/domain'

const CATEGORY_OPTIONS: { value: EmployeeCategory; label: string }[] = [
  { value: 'bar', label: 'Bar' },
  { value: 'counter', label: 'Comptoir' },
  { value: 'kitchen', label: 'Cuisine' },
  { value: 'dressing', label: 'Habillage' },
  { value: 'service', label: 'Service' },
]

function askOwnerPin(actualPin: string): boolean {
  const pin = window.prompt('PIN propriétaire requis pour cette action :')
  if (pin === null) return false
  if (pin !== actualPin) {
    window.alert('PIN incorrect.')
    return false
  }
  return true
}

export function TimeClockSettings({ employees }: { employees: Employee[] }) {
  const { settings } = useAppSettings()
  const { entries } = useTimeClock()
  const showToast = useToastStore((s) => s.show)
  const [newManagerPin, setNewManagerPin] = useState('')
  const [newOwnerPin, setNewOwnerPin] = useState('')
  const [companyEmail, setCompanyEmail] = useState(settings.company_email)
  const [locating, setLocating] = useState(false)

  const setCategory = async (employee: Employee, category: string) => {
    const { error } = await supabase.rpc('set_employee_category', { p_id: employee.id, p_category: category })
    if (error) showToast(error.message)
  }

  const toggleGps = async () => {
    const { error } = await supabase.rpc('set_app_setting', { p_key: 'require_gps_checkin', p_value: !settings.require_gps_checkin })
    if (error) showToast(error.message)
  }

  const captureVenue = () => {
    if (!navigator.geolocation) {
      showToast('Géolocalisation indisponible sur cet appareil')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false)
        const { error } = await supabase.rpc('set_app_setting', {
          p_key: 'venue_location',
          p_value: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        })
        if (error) showToast(error.message)
        else showToast('Emplacement du restaurant enregistré')
      },
      () => {
        setLocating(false)
        showToast('Impossible d\'obtenir la position')
      },
    )
  }

  const toggleOvertimeAlerts = async () => {
    const { error } = await supabase.rpc('set_app_setting', { p_key: 'overtime_alerts_enabled', p_value: !settings.overtime_alerts_enabled })
    if (error) showToast(error.message)
  }

  const setThreshold = async (value: string) => {
    const { error } = await supabase.rpc('set_app_setting', { p_key: 'overtime_threshold_hours', p_value: Number(value) || 0 })
    if (error) showToast(error.message)
  }

  const saveCompanyEmail = async () => {
    const { error } = await supabase.rpc('set_app_setting', { p_key: 'company_email', p_value: companyEmail.trim() })
    if (error) showToast(error.message)
    else showToast('Email enregistré')
  }

  const sendSchedule = () => {
    if (!settings.company_email) {
      showToast("Renseignez d'abord l'email de l'entreprise")
      return
    }
    const onShift = employees.filter((e) => entries.some((en) => en.employee_id === e.id && en.clock_out === null))
    const body = [
      'Résumé du planning — Chez Sanji',
      '',
      `En service maintenant : ${onShift.length}`,
      ...onShift.map((e) => `- ${e.name}`),
    ].join('\n')
    window.location.href = `mailto:${settings.company_email}?subject=${encodeURIComponent('Planning Chez Sanji')}&body=${encodeURIComponent(body)}`
  }

  const changeManagerPin = async () => {
    if (!/^\d{4}$/.test(newManagerPin)) {
      showToast('Le PIN manager doit être à 4 chiffres')
      return
    }
    if (!askOwnerPin(settings.owner_pin)) return
    const { error } = await supabase.rpc('set_app_setting', { p_key: 'manager_pin', p_value: newManagerPin })
    if (error) showToast(error.message)
    else {
      showToast('PIN manager mis à jour')
      setNewManagerPin('')
    }
  }

  const changeOwnerPin = async () => {
    if (!/^\d{4}$/.test(newOwnerPin)) {
      showToast('Le PIN propriétaire doit être à 4 chiffres')
      return
    }
    if (!askOwnerPin(settings.owner_pin)) return
    const { error } = await supabase.rpc('set_app_setting', { p_key: 'owner_pin', p_value: newOwnerPin })
    if (error) showToast(error.message)
    else {
      showToast('PIN propriétaire mis à jour')
      setNewOwnerPin('')
    }
  }

  return (
    <div>
      <div className="mb-4 font-[var(--font-heading)] text-lg font-extrabold">Réglages du pointage</div>

      <div className="mb-6 rounded-xl border border-[var(--color-divider)] bg-white p-4">
        <div className="mb-3 text-sm font-bold">Poste de chaque employé</div>
        <div className="flex flex-col gap-2">
          {employees.map((emp) => (
            <div key={emp.id} className="flex items-center justify-between gap-3">
              <span className="text-sm">{emp.name}</span>
              <select
                defaultValue={emp.category}
                onChange={(e) => setCategory(emp, e.target.value)}
                className="rounded-lg border border-[var(--color-divider)] px-2 py-1.5 text-xs"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          ))}
          {employees.length === 0 && <div className="text-xs text-[var(--color-ink)]/50">Aucun employé pour l'instant.</div>}
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-[var(--color-divider)] bg-white p-4">
        <div className="mb-1 text-sm font-bold">Géolocalisation obligatoire</div>
        <div className="mb-3 text-xs text-[var(--color-ink)]/60">Les employés doivent être sur place (150 m) pour pointer.</div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={toggleGps}
            className={`rounded-lg px-4 py-2 text-xs font-bold ${settings.require_gps_checkin ? 'bg-[var(--color-accent)]' : 'border border-[var(--color-divider)]'}`}
          >
            {settings.require_gps_checkin ? 'Activé' : 'Désactivé'}
          </button>
          <button onClick={captureVenue} disabled={locating} className="rounded-lg border border-[var(--color-divider)] px-4 py-2 text-xs font-bold disabled:opacity-40">
            {locating ? 'Localisation…' : "📍 Définir l'emplacement du restaurant (ici)"}
          </button>
          {settings.venue_location && (
            <span className="text-xs text-[var(--color-ink)]/50">
              {settings.venue_location.lat.toFixed(5)}, {settings.venue_location.lng.toFixed(5)}
            </span>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-[var(--color-divider)] bg-white p-4">
        <div className="mb-1 text-sm font-bold">Alertes heures supplémentaires</div>
        <div className="mb-3 text-xs text-[var(--color-ink)]/60">Prévenir quand un employé dépasse le seuil hebdomadaire.</div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={toggleOvertimeAlerts}
            className={`rounded-lg px-4 py-2 text-xs font-bold ${settings.overtime_alerts_enabled ? 'bg-[var(--color-accent)]' : 'border border-[var(--color-divider)]'}`}
          >
            {settings.overtime_alerts_enabled ? 'Activé' : 'Désactivé'}
          </button>
          <label className="flex items-center gap-2 text-xs">
            Seuil :
            <input
              type="number"
              defaultValue={settings.overtime_threshold_hours}
              onBlur={(e) => Number(e.target.value) !== settings.overtime_threshold_hours && setThreshold(e.target.value)}
              className="w-20 rounded-lg border border-[var(--color-divider)] px-2 py-1.5"
            />
            h/semaine
          </label>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-[var(--color-divider)] bg-white p-4">
        <div className="mb-1 text-sm font-bold">Planning par email</div>
        <div className="mb-3 text-xs text-[var(--color-ink)]/60">
          Ouvre votre application email avec le résumé pré-rempli, prêt à envoyer.
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={companyEmail}
            onChange={(e) => setCompanyEmail(e.target.value)}
            placeholder="email@chezsanji.com"
            className="flex-1 rounded-lg border border-[var(--color-divider)] px-3 py-2 text-sm"
          />
          <button onClick={saveCompanyEmail} className="rounded-lg border border-[var(--color-divider)] px-4 py-2 text-xs font-bold">
            Enregistrer
          </button>
          <button onClick={sendSchedule} className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-bold">
            Envoyer le planning
          </button>
        </div>
      </div>

      <div className="rounded-xl border-2 border-red-200 bg-white p-4">
        <div className="mb-1 text-sm font-bold">Contrôles propriétaire</div>
        <div className="mb-3 text-xs text-[var(--color-ink)]/60">
          Changer un PIN demande le PIN propriétaire actuel.
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs">
            <div className="mb-1 font-bold uppercase text-[var(--color-ink)]/60">Nouveau PIN manager</div>
            <input value={newManagerPin} onChange={(e) => setNewManagerPin(e.target.value)} maxLength={4} className="w-24 rounded-lg border border-[var(--color-divider)] px-2 py-1.5 text-sm" />
          </label>
          <button onClick={changeManagerPin} className="rounded-lg border border-[var(--color-divider)] px-3 py-2 text-xs font-bold">
            Changer
          </button>
          <label className="ml-4 text-xs">
            <div className="mb-1 font-bold uppercase text-[var(--color-ink)]/60">Nouveau PIN propriétaire</div>
            <input value={newOwnerPin} onChange={(e) => setNewOwnerPin(e.target.value)} maxLength={4} className="w-24 rounded-lg border border-[var(--color-divider)] px-2 py-1.5 text-sm" />
          </label>
          <button onClick={changeOwnerPin} className="rounded-lg border border-[var(--color-divider)] px-3 py-2 text-xs font-bold">
            Changer
          </button>
        </div>
      </div>
    </div>
  )
}
