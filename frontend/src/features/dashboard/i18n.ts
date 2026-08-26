import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page in this feature (see DashboardPage.tsx
 * etc.) registers the "dashboard" namespace once per lazy chunk load — cheap
 * and idempotent, so it's safe to import from more than one page file.
 */
await registerNamespace('dashboard', {
  en: () => import('@/locales/en/dashboard.json'),
  es: () => import('@/locales/es/dashboard.json'),
  fr: () => import('@/locales/fr/dashboard.json'),
  pt: () => import('@/locales/pt/dashboard.json'),
  de: () => import('@/locales/de/dashboard.json'),
  ru: () => import('@/locales/ru/dashboard.json'),
  hi: () => import('@/locales/hi/dashboard.json'),
  zh: () => import('@/locales/zh/dashboard.json'),
  ar: () => import('@/locales/ar/dashboard.json'),
  ur: () => import('@/locales/ur/dashboard.json'),
})
