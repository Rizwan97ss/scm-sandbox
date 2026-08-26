import { dataExportsApi } from '@/api/endpoints/dataExports'
import { queryKeys } from '@/api/queryKeys'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { DataExportsList } from '@/features/dataExports/components/DataExportsList'
import { PageHeader } from '@/components/layout/PageHeader'
import '../i18n'

/** Admin bulk — gated on data-export.school at the route level (see AppRouter). */
export function DataExportsPage() {
  const { t } = useFeatureTranslation('settings')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('dataExports.title')} description={t('dataExports.description')} />
      <DataExportsList
        queryKey={queryKeys.dataExportsSchool}
        list={dataExportsApi.listSchool}
        request={dataExportsApi.requestSchool}
        requestLabel={t('dataExports.requestLabel')}
        emptyLabel={t('dataExports.emptyLabel')}
      />
    </div>
  )
}
