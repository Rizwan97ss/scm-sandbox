import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page in this feature (see StudentsListPage.tsx
 * etc.) registers the "students" namespace once per lazy chunk load — cheap
 * and idempotent, so it's safe to import from more than one page file.
 */
await registerNamespace('students', {
  en: () => import('@/locales/en/students.json'),
  es: () => import('@/locales/es/students.json'),
  fr: () => import('@/locales/fr/students.json'),
  pt: () => import('@/locales/pt/students.json'),
  de: () => import('@/locales/de/students.json'),
  ru: () => import('@/locales/ru/students.json'),
  hi: () => import('@/locales/hi/students.json'),
  zh: () => import('@/locales/zh/students.json'),
  ar: () => import('@/locales/ar/students.json'),
  ur: () => import('@/locales/ur/students.json'),
})
