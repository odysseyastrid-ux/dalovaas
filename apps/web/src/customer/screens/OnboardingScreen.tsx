import { useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { Button } from '@/components/Button'
import { useAppSettings } from '@/hooks/useAppSettings'

// Fallback illustrations shown until the owner uploads a real photo for each
// onboarding slide (order fast, live tracking, loyalty points).
const ONBOARDING_ICONS = [
  <polygon key="bolt" points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  <>
    <path key="pin-outline" d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle key="pin-dot" cx="12" cy="10" r="3" />
  </>,
  <>
    <polyline key="gift-base" points="20 12 20 22 4 22 4 12" />
    <rect key="gift-lid" x="2" y="7" width="20" height="5" />
    <line key="gift-stem" x1="12" y1="22" x2="12" y2="7" />
    <path key="gift-bow-l" d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
    <path key="gift-bow-r" d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </>,
]

const SLIDES = [
  {
    titleEn: 'Order in seconds', descEn: 'Browse the full menu and customize every item exactly how you like it.',
    titleFr: 'Commandez en quelques secondes', descFr: 'Parcourez tout le menu et personnalisez chaque article comme vous voulez.',
  },
  {
    titleEn: 'Track it live', descEn: 'Watch your order move from kitchen to counter to your hands.',
    titleFr: 'Suivez en direct', descFr: 'Suivez votre commande de la cuisine au comptoir jusqu’à vous.',
  },
  {
    titleEn: 'Earn as you eat', descEn: 'Every order stacks points toward free food and drinks.',
    titleFr: 'Gagnez en mangeant', descFr: 'Chaque commande cumule des points pour des plats et boissons offerts.',
  },
]

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const { t, lang } = useI18n()
  const { settings } = useAppSettings()
  const [step, setStep] = useState(0)
  const slide = SLIDES[step]
  const isLast = step === SLIDES.length - 1
  const image = settings.onboarding_images[String(step)]

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex justify-end p-4">
        <button onClick={onDone} className="text-sm text-[var(--color-ink)]/60 underline">
          {t.skip}
        </button>
      </div>
      <div className="flex flex-1 flex-col px-6">
        <div className="flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-surface)]">
          {image ? (
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-700)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              {ONBOARDING_ICONS[step]}
            </svg>
          )}
        </div>
        <div className="mt-6">
          <div className="[font-family:var(--font-heading)] text-2xl font-extrabold">
            {lang === 'fr' ? slide.titleFr : slide.titleEn}
          </div>
          <div className="mt-3 text-sm leading-relaxed text-[var(--color-ink)]/70">
            {lang === 'fr' ? slide.descFr : slide.descEn}
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="mb-4 flex gap-1.5">
          {SLIDES.map((_, i) => (
            <div
              key={i}
              className="h-1.5 flex-1 rounded-full"
              style={{ background: i <= step ? 'var(--color-accent)' : 'var(--color-divider)' }}
            />
          ))}
        </div>
        <Button block onClick={() => (isLast ? onDone() : setStep((s) => s + 1))}>
          {isLast ? t.enter : '→'}
        </Button>
      </div>
    </div>
  )
}
