import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page in this feature (see
 * CourseMaterialListPage.tsx) registers the "courseMaterials" namespace once
 * per lazy chunk load — cheap and idempotent, so it's safe to import from
 * more than one page file.
 */
await registerNamespace('courseMaterials', {
  en: () => import('@/locales/en/courseMaterials.json'),
  es: () => import('@/locales/es/courseMaterials.json'),
  fr: () => import('@/locales/fr/courseMaterials.json'),
  pt: () => import('@/locales/pt/courseMaterials.json'),
  de: () => import('@/locales/de/courseMaterials.json'),
  ru: () => import('@/locales/ru/courseMaterials.json'),
  hi: () => import('@/locales/hi/courseMaterials.json'),
  zh: () => import('@/locales/zh/courseMaterials.json'),
  ar: () => import('@/locales/ar/courseMaterials.json'),
  ur: () => import('@/locales/ur/courseMaterials.json'),
})
