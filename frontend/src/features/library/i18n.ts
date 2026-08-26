import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page in this feature (see BooksPage.tsx
 * etc.) registers the "library" namespace once per lazy chunk load — cheap
 * and idempotent, so it's safe to import from more than one page file.
 */
await registerNamespace('library', {
  en: () => import('@/locales/en/library.json'),
  es: () => import('@/locales/es/library.json'),
  fr: () => import('@/locales/fr/library.json'),
  pt: () => import('@/locales/pt/library.json'),
  de: () => import('@/locales/de/library.json'),
  ru: () => import('@/locales/ru/library.json'),
  hi: () => import('@/locales/hi/library.json'),
  zh: () => import('@/locales/zh/library.json'),
  ar: () => import('@/locales/ar/library.json'),
  ur: () => import('@/locales/ur/library.json'),
})
