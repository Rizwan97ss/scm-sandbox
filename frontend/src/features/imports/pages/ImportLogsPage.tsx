import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { importLogsApi } from '@/api/endpoints/importLogs'
import { queryKeys } from '@/api/queryKeys'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, ConfirmDialog, DataTable, type DataTableColumn } from '@/components/ui'
import { formatApiError, type ApiError } from '@/api/client'
import { formatDateTime } from '@/utils/formatDate'
import type { ImportLog, ImportUndoResult } from '@/types/import'
import '../i18n'

export function ImportLogsPage() {
  const { setPage, queryParams } = usePagination('-created_at')
  const { can } = usePermission()
  const { t } = useFeatureTranslation('imports')
  const queryClient = useQueryClient()
  const [undoTarget, setUndoTarget] = useState<ImportLog | null>(null)

  const { data, isLoading, isError, refetch } = useQuery({ queryKey: queryKeys.importLogs(queryParams), queryFn: () => importLogsApi.list(queryParams) })

  const undoMutation = useMutation({
    mutationFn: (id: number) => importLogsApi.undo(id),
    onSuccess: (result: ImportUndoResult) => {
      setUndoTarget(null)
      queryClient.invalidateQueries({ queryKey: ['import-logs'] })
      if (result.blocked.length > 0) {
        const blockedList = result.blocked.map((b) => t('logs.undoBlockedItem', { type: b.type, label: b.label })).join(', ')
        toast.warning(t('logs.undoWarning', { deleted: result.deleted, blockedCount: result.blocked.length, blockedList }))
      } else {
        toast.success(t('logs.undoSuccess', { count: result.deleted }))
      }
    },
    onError: (error) => {
      setUndoTarget(null)
      toast.error(formatApiError(error as ApiError))
    },
  })

  const columns: DataTableColumn<ImportLog>[] = [
    { key: 'created_at', header: t('logs.columnWhen'), render: (row) => formatDateTime(row.created_at) },
    { key: 'entity', header: t('logs.columnEntity'), render: (row) => <Badge variant="default">{row.entity}</Badge> },
    { key: 'performed_by', header: t('logs.columnBy'), render: (row) => row.performed_by?.full_name ?? t('logs.unknownPerformer') },
    { key: 'file_name', header: t('logs.columnFile'), render: (row) => row.file_name },
    { key: 'mode', header: t('logs.columnMode'), render: (row) => row.mode },
    {
      key: 'result',
      header: t('logs.columnResult'),
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.dry_run && <Badge variant="outline">{t('logs.previewOnly')}</Badge>}
          {row.created_count > 0 && <Badge variant="success">{t('logs.createdCount', { count: row.created_count })}</Badge>}
          {row.updated_count > 0 && <Badge variant="info">{t('logs.updatedCount', { count: row.updated_count })}</Badge>}
          {row.failed_count > 0 && <Badge variant="destructive">{t('logs.failedCount', { count: row.failed_count })}</Badge>}
          {row.undone_at && <Badge variant="outline">{t('logs.undoneAt', { date: formatDateTime(row.undone_at) })}</Badge>}
        </div>
      ),
    },
    {
      key: 'actions',
      header: t('logs.columnActions'),
      render: (row) =>
        row.can_undo && can('audit-logs.manage') ? (
          <Button variant="outline" size="sm" onClick={() => setUndoTarget(row)}>
            {t('logs.undo')}
          </Button>
        ) : null,
    },
  ]

  return (
    <div>
      <PageHeader title={t('logs.title')} description={t('logs.description')} />
      <DataTable
        columns={columns}
        data={data?.data}
        rowKey={(row) => row.id}
        isLoading={isLoading} isError={isError} onRetry={refetch}
        meta={data?.meta}
        onPageChange={setPage}
        emptyTitle={t('logs.emptyTitle')}
        emptyDescription={t('logs.emptyDescription')}
      />

      <ConfirmDialog
        open={undoTarget !== null}
        onOpenChange={(open) => !open && setUndoTarget(null)}
        title={t('logs.undoDialogTitle', { entity: undoTarget?.entity })}
        description={t('logs.undoDialogDescription', { count: undoTarget?.created_count, fileName: undoTarget?.file_name })}
        confirmLabel={t('logs.undoConfirmLabel')}
        isLoading={undoMutation.isPending}
        onConfirm={() => undoTarget && undoMutation.mutate(undoTarget.id)}
      />
    </div>
  )
}
