import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page in this feature (see NoticeBoardPage.tsx)
 * registers the "noticeBoard" namespace once per lazy chunk load — cheap
 * and idempotent, so it's safe to import from more than one page file.
 */
await registerNamespace('noticeBoard', {
  en: () => import('@/locales/en/noticeBoard.json'),
  es: () => import('@/locales/es/noticeBoard.json'),
  fr: () => import('@/locales/fr/noticeBoard.json'),
  pt: () => import('@/locales/pt/noticeBoard.json'),
  de: () => import('@/locales/de/noticeBoard.json'),
  ru: () => import('@/locales/ru/noticeBoard.json'),
  hi: () => import('@/locales/hi/noticeBoard.json'),
  zh: () => import('@/locales/zh/noticeBoard.json'),
  ar: () => import('@/locales/ar/noticeBoard.json'),
  ur: () => import('@/locales/ur/noticeBoard.json'),
})
