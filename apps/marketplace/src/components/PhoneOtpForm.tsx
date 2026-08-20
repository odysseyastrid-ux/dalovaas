import { useEffect, useRef, useState } from 'react'
import { Field, Input } from '@/components/Field'
import { Button } from '@/components/Button'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'

const CODE_LENGTH = 6

export function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('237')) return `+${digits}`
  return `+237${digits}`
}

/** Shared phone-OTP entry, used by both the customer and courier auth
 * screens — this is the driver-app-standard flow (Uber/Bolt/Yango all
 * onboard by phone, not email), and the natural fit for a WhatsApp-first
 * market. Calls onVerified() once the session is live; the caller decides
 * what happens next (customer: nothing else needed, a trigger already
 * created their row — courier: still needs to fill in vehicle/city). */
export function PhoneOtpForm({
  title = 'Bienvenue 👋',
  desc = 'Connectez-vous avec votre numéro.',
  variant = 'primary',
  onVerified,
}: {
  title?: string
  desc?: string
  variant?: 'primary' | 'teal'
  onVerified?: () => void
}) {
  const [step, setStep] = useState<'phone' | 'code'>('phone')
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hiddenRef = useRef<HTMLInputElement | null>(null)
  const showToast = useToastStore((s) => s.show)

  useEffect(() => {
    if (step === 'code') hiddenRef.current?.focus()
  }, [step])

  const sendCode = async () => {
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 9) return
    setSending(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({ phone: toE164(phone) })
    setSending(false)
    if (err) {
      setError(err.message)
      return
    }
    showToast('Code envoyé par SMS')
    setStep('code')
  }

  const verify = async () => {
    if (code.length !== CODE_LENGTH) return
    setVerifying(true)
    setError(null)
    const { error: err } = await supabase.auth.verifyOtp({ phone: toE164(phone), token: code, type: 'sms' })
    setVerifying(false)
    if (err) {
      setError('Code invalide, réessayez.')
      return
    }
    onVerified?.()
  }

  return step === 'phone' ? (
    <div className="mx-auto w-full max-w-sm flex-1">
      <div className="mb-2 font-[var(--font-heading)] text-2xl font-extrabold">{title}</div>
      <div className="mb-6 text-sm text-[var(--color-ink)]/70">{desc}</div>
      <div className="mb-4">
        <Field label="Numéro de téléphone">
          <Input type="tel" inputMode="tel" placeholder="6XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
      </div>
      {error && <div className="mb-4 text-xs text-red-600">{error}</div>}
      <Button block variant={variant} disabled={sending} onClick={sendCode}>
        {sending ? '…' : 'Recevoir le code'}
      </Button>
    </div>
  ) : (
    <div className="mx-auto w-full max-w-sm flex-1">
      <div className="mb-2 font-[var(--font-heading)] text-2xl font-extrabold">Entrez le code</div>
      <div className="mb-6 text-sm text-[var(--color-ink)]/70">Code envoyé au {toE164(phone)}</div>
      <div className="relative mb-4 flex gap-2">
        <input
          ref={hiddenRef}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={CODE_LENGTH}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
          className="absolute inset-0 z-10 h-full w-full opacity-0"
        />
        {Array.from({ length: CODE_LENGTH }).map((_, i) => (
          <div key={i} className="flex h-12 w-full items-center justify-center rounded-lg border border-[var(--color-divider)] bg-white text-lg font-bold">
            {code[i] ?? ''}
          </div>
        ))}
      </div>
      {error && <div className="mb-4 text-xs text-red-600">{error}</div>}
      <Button block variant={variant} disabled={code.length !== CODE_LENGTH || verifying} onClick={verify}>
        {verifying ? '…' : 'Valider'}
      </Button>
      <button onClick={() => setStep('phone')} className="mt-4 text-center text-xs text-[var(--color-ink)]/50 underline">
        Changer de numéro
      </button>
    </div>
  )
}
