import { Link } from 'react-router-dom'
import { PhoneOtpForm } from '@/components/PhoneOtpForm'

export function CustomerAuth() {
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--color-bg)] px-6 py-10">
      <Link to="/" className="mb-8 text-sm text-[var(--color-ink)]/50">
        ← Retour
      </Link>
      <PhoneOtpForm title="Bienvenue 👋" desc="Connectez-vous avec votre numéro pour commander." />
    </div>
  )
}
