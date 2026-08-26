import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { resetPassword } from '@/api/endpoints/auth'
import { Button, FormField, Input } from '@/components/ui'
import { routePaths } from '@/routes/routePaths'
import type { ApiError } from '@/api/client'
import { toast } from 'sonner'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import '../i18n'

export function ResetPasswordPage() {
  const { t } = useFeatureTranslation('auth')
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''

  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      await resetPassword({ token, email, password, password_confirmation: passwordConfirmation })
      toast.success(t('resetPassword.successMessage'))
      navigate(routePaths.login)
    } catch (err) {
      setError((err as ApiError).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 text-lg font-semibold">{t('resetPassword.title')}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{t('resetPassword.forAccount', { email: email || t('resetPassword.forYourAccount') })}</p>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <FormField label={t('fields.newPassword')} htmlFor="password" required>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </FormField>
            <FormField label={t('fields.confirmPassword')} htmlFor="password_confirmation" required>
              <Input
                id="password_confirmation"
                type="password"
                required
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
              />
            </FormField>
            <Button type="submit" isLoading={isSubmitting}>
              {t('resetPassword.submit')}
            </Button>
          </form>
          <Link to={routePaths.login} className="mt-4 inline-block text-sm text-primary hover:underline">
            {t('resetPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  )
}
