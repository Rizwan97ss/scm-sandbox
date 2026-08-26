import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page in this feature (see AuditLogsPage.tsx
 * etc.) registers the "auditLogs" namespace once per lazy chunk load — cheap
 * and idempotent, so it's safe to import from more than one page file.
 */
await registerNamespace('auditLogs', {
  en: () => import('@/locales/en/auditLogs.json'),
  es: () => import('@/locales/es/auditLogs.json'),
  fr: () => import('@/locales/fr/auditLogs.json'),
  pt: () => import('@/locales/pt/auditLogs.json'),
  de: () => import('@/locales/de/auditLogs.json'),
  ru: () => import('@/locales/ru/auditLogs.json'),
  hi: () => import('@/locales/hi/auditLogs.json'),
  zh: () => import('@/locales/zh/auditLogs.json'),
  ar: () => import('@/locales/ar/auditLogs.json'),
  ur: () => import('@/locales/ur/auditLogs.json'),
})
