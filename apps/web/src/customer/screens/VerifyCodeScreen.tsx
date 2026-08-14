import { useRef, useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { Button } from '@/components/Button'
import { supabase } from '@/lib/supabaseClient'

export function VerifyCodeScreen({ phone, onBack }: { phone: string; onBack: () => void }) {
  const { t } = useI18n()
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const refs = useRef<Array<HTMLInputElement | null>>([])

  const setDigit = (i: number, value: string) => {
    const v = value.replace(/\D/g, '').slice(-1)
    setDigits((d) => d.map((old, idx) => (idx === i ? v : old)))
    if (v && i < 3) refs.current[i + 1]?.focus()
  }

  const onKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus()
  }

  const code = digits.join('')

  const verify = async () => {
    if (code.length !== 4) return
    setVerifying(true)
    setError(false)
    const { error: err } = await supabase.auth.verifyOtp({ phone, token: code, type: 'sms' })
    setVerifying(false)
    if (err) setError(true)
  }

  const resend = async () => {
    await supabase.auth.signInWithOtp({ phone })
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-6">
      <div className="mb-3 font-[var(--font-heading)] text-2xl font-extrabold">{t.verifyTitle}</div>
      <div className="mb-6 text-sm text-[var(--color-ink)]/70">
        {t.verifyDesc} {phone}
      </div>
      <div className="mb-4 flex gap-2.5">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            className="w-full rounded-lg border border-[var(--color-divider)] py-3 text-center text-xl font-bold outline-none focus:border-[var(--color-accent)]"
          />
        ))}
      </div>
      {error && <div className="mb-4 text-xs text-red-600">{t.codeError}</div>}
      <Button block disabled={code.length !== 4 || verifying} onClick={verify}>
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
