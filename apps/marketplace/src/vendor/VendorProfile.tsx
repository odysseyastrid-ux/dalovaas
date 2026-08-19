import { useState } from 'react'
import { useAuthStore } from '@/state/authStore'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import { Field, Input, Textarea } from '@/components/Field'
import { Button } from '@/components/Button'
import { VendorStatusPill } from '@/components/StatusPill'

export function VendorProfile() {
  const vendor = useAuthStore((s) => s.vendor)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const signOut = useAuthStore((s) => s.signOut)
  const showToast = useToastStore((s) => s.show)

  const [name, setName] = useState(vendor?.name ?? '')
  const [description, setDescription] = useState(vendor?.description ?? '')
  const [phone, setPhone] = useState(vendor?.phone ?? '')
  const [city, setCity] = useState(vendor?.city ?? '')
  const [address, setAddress] = useState(vendor?.address ?? '')
  const [saving, setSaving] = useState(false)

  if (!vendor) return null

  const save = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('mk_vendors')
      .update({ name: name.trim(), name_fr: name.trim(), description: description.trim(), phone: phone.trim(), city: city.trim(), address: address.trim() })
      .eq('id', vendor.id)
    setSaving(false)
    if (error) {
      showToast(error.message)
      return
    }
    await refreshProfile()
    showToast('Profil mis à jour')
  }

  return (
    <div className="px-5 pt-8 pb-10">
      <div className="mb-1 flex items-center justify-between">
        <div className="font-[var(--font-heading)] text-2xl font-extrabold">Profil restaurant</div>
        <VendorStatusPill status={vendor.status} />
      </div>
      <div className="mb-6 text-sm text-[var(--color-ink)]/60">Commission plateforme : {Math.round(vendor.commission_rate * 100)}%</div>

      <div className="flex flex-col gap-4">
        <Field label="Nom">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </Field>
        <Field label="Téléphone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Ville">
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field label="Adresse">
          <Input value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <Button disabled={saving} onClick={save}>
          {saving ? '…' : 'Enregistrer'}
        </Button>
      </div>

      <Button variant="secondary" block onClick={signOut} className="mt-10">
        Se déconnecter
      </Button>
    </div>
  )
}
