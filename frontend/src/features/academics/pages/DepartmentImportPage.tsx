import { departmentsApi } from '@/api/endpoints/academics'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { ImportForm } from '@/components/ui'
import { routePaths } from '@/routes/routePaths'
import '../i18n'

export function DepartmentImportPage() {
  const { t } = useFeatureTranslation('academics')
  return (
    <div>
      <PageHeader title={t('departmentImport.title')} breadcrumbs={[{ label: t('departments.title'), to: routePaths.departments }, { label: t('fields.breadcrumbImport') }]} />

      <ImportForm
        entityLabel={t('departmentImport.entityLabel')}
        templateUrl={departmentsApi.importTemplateUrl}
        templateFilename="department-import-template.xlsx"
        description={t('departmentImport.description')}
        onImport={departmentsApi.import}
        supportsMode
        columns={['name', 'code', 'description']}
      />
    </div>
  )
}
