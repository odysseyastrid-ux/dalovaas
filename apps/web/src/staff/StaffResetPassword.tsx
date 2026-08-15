import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Field, Input } from '@/components/Field'
import { Button } from '@/components/Button'
import { supabase } from '@/lib/supabaseClient'

export function StaffResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const submit = async () => {
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setDone(true)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-surface)] p-6">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-divider)] bg-white p-6">
        <div className="mb-1 font-[var(--font-heading)] text-xl font-extrabold">Chez Sanji</div>
        <div className="mb-6 text-sm text-[var(--color-ink)]/60">Nouveau mot de passe</div>
        {done ? (
          <>
            <div className="mb-4 text-sm text-[var(--color-ink)]/70">Mot de passe mis à jour.</div>
            <Button block onClick={() => navigate('/staff')}>
              Aller au dashboard →
            </Button>
          </>
        ) : (
          <>
            <div className="mb-3">
              <Field label="Nouveau mot de passe">
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </Field>
            </div>
            <div className="mb-4">
              <Field label="Confirmer le mot de passe">
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </Field>
            </div>
            {error && <div className="mb-4 text-xs text-red-600">{error}</div>}
            <Button block disabled={loading || !password || !confirm} onClick={submit}>
              {loading ? '…' : 'Mettre à jour'}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
