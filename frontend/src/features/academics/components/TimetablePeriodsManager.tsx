import { useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { timetablePeriodsApi } from '@/api/endpoints/academics'
import { queryKeys } from '@/api/queryKeys'
import { useCrudResource } from '@/hooks/useCrudResource'
import { usePermission } from '@/hooks/usePermission'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { Badge, Button, ConfirmDialog, DataTable, FormField, Input, Modal, Switch, type DataTableColumn } from '@/components/ui'
import type { TimetablePeriod, TimetablePeriodPayload } from '@/types/academic'
import '../i18n'

const emptyForm: TimetablePeriodPayload = { name: '', start_time: '08:00', end_time: '08:45', sequence: 1, is_break: false }

export function TimetablePeriodsManager() {
  const { t } = useFeatureTranslation('academics')
  const { can } = usePermission()
  const { listQuery, createMutation, updateMutation, removeMutation } = useCrudResource(
    timetablePeriodsApi,
    queryKeys.timetablePeriods,
    { per_page: 50, sort: 'sequence' },
    'Period'
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TimetablePeriod | null>(null)
  const [form, setForm] = useState<TimetablePeriodPayload>(emptyForm)
  const [deleting, setDeleting] = useState<TimetablePeriod | null>(null)
  const baselineRef = useRef<TimetablePeriodPayload>(emptyForm)

  useUnsavedChangesWarning(modalOpen && JSON.stringify(form) !== JSON.stringify(baselineRef.current))

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    baselineRef.current = emptyForm
    setModalOpen(true)
  }
  function openEdit(row: TimetablePeriod) {
    setEditing(row)
    const initial: TimetablePeriodPayload = { name: row.name, start_time: row.start_time, end_time: row.end_time, sequence: row.sequence, is_break: row.is_break }
    setForm(initial)
    baselineRef.current = initial
    setModalOpen(true)
  }
  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (editing) await updateMutation.mutateAsync({ id: editing.id, payload: form })
    else await createMutation.mutateAsync(form)
    setModalOpen(false)
  }

  const columns: DataTableColumn<TimetablePeriod>[] = [
    { key: 'sequence', header: t('fields.order'), render: (row) => row.sequence },
    { key: 'name', header: t('fields.name'), render: (row) => row.name },
    { key: 'start_time', header: t('fields.start'), render: (row) => row.start_time },
    { key: 'end_time', header: t('fields.end'), render: (row) => row.end_time },
    { key: 'is_break', header: '', render: (row) => (row.is_break ? <Badge variant="default">{t('timetablePeriods.breakBadge')}</Badge> : null) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          {can('timetable.edit') && (
            <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
              {t('fields.edit')}
            </Button>
          )}
          {can('timetable.delete') && (
            <Button variant="outline" size="sm" onClick={() => setDeleting(row)} aria-label={t('timetablePeriods.deleteAria', { name: row.name })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex justify-end">
        {can('timetable.create') && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> {t('timetablePeriods.newButton')}
          </Button>
        )}
      </div>
      <DataTable columns={columns} data={listQuery.data?.data} rowKey={(row) => row.id} isLoading={listQuery.isLoading} isError={listQuery.isError} onRetry={listQuery.refetch} emptyTitle={t('timetablePeriods.emptyTitle')} emptyDescription={t('timetablePeriods.emptyDescription')} />

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? t('timetablePeriods.modalTitleEdit') : t('timetablePeriods.modalTitleCreate')} size="sm">
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label={t('fields.name')} htmlFor="name" required hint={t('timetablePeriods.nameHint')}>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('timetablePeriods.startTimeLabel')} htmlFor="start_time" required>
              <Input id="start_time" type="time" required value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </FormField>
            <FormField label={t('timetablePeriods.endTimeLabel')} htmlFor="end_time" required>
              <Input id="end_time" type="time" required value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
            </FormField>
          </div>
          <FormField label={t('fields.sortOrder')} htmlFor="sequence">
            <Input id="sequence" type="number" value={form.sequence ?? 0} onChange={(e) => setForm({ ...form, sequence: Number(e.target.value) })} />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={!!form.is_break} onCheckedChange={(checked) => setForm({ ...form, is_break: checked })} />
            {t('timetablePeriods.isBreakLabel')}
          </label>
          <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending} className="mt-2">
            {editing ? t('fields.saveChanges') : t('timetablePeriods.createButton')}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('fields.deleteConfirmTitle', { name: deleting?.name })}
        description={t('timetablePeriods.deleteConfirmDescription')}
        isLoading={removeMutation.isPending}
        onConfirm={async () => {
          if (deleting) await removeMutation.mutateAsync(deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}
