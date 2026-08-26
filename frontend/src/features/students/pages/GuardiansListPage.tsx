import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Send, Upload } from 'lucide-react'
import { guardiansApi } from '@/api/endpoints/guardians'
import { queryKeys } from '@/api/queryKeys'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useDebounce } from '@/hooks/useDebounce'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, DataTable, LinkButton, SearchInput, type DataTableColumn } from '@/components/ui'
import type { Guardian } from '@/types/student'
import type { ApiError } from '@/api/client'
import { routePaths } from '@/routes/routePaths'
import '../i18n'

export function GuardiansListPage() {
  const { t } = useFeatureTranslation('students')
  const { can } = usePermission()
  const queryClient = useQueryClient()
  const { sort, search, setPage, setSort, setSearch, queryParams } = usePagination('first_name', 'first_name')
  const debouncedSearch = useDebounce(search)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.guardians({ ...queryParams, 'filter[first_name]': debouncedSearch }),
    queryFn: () => guardiansApi.list({ ...queryParams, 'filter[first_name]': debouncedSearch || undefined }),
  })

  const inviteMutation = useMutation({
    mutationFn: guardiansApi.invite,
    onSuccess: () => {
      toast.success(t('guardiansList.inviteSent'))
      queryClient.invalidateQueries({ queryKey: queryKeys.guardians().slice(0, 1) })
    },
    onError: (error) => toast.error((error as ApiError).message),
  })

  const columns: DataTableColumn<Guardian>[] = [
    { key: 'name', header: t('guardiansList.columnName'), sortable: true, render: (row) => <span className="font-medium">{row.full_name}</span> },
    { key: 'phone', header: t('guardiansList.columnPhone'), render: (row) => row.phone },
    { key: 'email', header: t('guardiansList.columnEmail'), render: (row) => row.email ?? '—' },
    { key: 'students', header: t('guardiansList.columnChildren'), render: (row) => row.students?.map((s) => s.full_name).join(', ') || '—' },
    {
      key: 'portal',
      header: t('guardiansList.columnPortalAccess'),
      render: (row) => (row.has_portal_access ? <Badge variant="success">{t('guardiansList.active')}</Badge> : <Badge variant="default">{t('guardiansList.notInvited')}</Badge>),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) =>
        can('guardians.edit') &&
        !row.has_portal_access &&
        row.email && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => inviteMutation.mutate(row.id)}
            isLoading={inviteMutation.isPending && inviteMutation.variables === row.id}
          >
            <Send className="h-3.5 w-3.5" /> {t('guardiansList.invite')}
          </Button>
        ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('guardiansList.title')}
        description={t('guardiansList.description')}
        actions={
          can('guardians.import') && (
            <LinkButton to={routePaths.guardianImport} variant="outline">
              <Upload className="h-4 w-4" /> {t('guardiansList.import')}
            </LinkButton>
          )
        }
      />

      <div className="mb-4 max-w-sm">
        <SearchInput placeholder={t('guardiansList.searchPlaceholder')} value={search} onChange={setSearch} />
      </div>

      <DataTable
        columns={columns}
        data={data?.data}
        rowKey={(row) => row.id}
        isLoading={isLoading} isError={isError} onRetry={refetch}
        meta={data?.meta}
        onPageChange={setPage}
        sort={sort}
        onSortChange={setSort}
        emptyTitle={debouncedSearch ? t('guardiansList.emptyTitleSearch', { query: debouncedSearch }) : t('guardiansList.emptyTitle')}
        emptyDescription={debouncedSearch ? t('guardiansList.emptyDescriptionSearch') : undefined}
      />
    </div>
  )
}
