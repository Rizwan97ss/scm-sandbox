import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { departmentsApi } from '@/api/endpoints/academics'
import { queryKeys } from '@/api/queryKeys'
import { useCrudResource } from '@/hooks/useCrudResource'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useDebounce } from '@/hooks/useDebounce'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, ConfirmDialog, DataTable, FormField, Input, Modal, SearchInput, Textarea, type DataTableColumn } from '@/components/ui'
import type { Department, DepartmentPayload } from '@/types/academic'
import '../i18n'

const emptyForm: DepartmentPayload = { name: '', code: '', description: '' }

export function DepartmentsPage() {
  const { t } = useFeatureTranslation('academics')
  const { can } = usePermission()
  const { sort, search, setPage, setSort, setSearch, queryParams } = usePagination('name', 'name')
  const debouncedSearch = useDebounce(search)
  const { listQuery, createMutation, updateMutation, removeMutation } = useCrudResource(
    departmentsApi,
    queryKeys.departments,
    { ...queryParams, 'filter[name]': debouncedSearch || undefined },
    'Department'
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [form, setForm] = useState<DepartmentPayload>(emptyForm)
  const [deleting, setDeleting] = useState<Department | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(department: Department) {
    setEditing(department)
    setForm({ name: department.name, code: department.code, description: department.description ?? '' })
    setModalOpen(true)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, payload: form })
    } else {
      await createMutation.mutateAsync(form)
    }
    setModalOpen(false)
  }

  const columns: DataTableColumn<Department>[] = [
    { key: 'name', header: t('fields.name'), sortable: true, render: (row) => row.name },
    { key: 'code', header: t('fields.code'), render: (row) => row.code },
    { key: 'description', header: t('fields.description'), render: (row) => row.description ?? '—' },
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
            <Button variant="outline" size="sm" onClick={() => setDeleting(row)} aria-label={t('departments.deleteAria', { name: row.name })}>
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
        title={t('departments.title')}
        description={t('departments.description')}
        actions={
          can('academic-structure.create') && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t('departments.newButton')}
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
        emptyTitle={debouncedSearch ? t('departments.emptyTitleSearch', { query: debouncedSearch }) : t('departments.emptyTitle')}
        emptyDescription={debouncedSearch ? t('departments.emptyDescriptionSearch') : undefined}
      />

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? t('departments.modalTitleEdit') : t('departments.modalTitleCreate')}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label={t('fields.name')} htmlFor="name" required>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label={t('fields.code')} htmlFor="code" required hint={t('departments.codeHint')}>
            <Input id="code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </FormField>
          <FormField label={t('fields.description')} htmlFor="description">
            <Textarea id="description" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending} className="mt-2">
            {editing ? t('fields.saveChanges') : t('departments.createButton')}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('departments.deleteConfirmTitle', { name: deleting?.name })}
        description={t('departments.deleteConfirmDescription')}
        isLoading={removeMutation.isPending}
        onConfirm={async () => {
          if (deleting) await removeMutation.mutateAsync(deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}
