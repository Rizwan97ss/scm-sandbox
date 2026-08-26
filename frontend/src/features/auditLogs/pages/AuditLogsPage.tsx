import { useQuery } from '@tanstack/react-query'
import { auditLogsApi, type AuditLogEntry } from '@/api/endpoints/auditLogs'
import { queryKeys } from '@/api/queryKeys'
import { usePagination } from '@/hooks/usePagination'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, DataTable, type DataTableColumn } from '@/components/ui'
import { formatDateTime } from '@/utils/formatDate'
import '../i18n'

export function AuditLogsPage() {
  const { t } = useFeatureTranslation('auditLogs')
  const { setPage, queryParams } = usePagination('-created_at')
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: queryKeys.auditLogs(queryParams), queryFn: () => auditLogsApi.list(queryParams) })

  const columns: DataTableColumn<AuditLogEntry>[] = [
    { key: 'created_at', header: t('list.columnWhen'), render: (row) => formatDateTime(row.created_at) },
    { key: 'causer', header: t('list.columnBy'), render: (row) => row.causer?.full_name ?? t('list.system') },
    { key: 'event', header: t('list.columnEvent'), render: (row) => (row.event ? <Badge variant="default">{row.event}</Badge> : '—') },
    { key: 'subject_type', header: t('list.columnSubject'), render: (row) => row.subject_type ?? '—' },
    { key: 'description', header: t('list.columnDescription'), render: (row) => row.description },
  ]

  return (
    <div>
      <PageHeader title={t('list.title')} description={t('list.description')} />
      <DataTable
        columns={columns}
        data={data?.data}
        rowKey={(row) => row.id}
        isLoading={isLoading} isError={isError} onRetry={refetch}
        meta={data?.meta}
        onPageChange={setPage}
        emptyTitle={t('list.emptyTitle')}
        emptyDescription={t('list.emptyDescription')}
      />
    </div>
  )
}
