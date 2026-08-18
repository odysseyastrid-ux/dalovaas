import { useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { useAppSettings } from '@/hooks/useAppSettings'

export function SplashScreen({ onEnter }: { onEnter: () => void }) {
  const { t } = useI18n()
  const { settings } = useAppSettings()
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-pattern-gold px-6">
      <div className="text-center">
        {settings.logo_url && !imgFailed ? (
          <img
            src={settings.logo_url}
            alt="Chez Sanji"
            onError={() => setImgFailed(true)}
            className="mx-auto h-auto w-[88%] max-w-[340px] [clip-path:circle(40.5%)] drop-shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
          />
        ) : (
          <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-[var(--color-ink)] text-4xl font-black text-[var(--color-accent)]">
            CS
          </div>
        )}
        <div className="mt-2 font-[var(--font-heading)] text-2xl font-extrabold text-white">
          <span className="text-3d animate-float">{t.slogan}</span>
        </div>
      </div>
      <button
        onClick={onEnter}
        className="absolute bottom-8 left-6 right-6 rounded-xl bg-white px-5 py-4 text-left font-[var(--font-heading)] text-sm font-bold tracking-wide text-[var(--color-ink)]"
      >
        {t.enter}
      </button>
    </div>
  )
}
