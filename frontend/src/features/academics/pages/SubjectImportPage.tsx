import { subjectsApi } from '@/api/endpoints/academics'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { ImportForm } from '@/components/ui'
import { routePaths } from '@/routes/routePaths'
import '../i18n'

export function SubjectImportPage() {
  const { t } = useFeatureTranslation('academics')
  return (
    <div>
      <PageHeader title={t('subjectImport.title')} breadcrumbs={[{ label: t('subjects.title'), to: routePaths.subjects }, { label: t('fields.breadcrumbImport') }]} />

      <ImportForm
        entityLabel={t('subjectImport.entityLabel')}
        templateUrl={subjectsApi.importTemplateUrl}
        templateFilename="subject-import-template.xlsx"
        description={t('subjectImport.description')}
        onImport={subjectsApi.import}
        supportsMode
      />
    </div>
  )
}
