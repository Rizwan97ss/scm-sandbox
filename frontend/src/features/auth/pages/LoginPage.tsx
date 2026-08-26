import { useState } from 'react'
import { LoginForm } from '../components/LoginForm'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import '../i18n'

export function LoginPage() {
  const { t } = useFeatureTranslation('auth')
  const [step, setStep] = useState<'credentials' | 'mfa'>('credentials')

  const stepCopy = {
    credentials: { heading: t('login.credentialsHeading'), description: t('login.credentialsDescription') },
    mfa: { heading: t('login.mfaHeading'), description: t('login.mfaDescription') },
  } as const

  return (
    <AuthLayout eyebrow={t('login.eyebrow')} title={t('login.title')} description={t('login.description')}>
      <h2 className="mb-1 text-[22px] font-medium text-[var(--mk-ink)]">{stepCopy[step].heading}</h2>
      <p className="mb-7 text-[14px] text-[var(--mk-ink-soft)]">{stepCopy[step].description}</p>
      <LoginForm onStepChange={setStep} />
    </AuthLayout>
  )
}
