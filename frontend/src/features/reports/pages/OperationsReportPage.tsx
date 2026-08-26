import { useQuery } from '@tanstack/react-query'
import { reportsApi } from '@/api/endpoints/reports'
import { queryKeys } from '@/api/queryKeys'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton, StatCard } from '@/components/ui'
import '../i18n'

export function OperationsReportPage() {
  const { t } = useFeatureTranslation('reports')
  const { data, isLoading } = useQuery({ queryKey: queryKeys.reportsOperations, queryFn: reportsApi.operations })

  const nothingVisible = !isLoading && !data?.library && !data?.transport && !data?.hostel

  return (
    <div>
      <PageHeader title={t('operations.title')} description={t('operations.description')} />

      {isLoading && <Skeleton className="h-48 w-full" />}
      {nothingVisible && <p className="text-sm text-muted-foreground">{t('operations.noDataForRole')}</p>}

      {data?.library && (
        <div className="mb-8">
          <h3 className="mb-3 text-sm font-semibold">{t('operations.library')}</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard label={t('operations.totalBooks')} value={data.library.total_books} />
            <StatCard label={t('operations.issuedThisMonth')} value={data.library.issued_this_month} />
            <StatCard label={t('operations.currentlyOverdue')} value={data.library.currently_overdue} />
          </div>
        </div>
      )}

      {data?.transport && (
        <div className="mb-8">
          <h3 className="mb-3 text-sm font-semibold">{t('operations.transport')}</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard label={t('operations.activeVehicles')} value={data.transport.vehicle_count} />
            <StatCard label={t('operations.studentsAssigned')} value={data.transport.students_assigned} />
          </div>
        </div>
      )}

      {data?.hostel && (
        <div>
          <h3 className="mb-3 text-sm font-semibold">{t('operations.hostel')}</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard label={t('operations.rooms')} value={data.hostel.room_count} />
            <StatCard label={t('operations.occupiedCapacity')} value={`${data.hostel.total_occupied} / ${data.hostel.total_capacity}`} />
            <StatCard label={t('operations.occupancy')} value={data.hostel.occupancy_percentage != null ? `${data.hostel.occupancy_percentage}%` : '—'} />
          </div>
        </div>
      )}
    </div>
  )
}
