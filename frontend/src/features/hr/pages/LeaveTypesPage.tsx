import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { leaveTypesApi } from '@/api/endpoints/hr'
import { queryKeys } from '@/api/queryKeys'
import { useCrudResource } from '@/hooks/useCrudResource'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useDebounce } from '@/hooks/useDebounce'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, Checkbox, ConfirmDialog, DataTable, FormField, Input, Modal, SearchInput, Textarea, type DataTableColumn } from '@/components/ui'
import type { LeaveType, LeaveTypePayload } from '@/types/hr'
import '../i18n'

const EMPTY_FORM: LeaveTypePayload = { name: '', days_allowed_per_year: null, is_paid: true, description: '', is_active: true }

export function LeaveTypesPage() {
  const { t } = useFeatureTranslation('hr')
  const { can } = usePermission()
  const { sort, search, setPage, setSort, setSearch, queryParams } = usePagination('name', 'name')
  const debouncedSearch = useDebounce(search)
  const { listQuery, createMutation, updateMutation, removeMutation } = useCrudResource(
    leaveTypesApi,
    queryKeys.leaveTypes,
    { ...queryParams, 'filter[name]': debouncedSearch || undefined },
    'Leave type'
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<LeaveType | null>(null)
  const [form, setForm] = useState<LeaveTypePayload>(EMPTY_FORM)
  const [deleting, setDeleting] = useState<LeaveType | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(leaveType: LeaveType) {
    setEditing(leaveType)
    setForm({
      name: leaveType.name,
      days_allowed_per_year: leaveType.days_allowed_per_year,
      is_paid: leaveType.is_paid,
      description: leaveType.description ?? '',
      is_active: leaveType.is_active,
    })
    setModalOpen(true)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (editing) await updateMutation.mutateAsync({ id: editing.id, payload: form })
    else await createMutation.mutateAsync(form)
    setModalOpen(false)
  }

  const columns: DataTableColumn<LeaveType>[] = [
    { key: 'name', header: t('fields.name'), sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'days', header: t('leaveTypes.columnDaysPerYear'), render: (row) => row.days_allowed_per_year ?? t('leaveTypes.unlimited') },
    { key: 'paid', header: t('leaveTypes.columnPaid'), render: (row) => <Badge variant={row.is_paid ? 'success' : 'default'}>{row.is_paid ? t('leaveTypes.paid') : t('leaveTypes.unpaid')}</Badge> },
    { key: 'status', header: t('fields.status'), render: (row) => <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? t('fields.active') : t('fields.inactive')}</Badge> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          {can('leave.manage') && (
            <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
              {t('fields.edit')}
            </Button>
          )}
          {can('leave.manage') && (
            <Button variant="outline" size="sm" onClick={() => setDeleting(row)} aria-label={t('leaveTypes.deleteAriaLabel', { name: row.name })}>
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
        title={t('leaveTypes.title')}
        description={t('leaveTypes.description')}
        actions={
          can('leave.manage') && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t('leaveTypes.newLeaveType')}
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
        emptyTitle={debouncedSearch ? t('leaveTypes.emptyTitleSearch', { query: debouncedSearch }) : t('leaveTypes.emptyTitle')}
        emptyDescription={debouncedSearch ? t('leaveTypes.emptyDescriptionSearch') : undefined}
      />

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? t('leaveTypes.editTitle') : t('leaveTypes.newTitle')}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label={t('fields.name')} htmlFor="name" required>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label={t('leaveTypes.daysAllowedPerYear')} htmlFor="days_allowed_per_year" hint={t('leaveTypes.daysAllowedHint')}>
            <Input
              id="days_allowed_per_year"
              type="number"
              min="1"
              value={form.days_allowed_per_year ?? ''}
              onChange={(e) => setForm({ ...form, days_allowed_per_year: e.target.value ? Number(e.target.value) : null })}
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.is_paid ?? true} onCheckedChange={(checked) => setForm({ ...form, is_paid: checked })} />
            {t('leaveTypes.paidLeave')}
          </label>
          <FormField label={t('fields.description')} htmlFor="description" hint={t('leaveTypes.descriptionHint')}>
            <Textarea id="description" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>
          <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending} className="mt-2">
            {editing ? t('fields.saveChanges') : t('leaveTypes.createLeaveType')}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('leaveTypes.deleteConfirmTitle', { name: deleting?.name })}
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
