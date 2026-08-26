import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { vehiclesApi } from '@/api/endpoints/transport'
import { queryKeys } from '@/api/queryKeys'
import { useCrudResource } from '@/hooks/useCrudResource'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useDebounce } from '@/hooks/useDebounce'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, ConfirmDialog, DataTable, FormField, Input, Modal, SearchInput, type DataTableColumn } from '@/components/ui'
import type { Vehicle, VehiclePayload } from '@/types/transport'
import '../i18n'

const EMPTY_FORM: VehiclePayload = { registration_number: '', capacity: 1, driver_name: '', driver_phone: '', is_active: true }

export function VehiclesPage() {
  const { t } = useFeatureTranslation('transport')
  const { can } = usePermission()
  const canManage = can('transport.manage')
  const { sort, search, setPage, setSort, setSearch, queryParams } = usePagination('registration_number', 'registration_number')
  const debouncedSearch = useDebounce(search)
  const { listQuery, createMutation, updateMutation, removeMutation } = useCrudResource(
    vehiclesApi,
    queryKeys.vehicles,
    { ...queryParams, 'filter[registration_number]': debouncedSearch || undefined },
    'Vehicle'
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [form, setForm] = useState<VehiclePayload>(EMPTY_FORM)
  const [deleting, setDeleting] = useState<Vehicle | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(vehicle: Vehicle) {
    setEditing(vehicle)
    setForm({
      registration_number: vehicle.registration_number,
      capacity: vehicle.capacity,
      driver_name: vehicle.driver_name ?? '',
      driver_phone: vehicle.driver_phone ?? '',
      is_active: vehicle.is_active,
    })
    setModalOpen(true)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (editing) await updateMutation.mutateAsync({ id: editing.id, payload: form })
    else await createMutation.mutateAsync(form)
    setModalOpen(false)
  }

  const columns: DataTableColumn<Vehicle>[] = [
    { key: 'registration_number', header: t('vehicles.columnRegistration'), sortable: true, render: (row) => <span className="font-medium">{row.registration_number}</span> },
    { key: 'capacity', header: t('fields.capacity'), align: 'right', render: (row) => row.capacity },
    { key: 'driver_name', header: t('fields.driver'), render: (row) => row.driver_name ?? '—' },
    { key: 'driver_phone', header: t('vehicles.columnPhone'), render: (row) => row.driver_phone ?? '—' },
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
            <Button variant="outline" size="sm" onClick={() => setDeleting(row)} aria-label={t('vehicles.deleteAriaLabel', { name: row.registration_number })}>
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
        title={t('vehicles.title')}
        description={t('vehicles.description')}
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t('vehicles.newVehicle')}
            </Button>
          )
        }
      />

      <div className="mb-4 max-w-sm">
        <SearchInput placeholder={t('vehicles.searchPlaceholder')} value={search} onChange={setSearch} />
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
        emptyTitle={debouncedSearch ? t('vehicles.emptyTitleSearch', { query: debouncedSearch }) : t('vehicles.emptyTitle')}
        emptyDescription={debouncedSearch ? t('vehicles.emptyDescriptionSearch') : undefined}
      />

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? t('vehicles.editTitle') : t('vehicles.newVehicle')}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label={t('fields.registrationNumber')} htmlFor="registration_number" required>
            <Input id="registration_number" required value={form.registration_number} onChange={(e) => setForm({ ...form, registration_number: e.target.value })} />
          </FormField>
          <FormField label={t('fields.capacity')} htmlFor="capacity" required>
            <Input id="capacity" type="number" min={1} required value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('vehicles.driverName')} htmlFor="driver_name">
              <Input id="driver_name" value={form.driver_name ?? ''} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} />
            </FormField>
            <FormField label={t('vehicles.driverPhone')} htmlFor="driver_phone">
              <Input id="driver_phone" value={form.driver_phone ?? ''} onChange={(e) => setForm({ ...form, driver_phone: e.target.value })} />
            </FormField>
          </div>
          <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending} className="mt-2">
            {editing ? t('fields.saveChanges') : t('vehicles.createVehicle')}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('vehicles.deleteConfirmTitle', { name: deleting?.registration_number })}
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
