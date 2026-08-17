import { useEffect, useRef, useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { Button } from '@/components/Button'
import { supabase } from '@/lib/supabaseClient'
import type { PendingLogin } from '../CustomerApp'

const CODE_LENGTH = 6

export function VerifyCodeScreen({ pending, onBack }: { pending: PendingLogin; onBack: () => void }) {
  const { t } = useI18n()
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(''))
  const [focused, setFocused] = useState(false)
  const [error, setError] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const hiddenRef = useRef<HTMLInputElement | null>(null)
  const identifier = pending.mode === 'email' ? pending.email : pending.phone

  useEffect(() => {
    hiddenRef.current?.focus()
  }, [])

  // A single real text input sits invisibly over the 6 boxes. This is what
  // lets a phone's "paste from clipboard" / one-time-code suggestion bar
  // fill the whole code in one tap -- per-box maxLength=1 inputs block that
  // on most mobile keyboards, forcing the customer to type digit by digit.
  const applyValue = (raw: string) => {
    const clean = raw.replace(/\D/g, '').slice(0, CODE_LENGTH)
    setDigits(Array.from({ length: CODE_LENGTH }, (_, i) => clean[i] ?? ''))
  }

  const activeIndex = Math.min(digits.filter(Boolean).length, CODE_LENGTH - 1)
  const code = digits.join('')

  const verify = async () => {
    if (code.length !== CODE_LENGTH) return
    setVerifying(true)
    setError(false)
    const { error: err } =
      pending.mode === 'email'
        ? await supabase.auth.verifyOtp({ email: pending.email, token: code, type: 'email' })
        : await supabase.auth.verifyOtp({ phone: pending.phone, token: code, type: 'sms' })
    setVerifying(false)
    if (err) setError(true)
  }

  const resend = async () => {
    if (pending.mode === 'email') await supabase.auth.signInWithOtp({ email: pending.email })
    else await supabase.auth.signInWithOtp({ phone: pending.phone })
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-6">
      <div className="mb-3 font-[var(--font-heading)] text-2xl font-extrabold">
        {pending.mode === 'email' ? t.verifyTitle : t.verifyTitlePhone}
      </div>
      <div className="mb-6 text-sm text-[var(--color-ink)]/70">
        {t.verifyDesc} {identifier}
      </div>
      <div className="relative mb-4 flex gap-2.5">
        <input
          ref={hiddenRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={CODE_LENGTH}
          value={code}
          onChange={(e) => applyValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="absolute inset-0 z-10 h-full w-full opacity-0"
        />
        {digits.map((d, i) => (
          <div
            key={i}
            onClick={() => hiddenRef.current?.focus()}
            className={`w-full rounded-lg border py-3 text-center text-xl font-bold ${
              focused && i === activeIndex ? 'border-[var(--color-accent)]' : 'border-[var(--color-divider)]'
            }`}
          >
            {d}
          </div>
        ))}
      </div>
      {error && <div className="mb-4 text-xs text-red-600">{t.codeError}</div>}
      <Button block disabled={code.length !== CODE_LENGTH || verifying} onClick={verify}>
        {verifying ? '…' : t.verify}
      </Button>
      <button onClick={resend} className="mt-4 text-center text-xs text-[var(--color-ink)]/60 underline">
        {t.resendCode}
      </button>
      <button onClick={onBack} className="mt-2 text-center text-xs text-[var(--color-ink)]/40">
        ←
      </button>
    </div>
  )
}
