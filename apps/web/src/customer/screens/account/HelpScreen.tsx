import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { BackHeader } from '@/components/AppShell'
import { Button } from '@/components/Button'

const STAFF_WHATSAPP_NUMBER = import.meta.env.VITE_STAFF_WHATSAPP_NUMBER || '237652776763'

export function HelpScreen() {
  const { t } = useI18n()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <BackHeader title={t.helpTitle} onBack={() => navigate('/account')} />
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mb-3 rounded-xl border border-[var(--color-divider)] p-4">
          <div className="font-[var(--font-heading)] text-sm font-bold">{t.helpWhatsappTitle}</div>
          <div className="mt-1 text-xs text-[var(--color-ink)]/60">{t.helpWhatsappDesc}</div>
          <div className="mt-3">
            <a href={`https://wa.me/${STAFF_WHATSAPP_NUMBER}`} target="_blank" rel="noopener">
              <Button block>{t.contactSupport}</Button>
            </a>
          </div>
        </div>
        <div className="rounded-xl border border-[var(--color-divider)] p-4">
          <div className="font-[var(--font-heading)] text-sm font-bold">{t.helpFaqTitle}</div>
          <div className="mt-1 text-xs text-[var(--color-ink)]/60">{t.helpFaqDesc}</div>
        </div>
      </div>
    </div>
  )
}
