import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { departmentsApi, subjectsApi } from '@/api/endpoints/academics'
import { queryKeys } from '@/api/queryKeys'
import { useCrudResource } from '@/hooks/useCrudResource'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useDebounce } from '@/hooks/useDebounce'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, Checkbox, ConfirmDialog, DataTable, FormField, Input, Modal, SearchInput, Select, type DataTableColumn } from '@/components/ui'
import type { Subject, SubjectPayload } from '@/types/academic'
import '../i18n'

const emptyForm: SubjectPayload = { name: '', code: '', department_id: null, is_elective: false }

export function SubjectsPage() {
  const { t } = useFeatureTranslation('academics')
  const { can } = usePermission()
  const { sort, search, setPage, setSort, setSearch, queryParams } = usePagination('name', 'name')
  const debouncedSearch = useDebounce(search)
  const { listQuery, createMutation, updateMutation, removeMutation } = useCrudResource(
    subjectsApi,
    queryKeys.subjects,
    { ...queryParams, 'filter[name]': debouncedSearch || undefined },
    'Subject'
  )
  const { data: departments } = useQuery({ queryKey: queryKeys.departments({ per_page: 100 }), queryFn: () => departmentsApi.list({ per_page: 100 }) })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Subject | null>(null)
  const [form, setForm] = useState<SubjectPayload>(emptyForm)
  const [deleting, setDeleting] = useState<Subject | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }
  function openEdit(row: Subject) {
    setEditing(row)
    setForm({ name: row.name, code: row.code, department_id: row.department_id, is_elective: row.is_elective })
    setModalOpen(true)
  }
  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (editing) await updateMutation.mutateAsync({ id: editing.id, payload: form })
    else await createMutation.mutateAsync(form)
    setModalOpen(false)
  }

  const columns: DataTableColumn<Subject>[] = [
    { key: 'name', header: t('fields.name'), sortable: true, render: (row) => row.name },
    { key: 'code', header: t('fields.code'), render: (row) => row.code },
    { key: 'department', header: t('fields.department'), render: (row) => row.department?.name ?? '—' },
    { key: 'is_elective', header: t('subjects.columnElective'), render: (row) => (row.is_elective ? <Badge variant="info">{t('subjects.electiveBadge')}</Badge> : null) },
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
            <Button variant="outline" size="sm" onClick={() => setDeleting(row)} aria-label={t('subjects.deleteAria', { name: row.name })}>
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
        title={t('subjects.title')}
        description={t('subjects.description')}
        actions={
          can('academic-structure.create') && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t('subjects.newButton')}
            </Button>
          )
        }
      />
      <div className="mb-4 max-w-sm">
        <SearchInput placeholder={t('fields.searchByName')} value={search} onChange={setSearch} />
      </div>
      <DataTable
        columns={columns}
        data={listQuery.data?.data}
        rowKey={(row) => row.id}
        isLoading={listQuery.isLoading} isError={listQuery.isError} onRetry={listQuery.refetch}
        meta={listQuery.data?.meta}
        onPageChange={setPage}
        sort={sort}
        onSortChange={setSort}
        emptyTitle={debouncedSearch ? t('subjects.emptyTitleSearch', { query: debouncedSearch }) : t('subjects.emptyTitle')}
        emptyDescription={debouncedSearch ? t('subjects.emptyDescriptionSearch') : undefined}
      />
      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? t('subjects.modalTitleEdit') : t('subjects.modalTitleCreate')}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label={t('fields.name')} htmlFor="name" required>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label={t('fields.code')} htmlFor="code" required>
            <Input id="code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </FormField>
          <FormField label={t('fields.department')} htmlFor="department_id" hint={t('fields.optional')}>
            <Select
              id="department_id"
              value={form.department_id ? String(form.department_id) : undefined}
              onValueChange={(value) => setForm({ ...form, department_id: value ? Number(value) : null })}
              options={(departments?.data ?? []).map((department) => ({ value: String(department.id), label: department.name }))}
              placeholder={t('subjects.noDepartmentPlaceholder')}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={!!form.is_elective} onCheckedChange={(checked) => setForm({ ...form, is_elective: checked })} />
            {t('subjects.electiveCheckboxLabel')}
          </label>
          <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending} className="mt-2">
            {editing ? t('fields.saveChanges') : t('subjects.createButton')}
          </Button>
        </form>
      </Modal>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('fields.deleteConfirmTitle', { name: deleting?.name })}
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
