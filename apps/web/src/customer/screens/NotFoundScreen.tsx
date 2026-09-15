import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { Button } from '@/components/Button'

export function NotFoundScreen() {
  const { lang } = useI18n()
  const navigate = useNavigate()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-pattern-gold">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
      </div>
      <div className="[font-family:var(--font-heading)] text-2xl font-extrabold">404</div>
      <div className="max-w-[260px] text-sm text-[var(--color-ink)]/60">
        {lang === 'fr' ? "Cette page n'existe pas ou plus." : "This page doesn't exist."}
      </div>
      <Button onClick={() => navigate('/')}>{lang === 'fr' ? "Retour à l'accueil" : 'Back to Home'}</Button>
    </div>
  )
}
