import { dataExportsApi } from '@/api/endpoints/dataExports'
import { queryKeys } from '@/api/queryKeys'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { DataExportsList } from '../components/DataExportsList'
import { PageHeader } from '@/components/layout/PageHeader'
import '../i18n'

/** Self-service — no permission gate, every role can export their own data. */
export function MyDataExportPage() {
  const { t } = useFeatureTranslation('dataExports')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('myDataExportPage.title')} description={t('myDataExportPage.description')} />
      <DataExportsList
        queryKey={queryKeys.dataExportsSelf}
        list={dataExportsApi.listSelf}
        request={dataExportsApi.requestSelf}
        requestLabel={t('myDataExportPage.requestLabel')}
        emptyLabel={t('myDataExportPage.emptyLabel')}
      />
    </div>
  )
}
