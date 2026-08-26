import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { i18n as I18n, TFunction } from 'i18next'
import { useLocale } from '@/context/LocaleContext'
import { ensureNamespaceLoaded, isNamespaceLoaded } from '@/i18n'

interface FeatureTranslation {
  t: TFunction
  i18n: I18n
  ready: boolean
}

/**
 * Like useTranslation(), but for a lazily-registered feature namespace (see
 * features/students/i18n.ts for the registration pattern).
 *
 * In the normal case `ready` is true from the very first render: each
 * feature's i18n.ts top-level-`await`s the same load this effect would
 * otherwise kick off, and since that file is a static import reached only
 * through the route's `lazy(() => import(...))`, the existing route-level
 * Suspense fallback already covered it before this component ever mounted —
 * the lazy initializer here just needs to notice that. The effect below is
 * the fallback path for a mid-session language switch (the newly-selected
 * locale's bundle for THIS namespace was never preloaded, since preloading
 * only ever targets the locale active at module-evaluation time).
 */
export function useFeatureTranslation(namespace: string): FeatureTranslation {
  const { locale } = useLocale()
  const [ready, setReady] = useState(() => isNamespaceLoaded(namespace, locale))
  const { t, i18n } = useTranslation(namespace)

  useEffect(() => {
    if (isNamespaceLoaded(namespace, locale)) {
      setReady(true)
      return
    }
    let cancelled = false
    setReady(false)
    ensureNamespaceLoaded(namespace, locale).then(() => {
      if (!cancelled) setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [namespace, locale])

  return { t, i18n, ready }
}
