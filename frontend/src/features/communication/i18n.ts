import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page in this feature (see AnnouncementsPage.tsx)
 * registers the "communication" namespace once per lazy chunk load — cheap
 * and idempotent, so it's safe to import from more than one page file.
 */
await registerNamespace('communication', {
  en: () => import('@/locales/en/communication.json'),
  es: () => import('@/locales/es/communication.json'),
  fr: () => import('@/locales/fr/communication.json'),
  pt: () => import('@/locales/pt/communication.json'),
  de: () => import('@/locales/de/communication.json'),
  ru: () => import('@/locales/ru/communication.json'),
  hi: () => import('@/locales/hi/communication.json'),
  zh: () => import('@/locales/zh/communication.json'),
  ar: () => import('@/locales/ar/communication.json'),
  ur: () => import('@/locales/ur/communication.json'),
})
