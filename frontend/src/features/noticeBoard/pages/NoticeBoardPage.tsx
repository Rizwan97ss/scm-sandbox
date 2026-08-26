import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarDays, MapPin, Megaphone, Plus, Trash2 } from 'lucide-react'
import { noticesApi } from '@/api/endpoints/noticeBoard'
import { queryKeys } from '@/api/queryKeys'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, Card, ConfirmDialog, EmptyState, FormField, Input, Modal, Select, Skeleton, Textarea } from '@/components/ui'
import { Pagination } from '@/components/ui/Pagination'
import { formatDate, formatDateTime } from '@/utils/formatDate'
import { AUDIENCES, getAudienceLabels, NOTICE_TYPES, getNoticeTypeLabels } from '@/types/noticeBoard'
import type { Notice, NoticePayload } from '@/types/noticeBoard'
import type { ApiError } from '@/api/client'
import '../i18n'

const EMPTY_FORM: NoticePayload = { title: '', body: '', type: 'general', audience: 'all' }

export function NoticeBoardPage() {
  const { t } = useFeatureTranslation('noticeBoard')
  const { can } = usePermission()
  const canManage = can('notice-board.create') || can('notice-board.edit')
  const { setPage, queryParams } = usePagination('-created_at')
  const listQuery = useQuery({ queryKey: queryKeys.notices(queryParams), queryFn: () => noticesApi.list(queryParams) })
  const queryClient = useQueryClient()

  const [modalOpen, setModalOpen] = useState(false)
  const [deleting, setDeleting] = useState<Notice | null>(null)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeys.notices().slice(0, 1) })
  }

  const publishMutation = useMutation({
    mutationFn: (id: number) => noticesApi.publish(id),
    onSuccess: () => {
      toast.success(t('list.publishedToast'))
      invalidate()
    },
    onError: (error) => toast.error((error as ApiError).message),
  })

  const removeMutation = useMutation({
    mutationFn: (id: number) => noticesApi.remove(id),
    onSuccess: () => {
      toast.success(t('list.deletedToast'))
      invalidate()
    },
    onError: (error) => toast.error((error as ApiError).message),
  })

  const notices = listQuery.data?.data ?? []

  return (
    <div>
      <PageHeader
        title={t('list.title')}
        description={t('list.description')}
        actions={
          can('notice-board.create') && (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" /> {t('list.newNotice')}
            </Button>
          )
        }
      />

      {listQuery.isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      )}

      {!listQuery.isLoading && notices.length === 0 && <EmptyState title={t('list.emptyTitle')} />}

      <div className="flex flex-col gap-3">
        {notices.map((notice) => (
          <Card key={notice.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="font-semibold">{notice.title}</h3>
                  <Badge variant={notice.type === 'event' ? 'info' : 'default'}>{notice.type_label}</Badge>
                  {canManage && !notice.is_published && <Badge variant="warning">{t('list.draft')}</Badge>}
                  <Badge variant="default">{notice.audience_label}</Badge>
                </div>
                <p className="whitespace-pre-line text-sm text-muted-foreground">{notice.body}</p>
                {notice.type === 'event' && notice.event_date && (
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" /> {formatDate(notice.event_date)}
                      {notice.start_time ? ` · ${notice.start_time}` : ''}
                    </span>
                    {notice.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" /> {notice.location}
                      </span>
                    )}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {notice.created_by?.full_name ?? t('list.postedBy')} · {formatDateTime(notice.created_at)}
                </p>
              </div>
              {canManage && (
                <div className="flex shrink-0 gap-2">
                  {!notice.is_published && can('notice-board.publish') && (
                    <Button
                      variant="outline"
                      size="sm"
                      isLoading={publishMutation.isPending && publishMutation.variables === notice.id}
                      onClick={() => publishMutation.mutate(notice.id)}
                    >
                      {t('list.publish')}
                    </Button>
                  )}
                  {can('notice-board.delete') && (
                    <Button variant="outline" size="sm" onClick={() => setDeleting(notice)} aria-label={t('list.deleteAriaLabel', { title: notice.title })}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {listQuery.data?.meta && (
        <div className="mt-4">
          <Pagination meta={listQuery.data.meta} onPageChange={setPage} />
        </div>
      )}

      {modalOpen && <CreateNoticeModal open={modalOpen} onOpenChange={setModalOpen} />}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('list.deleteConfirmTitle', { title: deleting?.title })}
        description={t('list.deleteConfirmDescription')}
        isLoading={removeMutation.isPending}
        onConfirm={async () => {
          if (deleting) await removeMutation.mutateAsync(deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}

function CreateNoticeModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useFeatureTranslation('noticeBoard')
  const queryClient = useQueryClient()
  const [form, setForm] = useState<NoticePayload>(EMPTY_FORM)

  const mutation = useMutation({
    mutationFn: () => noticesApi.create(form),
    onSuccess: () => {
      toast.success(t('createModal.successToast'))
      queryClient.invalidateQueries({ queryKey: queryKeys.notices().slice(0, 1) })
      setForm(EMPTY_FORM)
      onOpenChange(false)
    },
    onError: (error) => toast.error((error as ApiError).message),
  })

  const isEvent = form.type === 'event'

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t('createModal.title')}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormField label={t('fields.title')} htmlFor="title" required>
          <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </FormField>
        <FormField label={t('fields.body')} htmlFor="body" required>
          <Textarea id="body" rows={4} required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label={t('fields.type')} htmlFor="type" required>
            <Select
              id="type"
              value={form.type}
              onValueChange={(value) => setForm({ ...form, type: value as NoticePayload['type'] })}
              options={NOTICE_TYPES.map((type) => ({ value: type, label: getNoticeTypeLabels(t)[type] }))}
            />
          </FormField>
          <FormField label={t('fields.audience')} htmlFor="audience" required>
            <Select
              id="audience"
              value={form.audience}
              onValueChange={(value) => setForm({ ...form, audience: value as NoticePayload['audience'] })}
              options={AUDIENCES.map((a) => ({ value: a, label: getAudienceLabels(t)[a] }))}
            />
          </FormField>
        </div>
        {isEvent && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label={t('fields.eventDate')} htmlFor="event_date" required>
              <Input id="event_date" type="date" required={isEvent} value={form.event_date ?? ''} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
            </FormField>
            <FormField label={t('fields.startTime')} htmlFor="start_time" hint={t('fields.optional')}>
              <Input id="start_time" type="time" value={form.start_time ?? ''} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
            </FormField>
            <FormField label={t('fields.location')} htmlFor="location" hint={t('fields.optional')}>
              <Input id="location" value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </FormField>
          </div>
        )}
        <Button type="submit" isLoading={mutation.isPending} className="mt-2">
          <Megaphone className="h-4 w-4" /> {t('createModal.submit')}
        </Button>
      </form>
    </Modal>
  )
}
