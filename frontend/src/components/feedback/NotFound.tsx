import { FileQuestion } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { LinkButton } from '@/components/ui/LinkButton'
import { routePaths } from '@/routes/routePaths'

export function NotFound() {
  const { t } = useTranslation()
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-24 text-center">
      <FileQuestion className="h-12 w-12 text-muted-foreground" />
      <div>
        <h1 className="text-xl font-semibold">{t('feedback.notFoundTitle')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('feedback.notFoundDescription')}</p>
      </div>
      <LinkButton to={routePaths.dashboard}>{t('feedback.backToDashboard')}</LinkButton>
    </div>
  )
}
