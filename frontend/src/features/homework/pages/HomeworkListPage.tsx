import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { homeworkApi } from '@/api/endpoints/homework'
import { classSubjectTeachersApi, sectionsApi } from '@/api/endpoints/academics'
import { queryKeys } from '@/api/queryKeys'
import { useAuth } from '@/context/AuthContext'
import { useCrudResource } from '@/hooks/useCrudResource'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, DataTable, FormField, Input, Modal, Select, Textarea, type DataTableColumn } from '@/components/ui'
import { formatDate } from '@/utils/formatDate'
import { routePaths } from '@/routes/routePaths'
import { HomeworkSubmitModal } from '../components/HomeworkSubmitModal'
import { getHomeworkSubmissionStatusLabels } from '@/types/homework'
import type { Homework, HomeworkPayload } from '@/types/homework'
import '../i18n'

const EMPTY_FORM: HomeworkPayload = { academic_year_id: 0, section_id: 0, subject_id: 0, title: '', description: '', due_date: '', max_score: null }

export function HomeworkListPage() {
  const { t } = useFeatureTranslation('homework')
  const { user, hasRole } = useAuth()
  const { can } = usePermission()
  const navigate = useNavigate()
  const isStudent = hasRole('Student')
  const { setPage, queryParams } = usePagination('-due_date')
  const { listQuery, createMutation } = useCrudResource(homeworkApi, queryKeys.homework, queryParams, 'Homework')

  const canCreate = can('homework.create')
  const { data: assignments } = useQuery({
    queryKey: ['class-subject-teachers', 'all'],
    queryFn: () => classSubjectTeachersApi.list(),
    enabled: canCreate,
  })
  const { data: sections } = useQuery({
    queryKey: queryKeys.sections({ per_page: 100 }),
    queryFn: () => sectionsApi.list({ per_page: 100 }),
    enabled: canCreate,
  })
  const sectionNameById = useMemo(() => new Map((sections?.data ?? []).map((s) => [s.id, s.name])), [sections])

  // Teacher/Class Teacher may only assign homework to a class they're actually
  // assigned to teach (enforced server-side too — see HomeworkController's
  // assertCanManage); School Admin sees every assignment in the school since
  // they aren't restricted to any one of them.
  const myAssignments = useMemo(() => {
    if (!assignments) return []
    return hasRole('Teacher', 'Class Teacher') ? assignments.filter((a) => a.teacher.id === user?.id) : assignments
  }, [assignments, hasRole, user])

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<HomeworkPayload>(EMPTY_FORM)
  const [submitTarget, setSubmitTarget] = useState<Homework | null>(null)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    await createMutation.mutateAsync(form)
    setModalOpen(false)
  }

  const columns: DataTableColumn<Homework>[] = [
    { key: 'title', header: t('list.columnTitle'), render: (row) => <span className="font-medium">{row.title}</span> },
    { key: 'subject', header: t('list.columnSubject'), render: (row) => row.subject?.name ?? '—' },
    { key: 'section', header: t('list.columnSection'), render: (row) => row.section?.name ?? '—' },
    { key: 'due_date', header: t('list.columnDueDate'), render: (row) => formatDate(row.due_date) },
    isStudent
      ? {
          key: 'status',
          header: t('list.columnStatus'),
          render: (row) => {
            const status = row.my_submission?.status
            return status ? <Badge variant={status === 'graded' ? 'success' : 'info'}>{getHomeworkSubmissionStatusLabels(t)[status]}</Badge> : <Badge variant="outline">{t('fields.notSubmitted')}</Badge>
          },
        }
      : { key: 'teacher', header: t('list.columnTeacher'), render: (row) => row.teacher?.full_name ?? '—' },
  ]

  return (
    <div>
      <PageHeader
        title={t('list.title')}
        description={isStudent ? t('list.descriptionStudent') : t('list.descriptionStaff')}
        actions={
          canCreate && (
            <Button
              onClick={() => {
                setForm(EMPTY_FORM)
                setModalOpen(true)
              }}
            >
              <Plus className="h-4 w-4" /> {t('list.newHomework')}
            </Button>
          )
        }
      />
      <DataTable
        columns={columns}
        data={listQuery.data?.data}
        rowKey={(r) => r.id}
        isLoading={listQuery.isLoading} isError={listQuery.isError} onRetry={listQuery.refetch}
        meta={listQuery.data?.meta}
        onPageChange={setPage}
        onRowClick={(row) => (isStudent ? setSubmitTarget(row) : navigate(routePaths.homeworkDetail(row.id)))}
        emptyTitle={t('list.emptyTitle')}
        emptyDescription={canCreate ? t('list.emptyDescription') : undefined}
      />

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={t('list.modalTitle')}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label={t('list.classLabel')} htmlFor="assignment" required hint={t('list.classHint')}>
            <Select
              id="assignment"
              value={form.section_id && form.subject_id ? `${form.section_id}-${form.subject_id}` : undefined}
              onValueChange={(value) => {
                const assignment = myAssignments.find((a) => `${a.section_id}-${a.subject.id}` === value)
                if (assignment) setForm((prev) => ({ ...prev, academic_year_id: assignment.academic_year_id, section_id: assignment.section_id, subject_id: assignment.subject.id }))
              }}
              options={myAssignments.map((a) => ({ value: `${a.section_id}-${a.subject.id}`, label: `${sectionNameById.get(a.section_id) ?? a.section_id} — ${a.subject.name}` }))}
              placeholder={t('list.classPlaceholder')}
            />
          </FormField>
          <FormField label={t('fields.title')} htmlFor="title" required>
            <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </FormField>
          <FormField label={t('fields.description')} htmlFor="description" hint={t('fields.optional')}>
            <Textarea id="description" rows={3} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <FormField label={t('list.dueDateLabel')} htmlFor="due_date" required>
            <Input id="due_date" type="date" required value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </FormField>
          <FormField label={t('list.maxScoreLabel')} htmlFor="max_score" hint={t('fields.optional')}>
            <Input
              id="max_score"
              type="number"
              min="0"
              value={form.max_score ?? ''}
              onChange={(e) => setForm({ ...form, max_score: e.target.value ? Number(e.target.value) : null })}
            />
          </FormField>
          <Button type="submit" isLoading={createMutation.isPending} className="mt-2">
            {t('list.assignHomework')}
          </Button>
        </form>
      </Modal>

      {submitTarget && <HomeworkSubmitModal homework={submitTarget} open={!!submitTarget} onOpenChange={(open) => !open && setSubmitTarget(null)} />}
    </div>
  )
}
