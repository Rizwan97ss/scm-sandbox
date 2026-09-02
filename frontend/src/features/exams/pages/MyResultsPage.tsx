import { useQuery } from '@tanstack/react-query'
import { CalendarClock } from 'lucide-react'
import { studentsApi } from '@/api/endpoints/students'
import { examsApi } from '@/api/endpoints/exams'
import { queryKeys } from '@/api/queryKeys'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, Skeleton } from '@/components/ui'
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
  const { data, isLoading: studentLoading } = useQuery({ queryKey: queryKeys.students({ per_page: 1 }), queryFn: () => studentsApi.list({ per_page: 1 }) })
  const student = data?.data[0]

  const { data: exams, isLoading: examsLoading } = useQuery({
    queryKey: queryKeys.exams({ 'filter[academic_year_id]': student?.academic_year_id, per_page: 100 }),
    queryFn: () => examsApi.list({ 'filter[academic_year_id]': student!.academic_year_id, per_page: 100 }),
    enabled: !!student,
  })

  if (studentLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (!student) {
    return (
      <div>
        <PageHeader title={t('myResults.title')} />
        <EmptyState title={t('myResults.emptyTitle')} description={t('myResults.emptyDescription')} />
      </div>
    )
  }

  const upcomingExams = (exams?.data ?? []).filter((exam) =>
    exam.exam_subject_groups.some((group) => group.section?.id === student.current_section_id)
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('myResults.title')} description={t('myResults.description')} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" /> {t('myResults.examSchedule')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {examsLoading && <Skeleton className="h-24 w-full" />}
          {!examsLoading && upcomingExams.length === 0 && <p className="text-sm text-muted-foreground">{t('myResults.noExamsScheduledYet')}</p>}
          {!examsLoading && upcomingExams.length > 0 && (
            <ul className="flex flex-col divide-y divide-border">
              {upcomingExams.map((exam) => {
                const components = exam.exam_subject_groups
                  .filter((group) => group.section?.id === student.current_section_id)
                  .flatMap((group) => group.components.map((component) => ({ ...component, subjectName: group.subject?.name })))
                  .sort((a, b) => (a.exam_date ?? '').localeCompare(b.exam_date ?? ''))

                return (
                  <li key={exam.id} className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{exam.name}</span>
                      {exam.is_published && <Badge variant="success">{t('myResults.resultsDeclared')}</Badge>}
                    </div>
                    <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                      {components.map((component) => (
                        <li key={component.id} className="flex items-center justify-between gap-4">
                          <span>
                            {component.subjectName} — {component.assessment_component_type?.name ?? t('myResults.component')}
                          </span>
                          <span>{component.exam_date ? new Date(component.exam_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : t('myResults.dateTBA')}</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t('myResults.declaredResults')}</h2>
        <StudentExamResultsTab student={student} />
      </div>
    </div>
  )
}
