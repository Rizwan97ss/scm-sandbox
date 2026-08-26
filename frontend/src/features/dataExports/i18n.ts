import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page in this feature (see MyDataExportPage.tsx
 * etc.) registers the "dataExports" namespace once per lazy chunk load — cheap
 * and idempotent, so it's safe to import from more than one page file.
 */
await registerNamespace('dataExports', {
  en: () => import('@/locales/en/dataExports.json'),
  es: () => import('@/locales/es/dataExports.json'),
  fr: () => import('@/locales/fr/dataExports.json'),
  pt: () => import('@/locales/pt/dataExports.json'),
  de: () => import('@/locales/de/dataExports.json'),
  ru: () => import('@/locales/ru/dataExports.json'),
  hi: () => import('@/locales/hi/dataExports.json'),
  zh: () => import('@/locales/zh/dataExports.json'),
  ar: () => import('@/locales/ar/dataExports.json'),
  ur: () => import('@/locales/ur/dataExports.json'),
})
