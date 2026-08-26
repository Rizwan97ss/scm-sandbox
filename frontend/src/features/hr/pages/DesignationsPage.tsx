import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { designationsApi } from '@/api/endpoints/hr'
import { queryKeys } from '@/api/queryKeys'
import { useCrudResource } from '@/hooks/useCrudResource'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useDebounce } from '@/hooks/useDebounce'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, ConfirmDialog, DataTable, FormField, Input, Modal, SearchInput, Textarea, type DataTableColumn } from '@/components/ui'
import type { Designation, DesignationPayload } from '@/types/hr'
import '../i18n'

const EMPTY_FORM: DesignationPayload = { name: '', description: '', is_active: true }

export function DesignationsPage() {
  const { t } = useFeatureTranslation('hr')
  const { can } = usePermission()
  const { sort, search, setPage, setSort, setSearch, queryParams } = usePagination('name', 'name')
  const debouncedSearch = useDebounce(search)
  const { listQuery, createMutation, updateMutation, removeMutation } = useCrudResource(
    designationsApi,
    queryKeys.designations,
    { ...queryParams, 'filter[name]': debouncedSearch || undefined },
    'Designation'
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Designation | null>(null)
  const [form, setForm] = useState<DesignationPayload>(EMPTY_FORM)
  const [deleting, setDeleting] = useState<Designation | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(designation: Designation) {
    setEditing(designation)
    setForm({ name: designation.name, description: designation.description ?? '', is_active: designation.is_active })
    setModalOpen(true)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (editing) await updateMutation.mutateAsync({ id: editing.id, payload: form })
    else await createMutation.mutateAsync(form)
    setModalOpen(false)
  }

  const columns: DataTableColumn<Designation>[] = [
    { key: 'name', header: t('fields.name'), sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'description', header: t('fields.description'), render: (row) => row.description ?? '—' },
    { key: 'status', header: t('fields.status'), render: (row) => <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? t('fields.active') : t('fields.inactive')}</Badge> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          {can('designations.edit') && (
            <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
              {t('fields.edit')}
            </Button>
          )}
          {can('designations.delete') && (
            <Button variant="outline" size="sm" onClick={() => setDeleting(row)} aria-label={t('designations.deleteAriaLabel', { name: row.name })}>
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
        title={t('designations.title')}
        description={t('designations.description')}
        actions={
          can('designations.create') && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t('designations.newDesignation')}
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
        emptyTitle={debouncedSearch ? t('designations.emptyTitleSearch', { query: debouncedSearch }) : t('designations.emptyTitle')}
        emptyDescription={debouncedSearch ? t('designations.emptyDescriptionSearch') : undefined}
      />

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? t('designations.editTitle') : t('designations.newTitle')}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label={t('fields.name')} htmlFor="name" required>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label={t('fields.description')} htmlFor="description" hint={t('designations.descriptionHint')}>
            <Textarea id="description" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending} className="mt-2">
            {editing ? t('fields.saveChanges') : t('designations.createDesignation')}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('designations.deleteConfirmTitle', { name: deleting?.name })}
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
