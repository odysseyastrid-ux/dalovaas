import { useState } from 'react'
import { useAuthStore } from '@/state/authStore'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'
import { Field, Input, Select, Textarea } from '@/components/Field'
import { Button } from '@/components/Button'
import type { VehicleType } from '@/types/domain'

export function CourierProfile() {
  const courier = useAuthStore((s) => s.courier)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const signOut = useAuthStore((s) => s.signOut)
  const showToast = useToastStore((s) => s.show)

  const [fullName, setFullName] = useState(courier?.full_name ?? '')
  const [phone, setPhone] = useState(courier?.phone ?? '')
  const [vehicleType, setVehicleType] = useState<VehicleType>(courier?.vehicle_type ?? 'moto')
  const [city, setCity] = useState(courier?.city ?? '')
  const [address, setAddress] = useState(courier?.address ?? '')
  const [idNumber, setIdNumber] = useState(courier?.id_number ?? '')
  const [plateNumber, setPlateNumber] = useState(courier?.plate_number ?? '')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(courier?.emergency_contact_phone ?? '')
  const [saving, setSaving] = useState(false)

  if (!courier) return null

  const save = async () => {
    setSaving(true)
    const { error } = await supabase
      .from('mk_couriers')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim(),
        vehicle_type: vehicleType,
        city: city.trim(),
        address: address.trim(),
        id_number: idNumber.trim(),
        plate_number: plateNumber.trim(),
        emergency_contact_phone: emergencyContactPhone.trim(),
      })
      .eq('id', courier.id)
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
        <div className="font-[var(--font-heading)] text-2xl font-extrabold">Mon profil</div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${courier.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
          {courier.verified ? '✓ Vérifié' : 'En attente'}
        </span>
      </div>
      <div className="mb-6 flex items-center gap-1 text-sm text-amber-500">
        ★ {courier.rating.toFixed(1)} <span className="text-[var(--color-ink)]/40">({courier.rating_count} livraisons notées)</span>
      </div>

      {!courier.verified && (
        <div className="mb-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
          Modifier votre nom, CNI ou plaque relancera la vérification par l'équipe Dalovaas.
        </div>
      )}

      <div className="flex flex-col gap-4">
        <Field label="Nom complet (comme sur votre CNI)">
          <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </Field>
        <Field label="Numéro de CNI">
          <Input value={idNumber} onChange={(e) => setIdNumber(e.target.value)} />
        </Field>
        <Field label="Téléphone">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Adresse de résidence">
          <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
        </Field>
        <Field label="Ville">
          <Input value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>
        <Field label="Véhicule">
          <Select value={vehicleType} onChange={(e) => setVehicleType(e.target.value as VehicleType)}>
            <option value="moto">Moto</option>
            <option value="bike">Vélo</option>
            <option value="car">Voiture</option>
          </Select>
        </Field>
        {vehicleType !== 'bike' && (
          <Field label="Plaque d'immatriculation">
            <Input value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} />
          </Field>
        )}
        <Field label="Contact d'urgence">
          <Input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} />
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
