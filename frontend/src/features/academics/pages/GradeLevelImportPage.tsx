import { gradeLevelsApi } from '@/api/endpoints/academics'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { ImportForm } from '@/components/ui'
import { routePaths } from '@/routes/routePaths'
import '../i18n'

export function GradeLevelImportPage() {
  const { t } = useFeatureTranslation('academics')
  return (
    <div>
      <PageHeader title={t('gradeLevelImport.title')} breadcrumbs={[{ label: t('gradeLevels.title'), to: routePaths.gradeLevels }, { label: t('fields.breadcrumbImport') }]} />

      <ImportForm
        entityLabel={t('gradeLevelImport.entityLabel')}
        templateUrl={gradeLevelsApi.importTemplateUrl}
        templateFilename="grade-level-import-template.xlsx"
        description={t('gradeLevelImport.description')}
        onImport={gradeLevelsApi.import}
        supportsMode
      />
    </div>
  )
}
