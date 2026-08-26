import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page/component in this feature registers
 * the "attendance" namespace once per lazy chunk load — cheap and
 * idempotent, so it's safe to import from more than one file (see
 * students/i18n.ts for the original pattern).
 */
await registerNamespace('attendance', {
  en: () => import('@/locales/en/attendance.json'),
  es: () => import('@/locales/es/attendance.json'),
  fr: () => import('@/locales/fr/attendance.json'),
  pt: () => import('@/locales/pt/attendance.json'),
  de: () => import('@/locales/de/attendance.json'),
  ru: () => import('@/locales/ru/attendance.json'),
  hi: () => import('@/locales/hi/attendance.json'),
  zh: () => import('@/locales/zh/attendance.json'),
  ar: () => import('@/locales/ar/attendance.json'),
  ur: () => import('@/locales/ur/attendance.json'),
})
