import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page in this feature (see ExamsListPage.tsx
 * etc.) registers the "exams" namespace once per lazy chunk load — cheap
 * and idempotent, so it's safe to import from more than one page file.
 */
await registerNamespace('exams', {
  en: () => import('@/locales/en/exams.json'),
  es: () => import('@/locales/es/exams.json'),
  fr: () => import('@/locales/fr/exams.json'),
  pt: () => import('@/locales/pt/exams.json'),
  de: () => import('@/locales/de/exams.json'),
  ru: () => import('@/locales/ru/exams.json'),
  hi: () => import('@/locales/hi/exams.json'),
  zh: () => import('@/locales/zh/exams.json'),
  ar: () => import('@/locales/ar/exams.json'),
  ur: () => import('@/locales/ur/exams.json'),
})
