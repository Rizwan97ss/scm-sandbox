import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { DEFAULT_LANGUAGE_CODE, SUPPORTED_LANGUAGES, getStoredLocaleSync } from '@/config/languages'
import en from '@/locales/en/common.json'

i18n.use(initReactI18next).init({
  resources: { en: { common: en } },
  lng: DEFAULT_LANGUAGE_CODE,
  fallbackLng: DEFAULT_LANGUAGE_CODE,
  supportedLngs: SUPPORTED_LANGUAGES.map((lang) => lang.code),
  ns: ['common'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  returnNull: false,
})

const loadedLanguages = new Set(['en'])

/**
 * English ships in the main bundle (it's the default/fallback, always
 * needed at first paint); the other 8 languages' translation JSON only
 * downloads when a user actually switches to one — otherwise every visitor
 * pays for ~68KB of translations they never read. Each language's JSON is
 * imported from exactly one place (here), so this doesn't reintroduce the
 * eager+lazy double-import pattern that previously caused Rolldown to fold
 * unrelated large chunks into the main bundle (see docs/testing.md).
 */
export async function ensureLanguageLoaded(code: string): Promise<void> {
  if (loadedLanguages.has(code)) return

  const modules: Record<string, () => Promise<{ default: Record<string, unknown> }>> = {
    es: () => import('@/locales/es/common.json'),
    fr: () => import('@/locales/fr/common.json'),
    pt: () => import('@/locales/pt/common.json'),
    de: () => import('@/locales/de/common.json'),
    ru: () => import('@/locales/ru/common.json'),
    hi: () => import('@/locales/hi/common.json'),
    zh: () => import('@/locales/zh/common.json'),
    ar: () => import('@/locales/ar/common.json'),
    ur: () => import('@/locales/ur/common.json'),
  }

  const loader = modules[code]
  if (!loader) return

  const { default: resource } = await loader()
  i18n.addResourceBundle(code, 'common', resource)
  loadedLanguages.add(code)
}

type NamespaceLoader = () => Promise<{ default: Record<string, unknown> }>

const namespaceLoaders: Record<string, Record<string, NamespaceLoader>> = {}
const loadedNamespaces = new Set<string>()

/**
 * Feature namespaces (e.g. "students", "fees") are registered by a
 * side-effect import inside each feature's own lazy route chunk (see
 * features/students/i18n.ts for the pattern) — never from i18n.ts itself.
 * That keeps this file feature-agnostic so adding a new translated feature
 * never requires editing a file every other feature also depends on.
 *
 * Unlike "common", every language here — including English — is
 * dynamically imported. English's per-feature strings are only needed once
 * a user actually opens that feature's lazy-loaded page, so eagerly
 * bundling them would bloat the main bundle for no first-paint benefit
 * (see the ensureLanguageLoaded comment above for why that matters here).
 *
 * Returns the preload promise for the current best-guess locale — each
 * feature's i18n.ts `await`s this at module top level. Because that file is
 * statically imported by the feature's page component, which is itself
 * reached only through the route's `lazy(() => import(...))`, awaiting here
 * makes the ALREADY-EXISTING route-level Suspense fallback also cover
 * translation loading. Without this, useFeatureTranslation's `ready` flag
 * only flips true on a POST-MOUNT effect, so the page's first paint always
 * calls t() before any resource exists — i18next's missing-key fallback then
 * renders the raw key string (e.g. "login.rememberMe") for one frame. That's
 * invisible on a fast connection but real and reproducible (it's exactly
 * what LoginForm.test.tsx caught, synchronously, with nothing to await).
 */
export function registerNamespace(namespace: string, loaders: Record<string, NamespaceLoader>): Promise<void> {
  namespaceLoaders[namespace] = loaders
  const ns = i18n.options.ns
  if (Array.isArray(ns) && !ns.includes(namespace)) ns.push(namespace)
  return ensureNamespaceLoaded(namespace, getStoredLocaleSync())
}

export function isNamespaceLoaded(namespace: string, language: string): boolean {
  return loadedNamespaces.has(`${namespace}:${language}`)
}

export async function ensureNamespaceLoaded(namespace: string, language: string): Promise<void> {
  const key = `${namespace}:${language}`
  if (loadedNamespaces.has(key)) return

  const loader = namespaceLoaders[namespace]?.[language]
  if (!loader) return

  const { default: resource } = await loader()
  i18n.addResourceBundle(language, namespace, resource)
  loadedNamespaces.add(key)
}

export default i18n
