import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Download, IdCard, Plus, Upload } from 'lucide-react'
import { usersApi } from '@/api/endpoints/users'
import { idCardsApi } from '@/api/endpoints/certificates'
import { rolesApi } from '@/api/endpoints/roles'
import { queryKeys } from '@/api/queryKeys'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useDebounce } from '@/hooks/useDebounce'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, DataTable, LinkButton, SearchInput, type DataTableColumn } from '@/components/ui'
import { getUserStatusLabels } from '@/types/enums'
import type { User } from '@/types/auth'
import { routePaths } from '@/routes/routePaths'
import { downloadFile } from '@/utils/download'
import { UserFormModal } from '../components/UserFormModal'
import { UserStatusMenu } from '../components/UserStatusMenu'
import '../i18n'

export function UsersListPage() {
  const { t } = useFeatureTranslation('users')
  const { can } = usePermission()
  const { sort, search, setPage, setSort, setSearch, queryParams } = usePagination('first_name', 'first_name')
  const debouncedSearch = useDebounce(search)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.users({ ...queryParams, 'filter[first_name]': debouncedSearch }),
    queryFn: () => usersApi.list({ ...queryParams, 'filter[first_name]': debouncedSearch || undefined }),
  })
  const { data: roles } = useQuery({ queryKey: queryKeys.roles(), queryFn: rolesApi.list })

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)

  const columns: DataTableColumn<User>[] = [
    { key: 'name', header: t('fields.name'), sortable: true, render: (row) => <span className="font-medium">{row.full_name}</span> },
    { key: 'email', header: t('fields.email'), render: (row) => row.email },
    { key: 'roles', header: t('list.columnRoles'), render: (row) => <div className="flex flex-wrap gap-1">{row.roles.map((role) => <Badge key={role} variant="primary">{role}</Badge>)}</div> },
    {
      key: 'status',
      header: t('fields.status'),
      render: (row) => (
        <Badge variant={row.status === 'active' ? 'success' : row.status === 'suspended' ? 'destructive' : 'default'}>
          {getUserStatusLabels(t)[row.status]}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <a
            href={idCardsApi.staffPdfUrl(row.id)}
            target="_blank"
            rel="noopener"
            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
            aria-label={t('list.downloadIdCardAriaLabel', { name: row.full_name })}
          >
            <IdCard className="h-3.5 w-3.5" />
          </a>
          {can('users.edit') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditing(row)
                setModalOpen(true)
              }}
            >
              {t('fields.edit')}
            </Button>
          )}
          {can('users.edit') && <UserStatusMenu user={row} />}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('list.title')}
        description={t('list.description')}
        actions={
          <>
            {can('users.export') && (
              <Button variant="outline" onClick={() => downloadFile(usersApi.exportUrl, 'staff.xlsx')}>
                <Download className="h-4 w-4" /> {t('list.export')}
              </Button>
            )}
            {can('users.import') && (
              <LinkButton to={routePaths.userImport} variant="outline">
                <Upload className="h-4 w-4" /> {t('list.import')}
              </LinkButton>
            )}
            {can('users.create') && (
              <Button
                onClick={() => {
                  setEditing(null)
                  setModalOpen(true)
                }}
              >
                <Plus className="h-4 w-4" /> {t('list.newUser')}
              </Button>
            )}
          </>
        }
      />

      <div className="mb-4 max-w-sm">
        <SearchInput placeholder={t('list.searchPlaceholder')} value={search} onChange={setSearch} />
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
        emptyTitle={debouncedSearch ? t('list.emptyTitleSearch', { query: debouncedSearch }) : t('list.emptyTitle')}
        emptyDescription={debouncedSearch ? t('list.emptyDescriptionSearch') : undefined}
      />

      <UserFormModal open={modalOpen} onOpenChange={setModalOpen} editing={editing} roles={roles ?? []} />
    </div>
  )
}
