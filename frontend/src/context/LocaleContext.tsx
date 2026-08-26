import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import i18n, { ensureLanguageLoaded } from '@/i18n'
import { fetchPublicSettings } from '@/api/endpoints/settings'
import { queryKeys } from '@/api/queryKeys'
import { DEFAULT_LANGUAGE_CODE, isRtlLanguage, isSupportedLanguageCode } from '@/config/languages'

interface LocaleContextValue {
  locale: string
  setLocale: (locale: string) => void
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

const LOCALE_STORAGE_KEY = 'sms.locale'

/**
 * Locale source priority, mirroring ThemeContext's preference/settings
 * split: the user's own explicit choice (localStorage) wins if set; otherwise
 * falls back to the school's configured default (`school.locale`, already
 * public via GET /settings/public); otherwise 'en'. A user's choice is
 * per-browser, same tradeoff ThemeContext already accepts for theme.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const { data: settings } = useQuery({
    queryKey: queryKeys.publicSettings(),
    queryFn: () => fetchPublicSettings(),
    staleTime: 5 * 60 * 1000,
    retry: false,
    meta: { silentError: true },
  })

  const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY)
  const schoolLocale = settings?.['school.locale'] as string | undefined

  const [locale, setLocaleState] = useState<string>(() => {
    if (storedLocale && isSupportedLanguageCode(storedLocale)) return storedLocale
    return DEFAULT_LANGUAGE_CODE
  })

  // Once the school's default locale loads, adopt it — but only if the user
  // hasn't made their own explicit choice already (a stored value always wins).
  useEffect(() => {
    if (storedLocale) return
    if (schoolLocale && isSupportedLanguageCode(schoolLocale) && schoolLocale !== locale) {
      setLocaleState(schoolLocale)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolLocale])

  useEffect(() => {
    let cancelled = false
    ensureLanguageLoaded(locale).then(() => {
      if (cancelled) return
      i18n.changeLanguage(locale)
      document.documentElement.lang = locale
      document.documentElement.dir = isRtlLanguage(locale) ? 'rtl' : 'ltr'
    })
    return () => {
      cancelled = true
    }
  }, [locale])

  function setLocale(next: string) {
    if (!isSupportedLanguageCode(next)) return
    localStorage.setItem(LOCALE_STORAGE_KEY, next)
    setLocaleState(next)
  }

  const value = useMemo<LocaleContextValue>(() => ({ locale, setLocale }), [locale])

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within a LocaleProvider')
  return ctx
}
