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

  const signIn = async () => {
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) setError(err.message)
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--color-surface)] p-6">
      <div className="w-full max-w-sm rounded-2xl border border-[var(--color-divider)] bg-white p-6">
        <div className="mb-1 font-[var(--font-heading)] text-xl font-extrabold">Chez Sanji</div>
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
      </div>
    </div>
  )
}
