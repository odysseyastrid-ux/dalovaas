import { useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { Field, Input } from '@/components/Field'
import { Button } from '@/components/Button'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'

const OTP_WHATSAPP_NUMBER = import.meta.env.VITE_OTP_WHATSAPP_NUMBER as string | undefined
const OTP_WHATSAPP_NUMBER_2 = import.meta.env.VITE_OTP_WHATSAPP_NUMBER_2 as string | undefined

function otpNumbersLabel(lang: 'fr' | 'en') {
  const numbers = [OTP_WHATSAPP_NUMBER, OTP_WHATSAPP_NUMBER_2].filter(Boolean)
  if (numbers.length === 0) return ''
  const joiner = lang === 'fr' ? ' ou +' : ' or +'
  return ` (+${numbers.join(joiner)})`
}

function toE164(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  if (!digits) return null
  if (raw.trim().startsWith('+')) return '+' + digits
  // Default to Cameroon country code for local 9-digit mobile numbers.
  if (digits.length === 9) return '+237' + digits
  return '+' + digits
}

export function PhoneLoginScreen({ onCodeSent }: { onCodeSent: (phone: string) => void }) {
  const { t, lang } = useI18n()
  const [phone, setPhone] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const showToast = useToastStore((s) => s.show)

  const e164 = toE164(phone)

  const sendCode = async () => {
    if (!e164) return
    setSending(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({ phone: e164 })
    setSending(false)
    if (err) {
      setError(err.message)
      return
    }
    showToast(t.viaSms)
    onCodeSent(e164)
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-6">
      <div className="mb-3 font-[var(--font-heading)] text-2xl font-extrabold">{t.loginTitle}</div>
      <div className="mb-6 text-sm text-[var(--color-ink)]/70">{t.loginDesc}</div>
      <div className="mb-4">
        <Field label={t.phoneLabel}>
          <Input
            type="tel"
            placeholder="6XX XX XX XX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
      </div>
      {error && <div className="mb-4 text-xs text-red-600">{error}</div>}
      <Button block disabled={!e164 || sending} onClick={sendCode}>
        {sending ? '…' : t.sendCode}
      </Button>
      <div className="mt-3 text-center text-[11px] text-[var(--color-ink)]/50">
        {t.viaSms}
        {otpNumbersLabel(lang)}
      </div>
    </div>
  )
}
