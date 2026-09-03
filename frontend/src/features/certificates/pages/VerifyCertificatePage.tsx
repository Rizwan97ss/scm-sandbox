import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, XCircle } from 'lucide-react'
import { certificatesApi } from '@/api/endpoints/certificates'
import { Skeleton } from '@/components/ui'
import { formatDate } from '@/utils/formatDate'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import '../i18n'

/**
 * Public, no login required — what a scanned certificate QR code (or a
 * manually-typed verify link) lands on. Same "no ProtectedRoute" shape as
 * ForgotPasswordPage/ResetPasswordPage, registered outside the auth guard
 * in AppRouter.tsx.
 */
export function VerifyCertificatePage() {
  const { t } = useFeatureTranslation('certificates')
  const { token } = useParams<{ token: string }>()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['certificate-verify', token],
    queryFn: () => certificatesApi.verify(token!),
    enabled: !!token,
    retry: false,
  })

  const isValid = !isError && data?.valid

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-border bg-card p-6 text-center shadow-sm">
          {isLoading && (
            <div className="flex flex-col items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-4 w-40" />
            </div>
          )}

          {!isLoading && isValid && (
            <div className="flex flex-col items-center gap-2">
              <CheckCircle2 className="h-10 w-10 text-success" />
              <h1 className="text-base font-semibold">{t('verify.validTitle')}</h1>
              <p className="text-sm text-muted-foreground">{t('verify.validDescription', { school: data!.school_name })}</p>
              <dl className="mt-4 w-full space-y-2 text-start text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t('verify.student')}</dt>
                  <dd className="font-medium">{data!.student_name}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t('verify.template')}</dt>
                  <dd className="font-medium">{data!.template_name}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t('verify.number')}</dt>
                  <dd className="font-medium">{data!.certificate_number}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">{t('verify.issuedDate')}</dt>
                  <dd className="font-medium">{formatDate(data!.issued_date!)}</dd>
                </div>
              </dl>
            </div>
          )}

          {!isLoading && !isValid && (
            <div className="flex flex-col items-center gap-2">
              <XCircle className="h-10 w-10 text-destructive" />
              <h1 className="text-base font-semibold">{t('verify.invalidTitle')}</h1>
              <p className="text-sm text-muted-foreground">{t('verify.invalidDescription')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
