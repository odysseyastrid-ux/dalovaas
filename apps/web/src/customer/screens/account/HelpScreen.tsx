import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { BackHeader } from '@/components/AppShell'
import { Button } from '@/components/Button'

const STAFF_WHATSAPP_NUMBER = import.meta.env.VITE_STAFF_WHATSAPP_NUMBER || '237652776763'
const STAFF_WHATSAPP_NUMBER_2 = import.meta.env.VITE_STAFF_WHATSAPP_NUMBER_2 as string | undefined

export function HelpScreen() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BackHeader title={t.helpTitle} onBack={() => navigate('/account')} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mb-3 rounded-xl border border-[var(--color-divider)] p-4">
          <div className="[font-family:var(--font-heading)] text-sm font-bold">{t.helpWhatsappTitle}</div>
          <div className="mt-1 text-xs text-[var(--color-ink)]/60">{t.helpWhatsappDesc}</div>
          <div className="mt-3 flex flex-col gap-2">
            <a href={`https://wa.me/${STAFF_WHATSAPP_NUMBER}`} target="_blank" rel="noopener">
              <Button block>{t.contactSupport}</Button>
            </a>
            {STAFF_WHATSAPP_NUMBER_2 && (
              <a href={`https://wa.me/${STAFF_WHATSAPP_NUMBER_2}`} target="_blank" rel="noopener">
                <Button block variant="secondary">
                  {lang === 'fr' ? 'Autre numéro (si le premier ne répond pas)' : 'Other number (if the first is unavailable)'}
                </Button>
              </a>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-[var(--color-divider)] p-4">
          <div className="[font-family:var(--font-heading)] text-sm font-bold">{t.helpFaqTitle}</div>
          <div className="mt-1 text-xs text-[var(--color-ink)]/60">{t.helpFaqDesc}</div>
        </div>
      </div>
    </div>
  )
}
