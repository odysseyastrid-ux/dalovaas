import { useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { Field, Input } from '@/components/Field'
import { Button } from '@/components/Button'
import { supabase } from '@/lib/supabaseClient'

export function StaffLogin() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const signIn = async () => {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) setError(err.message)
  }

  const sendReset = async () => {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/staff/reset-password`,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    setResetSent(true)
  }

  if (forgotMode) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--color-surface)] p-6">
        <div className="w-full max-w-sm rounded-2xl border border-[var(--color-divider)] bg-white p-6">
          <div className="mb-1 [font-family:var(--font-heading)] text-xl font-extrabold">Chez Sanji</div>
          <div className="mb-6 text-sm text-[var(--color-ink)]/60">Mot de passe oublié</div>
          {resetSent ? (
            <div className="text-sm text-[var(--color-ink)]/70">
              Un lien de réinitialisation a été envoyé à <strong>{email}</strong> si ce compte existe.
            </div>
          ) : (
            <>
              <div className="mb-4">
                <Field label={t.staffEmail}>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </Field>
              </div>
              {error && <div className="mb-4 text-xs text-red-600">{error}</div>}
              <Button block disabled={loading || !email} onClick={sendReset}>
                {loading ? '…' : 'Envoyer le lien'}
              </Button>
            </>
          )}
          <button
            onClick={() => {
              setForgotMode(false)
              setResetSent(false)
              setError(null)
            }}
            className="mt-4 text-center text-xs text-[var(--color-ink)]/60 underline"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-surface)] p-6">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-divider)] bg-white p-6">
        <div className="mb-1 [font-family:var(--font-heading)] text-xl font-extrabold">Chez Sanji</div>
        <div className="mb-6 text-sm text-[var(--color-ink)]/60">{t.staffLoginTitle}</div>
        <div className="mb-3">
          <Field label={t.staffEmail}>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>
        <div className="mb-4">
          <Field label={t.staffPassword}>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
        </div>
        {error && <div className="mb-4 text-xs text-red-600">{error}</div>}
        <Button block disabled={loading || !email || !password} onClick={signIn}>
          {loading ? '…' : t.staffSignIn}
        </Button>
        <button onClick={() => setForgotMode(true)} className="mt-4 block w-full text-center text-xs text-[var(--color-ink)]/60 underline">
          Mot de passe oublié ?
        </button>
      </div>
    </div>
  )
}
