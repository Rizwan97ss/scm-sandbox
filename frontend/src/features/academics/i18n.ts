import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page in this feature (see AcademicYearsPage.tsx
 * etc.) registers the "academics" namespace once per lazy chunk load — cheap
 * and idempotent, so it's safe to import from more than one page file.
 */
await registerNamespace('academics', {
  en: () => import('@/locales/en/academics.json'),
  es: () => import('@/locales/es/academics.json'),
  fr: () => import('@/locales/fr/academics.json'),
  pt: () => import('@/locales/pt/academics.json'),
  de: () => import('@/locales/de/academics.json'),
  ru: () => import('@/locales/ru/academics.json'),
  hi: () => import('@/locales/hi/academics.json'),
  zh: () => import('@/locales/zh/academics.json'),
  ar: () => import('@/locales/ar/academics.json'),
  ur: () => import('@/locales/ur/academics.json'),
})
