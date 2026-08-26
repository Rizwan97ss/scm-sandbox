import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page in this feature (see HomeworkListPage.tsx
 * etc.) registers the "homework" namespace once per lazy chunk load — cheap
 * and idempotent, so it's safe to import from more than one page file.
 */
await registerNamespace('homework', {
  en: () => import('@/locales/en/homework.json'),
  es: () => import('@/locales/es/homework.json'),
  fr: () => import('@/locales/fr/homework.json'),
  pt: () => import('@/locales/pt/homework.json'),
  de: () => import('@/locales/de/homework.json'),
  ru: () => import('@/locales/ru/homework.json'),
  hi: () => import('@/locales/hi/homework.json'),
  zh: () => import('@/locales/zh/homework.json'),
  ar: () => import('@/locales/ar/homework.json'),
  ur: () => import('@/locales/ur/homework.json'),
})
