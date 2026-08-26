import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { examTypesApi } from '@/api/endpoints/exams'
import { queryKeys } from '@/api/queryKeys'
import { useCrudResource } from '@/hooks/useCrudResource'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useDebounce } from '@/hooks/useDebounce'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { Badge, Button, ConfirmDialog, DataTable, FormField, Input, Modal, SearchInput, type DataTableColumn } from '@/components/ui'
import type { ExamType, ExamTypePayload } from '@/types/exam'
import '../i18n'

const EMPTY_FORM: ExamTypePayload = { name: '', code: '', sequence: 0, is_active: true }

/** Class Test / Unit Test / Trimester / Semester / Final, etc. — configurable per school, seeded with a canonical starting set at provisioning. */
export function ExamTypesPage() {
  const { t } = useFeatureTranslation('exams')
  const { can } = usePermission()
  const { sort, search, setPage, setSort, setSearch, queryParams } = usePagination('sequence', 'name')
  const debouncedSearch = useDebounce(search)
  const { listQuery, createMutation, updateMutation, removeMutation } = useCrudResource(
    examTypesApi,
    queryKeys.examTypes,
    { ...queryParams, 'filter[name]': debouncedSearch || undefined },
    'Exam type'
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ExamType | null>(null)
  const [form, setForm] = useState<ExamTypePayload>(EMPTY_FORM)
  const [deleting, setDeleting] = useState<ExamType | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(examType: ExamType) {
    setEditing(examType)
    setForm({ name: examType.name, code: examType.code, sequence: examType.sequence, is_active: examType.is_active })
    setModalOpen(true)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (editing) await updateMutation.mutateAsync({ id: editing.id, payload: form })
    else await createMutation.mutateAsync(form)
    setModalOpen(false)
  }

  const columns: DataTableColumn<ExamType>[] = [
    { key: 'name', header: t('fields.name'), sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'code', header: t('fields.code'), render: (row) => <span className="font-mono text-xs text-muted-foreground">{row.code}</span> },
    { key: 'status', header: t('fields.status'), render: (row) => <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? t('fields.active') : t('fields.inactive')}</Badge> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          {can('grading.manage') && <Button variant="outline" size="sm" onClick={() => openEdit(row)}>{t('fields.edit')}</Button>}
          {can('grading.manage') && (
            <Button variant="outline" size="sm" onClick={() => setDeleting(row)} aria-label={t('examTypes.deleteAria', { name: row.name })}>
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
        {can('grading.manage') && <Button onClick={openCreate}><Plus className="h-4 w-4" /> {t('examTypes.newButton')}</Button>}
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
        emptyTitle={debouncedSearch ? t('examTypes.emptyTitleSearch', { query: debouncedSearch }) : t('examTypes.emptyTitle')}
        emptyDescription={debouncedSearch ? t('examTypes.emptyDescriptionSearch') : undefined}
      />

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? t('examTypes.modalTitleEdit') : t('examTypes.modalTitleCreate')}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label={t('fields.name')} htmlFor="name" required hint={t('examTypes.nameHint')}>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label={t('fields.code')} htmlFor="code" required hint={t('examTypes.codeHint')}>
            <Input id="code" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </FormField>
          <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending} className="mt-2">
            {editing ? t('fields.saveChanges') : t('examTypes.createButton')}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('examTypes.deleteConfirmTitle', { name: deleting?.name })}
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
