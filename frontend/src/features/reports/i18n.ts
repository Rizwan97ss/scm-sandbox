import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page in this feature (see
 * AttendanceReportPage.tsx etc.) registers the "reports" namespace once per
 * lazy chunk load — cheap and idempotent, so it's safe to import from more
 * than one page file.
 */
await registerNamespace('reports', {
  en: () => import('@/locales/en/reports.json'),
  es: () => import('@/locales/es/reports.json'),
  fr: () => import('@/locales/fr/reports.json'),
  pt: () => import('@/locales/pt/reports.json'),
  de: () => import('@/locales/de/reports.json'),
  ru: () => import('@/locales/ru/reports.json'),
  hi: () => import('@/locales/hi/reports.json'),
  zh: () => import('@/locales/zh/reports.json'),
  ar: () => import('@/locales/ar/reports.json'),
  ur: () => import('@/locales/ur/reports.json'),
})
