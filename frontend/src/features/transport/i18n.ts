import { registerNamespace } from '@/i18n'

await registerNamespace('transport', {
  en: () => import('@/locales/en/transport.json'),
  es: () => import('@/locales/es/transport.json'),
  fr: () => import('@/locales/fr/transport.json'),
  pt: () => import('@/locales/pt/transport.json'),
  de: () => import('@/locales/de/transport.json'),
  ru: () => import('@/locales/ru/transport.json'),
  hi: () => import('@/locales/hi/transport.json'),
  zh: () => import('@/locales/zh/transport.json'),
  ar: () => import('@/locales/ar/transport.json'),
  ur: () => import('@/locales/ur/transport.json'),
})
