import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page in this feature (see FeeStructuresPage.tsx
 * etc.) registers the "fees" namespace once per lazy chunk load — cheap
 * and idempotent, so it's safe to import from more than one page file.
 */
await registerNamespace('fees', {
  en: () => import('@/locales/en/fees.json'),
  es: () => import('@/locales/es/fees.json'),
  fr: () => import('@/locales/fr/fees.json'),
  pt: () => import('@/locales/pt/fees.json'),
  de: () => import('@/locales/de/fees.json'),
  ru: () => import('@/locales/ru/fees.json'),
  hi: () => import('@/locales/hi/fees.json'),
  zh: () => import('@/locales/zh/fees.json'),
  ar: () => import('@/locales/ar/fees.json'),
  ur: () => import('@/locales/ur/fees.json'),
})
