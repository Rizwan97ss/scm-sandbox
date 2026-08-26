import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { hostelRoomsApi, hostelsApi } from '@/api/endpoints/hostel'
import { queryKeys } from '@/api/queryKeys'
import { useCrudResource } from '@/hooks/useCrudResource'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useDebounce } from '@/hooks/useDebounce'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, ConfirmDialog, DataTable, FormField, Input, Modal, SearchInput, Select, type DataTableColumn } from '@/components/ui'
import type { HostelRoom, HostelRoomPayload } from '@/types/hostel'
import '../i18n'

const EMPTY_FORM: HostelRoomPayload = { hostel_id: 0, room_number: '', capacity: 1, is_active: true }

export function HostelRoomsPage() {
  const { t } = useFeatureTranslation('hostel')
  const { can } = usePermission()
  const canManage = can('hostel.manage')
  const { sort, search, setPage, setSort, setSearch, queryParams } = usePagination('room_number', 'room_number')
  const debouncedSearch = useDebounce(search)
  const { listQuery, createMutation, updateMutation, removeMutation } = useCrudResource(
    hostelRoomsApi,
    queryKeys.hostelRooms,
    { ...queryParams, 'filter[room_number]': debouncedSearch || undefined },
    'Room'
  )
  const { data: hostels } = useQuery({ queryKey: queryKeys.hostels({ per_page: 100 }), queryFn: () => hostelsApi.list({ per_page: 100 }) })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<HostelRoom | null>(null)
  const [form, setForm] = useState<HostelRoomPayload>(EMPTY_FORM)
  const [deleting, setDeleting] = useState<HostelRoom | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(room: HostelRoom) {
    setEditing(room)
    setForm({ hostel_id: room.hostel?.id ?? 0, room_number: room.room_number, capacity: room.capacity, is_active: room.is_active })
    setModalOpen(true)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (editing) await updateMutation.mutateAsync({ id: editing.id, payload: form })
    else await createMutation.mutateAsync(form)
    setModalOpen(false)
  }

  const columns: DataTableColumn<HostelRoom>[] = [
    { key: 'room_number', header: t('rooms.columnRoomNumber'), sortable: true, render: (row) => <span className="font-medium">{row.room_number}</span> },
    { key: 'hostel', header: t('fields.hostel'), render: (row) => row.hostel?.name ?? '—' },
    { key: 'occupancy', header: t('rooms.columnOccupancy'), align: 'right', render: (row) => t('rooms.occupancyValue', { occupied: row.occupied_count, capacity: row.capacity }) },
    { key: 'status', header: t('fields.status'), render: (row) => <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? t('fields.active') : t('fields.inactive')}</Badge> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
              {t('fields.edit')}
            </Button>
          )}
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setDeleting(row)} aria-label={t('rooms.deleteAriaLabel', { name: row.room_number })}>
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
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t('rooms.newRoom')}
            </Button>
          )
        }
      />

      <div className="mb-4 max-w-sm">
        <SearchInput placeholder={t('rooms.searchPlaceholder')} value={search} onChange={setSearch} />
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

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? t('rooms.editTitle') : t('rooms.newTitle')}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label={t('fields.hostel')} htmlFor="hostel_id" required>
            <Select
              id="hostel_id"
              value={form.hostel_id ? String(form.hostel_id) : undefined}
              onValueChange={(value) => setForm({ ...form, hostel_id: Number(value) })}
              options={(hostels?.data ?? []).map((h) => ({ value: String(h.id), label: h.name }))}
              placeholder={t('rooms.selectHostelPlaceholder')}
            />
          </FormField>
          <FormField label={t('rooms.roomNumberLabel')} htmlFor="room_number" required>
            <Input id="room_number" required value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} />
          </FormField>
          <FormField label={t('rooms.capacityLabel')} htmlFor="capacity" required>
            <Input id="capacity" type="number" min={1} required value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
          </FormField>
          <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending} disabled={!form.hostel_id} className="mt-2">
            {editing ? t('rooms.saveChanges') : t('rooms.createRoom')}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('rooms.deleteConfirmTitle', { name: deleting?.room_number })}
        description={t('rooms.deleteConfirmDescription')}
        isLoading={removeMutation.isPending}
        onConfirm={async () => {
          if (deleting) await removeMutation.mutateAsync(deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}
