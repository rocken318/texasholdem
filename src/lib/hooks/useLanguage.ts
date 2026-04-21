import { useState } from 'react'
import { T, type Lang } from '@/lib/i18n'

const KEY = 'texasholdem_lang'

export function useLanguage() {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window === 'undefined') return 'ja'
    const saved = localStorage.getItem(KEY) as Lang | null
    return saved === 'en' || saved === 'ja' ? saved : 'ja'
  })

  function toggleLang() {
    setLangState(prev => {
      const next: Lang = prev === 'ja' ? 'en' : 'ja'
      localStorage.setItem(KEY, next)
      return next
    })
  }

  return { lang, t: T[lang], toggleLang }
}
