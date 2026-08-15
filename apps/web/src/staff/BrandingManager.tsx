import { useRef } from 'react'
import { useAppSettings, type PromoSlide } from '@/hooks/useAppSettings'
import { supabase } from '@/lib/supabaseClient'
import { useToastStore } from '@/state/toastStore'

async function uploadToMenuPhotos(file: File, prefix: string): Promise<string | null> {
  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${prefix}-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('menu-photos').upload(path, file, { upsert: true })
  if (error) return null
  const { data } = supabase.storage.from('menu-photos').getPublicUrl(path)
  return data.publicUrl
}

function UploadSlot({
  label,
  imageUrl,
  onUpload,
  onRemove,
}: {
  label: string
  imageUrl?: string | null
  onUpload: (file: File) => void
  onRemove?: () => void
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[var(--color-divider)] bg-white p-3">
      <div className="h-16 w-16 flex-none overflow-hidden rounded-lg bg-[var(--color-surface)]">
        {imageUrl && <img src={imageUrl} alt="" className="h-full w-full object-cover" />}
      </div>
      <div className="flex-1 text-sm font-medium">{label}</div>
      <label className="cursor-pointer rounded-lg border border-[var(--color-divider)] px-3 py-2 text-xs font-bold">
        {imageUrl ? 'Changer' : 'Ajouter'}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onUpload(file)
            e.target.value = ''
          }}
        />
      </label>
      {imageUrl && onRemove && (
        <button onClick={onRemove} className="rounded-lg px-2 py-2 text-xs font-bold text-red-600">
          ✕
        </button>
      )}
    </div>
  )
}

export function BrandingManager() {
  const { settings, reload } = useAppSettings()
  const showToast = useToastStore((s) => s.show)
  const promoInputRef = useRef<HTMLInputElement | null>(null)

  const setSetting = async (key: string, value: unknown) => {
    const { error } = await supabase.rpc('set_app_setting', { p_key: key, p_value: value })
    if (error) {
      showToast(error.message)
      return
    }
    reload()
  }

  const setLogo = async (file: File) => {
    const url = await uploadToMenuPhotos(file, 'logo')
    if (url) setSetting('logo_url', url)
  }

  const addPromoSlide = async (file: File) => {
    const url = await uploadToMenuPhotos(file, 'promo')
    if (!url) return
    const next: PromoSlide[] = [...settings.promo_slides, { image_url: url, sort_order: settings.promo_slides.length }]
    setSetting('promo_slides', next)
  }

  const removePromoSlide = async (index: number) => {
    const next = settings.promo_slides.filter((_, i) => i !== index).map((s, i) => ({ ...s, sort_order: i }))
    setSetting('promo_slides', next)
  }

  const movePromoSlide = async (index: number, dir: -1 | 1) => {
    const next = [...settings.promo_slides]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setSetting('promo_slides', next.map((s, i) => ({ ...s, sort_order: i })))
  }

  const setOnboardingImage = async (step: number, file: File) => {
    const url = await uploadToMenuPhotos(file, `onboard-${step}`)
    if (url) setSetting('onboarding_images', { ...settings.onboarding_images, [String(step)]: url })
  }

  const setPaymentIcon = async (method: string, file: File) => {
    const url = await uploadToMenuPhotos(file, `payicon-${method}`)
    if (url) setSetting('payment_icons', { ...settings.payment_icons, [method]: url })
  }

  const ordered = [...settings.promo_slides].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div>
      <div className="mb-4 font-[var(--font-heading)] text-lg font-extrabold">Image de marque</div>

      <div className="mb-6">
        <div className="mb-2 text-xs font-bold uppercase text-[var(--color-ink)]/50">Logo</div>
        <UploadSlot label="Logo (splash + accueil)" imageUrl={settings.logo_url} onUpload={setLogo} />
      </div>

      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-xs font-bold uppercase text-[var(--color-ink)]/50">Bannières promo (accueil, défilement automatique)</div>
          <label className="cursor-pointer rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-bold">
            + Ajouter une bannière
            <input
              ref={promoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) addPromoSlide(file)
                e.target.value = ''
              }}
            />
          </label>
        </div>
        {ordered.length === 0 && <div className="text-xs text-[var(--color-ink)]/50">Aucune bannière — l'écran d'accueil n'affichera pas de carrousel.</div>}
        <div className="flex flex-col gap-2">
          {ordered.map((slide, i) => (
            <div key={slide.image_url + i} className="flex items-center gap-3 rounded-xl border border-[var(--color-divider)] bg-white p-3">
              <div className="h-16 w-12 flex-none overflow-hidden rounded-lg bg-[var(--color-surface)]">
                <img src={slide.image_url} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="flex-1 text-xs text-[var(--color-ink)]/60">Position {i + 1}</div>
              <button onClick={() => movePromoSlide(i, -1)} disabled={i === 0} className="rounded-lg border border-[var(--color-divider)] px-2 py-1.5 text-xs disabled:opacity-30">
                ↑
              </button>
              <button onClick={() => movePromoSlide(i, 1)} disabled={i === ordered.length - 1} className="rounded-lg border border-[var(--color-divider)] px-2 py-1.5 text-xs disabled:opacity-30">
                ↓
              </button>
              <button onClick={() => removePromoSlide(i)} className="rounded-lg px-2 py-1.5 text-xs font-bold text-red-600">
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6">
        <div className="mb-2 text-xs font-bold uppercase text-[var(--color-ink)]/50">Écrans d'accueil (onboarding)</div>
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((step) => (
            <UploadSlot
              key={step}
              label={`Étape ${step + 1}/3`}
              imageUrl={settings.onboarding_images[String(step)]}
              onUpload={(file) => setOnboardingImage(step, file)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="mb-2 text-xs font-bold uppercase text-[var(--color-ink)]/50">Icônes des moyens de paiement</div>
        <div className="flex flex-col gap-2">
          <UploadSlot label="Orange Money" imageUrl={settings.payment_icons.orange_money} onUpload={(file) => setPaymentIcon('orange_money', file)} />
          <UploadSlot label="MTN MoMo" imageUrl={settings.payment_icons.mtn_momo} onUpload={(file) => setPaymentIcon('mtn_momo', file)} />
          <UploadSlot label="Espèces" imageUrl={settings.payment_icons.cash} onUpload={(file) => setPaymentIcon('cash', file)} />
        </div>
      </div>
    </div>
  )
}
