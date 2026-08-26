import { registerNamespace } from '@/i18n'

/**
 * Side-effect import from every page in this feature (see
 * CertificatesPage.tsx / CertificateTemplatesPage.tsx) registers the
 * "certificates" namespace once per lazy chunk load — cheap and idempotent,
 * so it's safe to import from more than one page file.
 */
await registerNamespace('certificates', {
  en: () => import('@/locales/en/certificates.json'),
  es: () => import('@/locales/es/certificates.json'),
  fr: () => import('@/locales/fr/certificates.json'),
  pt: () => import('@/locales/pt/certificates.json'),
  de: () => import('@/locales/de/certificates.json'),
  ru: () => import('@/locales/ru/certificates.json'),
  hi: () => import('@/locales/hi/certificates.json'),
  zh: () => import('@/locales/zh/certificates.json'),
  ar: () => import('@/locales/ar/certificates.json'),
  ur: () => import('@/locales/ur/certificates.json'),
})
