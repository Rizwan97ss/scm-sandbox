import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { env } from '@/config/env'
import type { ApiErrorResponse } from '@/types/api'

/** API base (scheme+host+port+path, no trailing /v1). Exported for apiFileUrl.ts, which builds plain <a href> links outside of httpClient and must resolve the same base. */
export const apiUrl = env.apiUrl

/** Origin the API is served from, e.g. "http://myschool.localtest.me:8000". */
const apiOrigin = apiUrl.startsWith('/') ? window.location.origin : new URL(apiUrl).origin

export const httpClient = axios.create({
  baseURL: `${apiUrl}/v1`,
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    Accept: 'application/json',
  },
})

let csrfCookiePromise: Promise<void> | null = null

/**
 * Sanctum's SPA auth requires a GET to /sanctum/csrf-cookie before the first
 * mutating request in a session; the cookie it sets is then sent automatically
 * (withXSRFToken) on every subsequent request. Cached so repeated calls in the
 * same page load don't re-fetch it.
 */
export function ensureCsrfCookie(): Promise<void> {
  csrfCookiePromise ??= axios
    .get(`${apiOrigin}/sanctum/csrf-cookie`, { withCredentials: true })
    .then(() => undefined)
  return csrfCookiePromise
}

httpClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const method = config.method?.toLowerCase()
  if (method && method !== 'get' && method !== 'head') {
    await ensureCsrfCookie()
  }
  return config
})

/** Normalized shape every thrown API error carries, regardless of what the server returned. */
export interface ApiError {
  message: string
  errors?: Record<string, string[]>
  status?: number
  /** Only ever set on a 429 — Laravel's throttle middleware always sends this header, in seconds, on a rate-limited response. Lets the UI say "try again in Ns" instead of a vague "try again later." */
  retryAfterSeconds?: number
}

/**
 * Laravel's ValidationException always carries a field-by-field `errors` map
 * alongside its top-line `message` — but every onError handler in this app
 * historically only rendered `.message`, so a validation failure showed a
 * generic one-liner ("The given data was invalid.") with the actual reason
 * silently dropped. Appends the flattened field errors when present.
 */
export function formatApiError(error: ApiError): string {
  if (!error.errors) return error.message
  const details = Object.values(error.errors).flat()
  return details.length ? `${error.message} ${details.join(' ')}` : error.message
}

/** Single source of truth for "was this a 401" — used by app/queryClient.ts to detect a session that's expired mid-use (as opposed to AuthContext's initial /auth/me check, which is its own expected, silent 401 for a not-yet-logged-in user). */
export function isUnauthenticatedError(error: unknown): error is ApiError {
  return !!error && typeof error === 'object' && 'status' in error && (error as ApiError).status === 401
}

/**
 * Every throttled endpoint returns the same generic Laravel default ("Too
 * Many Attempts."), which says nothing about how long to actually wait.
 * Laravel's throttle middleware always sends a `Retry-After` header (in
 * seconds) alongside a 429, so this turns "try again later" into an actual
 * number, right at the source — every one of the ~60 `onError` call sites
 * across the app just reads `error.message`/`formatApiError(error)`, so
 * fixing it here means all of them get it for free, not just whichever
 * ones happen to check `error.status === 429` themselves.
 *
 * 403 is deliberately left untouched: Laravel policies already send a
 * specific, human-readable message per action ("You can only edit your own
 * leave requests," not just "Forbidden") — overriding it with a generic
 * string would throw away real information for no gain.
 */
function describeStatus(status: number | undefined, retryAfterSeconds: number | undefined, fallback: string): string {
  if (status === 429) {
    return retryAfterSeconds ? `Too many requests — please wait ${retryAfterSeconds}s and try again.` : 'Too many requests — please wait a moment and try again.'
  }
  return fallback
}

httpClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    const retryAfterHeader = error.response?.headers?.['retry-after']
    const retryAfterSeconds = retryAfterHeader !== undefined ? Number(retryAfterHeader) : undefined
    const status = error.response?.status
    const validRetryAfterSeconds = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds : undefined

    const apiError: ApiError = {
      message: describeStatus(status, validRetryAfterSeconds, error.response?.data?.message ?? error.message ?? 'Something went wrong.'),
      errors: error.response?.data?.errors,
      status,
      retryAfterSeconds: validRetryAfterSeconds,
    }
    return Promise.reject(apiError)
  }
)
