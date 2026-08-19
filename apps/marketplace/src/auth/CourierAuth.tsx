import { useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { Field, Input, Select } from '@/components/Field'
import { Button } from '@/components/Button'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/state/authStore'
import type { VehicleType } from '@/types/domain'

export function CourierAuth() {
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [vehicleType, setVehicleType] = useState<VehicleType>('moto')
  const [city, setCity] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmPending, setConfirmPending] = useState(false)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)

  const login = async () => {
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (err) setError('Identifiants incorrects.')
  }

  const signup = async () => {
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      setError('Renseignez au moins votre nom, un email et un mot de passe (6+ caractères).')
      return
    }
    setBusy(true)
    setError(null)
    const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password })
    if (err) {
      setBusy(false)
      setError(err.message)
      return
    }
    if (!data.session) {
      setBusy(false)
      setConfirmPending(true)
      return
    }
    const { error: rpcErr } = await supabase.rpc('mk_register_courier', {
      p_full_name: fullName.trim(),
      p_phone: phone.trim(),
      p_vehicle_type: vehicleType,
      p_city: city.trim(),
    })
    setBusy(false)
    if (rpcErr) {
      setError(rpcErr.message)
      return
    }
    await refreshProfile()
  }

  if (confirmPending) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-bg)] px-6 text-center">
        <div className="mb-3 text-4xl">📧</div>
        <div className="mb-2 font-[var(--font-heading)] text-xl font-bold">Confirmez votre email</div>
        <div className="text-sm text-[var(--color-ink)]/70">
          Un lien de confirmation a été envoyé à {email}. Revenez ensuite ici pour vous connecter.
        </div>
        <button onClick={() => { setConfirmPending(false); setTab('login') }} className="mt-6 text-sm font-bold text-[var(--color-accent-700)] underline">
          Se connecter
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-bg)] px-6 py-10">
      <Link to="/" className="mb-6 text-sm text-[var(--color-ink)]/50">
        ← Retour
      </Link>
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-2 font-[var(--font-heading)] text-2xl font-extrabold">Espace livreur</div>
        <div className="mb-6 text-sm text-[var(--color-ink)]/70">Choisissez vos courses et livrez à votre rythme.</div>

        <div className="mb-6 flex rounded-xl bg-[var(--color-surface)] p-1">
          {(['login', 'signup'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'flex-1 rounded-lg py-2 text-sm font-bold transition',
                tab === t ? 'bg-white shadow-sm' : 'text-[var(--color-ink)]/50',
              )}
            >
              {t === 'login' ? 'Connexion' : 'Devenir livreur'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {tab === 'signup' && (
            <>
              <Field label="Nom complet">
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </Field>
              <Field label="Téléphone">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="6XX XXX XXX" />
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
            </>
          )}
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Mot de passe">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>

          {error && <div className="text-xs text-red-600">{error}</div>}

          <Button block variant="teal" disabled={busy} onClick={tab === 'login' ? login : signup}>
            {busy ? '…' : tab === 'login' ? 'Se connecter' : 'Créer mon compte livreur'}
          </Button>
        </div>
      </div>
    </div>
  )
}
