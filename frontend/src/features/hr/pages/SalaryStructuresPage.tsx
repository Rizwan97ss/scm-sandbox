import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { salaryStructuresApi } from '@/api/endpoints/hr'
import { usersApi } from '@/api/endpoints/users'
import { queryKeys } from '@/api/queryKeys'
import { useCrudResource } from '@/hooks/useCrudResource'
import { usePagination } from '@/hooks/usePagination'
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, DataTable, FormField, Input, Modal, Select, type DataTableColumn } from '@/components/ui'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import type { SalaryStructure, SalaryStructurePayload } from '@/types/hr'
import '../i18n'

const EMPTY_FORM: SalaryStructurePayload = { user_id: 0, basic_salary: 0, allowances: 0, deductions: 0, effective_from: new Date().toISOString().slice(0, 10) }

export function SalaryStructuresPage() {
  const { t } = useFeatureTranslation('hr')
  const { setPage, queryParams } = usePagination('-effective_from')
  const { listQuery, createMutation } = useCrudResource(salaryStructuresApi, queryKeys.salaryStructures, queryParams, 'Salary structure')
  const { data: users } = useQuery({ queryKey: queryKeys.users({ per_page: 200 }), queryFn: () => usersApi.list({ per_page: 200 }) })

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<SalaryStructurePayload>(EMPTY_FORM)

  useUnsavedChangesWarning(modalOpen && JSON.stringify(form) !== JSON.stringify(EMPTY_FORM))

  function handleModalOpenChange(open: boolean) {
    setModalOpen(open)
    if (!open) setForm(EMPTY_FORM)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    await createMutation.mutateAsync(form)
    setModalOpen(false)
    setForm(EMPTY_FORM)
  }

  const columns: DataTableColumn<SalaryStructure>[] = [
    { key: 'user', header: t('fields.staffMember'), render: (row) => row.user?.full_name ?? '—' },
    { key: 'basic', header: t('salaryStructures.columnBasic'), align: 'right', render: (row) => formatCurrency(row.basic_salary) },
    { key: 'allowances', header: t('salaryStructures.columnAllowances'), align: 'right', render: (row) => formatCurrency(row.allowances) },
    { key: 'deductions', header: t('salaryStructures.columnDeductions'), align: 'right', render: (row) => formatCurrency(row.deductions) },
    { key: 'net', header: t('salaryStructures.columnNet'), align: 'right', render: (row) => <span className="font-medium">{formatCurrency(row.net_salary)}</span> },
    { key: 'effective_from', header: t('salaryStructures.columnEffectiveFrom'), render: (row) => formatDate(row.effective_from) },
    { key: 'status', header: t('fields.status'), render: (row) => <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? t('fields.active') : t('salaryStructures.superseded')}</Badge> },
  ]

  return (
    <div>
      <PageHeader
        title={t('salaryStructures.title')}
        description={t('salaryStructures.description')}
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> {t('salaryStructures.newStructure')}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={listQuery.data?.data}
        rowKey={(row) => row.id}
        isLoading={listQuery.isLoading} isError={listQuery.isError} onRetry={listQuery.refetch}
        meta={listQuery.data?.meta}
        onPageChange={setPage}
        emptyTitle={t('salaryStructures.emptyTitle')}
        emptyDescription={t('salaryStructures.emptyDescription')}
      />

      <Modal open={modalOpen} onOpenChange={handleModalOpenChange} title={t('salaryStructures.newTitle')}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label={t('salaryStructures.selectStaffMember')} htmlFor="user_id" required>
            <Select
              id="user_id"
              value={form.user_id ? String(form.user_id) : undefined}
              onValueChange={(value) => setForm({ ...form, user_id: Number(value) })}
              options={(users?.data ?? []).map((u) => ({ value: String(u.id), label: u.full_name }))}
              placeholder={t('salaryStructures.selectStaffMember')}
            />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label={t('salaryStructures.basicSalary')} htmlFor="basic_salary" required>
              <Input id="basic_salary" type="number" min="0.01" step="0.01" required value={form.basic_salary || ''} onChange={(e) => setForm({ ...form, basic_salary: Number(e.target.value) })} />
            </FormField>
            <FormField label={t('salaryStructures.allowances')} htmlFor="allowances">
              <Input id="allowances" type="number" min="0" step="0.01" value={form.allowances ?? ''} onChange={(e) => setForm({ ...form, allowances: Number(e.target.value) })} />
            </FormField>
            <FormField label={t('salaryStructures.deductions')} htmlFor="deductions">
              <Input id="deductions" type="number" min="0" step="0.01" value={form.deductions ?? ''} onChange={(e) => setForm({ ...form, deductions: Number(e.target.value) })} />
            </FormField>
          </div>
          <FormField label={t('salaryStructures.effectiveFrom')} htmlFor="effective_from" required>
            <Input id="effective_from" type="date" required value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} />
          </FormField>
          <Button type="submit" isLoading={createMutation.isPending} className="mt-2">
            {t('salaryStructures.createStructure')}
          </Button>
        </form>
      </Modal>
    </div>
  )
}
