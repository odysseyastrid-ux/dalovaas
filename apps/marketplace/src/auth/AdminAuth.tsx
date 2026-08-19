import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Field, Input } from '@/components/Field'
import { Button } from '@/components/Button'
import { supabase } from '@/lib/supabaseClient'

export function AdminAuth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const login = async () => {
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (err) setError('Identifiants incorrects.')
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-ink)] px-6 py-10 text-white">
      <Link to="/" className="mb-6 text-sm text-white/50">
        ← Retour
      </Link>
      <div className="mx-auto w-full max-w-sm flex-1">
        <div className="mb-2 font-[var(--font-heading)] text-2xl font-extrabold">Accès plateforme</div>
        <div className="mb-6 text-sm text-white/60">Réservé aux administrateurs Dalovaas.</div>

        <div className="flex flex-col gap-4">
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Mot de passe">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          {error && <div className="text-xs text-red-400">{error}</div>}
          <Button block disabled={busy} onClick={login}>
            {busy ? '…' : 'Se connecter'}
          </Button>
        </div>
      </div>
    </div>
  )
}
