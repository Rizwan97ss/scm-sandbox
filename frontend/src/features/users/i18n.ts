import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page in this feature (see UsersListPage.tsx
 * etc.) registers the "users" namespace once per lazy chunk load — cheap
 * and idempotent, so it's safe to import from more than one page file.
 */
await registerNamespace('users', {
  en: () => import('@/locales/en/users.json'),
  es: () => import('@/locales/es/users.json'),
  fr: () => import('@/locales/fr/users.json'),
  pt: () => import('@/locales/pt/users.json'),
  de: () => import('@/locales/de/users.json'),
  ru: () => import('@/locales/ru/users.json'),
  hi: () => import('@/locales/hi/users.json'),
  zh: () => import('@/locales/zh/users.json'),
  ar: () => import('@/locales/ar/users.json'),
  ur: () => import('@/locales/ur/users.json'),
})
