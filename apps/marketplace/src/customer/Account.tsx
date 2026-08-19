import { useState } from 'react'
import { useAuthStore } from '@/state/authStore'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import { Field, Input, Textarea } from '@/components/Field'
import { Button } from '@/components/Button'

export function Account() {
  const customer = useAuthStore((s) => s.customer)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const signOut = useAuthStore((s) => s.signOut)
  const showToast = useToastStore((s) => s.show)
  const [name, setName] = useState(customer?.full_name ?? '')
  const [address, setAddress] = useState(customer?.default_address ?? '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    await supabase.from('mk_customers').update({ full_name: name.trim(), default_address: address.trim() }).eq('id', customer?.id)
    await refreshProfile()
    setSaving(false)
    showToast('Profil mis à jour')
  }

  return (
    <div className="px-5 pt-8 pb-10">
      <div className="mb-6 font-[var(--font-heading)] text-2xl font-extrabold">Mon compte</div>
      <div className="mb-6 text-sm text-[var(--color-ink)]/60">{customer?.phone}</div>

      <div className="flex flex-col gap-4">
        <Field label="Nom complet">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Adresse par défaut">
          <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
        </Field>
        <Button block disabled={saving} onClick={save}>
          {saving ? '…' : 'Enregistrer'}
        </Button>
      </div>

      <Button variant="secondary" block onClick={signOut} className="mt-10">
        Se déconnecter
      </Button>
    </div>
  )
}
