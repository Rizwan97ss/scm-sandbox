import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page in this feature (see SettingsPage.tsx
 * etc.) registers the "settings" namespace once per lazy chunk load — cheap
 * and idempotent, so it's safe to import from more than one page file.
 */
await registerNamespace('settings', {
  en: () => import('@/locales/en/settings.json'),
  es: () => import('@/locales/es/settings.json'),
  fr: () => import('@/locales/fr/settings.json'),
  pt: () => import('@/locales/pt/settings.json'),
  de: () => import('@/locales/de/settings.json'),
  ru: () => import('@/locales/ru/settings.json'),
  hi: () => import('@/locales/hi/settings.json'),
  zh: () => import('@/locales/zh/settings.json'),
  ar: () => import('@/locales/ar/settings.json'),
  ur: () => import('@/locales/ur/settings.json'),
})
