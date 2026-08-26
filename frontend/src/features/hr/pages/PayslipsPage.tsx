import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Download, Zap } from 'lucide-react'
import { payslipsApi } from '@/api/endpoints/hr'
import { queryKeys } from '@/api/queryKeys'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, DataTable, FormField, Modal, Select, type DataTableColumn } from '@/components/ui'
import { formatCurrency } from '@/utils/formatCurrency'
import { getPayslipStatusLabels } from '@/types/hr'
import type { Payslip } from '@/types/hr'
import type { ApiError } from '@/api/client'
import '../i18n'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'default'> = {
  generated: 'warning',
  paid: 'success',
}

export function PayslipsPage() {
  const { t } = useFeatureTranslation('hr')
  const monthNames = t('payslips.months', { returnObjects: true }) as string[]
  const { can } = usePermission()
  const canManage = can('payroll.manage')
  const canViewAll = can('payroll.view') || canManage
  const { setPage, queryParams } = usePagination('-year')
  const listQuery = useQuery({ queryKey: queryKeys.payslips(queryParams), queryFn: () => payslipsApi.list(queryParams) })
  const queryClient = useQueryClient()

  const [generateModalOpen, setGenerateModalOpen] = useState(false)

  const markPaidMutation = useMutation({
    mutationFn: (id: number) => payslipsApi.markPaid(id),
    onSuccess: () => {
      toast.success(t('payslips.markPaidToast'))
      queryClient.invalidateQueries({ queryKey: queryKeys.payslips().slice(0, 1) })
    },
    onError: (error) => toast.error((error as ApiError).message),
  })

  const columns: DataTableColumn<Payslip>[] = [
    ...(canViewAll ? [{ key: 'user', header: t('fields.staffMember'), render: (row: Payslip) => row.user?.full_name ?? '—' } satisfies DataTableColumn<Payslip>] : []),
    { key: 'payslip_number', header: t('payslips.columnPayslipNumber'), render: (row) => row.payslip_number },
    { key: 'period', header: t('payslips.columnPeriod'), render: (row) => `${monthNames[row.month - 1]} ${row.year}` },
    { key: 'net', header: t('payslips.columnNetSalary'), align: 'right', render: (row) => <span className="font-medium">{formatCurrency(row.net_salary)}</span> },
    { key: 'status', header: t('fields.status'), render: (row) => <Badge variant={STATUS_VARIANT[row.status] ?? 'default'}>{getPayslipStatusLabels(t)[row.status]}</Badge> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <a
            href={payslipsApi.receiptPdfUrl(row.id)}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1 text-sm text-primary hover:underline"
            aria-label={t('payslips.pdfAriaLabel', { number: row.payslip_number })}
          >
            <Download className="h-3.5 w-3.5" /> {t('payslips.pdf')}
          </a>
          {canManage && row.status === 'generated' && (
            <Button
              variant="outline"
              size="sm"
              isLoading={markPaidMutation.isPending && markPaidMutation.variables === row.id}
              onClick={() => markPaidMutation.mutate(row.id)}
            >
              {t('payslips.markPaid')}
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('payslips.title')}
        description={canViewAll ? t('payslips.descriptionAll') : t('payslips.descriptionOwn')}
        actions={
          canManage && (
            <Button onClick={() => setGenerateModalOpen(true)}>
              <Zap className="h-4 w-4" /> {t('payslips.generatePayroll')}
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={listQuery.data?.data}
        rowKey={(row) => row.id}
        isLoading={listQuery.isLoading} isError={listQuery.isError} onRetry={listQuery.refetch}
        meta={listQuery.data?.meta}
        onPageChange={setPage}
        emptyTitle={t('payslips.emptyTitle')}
        emptyDescription={t('payslips.emptyDescription')}
      />

      {generateModalOpen && <GeneratePayrollModal open={generateModalOpen} onOpenChange={setGenerateModalOpen} monthNames={monthNames} />}
    </div>
  )
}

function GeneratePayrollModal({ open, onOpenChange, monthNames }: { open: boolean; onOpenChange: (open: boolean) => void; monthNames: string[] }) {
  const { t } = useFeatureTranslation('hr')
  const queryClient = useQueryClient()
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())

  const mutation = useMutation({
    mutationFn: () => payslipsApi.generate({ month, year }),
    onSuccess: (result) => {
      toast.success(t('payslips.generateModal.successToast', { created: result.created_count, skipped: result.skipped_count }))
      queryClient.invalidateQueries({ queryKey: queryKeys.payslips().slice(0, 1) })
      onOpenChange(false)
    },
    onError: (error) => toast.error((error as ApiError).message),
  })

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t('payslips.generateModal.title')}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        <p className="text-sm text-muted-foreground">{t('payslips.generateModal.description')}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('payslips.generateModal.month')} htmlFor="month" required>
            <Select
              id="month"
              value={String(month)}
              onValueChange={(value) => setMonth(Number(value))}
              options={monthNames.map((name, index) => ({ value: String(index + 1), label: name }))}
            />
          </FormField>
          <FormField label={t('payslips.generateModal.year')} htmlFor="year" required>
            <Select
              id="year"
              value={String(year)}
              onValueChange={(value) => setYear(Number(value))}
              options={[year - 1, year, year + 1].map((y) => ({ value: String(y), label: String(y) }))}
            />
          </FormField>
        </div>
        <Button type="submit" isLoading={mutation.isPending} className="mt-2">
          {t('payslips.generateModal.submit')}
        </Button>
      </form>
    </Modal>
  )
}
