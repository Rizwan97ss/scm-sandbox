import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { gradingScalesApi } from '@/api/endpoints/exams'
import { queryKeys } from '@/api/queryKeys'
import { useCrudResource } from '@/hooks/useCrudResource'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, Checkbox, ConfirmDialog, DataTable, FormField, Input, Modal, type DataTableColumn } from '@/components/ui'
import type { GradeBandInput, GradingScale, GradingScalePayload } from '@/types/exam'
import '../i18n'

const EMPTY_BAND: GradeBandInput = { min_percentage: 0, max_percentage: 100, grade_label: '', grade_point: null, remark: '' }

export function GradingScalesPage() {
  const { t } = useFeatureTranslation('exams')
  const { can } = usePermission()
  const { setPage, queryParams } = usePagination('name')
  const { listQuery, createMutation, updateMutation, removeMutation } = useCrudResource(gradingScalesApi, queryKeys.gradingScales, queryParams, 'Grading scale')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<GradingScale | null>(null)
  const [deleting, setDeleting] = useState<GradingScale | null>(null)

  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<GradingScalePayload>({
    defaultValues: { name: '', is_default: false, grade_bands: [EMPTY_BAND] },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'grade_bands' })

  function openCreate() {
    setEditing(null)
    reset({ name: '', is_default: false, grade_bands: [EMPTY_BAND] })
    setModalOpen(true)
  }

  function openEdit(scale: GradingScale) {
    setEditing(scale)
    reset({
      name: scale.name,
      is_default: scale.is_default,
      grade_bands: scale.grade_bands.map((b) => ({ min_percentage: b.min_percentage, max_percentage: b.max_percentage, grade_label: b.grade_label, grade_point: b.grade_point, remark: b.remark })),
    })
    setModalOpen(true)
  }

  async function onSubmit(values: GradingScalePayload) {
    try {
      if (editing) await updateMutation.mutateAsync({ id: editing.id, payload: values })
      else await createMutation.mutateAsync(values)
      setModalOpen(false)
    } catch {
      toast.error(t('gradingScales.validationErrorToast'))
    }
  }

  const columns: DataTableColumn<GradingScale>[] = [
    { key: 'name', header: t('gradingScales.columnName'), sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'default', header: t('gradingScales.columnDefault'), render: (row) => (row.is_default ? <Badge variant="primary">{t('gradingScales.default')}</Badge> : '—') },
    { key: 'bands', header: t('gradingScales.columnBands'), render: (row) => row.grade_bands.length },
    {
      key: 'actions', header: '', align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          {can('grading.manage') && <Button variant="outline" size="sm" onClick={() => openEdit(row)}>{t('fields.edit')}</Button>}
          {can('grading.manage') && (
            <Button variant="outline" size="sm" onClick={() => setDeleting(row)} aria-label={t('gradingScales.deleteAria', { name: row.name })}>
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
        title={t('gradingScales.title')}
        description={t('gradingScales.description')}
        actions={can('grading.manage') && <Button onClick={openCreate}><Plus className="h-4 w-4" /> {t('gradingScales.newScale')}</Button>}
      />
      <DataTable columns={columns} data={listQuery.data?.data} rowKey={(r) => r.id} isLoading={listQuery.isLoading} isError={listQuery.isError} onRetry={listQuery.refetch} meta={listQuery.data?.meta} onPageChange={setPage} emptyTitle={t('gradingScales.emptyTitle')} emptyDescription={t('gradingScales.emptyDescription')} />

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? t('gradingScales.modalTitleEdit') : t('gradingScales.modalTitleCreate')} size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          <FormField label={t('gradingScales.scaleName')} htmlFor="name" required error={errors.name?.message}>
            <Input id="name" required {...register('name', { required: t('gradingScales.requiredError') })} />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={watch('is_default')} onCheckedChange={(checked) => setValue('is_default', checked)} />
            {t('gradingScales.setDefault')}
          </label>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t('gradingScales.gradeBandsHeading')}</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => append(EMPTY_BAND)}>
                <Plus className="h-3.5 w-3.5" /> {t('gradingScales.addBand')}
              </Button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 items-end gap-2 rounded-md border border-border p-2 sm:grid-cols-12">
                <FormField label={t('gradingScales.minPercentage')} htmlFor={`grade_bands.${index}.min_percentage`} className="sm:col-span-2">
                  <Input id={`grade_bands.${index}.min_percentage`} type="number" step="0.01" {...register(`grade_bands.${index}.min_percentage`, { valueAsNumber: true, required: true })} />
                </FormField>
                <FormField label={t('gradingScales.maxPercentage')} htmlFor={`grade_bands.${index}.max_percentage`} className="sm:col-span-2">
                  <Input id={`grade_bands.${index}.max_percentage`} type="number" step="0.01" {...register(`grade_bands.${index}.max_percentage`, { valueAsNumber: true, required: true })} />
                </FormField>
                <FormField label={t('gradingScales.label')} htmlFor={`grade_bands.${index}.grade_label`} className="sm:col-span-2">
                  <Input id={`grade_bands.${index}.grade_label`} placeholder={t('gradingScales.labelPlaceholder')} {...register(`grade_bands.${index}.grade_label`, { required: true })} />
                </FormField>
                <FormField label={t('gradingScales.gpa')} htmlFor={`grade_bands.${index}.grade_point`} className="sm:col-span-2">
                  <Input id={`grade_bands.${index}.grade_point`} type="number" step="0.01" {...register(`grade_bands.${index}.grade_point`, { valueAsNumber: true })} />
                </FormField>
                <FormField label={t('gradingScales.remark')} htmlFor={`grade_bands.${index}.remark`} className="sm:col-span-3">
                  <Input id={`grade_bands.${index}.remark`} placeholder={t('gradingScales.remarkPlaceholder')} {...register(`grade_bands.${index}.remark`)} />
                </FormField>
                <div className="sm:col-span-1">
                  <Button type="button" variant="outline" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1} aria-label={t('gradingScales.removeBandAria')}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending} className="mt-2">
            {editing ? t('fields.saveChanges') : t('gradingScales.createButton')}
          </Button>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('gradingScales.deleteConfirmTitle', { name: deleting?.name })}
        description={t('gradingScales.deleteConfirmDescription')}
        isLoading={removeMutation.isPending}
        onConfirm={async () => {
          if (deleting) await removeMutation.mutateAsync(deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}
