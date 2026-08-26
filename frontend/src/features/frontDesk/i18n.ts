import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page in this feature (see VisitorsPage.tsx)
 * registers the "frontDesk" namespace once per lazy chunk load — cheap
 * and idempotent, so it's safe to import from more than one page file.
 */
await registerNamespace('frontDesk', {
  en: () => import('@/locales/en/frontDesk.json'),
  es: () => import('@/locales/es/frontDesk.json'),
  fr: () => import('@/locales/fr/frontDesk.json'),
  pt: () => import('@/locales/pt/frontDesk.json'),
  de: () => import('@/locales/de/frontDesk.json'),
  ru: () => import('@/locales/ru/frontDesk.json'),
  hi: () => import('@/locales/hi/frontDesk.json'),
  zh: () => import('@/locales/zh/frontDesk.json'),
  ar: () => import('@/locales/ar/frontDesk.json'),
  ur: () => import('@/locales/ur/frontDesk.json'),
})
