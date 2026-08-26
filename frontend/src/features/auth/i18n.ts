import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page/component in this feature registers
 * the "auth" namespace once per lazy chunk load — cheap and idempotent, so
 * it's safe to import from more than one file (see students/i18n.ts for the
 * original pattern). Auth pages render before login, but LocaleProvider
 * sits outside AuthProvider in AppProviders.tsx and only depends on the
 * public settings endpoint, so translated auth pages work pre-login too.
 */
await registerNamespace('auth', {
  en: () => import('@/locales/en/auth.json'),
  es: () => import('@/locales/es/auth.json'),
  fr: () => import('@/locales/fr/auth.json'),
  pt: () => import('@/locales/pt/auth.json'),
  de: () => import('@/locales/de/auth.json'),
  ru: () => import('@/locales/ru/auth.json'),
  hi: () => import('@/locales/hi/auth.json'),
  zh: () => import('@/locales/zh/auth.json'),
  ar: () => import('@/locales/ar/auth.json'),
  ur: () => import('@/locales/ur/auth.json'),
})
