import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { parentPortalApi } from '@/api/endpoints/dashboard'
import { queryKeys } from '@/api/queryKeys'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar, Badge, QueryErrorState, Skeleton, Tabs } from '@/components/ui'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { getGenderLabels, getStudentStatusLabels } from '@/types/enums'
import { formatDate } from '@/utils/formatDate'
import { routePaths } from '@/routes/routePaths'
import { ChildAttendanceTab } from '../components/ChildAttendanceTab'
import { ChildExamResultsTab } from '../components/ChildExamResultsTab'
import { ChildHomeworkTab } from '../components/ChildHomeworkTab'
import { ChildRemarksTab } from '../components/ChildRemarksTab'
import { ChildFeesTab } from '../components/ChildFeesTab'
import '../i18n'

export function ParentChildProfilePage() {
  const { t } = useFeatureTranslation('dashboard')
  const { id } = useParams<{ id: string }>()
  const studentId = Number(id)
  const { data: student, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.parentChildProfile(studentId),
    queryFn: () => parentPortalApi.childProfile(studentId),
  })

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
      </div>
    )
  }

  if (isError || !student) {
    return <QueryErrorState onRetry={refetch} />
  }

  return (
    <div>
      <PageHeader title={student.full_name} breadcrumbs={[{ label: t('childProfile.breadcrumbMyChildren'), to: routePaths.parentChildren }, { label: student.full_name }]} />

      <div className="mb-6 flex flex-col gap-4 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:gap-6">
        <Avatar name={student.full_name} src={student.photo_url} size={64} />
        <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <p className="text-muted-foreground">{t('fields.admissionNumber')}</p>
            <p className="font-medium">{student.admission_number}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('fields.status')}</p>
            <Badge variant={student.status === 'active' ? 'success' : 'default'}>{getStudentStatusLabels(t)[student.status]}</Badge>
          </div>
          <div>
            <p className="text-muted-foreground">{t('fields.gradeSection')}</p>
            <p className="font-medium">
              {student.grade_level?.name ?? '—'} {student.section ? `- ${student.section.name}` : ''}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{t('fields.dateOfBirth')}</p>
            <p className="font-medium">
              {formatDate(student.date_of_birth)} ({getGenderLabels(t)[student.gender]})
            </p>
          </div>
        </div>
      </div>

      <Tabs
        items={[
          { value: 'attendance', label: t('fields.attendance'), content: <ChildAttendanceTab studentId={studentId} /> },
          { value: 'exams', label: t('childProfile.tabExams'), content: <ChildExamResultsTab student={student} /> },
          { value: 'homework', label: t('fields.homework'), content: <ChildHomeworkTab studentId={studentId} /> },
          { value: 'remarks', label: t('fields.remarks'), content: <ChildRemarksTab studentId={studentId} /> },
          { value: 'fees', label: t('childProfile.tabFees'), content: <ChildFeesTab studentId={studentId} /> },
        ]}
      />
    </div>
  )
}
