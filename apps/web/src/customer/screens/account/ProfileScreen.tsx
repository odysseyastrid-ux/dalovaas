import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { BackHeader } from '@/components/AppShell'
import { Field, Input } from '@/components/Field'
import { Button } from '@/components/Button'
import { useAuthStore } from '@/state/authStore'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'

export function ProfileScreen() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const account = useAuthStore((s) => s.account)
  const refreshAccount = useAuthStore((s) => s.refreshAccount)
  const showToast = useToastStore((s) => s.show)
  const [name, setName] = useState(account?.profile_name ?? '')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const initials = (account?.profile_name || account?.phone || '??').slice(0, 2).toUpperCase()

  const saveName = async () => {
    if (!account) return
    await supabase.from('accounts').update({ profile_name: name.trim() }).eq('id', account.id)
    await refreshAccount()
    showToast(t.save)
  }

  const uploadPhoto = async (file: File) => {
    if (!account) return
    setUploading(true)
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${account.id}/${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadErr) {
      setUploading(false)
      showToast(uploadErr.message)
      return
    }
    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
    await supabase.from('accounts').update({ avatar_url: pub.publicUrl }).eq('id', account.id)
    await refreshAccount()
    setUploading(false)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BackHeader title={t.profileTitle} onBack={() => navigate('/account')} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="relative h-24 w-24">
            {account?.avatar_url ? (
              <img src={account.avatar_url} alt="" className="h-24 w-24 rounded-full object-cover" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--color-accent)] font-[var(--font-heading)] text-2xl font-bold">
                {initials}
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) uploadPhoto(file)
              e.target.value = ''
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="rounded-lg border border-[var(--color-divider)] px-4 py-2 text-xs font-bold disabled:opacity-40"
          >
            {uploading ? '…' : account?.avatar_url ? t.changePhoto : t.addPhoto}
          </button>
        </div>

        <div className="mb-4">
          <Field label={t.customerName}>
            <Input value={name} onChange={(e) => setName(e.target.value)} onBlur={saveName} />
          </Field>
        </div>

        <div className="mb-4">
          <Field label={t.phoneLabel}>
            <Input value={account?.phone ?? ''} disabled />
          </Field>
          <div className="mt-1.5 text-xs text-[var(--color-ink)]/50">{t.phoneNotEditable}</div>
        </div>

        <div className="mt-4">
          <Button block onClick={saveName}>
            {t.save}
          </Button>
        </div>
      </div>
    </div>
  )
}
