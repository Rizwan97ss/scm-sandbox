import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function LoadingScreen({ label }: { label?: string }) {
  const { t } = useTranslation()
  return (
    <div className="flex h-svh w-full flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      <p className="text-sm">{label ?? t('feedback.loading')}</p>
    </div>
  )
}
