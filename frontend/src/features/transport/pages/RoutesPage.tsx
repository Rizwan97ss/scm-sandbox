import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ListPlus, Plus, Trash2 } from 'lucide-react'
import { routesApi } from '@/api/endpoints/transport'
import { queryKeys } from '@/api/queryKeys'
import { useCrudResource } from '@/hooks/useCrudResource'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useDebounce } from '@/hooks/useDebounce'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, ConfirmDialog, DataTable, FormField, Input, Modal, SearchInput, type DataTableColumn } from '@/components/ui'
import type { RoutePayload, RouteStopPayload, TransportRoute } from '@/types/transport'
import type { ApiError } from '@/api/client'
import '../i18n'

const EMPTY_STOP: RouteStopPayload = { name: '' }
const EMPTY_FORM: RoutePayload = { name: '', description: '', is_active: true, stops: [{ ...EMPTY_STOP }] }

export function RoutesPage() {
  const { t } = useFeatureTranslation('transport')
  const { can } = usePermission()
  const canManage = can('transport.manage')
  const { sort, search, setPage, setSort, setSearch, queryParams } = usePagination('name', 'name')
  const debouncedSearch = useDebounce(search)
  const { listQuery, createMutation, removeMutation } = useCrudResource(
    routesApi,
    queryKeys.routes,
    { ...queryParams, 'filter[name]': debouncedSearch || undefined },
    'Route'
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<RoutePayload>(EMPTY_FORM)
  const [deleting, setDeleting] = useState<TransportRoute | null>(null)
  const [managingStops, setManagingStops] = useState<TransportRoute | null>(null)

  function openCreate() {
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    await createMutation.mutateAsync(form)
    setModalOpen(false)
  }

  const columns: DataTableColumn<TransportRoute>[] = [
    { key: 'name', header: t('fields.name'), sortable: true, render: (row) => <span className="font-medium">{row.name}</span> },
    { key: 'description', header: t('fields.description'), render: (row) => row.description ?? '—' },
    { key: 'stops', header: t('routes.columnStops'), align: 'right', render: (row) => row.stops?.length ?? 0 },
    { key: 'status', header: t('fields.status'), render: (row) => <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? t('fields.active') : t('fields.inactive')}</Badge> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setManagingStops(row)}>
              <ListPlus className="h-3.5 w-3.5" /> {t('routes.stopsHeading')}
            </Button>
          )}
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setDeleting(row)} aria-label={t('routes.deleteAriaLabel', { name: row.name })}>
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
        title={t('routes.title')}
        description={t('routes.description')}
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t('routes.newRoute')}
            </Button>
          )
        }
      />

      <div className="mb-4 max-w-sm">
        <SearchInput placeholder={t('routes.searchPlaceholder')} value={search} onChange={setSearch} />
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
        emptyTitle={debouncedSearch ? t('routes.emptyTitleSearch', { query: debouncedSearch }) : t('routes.emptyTitle')}
        emptyDescription={debouncedSearch ? t('routes.emptyDescriptionSearch') : undefined}
      />

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={t('routes.newRoute')} size="lg">
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label={t('fields.name')} htmlFor="name" required>
            <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label={t('fields.description')} htmlFor="description">
            <Input id="description" value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </FormField>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">{t('routes.stopsHeading')}</h3>
              <Button type="button" variant="outline" size="sm" onClick={() => setForm((prev) => ({ ...prev, stops: [...(prev.stops ?? []), { ...EMPTY_STOP }] }))}>
                <Plus className="h-3.5 w-3.5" /> {t('routes.addStop')}
              </Button>
            </div>
            {(form.stops ?? []).map((stop, index) => (
              <div key={index} className="flex items-end gap-2">
                <FormField label={t('routes.stopNameLabel')} htmlFor={`stop-${index}-name`} className="flex-1">
                  <Input
                    id={`stop-${index}-name`}
                    required
                    value={stop.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, stops: (prev.stops ?? []).map((s, i) => (i === index ? { ...s, name: e.target.value } : s)) }))}
                  />
                </FormField>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setForm((prev) => ({ ...prev, stops: (prev.stops ?? []).filter((_, i) => i !== index) }))}
                  disabled={(form.stops ?? []).length <= 1}
                  aria-label={t('routes.removeStopAriaLabel')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          <Button type="submit" isLoading={createMutation.isPending} className="mt-2">
            {t('routes.createRoute')}
          </Button>
        </form>
      </Modal>

      {managingStops && <ManageStopsModal route={managingStops} open={!!managingStops} onOpenChange={(open) => !open && setManagingStops(null)} />}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('routes.deleteConfirmTitle', { name: deleting?.name })}
        description={t('fields.cannotBeUndone')}
        isLoading={removeMutation.isPending}
        onConfirm={async () => {
          if (deleting) await removeMutation.mutateAsync(deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}

function ManageStopsModal({ route, open, onOpenChange }: { route: TransportRoute; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useFeatureTranslation('transport')
  const queryClient = useQueryClient()
  const [newStopName, setNewStopName] = useState('')
  const [pendingRemoval, setPendingRemoval] = useState<{ id: number; name: string } | null>(null)

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: queryKeys.routes().slice(0, 1) })
  }

  const addMutation = useMutation({
    mutationFn: () => routesApi.addStop(route.id, { name: newStopName }),
    onSuccess: () => {
      toast.success(t('routes.stopAdded'))
      setNewStopName('')
      invalidate()
    },
    onError: (error) => toast.error((error as ApiError).message),
  })

  const removeMutation = useMutation({
    mutationFn: (stopId: number) => routesApi.removeStop(route.id, stopId),
    onSuccess: () => {
      toast.success(t('routes.stopRemoved'))
      setPendingRemoval(null)
      invalidate()
    },
    onError: (error) => toast.error((error as ApiError).message),
  })

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t('routes.manageStopsTitle', { name: route.name })}>
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {route.stops.map((stop) => (
            <li key={stop.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
              <span>
                {stop.sequence}. {stop.name}
              </span>
              <Button
                variant="outline"
                size="icon"
                isLoading={removeMutation.isPending && removeMutation.variables === stop.id}
                onClick={() => setPendingRemoval({ id: stop.id, name: stop.name })}
                aria-label={t('routes.removeAriaLabel', { name: stop.name })}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
          {route.stops.length === 0 && <p className="text-sm text-muted-foreground">{t('routes.noStopsYet')}</p>}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addMutation.mutate()
          }}
          className="flex items-end gap-2"
          noValidate
        >
          <FormField label={t('routes.newStopLabel')} htmlFor="new_stop_name" required className="flex-1">
            <Input id="new_stop_name" required value={newStopName} onChange={(e) => setNewStopName(e.target.value)} />
          </FormField>
          <Button type="submit" isLoading={addMutation.isPending}>
            {t('routes.add')}
          </Button>
        </form>
      </div>

      <ConfirmDialog
        open={pendingRemoval !== null}
        onOpenChange={(nextOpen) => !nextOpen && setPendingRemoval(null)}
        title={t('routes.removeStopConfirmTitle')}
        description={pendingRemoval ? t('routes.removeStopConfirmDescription', { name: pendingRemoval.name }) : undefined}
        confirmLabel={t('routes.removeStopConfirmLabel')}
        isLoading={removeMutation.isPending}
        onConfirm={() => pendingRemoval && removeMutation.mutate(pendingRemoval.id)}
      />
    </Modal>
  )
}
