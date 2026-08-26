import { roomsApi } from '@/api/endpoints/academics'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { ImportForm } from '@/components/ui'
import { routePaths } from '@/routes/routePaths'
import '../i18n'

export function RoomImportPage() {
  const { t } = useFeatureTranslation('academics')
  return (
    <div>
      <PageHeader title={t('roomImport.title')} breadcrumbs={[{ label: t('rooms.title'), to: routePaths.rooms }, { label: t('fields.breadcrumbImport') }]} />

      <ImportForm
        entityLabel={t('roomImport.entityLabel')}
        templateUrl={roomsApi.importTemplateUrl}
        templateFilename="room-import-template.xlsx"
        description={t('roomImport.description')}
        onImport={roomsApi.import}
        supportsMode
      />
    </div>
  )
}
