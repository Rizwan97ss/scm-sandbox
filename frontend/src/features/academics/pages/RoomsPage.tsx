import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { roomsApi } from '@/api/endpoints/academics'
import { queryKeys } from '@/api/queryKeys'
import { useCrudResource } from '@/hooks/useCrudResource'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useDebounce } from '@/hooks/useDebounce'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button, ConfirmDialog, DataTable, FormField, Input, Modal, SearchInput, Select, type DataTableColumn } from '@/components/ui'
import { ROOM_TYPES, getRoomTypeLabels } from '@/types/enums'
import type { Room, RoomPayload } from '@/types/academic'
import '../i18n'

const emptyForm: RoomPayload = { name: '', code: '', capacity: null, type: 'classroom' }

export function RoomsPage() {
  const { t } = useFeatureTranslation('academics')
  const { can } = usePermission()
  const { sort, search, setPage, setSort, setSearch, queryParams } = usePagination('name', 'name')
  const debouncedSearch = useDebounce(search)
  const { listQuery, createMutation, updateMutation, removeMutation } = useCrudResource(
    roomsApi,
    queryKeys.rooms,
    { ...queryParams, 'filter[name]': debouncedSearch || undefined },
    'Room'
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Room | null>(null)
  const [form, setForm] = useState<RoomPayload>(emptyForm)
  const [deleting, setDeleting] = useState<Room | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }
  function openEdit(row: Room) {
    setEditing(row)
    setForm({ name: row.name, code: row.code, capacity: row.capacity, type: row.type })
    setModalOpen(true)
  }
  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (editing) await updateMutation.mutateAsync({ id: editing.id, payload: form })
    else await createMutation.mutateAsync(form)
    setModalOpen(false)
  }

  const columns: DataTableColumn<Room>[] = [
    { key: 'name', header: t('fields.name'), sortable: true, render: (row) => row.name },
    { key: 'code', header: t('fields.code'), render: (row) => row.code },
    { key: 'type', header: t('fields.type'), render: (row) => getRoomTypeLabels(t)[row.type] },
    { key: 'capacity', header: t('fields.capacity'), render: (row) => row.capacity ?? '—' },
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
            <Button variant="outline" size="sm" onClick={() => setDeleting(row)} aria-label={t('rooms.deleteAria', { name: row.name })}>
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
        title={t('rooms.title')}
        description={t('rooms.description')}
        actions={
          can('academic-structure.create') && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t('rooms.newButton')}
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
        emptyTitle={debouncedSearch ? t('rooms.emptyTitleSearch', { query: debouncedSearch }) : t('rooms.emptyTitle')}
        emptyDescription={debouncedSearch ? t('rooms.emptyDescriptionSearch') : undefined}
      />
      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? t('rooms.modalTitleEdit') : t('rooms.modalTitleCreate')}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label={t('fields.name')} htmlFor="name" required>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label={t('fields.code')} htmlFor="code" required>
            <Input id="code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </FormField>
          <FormField label={t('fields.type')} htmlFor="type">
            <Select
              id="type"
              value={form.type}
              onValueChange={(value) => setForm({ ...form, type: value as RoomPayload['type'] })}
              options={ROOM_TYPES.map((type) => ({ value: type, label: getRoomTypeLabels(t)[type] }))}
            />
          </FormField>
          <FormField label={t('fields.capacity')} htmlFor="capacity">
            <Input
              id="capacity"
              type="number"
              value={form.capacity ?? ''}
              onChange={(e) => setForm({ ...form, capacity: e.target.value ? Number(e.target.value) : null })}
            />
          </FormField>
          <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending} className="mt-2">
            {editing ? t('fields.saveChanges') : t('rooms.createButton')}
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
