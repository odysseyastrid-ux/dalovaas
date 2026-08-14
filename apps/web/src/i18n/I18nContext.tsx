import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { STRINGS, type Lang, type Strings } from './strings'

interface I18nValue {
  lang: Lang
  t: Strings
  toggleLang: () => void
  setLang: (lang: Lang) => void
}

const I18nCtx = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('chez-sanji-lang')
    return saved === 'en' ? 'en' : 'fr'
  })

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    localStorage.setItem('chez-sanji-lang', l)
  }, [])

  const toggleLang = useCallback(() => {
    setLang(lang === 'fr' ? 'en' : 'fr')
  }, [lang, setLang])

  const value = useMemo(() => ({ lang, t: STRINGS[lang], toggleLang, setLang }), [lang, toggleLang, setLang])

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nCtx)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
