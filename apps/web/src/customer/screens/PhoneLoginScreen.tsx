import { useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { Field, Input } from '@/components/Field'
import { Button } from '@/components/Button'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import type { PendingLogin } from '../CustomerApp'

const LAST_EMAIL_KEY = 'chez_sanji_last_email'
const LAST_PHONE_KEY = 'chez_sanji_last_phone'
const OTP_WHATSAPP_NUMBER = import.meta.env.VITE_OTP_WHATSAPP_NUMBER as string | undefined
const OTP_WHATSAPP_NUMBER_2 = import.meta.env.VITE_OTP_WHATSAPP_NUMBER_2 as string | undefined

function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim())
}

function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  if (raw.trim().startsWith('+')) return '+' + digits
  // Default to Cameroon country code for local 9-digit mobile numbers.
  if (digits.length === 9) return '+237' + digits
  return '+' + digits
}

function otpNumbersLabel(lang: 'fr' | 'en') {
  const numbers = [OTP_WHATSAPP_NUMBER, OTP_WHATSAPP_NUMBER_2].filter(Boolean)
  if (numbers.length === 0) return ''
  const joiner = lang === 'fr' ? ' ou +' : ' or +'
  return ` (+${numbers.join(joiner)})`
}

export function PhoneLoginScreen({ onCodeSent }: { onCodeSent: (pending: PendingLogin) => void }) {
  const { t, lang } = useI18n()
  const [mode, setMode] = useState<'email' | 'phone'>('email')
  // Pre-fill with the last value used on this device, so reconnecting (new
  // session, cleared cache, another visit) doesn't rely on the customer
  // retyping it from memory -- a typo there would land on a different account.
  const [email, setEmail] = useState(() => localStorage.getItem(LAST_EMAIL_KEY) ?? '')
  const [phone, setPhone] = useState(() => localStorage.getItem(LAST_PHONE_KEY) ?? '')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showToast = useToastStore((s) => s.show)

  const trimmedEmail = email.trim()
  const e164 = toE164(phone)
  const valid = mode === 'email' ? isValidEmail(trimmedEmail) : !!e164

  const sendCode = async () => {
    if (!valid) return
    setSending(true)
    setError(null)
    if (mode === 'email') {
      const { error: err } = await supabase.auth.signInWithOtp({ email: trimmedEmail })
      setSending(false)
      if (err) {
        setError(err.message)
        return
      }
      localStorage.setItem(LAST_EMAIL_KEY, trimmedEmail)
      showToast(t.viaSms)
      onCodeSent({ mode: 'email', email: trimmedEmail })
    } else {
      const { error: err } = await supabase.auth.signInWithOtp({ phone: e164! })
      setSending(false)
      if (err) {
        setError(err.message)
        return
      }
      localStorage.setItem(LAST_PHONE_KEY, phone)
      showToast(t.viaWhatsapp)
      onCodeSent({ mode: 'phone', phone: e164! })
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-6">
      <div className="mb-3 font-[var(--font-heading)] text-2xl font-extrabold">{t.loginTitle}</div>
      <div className="mb-4 flex rounded-lg border border-[var(--color-divider)] p-1">
        <button
          onClick={() => setMode('email')}
          className="flex-1 rounded-md py-2 text-[11px] font-bold"
          style={{ background: mode === 'email' ? 'var(--color-accent)' : 'transparent' }}
        >
          {t.emailLabel}
        </button>
        <button
          onClick={() => setMode('phone')}
          className="flex-1 rounded-md py-2 text-[11px] font-bold"
          style={{ background: mode === 'phone' ? 'var(--color-accent)' : 'transparent' }}
        >
          {t.phoneLabel}
        </button>
      </div>
      <div className="mb-6 text-sm text-[var(--color-ink)]/70">
        {mode === 'email' ? t.loginDesc : t.loginDescPhone}
      </div>
      <div className="mb-4">
        {mode === 'email' ? (
          <Field label={t.emailLabel}>
            <Input type="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
        ) : (
          <Field label={t.phoneLabel}>
            <Input type="tel" placeholder="6XX XX XX XX" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        )}
      </div>
      {error && <div className="mb-4 text-xs text-red-600">{error}</div>}
      <Button block disabled={!valid || sending} onClick={sendCode}>
        {sending ? '…' : t.sendCode}
      </Button>
      <div className="mt-3 text-center text-[11px] text-[var(--color-ink)]/50">
        {mode === 'email' ? t.viaSms : t.viaWhatsapp}
        {mode === 'phone' && otpNumbersLabel(lang)}
      </div>
    </div>
  )
}
