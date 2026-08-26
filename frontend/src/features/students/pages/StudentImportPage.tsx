import { studentsApi } from '@/api/endpoints/students'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { ImportForm } from '@/components/ui'
import { routePaths } from '@/routes/routePaths'
import '../i18n'

export function StudentImportPage() {
  const { t } = useFeatureTranslation('students')
  return (
    <div>
      <PageHeader title={t('studentImport.title')} breadcrumbs={[{ label: t('studentImport.breadcrumbStudents'), to: routePaths.students }, { label: t('studentImport.breadcrumbImport') }]} />

      <ImportForm
        entityLabel={t('studentImport.entityLabel')}
        templateUrl={studentsApi.importTemplateUrl}
        templateFilename="student-import-template.xlsx"
        description={t('studentImport.description')}
        onImport={studentsApi.import}
      />
    </div>
  )
}
