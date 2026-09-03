import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Send, Trash2 } from 'lucide-react'
import { certificateTemplatesApi } from '@/api/endpoints/certificates'
import { studentsApi } from '@/api/endpoints/students'
import { queryKeys } from '@/api/queryKeys'
import { useCrudResource } from '@/hooks/useCrudResource'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useDebounce } from '@/hooks/useDebounce'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, ConfirmDialog, DataTable, FormField, Input, Modal, SearchInput, Select, Textarea, type DataTableColumn } from '@/components/ui'
import { CERTIFICATE_LAYOUTS } from '@/types/certificates'
import type { CertificateLayout, CertificateTemplate, CertificateTemplatePayload } from '@/types/certificates'
import type { ApiError } from '@/api/client'
import '../i18n'

const EMPTY_FORM: CertificateTemplatePayload = { name: '', type: '', body: '', layout: 'classic', signatories: [], is_active: true }

const LAYOUT_LABEL_KEYS: Record<CertificateLayout, string> = {
  classic: 'templates.layoutClassic',
  recognition: 'templates.layoutRecognition',
  achievement: 'templates.layoutAchievement',
  merit: 'templates.layoutMerit',
}

export function CertificateTemplatesPage() {
  const { t } = useFeatureTranslation('certificates')
  const { can } = usePermission()
  const canManage = can('certificates.edit') || can('certificates.create')
  const { sort, search, setPage, setSort, setSearch, queryParams } = usePagination('name', 'name')
  const debouncedSearch = useDebounce(search)
  const { listQuery, createMutation, updateMutation, removeMutation } = useCrudResource(
    certificateTemplatesApi,
    queryKeys.certificateTemplates,
    { ...queryParams, 'filter[name]': debouncedSearch || undefined },
    'Certificate template'
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CertificateTemplate | null>(null)
  const [form, setForm] = useState<CertificateTemplatePayload>(EMPTY_FORM)
  const [deleting, setDeleting] = useState<CertificateTemplate | null>(null)
  const [issuing, setIssuing] = useState<CertificateTemplate | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(template: CertificateTemplate) {
    setEditing(template)
    setForm({
      name: template.name,
      type: template.type,
      body: template.body,
      layout: template.layout,
      signatories: template.signatories,
      is_active: template.is_active,
    })
    setModalOpen(true)
  }

  function setSignatory(index: number, field: 'name' | 'title', value: string) {
    setForm((prev) => {
      const signatories = [...prev.signatories]
      const current = signatories[index] ?? { name: '', title: '' }
      signatories[index] = { ...current, [field]: value }
      return { ...prev, signatories }
    })
  }

  function removeSignatory(index: number) {
    setForm((prev) => ({ ...prev, signatories: prev.signatories.filter((_, i) => i !== index) }))
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (editing) await updateMutation.mutateAsync({ id: editing.id, payload: form })
    else await createMutation.mutateAsync(form)
    setModalOpen(false)
  }

  const columns: DataTableColumn<CertificateTemplate>[] = [
    { key: 'name', header: t('fields.name'), sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'type', header: t('fields.type'), render: (row) => row.type },
    { key: 'layout', header: t('fields.layout'), render: (row) => t(LAYOUT_LABEL_KEYS[row.layout]) },
    { key: 'status', header: t('fields.status'), render: (row) => <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? t('fields.active') : t('fields.inactive')}</Badge> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          {can('certificates.issue') && (
            <Button variant="outline" size="sm" onClick={() => setIssuing(row)}>
              <Send className="h-3.5 w-3.5" /> {t('templates.issue')}
            </Button>
          )}
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
              {t('templates.edit')}
            </Button>
          )}
          {can('certificates.delete') && (
            <Button variant="outline" size="sm" onClick={() => setDeleting(row)} aria-label={t('templates.deleteAriaLabel', { name: row.name })}>
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
        title={t('templates.title')}
        description={t('templates.description')}
        actions={
          can('certificates.create') && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t('templates.newTemplate')}
            </Button>
          )
        }
      />

      <div className="mb-4 max-w-sm">
        <SearchInput placeholder={t('templates.searchPlaceholder')} value={search} onChange={setSearch} />
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
        emptyTitle={debouncedSearch ? t('templates.emptyTitleSearch', { query: debouncedSearch }) : t('templates.emptyTitle')}
        emptyDescription={debouncedSearch ? t('templates.emptyDescriptionSearch') : undefined}
      />

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? t('templates.editTitle') : t('templates.newTitle')}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('fields.name')} htmlFor="name" required>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </FormField>
            <FormField label={t('fields.type')} htmlFor="type" required hint={t('templates.typeHint')}>
              <Input id="type" required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            </FormField>
          </div>
          <FormField
            label={t('templates.bodyLabel')}
            htmlFor="body"
            required
            hint={t('templates.bodyHint')}
          >
            <Textarea id="body" rows={6} required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          </FormField>
          <FormField label={t('fields.layout')} htmlFor="layout" hint={t('templates.layoutHint')}>
            <Select
              id="layout"
              value={form.layout}
              onValueChange={(value) => setForm({ ...form, layout: value as CertificateLayout })}
              options={CERTIFICATE_LAYOUTS.map((layout) => ({ value: layout, label: t(LAYOUT_LABEL_KEYS[layout]) }))}
            />
          </FormField>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">{t('templates.signatoriesLabel')}</p>
              {form.signatories.length < 2 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setForm((prev) => ({ ...prev, signatories: [...prev.signatories, { name: '', title: '' }] }))}
                >
                  <Plus className="h-3.5 w-3.5" /> {t('templates.addSignatory')}
                </Button>
              )}
            </div>
            {form.signatories.length === 0 && <p className="text-xs text-muted-foreground">{t('templates.signatoriesHint')}</p>}
            {form.signatories.map((signatory, index) => (
              <div key={index} className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
                <Input
                  aria-label={t('templates.signatoryNamePlaceholder')}
                  placeholder={t('templates.signatoryNamePlaceholder')}
                  value={signatory.name}
                  onChange={(e) => setSignatory(index, 'name', e.target.value)}
                />
                <Input
                  aria-label={t('templates.signatoryTitlePlaceholder')}
                  placeholder={t('templates.signatoryTitlePlaceholder')}
                  value={signatory.title}
                  onChange={(e) => setSignatory(index, 'title', e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeSignatory(index)}
                  aria-label={t('templates.removeSignatory')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
          <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending} className="mt-2">
            {editing ? t('templates.saveChanges') : t('templates.createTemplate')}
          </Button>
        </form>
      </Modal>

      {issuing && <IssueCertificateModal template={issuing} open={!!issuing} onOpenChange={(open) => !open && setIssuing(null)} />}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('templates.deleteConfirmTitle', { name: deleting?.name })}
        description={t('templates.deleteConfirmDescription')}
        isLoading={removeMutation.isPending}
        onConfirm={async () => {
          if (deleting) await removeMutation.mutateAsync(deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}

function IssueCertificateModal({ template, open, onOpenChange }: { template: CertificateTemplate; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useFeatureTranslation('certificates')
  const queryClient = useQueryClient()
  const { data: students } = useQuery({ queryKey: queryKeys.students({ per_page: 100 }), queryFn: () => studentsApi.list({ per_page: 100 }) })
  const [studentId, setStudentId] = useState<number | undefined>()

  const mutation = useMutation({
    mutationFn: () => certificateTemplatesApi.issue(template.id, { student_id: studentId! }),
    onSuccess: () => {
      toast.success(t('templates.issueModal.successToast'))
      queryClient.invalidateQueries({ queryKey: queryKeys.certificates().slice(0, 1) })
      onOpenChange(false)
    },
    onError: (error) => toast.error((error as ApiError).message),
  })

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t('templates.issueModal.title', { name: template.name })}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormField label={t('fields.student')} htmlFor="student_id" required>
          <Select
            id="student_id"
            value={studentId ? String(studentId) : undefined}
            onValueChange={(value) => setStudentId(Number(value))}
            options={(students?.data ?? []).map((s) => ({ value: String(s.id), label: `${s.full_name} (${s.admission_number})` }))}
            placeholder={t('templates.issueModal.selectStudentPlaceholder')}
          />
        </FormField>
        <Button type="submit" isLoading={mutation.isPending} disabled={!studentId} className="mt-2">
          {t('templates.issueModal.submit')}
        </Button>
      </form>
    </Modal>
  )
}
