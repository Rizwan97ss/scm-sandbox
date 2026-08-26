import { useQuery } from '@tanstack/react-query'
import { studentsApi } from '@/api/endpoints/students'
import { queryKeys } from '@/api/queryKeys'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { EmptyState, Skeleton } from '@/components/ui'
import { getEnrollmentActionLabels } from '@/types/enums'
import { formatDate } from '@/utils/formatDate'
import '../i18n'

export function StudentEnrollmentHistoryTimeline({ studentId }: { studentId: number }) {
  const { t } = useFeatureTranslation('students')
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.studentEnrollmentHistory(studentId),
    queryFn: () => studentsApi.enrollmentHistory(studentId),
  })

  if (isLoading) return <Skeleton className="h-32 w-full" />
  if (!data || data.length === 0) return <EmptyState title={t('enrollmentHistory.noHistory')} />

  return (
    <ol className="flex flex-col gap-4 border-s border-border ps-4">
      {data.map((entry) => (
        <li key={entry.id} className="relative">
          <span className="absolute -start-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
          <p className="text-sm font-medium">{getEnrollmentActionLabels(t)[entry.action]}</p>
          <p className="text-xs text-muted-foreground">
            {formatDate(entry.effective_date)}
            {entry.performed_by ? ` · ${t('enrollmentHistory.performedBy', { name: entry.performed_by })}` : ''}
          </p>
          {(entry.to_grade_level || entry.to_section) && (
            <p className="mt-1 text-sm">
              {entry.from_grade_level ?? '—'} {entry.from_section ? `(${entry.from_section})` : ''} → {entry.to_grade_level ?? '—'}{' '}
              {entry.to_section ? `(${entry.to_section})` : ''}
            </p>
          )}
          {entry.reason && <p className="mt-1 text-sm text-muted-foreground">"{entry.reason}"</p>}
        </li>
      ))}
    </ol>
  )
}
