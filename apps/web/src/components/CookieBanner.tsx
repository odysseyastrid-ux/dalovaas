import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'

const STORAGE_KEY = 'chez-sanji-cookie-consent'

export function CookieBanner() {
  const { lang } = useI18n()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setShow(true)
  }, [])

  if (!show) return null

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setShow(false)
  }

  return (
    <div className="no-print absolute inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t border-[var(--color-divider)] bg-[var(--color-card)] p-3.5 text-xs shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
      <div className="text-[var(--color-ink)]/70">
        {lang === 'fr'
          ? "Ce site utilise des cookies essentiels pour se souvenir de votre session et de vos préférences."
          : 'This site uses essential cookies to remember your session and preferences.'}
      </div>
      <button
        onClick={accept}
        className="self-end rounded-lg bg-gradient-to-r from-red-500 to-orange-600 px-4 py-1.5 text-[11px] font-bold text-white"
      >
        {lang === 'fr' ? "J'ai compris" : 'Got it'}
      </button>
    </div>
  )
}
