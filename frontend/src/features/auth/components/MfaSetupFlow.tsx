import { useEffect, useState } from 'react'
import { Button, Card, CardContent, Checkbox, FormField, Input } from '@/components/ui'
import type { ApiError } from '@/api/client'
import type { MfaRecoveryCodesResponse, MfaSetupResponse } from '@/types/auth'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import '../i18n'

/** Enrollment flow used by MfaSetupPage — 3 steps: QR -> confirm code -> save recovery codes. */
export function MfaSetupFlow({
  onSetup,
  onConfirm,
  onDone,
}: {
  onSetup: () => Promise<MfaSetupResponse>
  onConfirm: (code: string) => Promise<MfaRecoveryCodesResponse>
  onDone: () => void
}) {
  const { t } = useFeatureTranslation('auth')
  const [step, setStep] = useState<'loading' | 'scan' | 'codes' | 'error'>('loading')
  const [setupData, setSetupData] = useState<MfaSetupResponse | null>(null)
  const [code, setCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [confirmedSaved, setConfirmedSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    onSetup()
      .then((data) => {
        if (cancelled) return
        setSetupData(data)
        setStep('scan')
      })
      .catch((err) => {
        if (cancelled) return
        setError((err as ApiError).message ?? t('mfaSetupFlow.genericSetupError'))
        setStep('error')
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleConfirm() {
    setError(null)
    setIsSubmitting(true)
    try {
      const result = await onConfirm(code)
      setRecoveryCodes(result.recovery_codes)
      setStep('codes')
    } catch (err) {
      setError((err as ApiError).message ?? t('mfaSetupFlow.genericConfirmError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (step === 'loading') {
    return <p className="text-sm text-muted-foreground">{t('mfaSetupFlow.loading')}</p>
  }

  if (step === 'error') {
    return <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
  }

  if (step === 'scan' && setupData) {
    return (
      <div className="flex flex-col gap-5">
        <div>
          <h2 className="text-lg font-semibold">{t('mfaSetupFlow.step1Title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('mfaSetupFlow.step1Description')}</p>
        </div>

        <img src={setupData.qr_code} alt={t('mfaSetupFlow.qrAlt')} className="h-48 w-48 self-center rounded-md border border-border" />

        <FormField label={t('fields.manualKey')} htmlFor="mfa-manual-key">
          <Input id="mfa-manual-key" readOnly value={setupData.secret} className="font-mono text-xs" />
        </FormField>

        <div>
          <h2 className="text-lg font-semibold">{t('mfaSetupFlow.step2Title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('mfaSetupFlow.step2Description')}</p>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <FormField label={t('fields.authenticationCode')} htmlFor="mfa-confirm-code" required>
          <Input
            id="mfa-confirm-code"
            autoFocus
            inputMode="numeric"
            placeholder={t('mfaSetupFlow.codePlaceholder')}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </FormField>

        <Button onClick={handleConfirm} isLoading={isSubmitting} disabled={!code} className="self-start">
          {t('mfaSetupFlow.confirmAndEnable')}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-semibold">{t('mfaSetupFlow.step3Title')}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t('mfaSetupFlow.step3Description')}</p>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-2 pt-6 font-mono text-sm sm:grid-cols-2">
          {recoveryCodes.map((recoveryCode) => (
            <span key={recoveryCode}>{recoveryCode}</span>
          ))}
        </CardContent>
      </Card>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={confirmedSaved} onCheckedChange={setConfirmedSaved} aria-label={t('mfaSetupFlow.savedCheckboxAriaLabel')} />
        {t('mfaSetupFlow.savedCheckboxLabel')}
      </label>

      <Button onClick={onDone} disabled={!confirmedSaved} className="self-start">
        {t('mfaSetupFlow.done')}
      </Button>
    </div>
  )
}
