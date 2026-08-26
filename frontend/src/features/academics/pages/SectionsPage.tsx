import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { academicYearsApi, gradeLevelsApi, roomsApi, sectionsApi } from '@/api/endpoints/academics'
import { usersApi } from '@/api/endpoints/users'
import { queryKeys } from '@/api/queryKeys'
import { useCrudResource } from '@/hooks/useCrudResource'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, ConfirmDialog, DataTable, FormField, Input, Modal, Select, type DataTableColumn } from '@/components/ui'
import type { Section, SectionPayload } from '@/types/academic'
import '../i18n'

export function SectionsPage() {
  const { t } = useFeatureTranslation('academics')
  const { can } = usePermission()
  const { sort, setPage, setSort, queryParams } = usePagination('name')
  const { listQuery, createMutation, updateMutation, removeMutation } = useCrudResource(sectionsApi, queryKeys.sections, queryParams, 'Section')

  const { data: academicYears } = useQuery({ queryKey: queryKeys.academicYears({ per_page: 100 }), queryFn: () => academicYearsApi.list({ per_page: 100 }) })
  const { data: gradeLevels } = useQuery({ queryKey: queryKeys.gradeLevels({ per_page: 100 }), queryFn: () => gradeLevelsApi.list({ per_page: 100 }) })
  const { data: rooms } = useQuery({ queryKey: queryKeys.rooms({ per_page: 100 }), queryFn: () => roomsApi.list({ per_page: 100 }) })
  const { data: teachers } = useQuery({
    queryKey: queryKeys.users({ role: 'Class Teacher' }),
    queryFn: () => usersApi.list({ per_page: 100, 'filter[role]': 'Class Teacher' }),
  })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Section | null>(null)
  const [form, setForm] = useState<SectionPayload>({ academic_year_id: 0, grade_level_id: 0, name: '' })
  const [deleting, setDeleting] = useState<Section | null>(null)

  function openCreate() {
    setEditing(null)
    setForm({ academic_year_id: academicYears?.data[0]?.id ?? 0, grade_level_id: gradeLevels?.data[0]?.id ?? 0, name: '' })
    setModalOpen(true)
  }
  function openEdit(row: Section) {
    setEditing(row)
    setForm({
      academic_year_id: row.academic_year_id,
      grade_level_id: row.grade_level_id,
      name: row.name,
      capacity: row.capacity,
      class_teacher_id: row.class_teacher_id,
      room_id: row.room_id,
    })
    setModalOpen(true)
  }
  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (editing) await updateMutation.mutateAsync({ id: editing.id, payload: form })
    else await createMutation.mutateAsync(form)
    setModalOpen(false)
  }

  const columns: DataTableColumn<Section>[] = [
    { key: 'grade_level', header: t('fields.gradeLevel'), render: (row) => row.grade_level?.name ?? '—' },
    { key: 'name', header: t('fields.section'), sortable: true, render: (row) => row.name },
    { key: 'class_teacher', header: t('sections.columnClassTeacher'), render: (row) => row.class_teacher?.full_name ?? '—' },
    { key: 'room', header: t('fields.room'), render: (row) => row.room?.name ?? '—' },
    { key: 'student_count', header: t('sections.columnStudents'), render: (row) => row.student_count ?? '—' },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          {can('academic-structure.edit') && (
            <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
              {t('fields.edit')}
            </Button>
          )}
          {can('academic-structure.delete') && (
            <Button variant="outline" size="sm" onClick={() => setDeleting(row)} aria-label={t('sections.deleteAria', { name: row.name })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('sections.title')}
        description={t('sections.description')}
        actions={
          can('academic-structure.create') && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t('sections.newButton')}
            </Button>
          )
        }
      />
      <DataTable
        columns={columns}
        data={listQuery.data?.data}
        rowKey={(row) => row.id}
        isLoading={listQuery.isLoading} isError={listQuery.isError} onRetry={listQuery.refetch}
        meta={listQuery.data?.meta}
        onPageChange={setPage}
        sort={sort}
        onSortChange={setSort}
        emptyTitle={t('sections.emptyTitle')}
        emptyDescription={t('sections.emptyDescription')}
      />
      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? t('sections.modalTitleEdit') : t('sections.modalTitleCreate')}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label={t('fields.academicYear')} htmlFor="academic_year_id" required>
            <Select
              id="academic_year_id"
              value={String(form.academic_year_id)}
              onValueChange={(value) => setForm({ ...form, academic_year_id: Number(value) })}
              options={(academicYears?.data ?? []).map((year) => ({ value: String(year.id), label: year.name }))}
            />
          </FormField>
          <FormField label={t('fields.gradeLevel')} htmlFor="grade_level_id" required>
            <Select
              id="grade_level_id"
              value={String(form.grade_level_id)}
              onValueChange={(value) => setForm({ ...form, grade_level_id: Number(value) })}
              options={(gradeLevels?.data ?? []).map((level) => ({ value: String(level.id), label: level.name }))}
            />
          </FormField>
          <FormField label={t('sections.nameLabel')} htmlFor="name" required hint={t('sections.nameHint')}>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label={t('fields.capacity')} htmlFor="capacity">
            <Input
              id="capacity"
              type="number"
              value={form.capacity ?? ''}
              onChange={(e) => setForm({ ...form, capacity: e.target.value ? Number(e.target.value) : null })}
            />
          </FormField>
          <FormField label={t('sections.classTeacherLabel')} htmlFor="class_teacher_id" hint={t('fields.optional')}>
            <Select
              id="class_teacher_id"
              value={form.class_teacher_id ? String(form.class_teacher_id) : undefined}
              onValueChange={(value) => setForm({ ...form, class_teacher_id: value ? Number(value) : null })}
              options={(teachers?.data ?? []).map((teacher) => ({ value: String(teacher.id), label: teacher.full_name }))}
              placeholder={t('fields.unassigned')}
            />
          </FormField>
          <FormField label={t('fields.room')} htmlFor="room_id" hint={t('fields.optional')}>
            <Select
              id="room_id"
              value={form.room_id ? String(form.room_id) : undefined}
              onValueChange={(value) => setForm({ ...form, room_id: value ? Number(value) : null })}
              options={(rooms?.data ?? []).map((room) => ({ value: String(room.id), label: room.name }))}
              placeholder={t('fields.unassigned')}
            />
          </FormField>
          <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending} className="mt-2">
            {editing ? t('fields.saveChanges') : t('sections.createButton')}
          </Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('sections.deleteConfirmTitle', { name: deleting?.name })}
        description={t('fields.cannotBeUndone')}
        isLoading={removeMutation.isPending}
        onConfirm={async () => {
          if (deleting) await removeMutation.mutateAsync(deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}
