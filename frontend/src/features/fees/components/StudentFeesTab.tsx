import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { invoicesApi } from '@/api/endpoints/fees'
import { queryKeys } from '@/api/queryKeys'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { Badge, EmptyState, Skeleton, StatCard, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { routePaths } from '@/routes/routePaths'
import '../i18n'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'default' | 'info'> = {
  draft: 'default',
  issued: 'info',
  partially_paid: 'warning',
  paid: 'success',
  void: 'destructive',
}

export function StudentFeesTab({ studentId }: { studentId: number }) {
  const { t } = useFeatureTranslation('fees')
  const navigate = useNavigate()
  const { data: statement, isLoading } = useQuery({ queryKey: queryKeys.feeStatement(studentId), queryFn: () => invoicesApi.statement(studentId) })

  if (isLoading) return <Skeleton className="h-48 w-full" />
  if (!statement) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label={t('studentFeesTab.totalBilled')} value={formatCurrency(statement.summary.total_billed)} />
        <StatCard label={t('studentFeesTab.totalPaid')} value={formatCurrency(statement.summary.total_paid)} />
        <StatCard label={t('studentFeesTab.totalCredited')} value={formatCurrency(statement.summary.total_credited)} />
        <StatCard label={t('studentFeesTab.outstanding')} value={formatCurrency(statement.summary.total_outstanding)} />
      </div>

      {statement.invoices.length === 0 && <EmptyState title={t('studentFeesTab.noInvoices')} />}

      {statement.invoices.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('fields.invoiceNumber')}</TableHead>
              <TableHead>{t('fields.issued')}</TableHead>
              <TableHead>{t('fields.due')}</TableHead>
              <TableHead className="text-end">{t('fields.total')}</TableHead>
              <TableHead className="text-end">{t('fields.balance')}</TableHead>
              <TableHead>{t('fields.status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statement.invoices.map((invoice) => (
              <TableRow key={invoice.id} className="cursor-pointer" onClick={() => navigate(routePaths.invoiceDetail(invoice.id))}>
                <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                <TableCell>{formatDate(invoice.issue_date)}</TableCell>
                <TableCell>{formatDate(invoice.due_date)}</TableCell>
                <TableCell className="text-end">{formatCurrency(invoice.total)}</TableCell>
                <TableCell className="text-end">{formatCurrency(invoice.balance)}</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANT[invoice.status] ?? 'default'}>{invoice.status_label}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
