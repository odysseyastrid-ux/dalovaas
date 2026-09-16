import { useState } from 'react'
import { useI18n } from '@/i18n/I18nContext'
import { FlameShaderBackground } from '@/components/FlameShaderBackground'
import { BRAND_NAME, BRAND_WORDMARK_URL } from '@/lib/brand'

export function SplashScreen({ onEnter }: { onEnter: () => void }) {
  const { t } = useI18n()
  const [imgFailed, setImgFailed] = useState(false)

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 overflow-hidden px-6 pb-40">
      <FlameShaderBackground />
      <div className="relative z-10 text-center">
        {!imgFailed ? (
          <img
            src={BRAND_WORDMARK_URL}
            alt={BRAND_NAME}
            onError={() => setImgFailed(true)}
            className="mx-auto h-auto w-[80%] max-w-[320px] drop-shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
          />
        ) : (
          <div className="[font-family:var(--font-heading)] text-5xl font-black text-white drop-shadow-lg">
            {BRAND_NAME}
          </div>
        )}
        <div className="mt-3 [font-family:var(--font-heading)] text-2xl font-extrabold text-white">
          <span className="text-3d animate-float">{t.slogan}</span>
        </div>
      </div>
      <button
        onClick={onEnter}
        className="btn-gradient absolute bottom-5 left-6 right-6 z-10 rounded-xl transition active:scale-[0.98]"
      >
        <span className="btn-gradient-inner flex items-center justify-center rounded-[9px] px-5 py-4 [font-family:var(--font-heading)] text-sm font-bold tracking-wide">
          {t.enter}
        </span>
      </button>
    </div>
  )
}
