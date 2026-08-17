import { useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { Field, Input } from '@/components/Field'
import { Button } from '@/components/Button'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'

const LAST_EMAIL_KEY = 'chez_sanji_last_email'

function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim())
}

export function PhoneLoginScreen({ onCodeSent }: { onCodeSent: (email: string) => void }) {
  const { t } = useI18n()
  // Pre-fill with the last email used on this device, so reconnecting
  // (new session, cleared cache, another visit) doesn't rely on the customer
  // retyping it from memory -- a typo there would land on a different account.
  const [email, setEmail] = useState(() => localStorage.getItem(LAST_EMAIL_KEY) ?? '')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showToast = useToastStore((s) => s.show)

  const trimmedEmail = email.trim()
  const valid = isValidEmail(trimmedEmail)

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
    localStorage.setItem(LAST_EMAIL_KEY, trimmedEmail)
    showToast(t.viaSms)
    onCodeSent(trimmedEmail)
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-6">
      <div className="mb-3 font-[var(--font-heading)] text-2xl font-extrabold">{t.loginTitle}</div>
      <div className="mb-6 text-sm text-[var(--color-ink)]/70">{t.loginDesc}</div>
      <div className="mb-4">
        <Field label={t.emailLabel}>
          <Input
            type="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
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
