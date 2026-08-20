import { useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { Button } from '@/components/Button'
import { useAppSettings } from '@/hooks/useAppSettings'

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
        <div className="flex flex-1 items-center justify-center overflow-hidden rounded-2xl bg-[var(--color-surface)] text-6xl">
          {image ? <img src={image} alt="" className="h-full w-full object-cover" /> : ['⚡', '📍', '🎁'][step]}
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
