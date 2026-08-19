import { useAuthStore } from '@/state/authStore'
import { Button } from '@/components/Button'
import { VendorStatusPill } from '@/components/StatusPill'

export function PendingVendor() {
  const vendor = useAuthStore((s) => s.vendor)
  const signOut = useAuthStore((s) => s.signOut)
  if (!vendor) return null

  const suspended = vendor.status === 'suspended'

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[var(--color-bg)] px-6 text-center">
      <div className="mb-4 text-4xl">{suspended ? '⛔' : '⏳'}</div>
      <div className="mb-2 font-[var(--font-heading)] text-xl font-bold">{vendor.name}</div>
      <VendorStatusPill status={vendor.status} className="mb-4" />
      <div className="max-w-xs text-sm text-[var(--color-ink)]/70">
        {suspended
          ? 'Votre compte restaurant a été suspendu. Contactez la plateforme Dalovaas pour plus de détails.'
          : "Votre demande de partenariat est en cours d'examen par l'équipe Dalovaas. Vous serez actif dès l'approbation."}
      </div>
      <Button variant="secondary" onClick={signOut} className="mt-8">
        Se déconnecter
      </Button>
    </div>
  )
}
