import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { assessmentComponentTypesApi } from '@/api/endpoints/exams'
import { queryKeys } from '@/api/queryKeys'
import { useCrudResource } from '@/hooks/useCrudResource'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useDebounce } from '@/hooks/useDebounce'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { Badge, Button, Checkbox, ConfirmDialog, DataTable, FormField, Input, Modal, SearchInput, type DataTableColumn } from '@/components/ui'
import type { AssessmentComponentType, AssessmentComponentTypePayload } from '@/types/exam'
import '../i18n'

const EMPTY_FORM: AssessmentComponentTypePayload = { name: '', code: '', is_auto_graded: false, sequence: 0, is_active: true }

/** Online MCQ / Written / Practical / Oral, etc. — the gradable components a subject's result can combine, configurable per school. */
export function AssessmentComponentTypesPage() {
  const { t } = useFeatureTranslation('exams')
  const { can } = usePermission()
  const { sort, search, setPage, setSort, setSearch, queryParams } = usePagination('sequence', 'name')
  const debouncedSearch = useDebounce(search)
  const { listQuery, createMutation, updateMutation, removeMutation } = useCrudResource(
    assessmentComponentTypesApi,
    queryKeys.assessmentComponentTypes,
    { ...queryParams, 'filter[name]': debouncedSearch || undefined },
    'Component type'
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<AssessmentComponentType | null>(null)
  const [form, setForm] = useState<AssessmentComponentTypePayload>(EMPTY_FORM)
  const [deleting, setDeleting] = useState<AssessmentComponentType | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(componentType: AssessmentComponentType) {
    setEditing(componentType)
    setForm({ name: componentType.name, code: componentType.code, is_auto_graded: componentType.is_auto_graded, sequence: componentType.sequence, is_active: componentType.is_active })
    setModalOpen(true)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (editing) await updateMutation.mutateAsync({ id: editing.id, payload: form })
    else await createMutation.mutateAsync(form)
    setModalOpen(false)
  }

  const columns: DataTableColumn<AssessmentComponentType>[] = [
    { key: 'name', header: t('fields.name'), sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'code', header: t('fields.code'), render: (row) => <span className="font-mono text-xs text-muted-foreground">{row.code}</span> },
    { key: 'is_auto_graded', header: t('componentTypes.columnGrading'), render: (row) => (row.is_auto_graded ? <Badge variant="info">{t('componentTypes.autoGraded')}</Badge> : <Badge variant="outline">{t('componentTypes.manualEntry')}</Badge>) },
    { key: 'status', header: t('fields.status'), render: (row) => <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? t('fields.active') : t('fields.inactive')}</Badge> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          {can('grading.manage') && <Button variant="outline" size="sm" onClick={() => openEdit(row)}>{t('fields.edit')}</Button>}
          {can('grading.manage') && (
            <Button variant="outline" size="sm" onClick={() => setDeleting(row)} aria-label={t('componentTypes.deleteAria', { name: row.name })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="max-w-sm flex-1">
          <SearchInput placeholder={t('fields.searchByName')} value={search} onChange={setSearch} />
        </div>
        {can('grading.manage') && <Button onClick={openCreate}><Plus className="h-4 w-4" /> {t('componentTypes.newButton')}</Button>}
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
        emptyTitle={debouncedSearch ? t('componentTypes.emptyTitleSearch', { query: debouncedSearch }) : t('componentTypes.emptyTitle')}
        emptyDescription={debouncedSearch ? t('componentTypes.emptyDescriptionSearch') : undefined}
      />

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? t('componentTypes.modalTitleEdit') : t('componentTypes.modalTitleCreate')}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label={t('fields.name')} htmlFor="name" required hint={t('componentTypes.nameHint')}>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label={t('fields.code')} htmlFor="code" required hint={t('componentTypes.codeHint')}>
            <Input id="code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.is_auto_graded ?? false} onCheckedChange={(checked) => setForm({ ...form, is_auto_graded: checked })} />
            {t('componentTypes.autoGradedCheckbox')}
          </label>
          <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending} className="mt-2">
            {editing ? t('fields.saveChanges') : t('componentTypes.createButton')}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('componentTypes.deleteConfirmTitle', { name: deleting?.name })}
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
