import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Field, Input, Select } from '@/components/Field'
import { Button } from '@/components/Button'
import { PhoneOtpForm } from '@/components/PhoneOtpForm'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/state/authStore'
import type { VehicleType } from '@/types/domain'

/** Registration step: shown any time there's a live session but no
 * mk_couriers row yet — a brand-new phone verification, or someone
 * returning after an interrupted signup (closed the tab, lost network
 * mid-registration). Reusing this same check for both cases is what fixes
 * the old bug where a half-registered courier had no way back in. */
function CourierRegistration() {
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const signOut = useAuthStore((s) => s.signOut)
  const [fullName, setFullName] = useState('')
  const [vehicleType, setVehicleType] = useState<VehicleType>('moto')
  const [city, setCity] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const register = async () => {
    if (!fullName.trim()) {
      setError('Renseignez votre nom.')
      return
    }
    setBusy(true)
    setError(null)
    const phone = useAuthStore.getState().session?.user?.phone ?? ''
    const { error: err } = await supabase.rpc('mk_register_courier', {
      p_full_name: fullName.trim(),
      p_phone: phone,
      p_vehicle_type: vehicleType,
      p_city: city.trim(),
    })
    setBusy(false)
    if (err) {
      setError(err.message)
      return
    }
    await refreshProfile()
  }

  return (
    <div className="mx-auto w-full max-w-sm flex-1">
      <div className="mb-2 font-[var(--font-heading)] text-2xl font-extrabold">Presque prêt 🏍️</div>
      <div className="mb-6 text-sm text-[var(--color-ink)]/70">Quelques infos pour finaliser votre profil livreur.</div>
      <div className="flex flex-col gap-4">
        <Field label="Nom complet">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Véhicule">
          <Select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)}>
            <option value="moto">Moto</option>
            <option value="bike">Vélo</option>
            <option value="car">Voiture</option>
          </Select>
        </Field>
        <Field label="Ville">
          <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Douala, Yaoundé…" />
        </Field>
        {error && <div className="text-xs text-red-600">{error}</div>}
        <Button block variant="teal" disabled={busy} onClick={register}>
          {busy ? '…' : 'Devenir livreur'}
        </Button>
        <button onClick={signOut} className="text-center text-xs text-[var(--color-ink)]/40">
          Se déconnecter
        </button>
      </div>
    </div>
  )
}

export function CourierAuth() {
  const session = useAuthStore((s) => s.session)
  const courier = useAuthStore((s) => s.courier)
  const authLoading = useAuthStore((s) => s.loading)

  // A session with no courier row yet covers both a fresh signup and
  // someone returning to finish an interrupted one — same screen either way.
  const needsRegistration = !!session && !courier && !authLoading

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-bg)] px-6 py-10">
      <Link to="/" className="mb-8 text-sm text-[var(--color-ink)]/50">
        ← Retour
      </Link>
      {needsRegistration ? (
        <CourierRegistration />
      ) : (
        <PhoneOtpForm title="Devenez livreur 🏍️" desc="Choisissez vos courses, livrez, encaissez." variant="teal" />
      )}
    </div>
  )
}
