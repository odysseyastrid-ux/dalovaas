import { useState } from 'react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { Field, Input } from '@/components/Field'
import { Button } from '@/components/Button'
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/state/authStore'

export function PartnerAuth() {
  const [tab, setTab] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [cuisineType, setCuisineType] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
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
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError('Renseignez au moins le nom du restaurant, un email et un mot de passe (6+ caractères).')
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
    const { error: rpcErr } = await supabase.rpc('mk_register_vendor', {
      p_name: name.trim(),
      p_name_fr: name.trim(),
      p_cuisine_type: cuisineType.trim(),
      p_phone: phone.trim(),
      p_city: city.trim(),
      p_address: address.trim(),
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
        <div className="mb-2 font-[var(--font-heading)] text-2xl font-extrabold">Espace restaurant</div>
        <div className="mb-6 text-sm text-[var(--color-ink)]/70">Gérez votre menu et vos commandes sur Dalovaas.</div>

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
              {t === 'login' ? 'Connexion' : 'Devenir partenaire'}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          {tab === 'signup' && (
            <>
              <Field label="Nom du restaurant">
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Chez Sanji" />
              </Field>
              <Field label="Type de cuisine">
                <Input value={cuisineType} onChange={(e) => setCuisineType(e.target.value)} placeholder="Ex : Burgers & fast-food" />
              </Field>
              <Field label="Téléphone">
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="6XX XXX XXX" />
              </Field>
              <Field label="Ville">
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Douala, Yaoundé…" />
              </Field>
              <Field label="Adresse">
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Quartier, repère" />
              </Field>
            </>
          )}
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@restaurant.cm" />
          </Field>
          <Field label="Mot de passe">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>

          {error && <div className="text-xs text-red-600">{error}</div>}

          <Button block disabled={busy} onClick={tab === 'login' ? login : signup}>
            {busy ? '…' : tab === 'login' ? 'Se connecter' : 'Créer mon compte restaurant'}
          </Button>
        </div>
      </div>
    </div>
  )
}
