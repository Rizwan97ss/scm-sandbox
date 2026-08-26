import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { examsApi, examTypesApi } from '@/api/endpoints/exams'
import { academicYearsApi, termsApi } from '@/api/endpoints/academics'
import { queryKeys } from '@/api/queryKeys'
import { useCrudResource } from '@/hooks/useCrudResource'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, DataTable, FormField, Input, Modal, Select, type DataTableColumn } from '@/components/ui'
import { routePaths } from '@/routes/routePaths'
import type { Exam, ExamPayload } from '@/types/exam'
import '../i18n'

export function ExamsListPage() {
  const { t } = useFeatureTranslation('exams')
  const { can } = usePermission()
  const navigate = useNavigate()
  const { setPage, queryParams } = usePagination('-created_at')
  const { listQuery, createMutation } = useCrudResource(examsApi, queryKeys.exams, queryParams, 'Exam')
  const { data: academicYears } = useQuery({ queryKey: queryKeys.academicYears({ per_page: 100 }), queryFn: () => academicYearsApi.list({ per_page: 100 }) })
  const { data: terms } = useQuery({ queryKey: queryKeys.terms({ per_page: 100 }), queryFn: () => termsApi.list({ per_page: 100 }) })
  const { data: examTypes } = useQuery({ queryKey: queryKeys.examTypes(), queryFn: () => examTypesApi.list() })

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<ExamPayload>({ academic_year_id: 0, name: '', weight: 1 })

  function openCreate() {
    setForm({ academic_year_id: academicYears?.data[0]?.id ?? 0, name: '', weight: 1 })
    setModalOpen(true)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const exam = await createMutation.mutateAsync(form)
    setModalOpen(false)
    navigate(routePaths.examDetail(exam.id))
  }

  const columns: DataTableColumn<Exam>[] = [
    { key: 'name', header: t('list.columnName'), sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'exam_type', header: t('list.columnType'), render: (row) => row.exam_type?.name ?? '—' },
    { key: 'subjects', header: t('list.columnSubjects'), render: (row) => row.exam_subject_groups.length },
    { key: 'weight', header: t('list.columnWeight'), render: (row) => row.weight },
    { key: 'status', header: t('list.columnStatus'), render: (row) => <Badge variant={row.is_published ? 'success' : 'default'}>{row.is_published ? t('list.statusPublished') : t('list.statusDraft')}</Badge> },
  ]

  return (
    <div>
      <PageHeader
        title={t('list.title')}
        description={t('list.description')}
        actions={can('exams.create') && <Button onClick={openCreate}><Plus className="h-4 w-4" /> {t('list.newExam')}</Button>}
      />
      <DataTable
        columns={columns}
        data={listQuery.data?.data}
        rowKey={(r) => r.id}
        isLoading={listQuery.isLoading} isError={listQuery.isError} onRetry={listQuery.refetch}
        meta={listQuery.data?.meta}
        onPageChange={setPage}
        onRowClick={(row) => navigate(routePaths.examDetail(row.id))}
        emptyTitle={t('list.emptyTitle')}
        emptyDescription={can('exams.create') ? t('list.emptyDescription') : undefined}
      />

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={t('list.modalTitle')} description={t('list.modalDescription')}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label={t('list.name')} htmlFor="name" required hint={t('list.nameHint')}>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label={t('list.academicYear')} htmlFor="academic_year_id" required>
            <Select
              id="academic_year_id"
              value={form.academic_year_id ? String(form.academic_year_id) : undefined}
              onValueChange={(value) => setForm({ ...form, academic_year_id: Number(value) })}
              options={(academicYears?.data ?? []).map((y) => ({ value: String(y.id), label: y.name }))}
            />
          </FormField>
          <FormField label={t('list.term')} htmlFor="term_id" hint={t('list.termHint')}>
            <Select
              id="term_id"
              value={form.term_id ? String(form.term_id) : undefined}
              onValueChange={(value) => setForm({ ...form, term_id: Number(value) })}
              options={(terms?.data ?? []).map((t) => ({ value: String(t.id), label: t.name }))}
              placeholder={t('list.termNone')}
            />
          </FormField>
          <FormField label={t('list.examType')} htmlFor="exam_type_id" hint={t('list.examTypeHint')}>
            <Select
              id="exam_type_id"
              value={form.exam_type_id ? String(form.exam_type_id) : undefined}
              onValueChange={(value) => setForm({ ...form, exam_type_id: Number(value) })}
              options={(examTypes?.data ?? []).map((t) => ({ value: String(t.id), label: t.name }))}
              placeholder={t('list.examTypeNone')}
            />
          </FormField>
          <FormField label={t('list.weight')} htmlFor="weight" hint={t('list.weightHint')}>
            <Input id="weight" type="number" step="0.01" min="0.01" value={form.weight ?? 1} onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })} />
          </FormField>
          <Button type="submit" isLoading={createMutation.isPending} className="mt-2">{t('list.createExam')}</Button>
        </form>
      </Modal>
    </div>
  )
}
