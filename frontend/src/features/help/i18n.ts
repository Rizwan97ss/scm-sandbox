import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from HelpGuidePage.tsx registers the "help" namespace
 * once per lazy chunk load — cheap and idempotent (see students/i18n.ts for
 * the original pattern).
 */
await registerNamespace('help', {
  en: () => import('@/locales/en/help.json'),
  es: () => import('@/locales/es/help.json'),
  fr: () => import('@/locales/fr/help.json'),
  pt: () => import('@/locales/pt/help.json'),
  de: () => import('@/locales/de/help.json'),
  ru: () => import('@/locales/ru/help.json'),
  hi: () => import('@/locales/hi/help.json'),
  zh: () => import('@/locales/zh/help.json'),
  ar: () => import('@/locales/ar/help.json'),
  ur: () => import('@/locales/ur/help.json'),
})
