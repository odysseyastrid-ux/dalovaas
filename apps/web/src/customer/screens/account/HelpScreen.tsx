import { useNavigate } from 'react-router-dom'
import { useI18n } from '@/i18n/I18nContext'
import { BackHeader } from '@/components/AppShell'
import { Button } from '@/components/Button'
import { FaqAccordion } from '@/components/FaqAccordion'

const STAFF_WHATSAPP_NUMBER = import.meta.env.VITE_STAFF_WHATSAPP_NUMBER || '237652776763'
const STAFF_WHATSAPP_NUMBER_2 = import.meta.env.VITE_STAFF_WHATSAPP_NUMBER_2 as string | undefined

const FAQ_FR = [
  { q: 'Comment suivre ma commande ?', a: "Après avoir commandé, vous arrivez automatiquement sur l'écran de suivi. Vous pouvez aussi le retrouver dans Compte > Historique des commandes." },
  { q: 'Quels moyens de paiement acceptez-vous ?', a: 'Orange Money, MTN MoMo et espèces à la récupération de votre commande.' },
  { q: "Comment fonctionnent les points de fidélité ?", a: "Vous gagnez des points à chaque commande et en laissant un avis après réception. Échangez-les contre des récompenses dans l'onglet Récompenses." },
  { q: 'Puis-je changer mon numéro de téléphone ou email ?', a: "Ces informations sont liées à votre connexion et ne peuvent pas être modifiées directement — contactez le support par WhatsApp." },
  { q: 'Ma commande est en retard, que faire ?', a: "Contactez-nous directement sur WhatsApp avec votre code de commande, nous vérifions immédiatement." },
]
const FAQ_EN = [
  { q: 'How do I track my order?', a: 'After ordering you land on the tracking screen automatically. You can also find it in Account > Order History.' },
  { q: 'What payment methods do you accept?', a: 'Orange Money, MTN MoMo, and cash on pickup.' },
  { q: 'How do loyalty points work?', a: 'You earn points on every order and by leaving a review after delivery. Redeem them for rewards in the Rewards tab.' },
  { q: 'Can I change my phone number or email?', a: "These are tied to your login and can't be changed directly, contact support on WhatsApp." },
  { q: 'My order is late, what do I do?', a: "Message us directly on WhatsApp with your order code, we'll check right away." },
]

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
          <div className="mb-3 mt-1 text-xs text-[var(--color-ink)]/60">{t.helpFaqDesc}</div>
          <FaqAccordion items={lang === 'fr' ? FAQ_FR : FAQ_EN} />
        </div>
      </div>
    </div>
  )
}
