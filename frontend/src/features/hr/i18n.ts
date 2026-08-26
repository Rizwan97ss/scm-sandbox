import { registerNamespace } from '@/i18n'

await registerNamespace('hr', {
  en: () => import('@/locales/en/hr.json'),
  es: () => import('@/locales/es/hr.json'),
  fr: () => import('@/locales/fr/hr.json'),
  pt: () => import('@/locales/pt/hr.json'),
  de: () => import('@/locales/de/hr.json'),
  ru: () => import('@/locales/ru/hr.json'),
  hi: () => import('@/locales/hi/hr.json'),
  zh: () => import('@/locales/zh/hr.json'),
  ar: () => import('@/locales/ar/hr.json'),
  ur: () => import('@/locales/ur/hr.json'),
})
