import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page in this feature (see RolesListPage.tsx
 * etc.) registers the "roles" namespace once per lazy chunk load — cheap
 * and idempotent, so it's safe to import from more than one page file.
 */
await registerNamespace('roles', {
  en: () => import('@/locales/en/roles.json'),
  es: () => import('@/locales/es/roles.json'),
  fr: () => import('@/locales/fr/roles.json'),
  pt: () => import('@/locales/pt/roles.json'),
  de: () => import('@/locales/de/roles.json'),
  ru: () => import('@/locales/ru/roles.json'),
  hi: () => import('@/locales/hi/roles.json'),
  zh: () => import('@/locales/zh/roles.json'),
  ar: () => import('@/locales/ar/roles.json'),
  ur: () => import('@/locales/ur/roles.json'),
})
