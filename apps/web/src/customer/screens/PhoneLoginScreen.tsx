import { useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { Field, Input } from '@/components/Field'
import { Button } from '@/components/Button'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import type { PendingLogin } from '../CustomerApp'

function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim())
}

export function PhoneLoginScreen({ onCodeSent }: { onCodeSent: (pending: PendingLogin) => void }) {
  const { t, lang } = useI18n()
  // Deliberately never pre-filled: this app is often used on a shared
  // counter device where multiple customers order in turn. Pre-filling the
  // last email typed on the device meant every next customer saw the
  // previous person's address and, if they didn't notice and change it,
  // their OTP code silently went to someone else's inbox instead of theirs.
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showToast = useToastStore((s) => s.show)

  const trimmedEmail = email.trim()
  const valid = isValidEmail(trimmedEmail)

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/` } })
  }

  const sendCode = async () => {
    if (!valid) return
    setSending(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({ email: trimmedEmail })
    setSending(false)
    if (err) {
      setError(err.message)
      return
    }
    showToast(t.viaSms)
    onCodeSent({ mode: 'email', email: trimmedEmail })
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-6">
      <div className="mb-3 font-[var(--font-heading)] text-2xl font-extrabold">{t.loginTitle}</div>

      <button
        onClick={signInWithGoogle}
        className="mb-4 flex items-center justify-center gap-2.5 rounded-xl border border-[var(--color-divider)] bg-white py-3 text-sm font-bold"
      >
        <svg width="18" height="18" viewBox="0 0 48 48">
          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.9-2.26 5.36-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.82l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
        </svg>
        {lang === 'fr' ? 'Continuer avec Google' : 'Continue with Google'}
      </button>

      <div className="mb-4 flex items-center gap-3 text-[11px] text-[var(--color-ink)]/40">
        <div className="h-px flex-1 bg-[var(--color-divider)]" />
        {lang === 'fr' ? 'ou' : 'or'}
        <div className="h-px flex-1 bg-[var(--color-divider)]" />
      </div>

      <div className="mb-6 text-sm text-[var(--color-ink)]/70">{t.loginDesc}</div>
      <div className="mb-4">
        <Field label={t.emailLabel}>
          <Input type="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </div>
      {error && <div className="mb-4 text-xs text-red-600">{error}</div>}
      <Button block disabled={!valid || sending} onClick={sendCode}>
        {sending ? '…' : t.sendCode}
      </Button>
      <div className="mt-3 text-center text-[11px] text-[var(--color-ink)]/50">{t.viaSms}</div>
    </div>
  )
}
