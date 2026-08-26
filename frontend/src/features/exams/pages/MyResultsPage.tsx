import { useQuery } from '@tanstack/react-query'
import { studentsApi } from '@/api/endpoints/students'
import { queryKeys } from '@/api/queryKeys'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState, Skeleton } from '@/components/ui'
import { StudentExamResultsTab } from '../components/StudentExamResultsTab'
import '../i18n'

/**
 * Self-service "My Result" for a logged-in Student — reuses the same
 * StudentExamResultsTab the Student Profile page shows to staff, just fed
 * with the caller's own record. No dedicated "my student record" endpoint
 * exists or is needed: Student::scopeVisibleTo() already restricts
 * GET /students to exactly the caller's own row for the Student role.
 */
export function MyResultsPage() {
  const { t } = useFeatureTranslation('exams')
  const { data, isLoading } = useQuery({ queryKey: queryKeys.students({ per_page: 1 }), queryFn: () => studentsApi.list({ per_page: 1 }) })
  const student = data?.data[0]

  return (
    <div>
      <PageHeader title={t('myResults.title')} description={t('myResults.description')} />

      {isLoading && <Skeleton className="h-64 w-full" />}

      {!isLoading && !student && (
        <EmptyState title={t('myResults.emptyTitle')} description={t('myResults.emptyDescription')} />
      )}

      {!isLoading && student && <StudentExamResultsTab student={student} />}
    </div>
  )
}
