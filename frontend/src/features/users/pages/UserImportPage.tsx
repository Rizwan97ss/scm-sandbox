import { usersApi } from '@/api/endpoints/users'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { ImportForm } from '@/components/ui'
import { routePaths } from '@/routes/routePaths'
import '../i18n'

export function UserImportPage() {
  const { t } = useFeatureTranslation('users')
  return (
    <div>
      <PageHeader
        title={t('userImport.title')}
        breadcrumbs={[{ label: t('userImport.breadcrumbUsers'), to: routePaths.users }, { label: t('userImport.breadcrumbImport') }]}
      />

      <ImportForm
        entityLabel={t('userImport.entityLabel')}
        templateUrl={usersApi.importTemplateUrl}
        templateFilename="staff-import-template.xlsx"
        description={
          <>
            {t('userImport.descriptionBeforeCode')}<code>role</code>{t('userImport.descriptionAfterCode')}
          </>
        }
        onImport={usersApi.import}
      />
    </div>
  )
}
