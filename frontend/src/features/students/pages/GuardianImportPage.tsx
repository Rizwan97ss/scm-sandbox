import { guardiansApi } from '@/api/endpoints/guardians'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { ImportForm } from '@/components/ui'
import { routePaths } from '@/routes/routePaths'
import '../i18n'

export function GuardianImportPage() {
  const { t } = useFeatureTranslation('students')
  return (
    <div>
      <PageHeader title={t('guardianImport.title')} breadcrumbs={[{ label: t('guardianImport.breadcrumbGuardians'), to: routePaths.guardians }, { label: t('guardianImport.breadcrumbImport') }]} />

      <ImportForm
        entityLabel={t('guardianImport.entityLabel')}
        templateUrl={guardiansApi.importTemplateUrl}
        templateFilename="guardian-import-template.xlsx"
        description={t('guardianImport.description')}
        onImport={guardiansApi.import}
        supportsMode
      />
    </div>
  )
}
