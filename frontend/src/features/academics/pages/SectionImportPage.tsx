import { sectionsApi } from '@/api/endpoints/academics'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { ImportForm } from '@/components/ui'
import { routePaths } from '@/routes/routePaths'
import '../i18n'

export function SectionImportPage() {
  const { t } = useFeatureTranslation('academics')
  return (
    <div>
      <PageHeader title={t('sectionImport.title')} breadcrumbs={[{ label: t('sections.title'), to: routePaths.sections }, { label: t('fields.breadcrumbImport') }]} />

      <ImportForm
        entityLabel={t('sectionImport.entityLabel')}
        templateUrl={sectionsApi.importTemplateUrl}
        templateFilename="section-import-template.xlsx"
        description={t('sectionImport.description')}
        onImport={sectionsApi.import}
        supportsMode
      />
    </div>
  )
}
