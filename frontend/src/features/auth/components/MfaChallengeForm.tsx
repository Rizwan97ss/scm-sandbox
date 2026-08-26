import { useState, type FormEvent } from 'react'
import { Button, FormField, Input } from '@/components/ui'
import type { MfaChallengePayload } from '@/types/auth'
import type { ApiError } from '@/api/client'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import '../i18n'

/**
 * The login flow's second step. The caller supplies onVerify (the API
 * function to call) and onSuccess (where to navigate once the returned user
 * is cached).
 */
export function MfaChallengeForm({
  challengeToken,
  onVerify,
  onSuccess,
}: {
  challengeToken: string
  onVerify: (payload: MfaChallengePayload) => Promise<unknown>
  onSuccess: () => void
}) {
  const { t } = useFeatureTranslation('auth')
  const [code, setCode] = useState('')
  const [useRecoveryCode, setUseRecoveryCode] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await onVerify({ challenge_token: challengeToken, code })
      onSuccess()
    } catch (err) {
      setError((err as ApiError).message ?? t('mfaChallenge.genericError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-muted-foreground">
        {useRecoveryCode ? t('mfaChallenge.descriptionRecovery') : t('mfaChallenge.descriptionCode')}
      </p>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <FormField label={useRecoveryCode ? t('fields.recoveryCode') : t('fields.authenticationCode')} htmlFor="mfa-code" required>
        <Input
          id="mfa-code"
          autoFocus
          autoComplete="one-time-code"
          inputMode={useRecoveryCode ? 'text' : 'numeric'}
          placeholder={useRecoveryCode ? t('mfaChallenge.recoveryPlaceholder') : t('mfaChallenge.codePlaceholder')}
          value={code}
          onChange={(event) => setCode(event.target.value)}
        />
      </FormField>

      <button
        type="button"
        onClick={() => {
          setUseRecoveryCode((v) => !v)
          setCode('')
          setError(null)
        }}
        className="text-start text-sm text-primary hover:underline"
      >
        {useRecoveryCode ? t('mfaChallenge.useAuthenticatorApp') : t('mfaChallenge.useRecoveryCode')}
      </button>

      <Button type="submit" isLoading={isSubmitting} disabled={!code} className="mt-2">
        {t('mfaChallenge.submit')}
      </Button>
    </form>
  )
}
