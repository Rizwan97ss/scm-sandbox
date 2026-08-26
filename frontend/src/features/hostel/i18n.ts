import { registerNamespace } from '@/i18n'

await registerNamespace('hostel', {
  en: () => import('@/locales/en/hostel.json'),
  es: () => import('@/locales/es/hostel.json'),
  fr: () => import('@/locales/fr/hostel.json'),
  pt: () => import('@/locales/pt/hostel.json'),
  de: () => import('@/locales/de/hostel.json'),
  ru: () => import('@/locales/ru/hostel.json'),
  hi: () => import('@/locales/hi/hostel.json'),
  zh: () => import('@/locales/zh/hostel.json'),
  ar: () => import('@/locales/ar/hostel.json'),
  ur: () => import('@/locales/ur/hostel.json'),
})
