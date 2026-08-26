export interface SupportedLanguage {
  code: string
  englishName: string
  nativeName: string
  rtl: boolean
}

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'en', englishName: 'English', nativeName: 'English', rtl: false },
  { code: 'es', englishName: 'Spanish', nativeName: 'Español', rtl: false },
  { code: 'fr', englishName: 'French', nativeName: 'Français', rtl: false },
  { code: 'pt', englishName: 'Portuguese', nativeName: 'Português', rtl: false },
  { code: 'de', englishName: 'German', nativeName: 'Deutsch', rtl: false },
  { code: 'ru', englishName: 'Russian', nativeName: 'Русский', rtl: false },
  { code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी', rtl: false },
  { code: 'zh', englishName: 'Chinese (Simplified)', nativeName: '简体中文', rtl: false },
  { code: 'ar', englishName: 'Arabic', nativeName: 'العربية', rtl: true },
  { code: 'ur', englishName: 'Urdu', nativeName: 'اردو', rtl: true },
]

export const DEFAULT_LANGUAGE_CODE = 'en'

export const LOCALE_STORAGE_KEY = 'sms.locale'

export function isSupportedLanguageCode(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === code)
}

/**
 * Synchronous best-guess at the active locale, for use at module-evaluation
 * time (before React/LocaleContext exist) — see i18n.ts's registerNamespace.
 * Mirrors LocaleContext's own stored-choice-first priority; it deliberately
 * skips the school-default-locale fallback (that needs an async settings
 * fetch) since this is only a preload optimization, not the source of truth
 * — LocaleContext's own effect still re-loads the right bundle reactively
 * once the real locale is known.
 */
export function getStoredLocaleSync(): string {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored && isSupportedLanguageCode(stored)) return stored
  } catch {
    // localStorage unavailable (private browsing, SSR, etc.) — fall through
  }
  return DEFAULT_LANGUAGE_CODE
}

export function isRtlLanguage(code: string): boolean {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code)?.rtl ?? false
}
