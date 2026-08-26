import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page in this feature (see ImportCenterPage.tsx
 * etc.) registers the "imports" namespace once per lazy chunk load — cheap
 * and idempotent, so it's safe to import from more than one page file.
 */
await registerNamespace('imports', {
  en: () => import('@/locales/en/imports.json'),
  es: () => import('@/locales/es/imports.json'),
  fr: () => import('@/locales/fr/imports.json'),
  pt: () => import('@/locales/pt/imports.json'),
  de: () => import('@/locales/de/imports.json'),
  ru: () => import('@/locales/ru/imports.json'),
  hi: () => import('@/locales/hi/imports.json'),
  zh: () => import('@/locales/zh/imports.json'),
  ar: () => import('@/locales/ar/imports.json'),
  ur: () => import('@/locales/ur/imports.json'),
})
