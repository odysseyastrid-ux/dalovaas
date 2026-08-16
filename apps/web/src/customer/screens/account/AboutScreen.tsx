import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { BackHeader } from '@/components/AppShell'
import { useAppSettings } from '@/hooks/useAppSettings'

const FOUNDER_NAME = 'Dama Louis Vanell Astrid'
const COPYRIGHT_YEAR = 2026

export function AboutScreen() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const { settings } = useAppSettings()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BackHeader title={t.aboutTitle} onBack={() => navigate('/account')} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex flex-col items-center rounded-xl border border-[var(--color-divider)] p-6 text-center">
          {settings.logo_url ? (
            <img src={settings.logo_url} alt="Chez Sanji" className="mb-3 h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-ink)] text-lg font-black text-[var(--color-accent)]">
              CS
            </div>
          )}
          <div className="font-[var(--font-heading)] text-xl font-extrabold">Chez Sanji</div>
          <div className="mt-1 text-xs text-[var(--color-ink)]/60">
            {lang === 'fr' ? 'Restauration rapide' : 'Fast food restaurant'}
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-[var(--color-divider)] p-4">
          <div className="mb-2 font-[var(--font-heading)] text-sm font-bold">
            {lang === 'fr' ? 'Notre entreprise' : 'Our company'}
          </div>
          <div className="text-sm leading-relaxed text-[var(--color-ink)]/70">
            {lang === 'fr'
              ? 'Chez Sanji est une entreprise de restauration rapide canadienne, implantée au Cameroun.'
              : 'Chez Sanji is a Canadian fast-food company, established in Cameroon.'}
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-[var(--color-divider)] p-4">
          <div className="mb-2 font-[var(--font-heading)] text-sm font-bold">
            {lang === 'fr' ? 'Fondatrice' : 'Founder'}
          </div>
          <div className="text-sm leading-relaxed text-[var(--color-ink)]/70">{FOUNDER_NAME}</div>
        </div>

        <div className="rounded-xl border border-[var(--color-divider)] p-4">
          <div className="mb-2 font-[var(--font-heading)] text-sm font-bold">
            {lang === 'fr' ? 'Informations légales' : 'Legal information'}
          </div>
          <div className="text-xs leading-relaxed text-[var(--color-ink)]/60">
            © {COPYRIGHT_YEAR} Chez Sanji.{' '}
            {lang === 'fr' ? 'Tous droits réservés.' : 'All rights reserved.'}
          </div>
          <div className="mt-1 text-xs leading-relaxed text-[var(--color-ink)]/60">
            {lang === 'fr'
              ? 'Toute reproduction, distribution ou utilisation non autorisée du contenu, du nom ou de la marque Chez Sanji est interdite sans autorisation écrite préalable.'
              : 'Any unauthorized reproduction, distribution, or use of the content, name, or Chez Sanji brand is prohibited without prior written permission.'}
          </div>
        </div>
      </div>
    </div>
  )
}
