import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { BackHeader } from '@/components/AppShell'
import { Field, Input } from '@/components/Field'
import { Button } from '@/components/Button'
import { useAuthStore } from '@/state/authStore'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'

export function AddressesScreen() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const account = useAuthStore((s) => s.account)
  const refreshAccount = useAuthStore((s) => s.refreshAccount)
  const showToast = useToastStore((s) => s.show)
  const [address, setAddress] = useState(account?.saved_address ?? '')

  const save = async () => {
    if (!account) return
    await supabase.from('accounts').update({ saved_address: address }).eq('id', account.id)
    await refreshAccount()
    showToast(t.save)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BackHeader title={t.addressesTitle} onBack={() => navigate('/account')} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        <Field label={t.deliveryAddress}>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Market Street" />
        </Field>
        <div className="mt-3 text-xs text-[var(--color-ink)]/60">{t.addressAutoUse}</div>
        <div className="mt-4">
          <Button onClick={save}>{t.save}</Button>
        </div>
      </div>
    </div>
  )
}
