import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { leaveRequestsApi, leaveTypesApi } from '@/api/endpoints/hr'
import { queryKeys } from '@/api/queryKeys'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, DataTable, FormField, Input, Modal, Select, Textarea, type DataTableColumn } from '@/components/ui'
import { formatDate } from '@/utils/formatDate'
import { getLeaveStatusLabels } from '@/types/hr'
import type { LeaveRequest, LeaveRequestPayload } from '@/types/hr'
import type { ApiError } from '@/api/client'
import '../i18n'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'destructive' | 'default' | 'info'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'destructive',
  cancelled: 'default',
}

const EMPTY_FORM: LeaveRequestPayload = { leave_type_id: 0, start_date: '', end_date: '', reason: '' }

export function LeaveRequestsPage() {
  const { t } = useFeatureTranslation('hr')
  const { can } = usePermission()
  const canReview = can('leave.manage')
  const canViewAll = can('leave.view') || canReview
  const { setPage, queryParams } = usePagination('-created_at')
  const listQuery = useQuery({ queryKey: queryKeys.leaveRequests(queryParams), queryFn: () => leaveRequestsApi.list(queryParams) })

  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const [reviewTarget, setReviewTarget] = useState<LeaveRequest | null>(null)

  const columns: DataTableColumn<LeaveRequest>[] = [
    ...(canViewAll ? [{ key: 'user', header: t('fields.staffMember'), render: (row: LeaveRequest) => row.user?.full_name ?? '—' } satisfies DataTableColumn<LeaveRequest>] : []),
    { key: 'leave_type', header: t('leaveRequests.columnType'), render: (row) => row.leave_type?.name ?? '—' },
    { key: 'dates', header: t('leaveRequests.columnDates'), render: (row) => `${formatDate(row.start_date)} – ${formatDate(row.end_date)}` },
    { key: 'days', header: t('leaveRequests.columnDays'), align: 'right', render: (row) => row.days },
    { key: 'status', header: t('fields.status'), render: (row) => <Badge variant={STATUS_VARIANT[row.status] ?? 'default'}>{row.status_label}</Badge> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) =>
        canReview && row.status === 'pending' ? (
          <Button variant="outline" size="sm" onClick={() => setReviewTarget(row)}>
            {t('leaveRequests.review')}
          </Button>
        ) : null,
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('leaveRequests.title')}
        description={canViewAll ? t('leaveRequests.descriptionAll') : t('leaveRequests.descriptionOwn')}
        actions={
          <Button onClick={() => setApplyModalOpen(true)}>
            <Plus className="h-4 w-4" /> {t('leaveRequests.applyForLeave')}
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
        emptyTitle={t('leaveRequests.emptyTitle')}
        emptyDescription={t('leaveRequests.emptyDescription')}
      />

      {applyModalOpen && <ApplyForLeaveModal open={applyModalOpen} onOpenChange={setApplyModalOpen} />}
      {reviewTarget && <ReviewLeaveModal leaveRequest={reviewTarget} open={!!reviewTarget} onOpenChange={(open) => !open && setReviewTarget(null)} />}
    </div>
  )
}

function ApplyForLeaveModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useFeatureTranslation('hr')
  const queryClient = useQueryClient()
  const { data: leaveTypes } = useQuery({ queryKey: queryKeys.leaveTypes({ per_page: 50 }), queryFn: () => leaveTypesApi.list({ per_page: 50 }) })
  const [form, setForm] = useState<LeaveRequestPayload>(EMPTY_FORM)

  const mutation = useMutation({
    mutationFn: () => leaveRequestsApi.apply(form),
    onSuccess: () => {
      toast.success(t('leaveRequests.applyModal.successToast'))
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests().slice(0, 1) })
      setForm(EMPTY_FORM)
      onOpenChange(false)
    },
    onError: (error) => toast.error((error as ApiError).message),
  })

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t('leaveRequests.applyModal.title')}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormField label={t('leaveRequests.applyModal.leaveType')} htmlFor="leave_type_id" required>
          <Select
            id="leave_type_id"
            value={form.leave_type_id ? String(form.leave_type_id) : undefined}
            onValueChange={(value) => setForm({ ...form, leave_type_id: Number(value) })}
            options={(leaveTypes?.data ?? []).map((leaveType) => ({ value: String(leaveType.id), label: leaveType.name }))}
            placeholder={t('leaveRequests.applyModal.selectLeaveType')}
          />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('fields.startDate')} htmlFor="start_date" required>
            <Input id="start_date" type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </FormField>
          <FormField label={t('fields.endDate')} htmlFor="end_date" required>
            <Input id="end_date" type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
          </FormField>
        </div>
        <FormField label={t('fields.reason')} htmlFor="reason" required>
          <Textarea id="reason" rows={3} required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        </FormField>
        <Button type="submit" isLoading={mutation.isPending} className="mt-2">
          {t('leaveRequests.applyModal.submit')}
        </Button>
      </form>
    </Modal>
  )
}

function ReviewLeaveModal({ leaveRequest, open, onOpenChange }: { leaveRequest: LeaveRequest; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useFeatureTranslation('hr')
  const queryClient = useQueryClient()
  const [notes, setNotes] = useState('')

  const mutation = useMutation({
    mutationFn: (status: 'approved' | 'rejected') => leaveRequestsApi.review(leaveRequest.id, { status, review_notes: notes || null }),
    onSuccess: (updated) => {
      toast.success(t('leaveRequests.reviewModal.successToast', { status: getLeaveStatusLabels(t)[updated.status] }))
      queryClient.invalidateQueries({ queryKey: queryKeys.leaveRequests().slice(0, 1) })
      onOpenChange(false)
    },
    onError: (error) => toast.error((error as ApiError).message),
  })

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t('leaveRequests.reviewModal.title', { name: leaveRequest.user?.full_name ?? '' })}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {t('leaveRequests.reviewModal.summary', {
            leaveType: leaveRequest.leave_type?.name,
            startDate: formatDate(leaveRequest.start_date),
            endDate: formatDate(leaveRequest.end_date),
            days: t('leaveRequests.reviewModal.daysCount', { count: leaveRequest.days }),
          })}
        </p>
        <p className="text-sm">{leaveRequest.reason}</p>
        <FormField label={t('leaveRequests.reviewModal.notes')} htmlFor="review_notes" hint={t('leaveRequests.reviewModal.notesHint')}>
          <Textarea id="review_notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </FormField>
        <div className="flex gap-2">
          <Button variant="destructive" isLoading={mutation.isPending} onClick={() => mutation.mutate('rejected')}>
            {t('leaveRequests.reviewModal.reject')}
          </Button>
          <Button isLoading={mutation.isPending} onClick={() => mutation.mutate('approved')}>
            {t('leaveRequests.reviewModal.approve')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
