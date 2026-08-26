import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Send, Trash2 } from 'lucide-react'
import { booksApi } from '@/api/endpoints/library'
import { studentsApi } from '@/api/endpoints/students'
import { usersApi } from '@/api/endpoints/users'
import { queryKeys } from '@/api/queryKeys'
import { useCrudResource } from '@/hooks/useCrudResource'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import { useDebounce } from '@/hooks/useDebounce'
import { useFeatureTranslation } from '@/hooks/useFeatureTranslation'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, Button, Checkbox, ConfirmDialog, DataTable, FormField, Input, Modal, SearchInput, Select, type DataTableColumn } from '@/components/ui'
import type { Book, BookPayload } from '@/types/library'
import type { ApiError } from '@/api/client'
import '../i18n'

const EMPTY_FORM: BookPayload = { title: '', author: '', isbn: '', category: '', total_copies: 1, is_active: true }

export function BooksPage() {
  const { t } = useFeatureTranslation('library')
  const { can } = usePermission()
  const canManage = can('library.manage')
  const { sort, search, setPage, setSort, setSearch, queryParams } = usePagination('title', 'title')
  const debouncedSearch = useDebounce(search)
  const { listQuery, createMutation, updateMutation, removeMutation } = useCrudResource(
    booksApi,
    queryKeys.books,
    { ...queryParams, 'filter[title]': debouncedSearch || undefined },
    'Book'
  )

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Book | null>(null)
  const [form, setForm] = useState<BookPayload>(EMPTY_FORM)
  const [deleting, setDeleting] = useState<Book | null>(null)
  const [issuing, setIssuing] = useState<Book | null>(null)

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  function openEdit(book: Book) {
    setEditing(book)
    setForm({ title: book.title, author: book.author ?? '', isbn: book.isbn ?? '', category: book.category ?? '', total_copies: book.total_copies, is_active: book.is_active })
    setModalOpen(true)
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (editing) await updateMutation.mutateAsync({ id: editing.id, payload: form })
    else await createMutation.mutateAsync(form)
    setModalOpen(false)
  }

  const columns: DataTableColumn<Book>[] = [
    { key: 'title', header: t('fields.title'), sortable: true, render: (row) => <span className="font-medium">{row.title}</span> },
    { key: 'author', header: t('fields.author'), render: (row) => row.author ?? '—' },
    { key: 'category', header: t('fields.category'), render: (row) => row.category ?? '—' },
    { key: 'copies', header: t('books.columnAvailableTotal'), align: 'right', render: (row) => `${row.available_copies} / ${row.total_copies}` },
    { key: 'status', header: t('fields.status'), render: (row) => <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? t('fields.active') : t('fields.inactive')}</Badge> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          {canManage && row.available_copies > 0 && (
            <Button variant="outline" size="sm" onClick={() => setIssuing(row)}>
              <Send className="h-3.5 w-3.5" /> {t('books.issue')}
            </Button>
          )}
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
              {t('books.edit')}
            </Button>
          )}
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setDeleting(row)} aria-label={t('books.deleteAriaLabel', { title: row.title })}>
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
        title={t('books.title')}
        description={t('books.description')}
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" /> {t('books.newBook')}
            </Button>
          )
        }
      />

      <div className="mb-4 max-w-sm">
        <SearchInput placeholder={t('books.searchPlaceholder')} value={search} onChange={setSearch} />
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
        emptyTitle={debouncedSearch ? t('books.emptyTitleSearch', { query: debouncedSearch }) : t('books.emptyTitle')}
        emptyDescription={debouncedSearch ? t('books.emptyDescription') : undefined}
      />

      <Modal open={modalOpen} onOpenChange={setModalOpen} title={editing ? t('books.editModalTitle') : t('books.newModalTitle')}>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <FormField label={t('fields.title')} htmlFor="title" required>
            <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('fields.author')} htmlFor="author">
              <Input id="author" value={form.author ?? ''} onChange={(e) => setForm({ ...form, author: e.target.value })} />
            </FormField>
            <FormField label={t('fields.category')} htmlFor="category">
              <Input id="category" value={form.category ?? ''} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label={t('books.isbn')} htmlFor="isbn">
              <Input id="isbn" value={form.isbn ?? ''} onChange={(e) => setForm({ ...form, isbn: e.target.value })} />
            </FormField>
            <FormField label={t('books.totalCopies')} htmlFor="total_copies" required>
              <Input
                id="total_copies"
                type="number"
                min={1}
                required
                value={form.total_copies}
                onChange={(e) => setForm({ ...form, total_copies: Number(e.target.value) })}
              />
            </FormField>
          </div>
          <FormField label={t('fields.active')} htmlFor="is_active">
            <Checkbox id="is_active" checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
          </FormField>
          <Button type="submit" isLoading={createMutation.isPending || updateMutation.isPending} className="mt-2">
            {editing ? t('books.saveChanges') : t('books.createBook')}
          </Button>
        </form>
      </Modal>

      {issuing && <IssueBookModal book={issuing} open={!!issuing} onOpenChange={(open) => !open && setIssuing(null)} />}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t('books.deleteConfirmTitle', { title: deleting?.title })}
        description={t('books.deleteConfirmDescription')}
        isLoading={removeMutation.isPending}
        onConfirm={async () => {
          if (deleting) await removeMutation.mutateAsync(deleting.id)
          setDeleting(null)
        }}
      />
    </div>
  )
}

function IssueBookModal({ book, open, onOpenChange }: { book: Book; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useFeatureTranslation('library')
  const queryClient = useQueryClient()
  const [borrowerType, setBorrowerType] = useState<'student' | 'user'>('student')
  const [borrowerId, setBorrowerId] = useState<number | undefined>()
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().slice(0, 10)
  })

  const { data: students } = useQuery({ queryKey: queryKeys.students({ per_page: 100 }), queryFn: () => studentsApi.list({ per_page: 100 }), enabled: borrowerType === 'student' })
  const { data: users } = useQuery({ queryKey: queryKeys.users({ per_page: 100 }), queryFn: () => usersApi.list({ per_page: 100 }), enabled: borrowerType === 'user' })

  const mutation = useMutation({
    mutationFn: () =>
      booksApi.issue(book.id, {
        student_id: borrowerType === 'student' ? borrowerId : null,
        user_id: borrowerType === 'user' ? borrowerId : null,
        due_date: dueDate,
      }),
    onSuccess: () => {
      toast.success(t('books.issueModal.successToast'))
      queryClient.invalidateQueries({ queryKey: queryKeys.books().slice(0, 1) })
      queryClient.invalidateQueries({ queryKey: queryKeys.bookIssues().slice(0, 1) })
      onOpenChange(false)
    },
    onError: (error) => toast.error((error as ApiError).message),
  })

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={t('books.issueModal.title', { title: book.title })}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          mutation.mutate()
        }}
        className="flex flex-col gap-4"
        noValidate
      >
        <FormField label={t('books.issueModal.borrowerType')} htmlFor="borrower_type" required>
          <Select
            id="borrower_type"
            value={borrowerType}
            onValueChange={(value) => {
              setBorrowerType(value as 'student' | 'user')
              setBorrowerId(undefined)
            }}
            options={[
              { value: 'student', label: t('fields.student') },
              { value: 'user', label: t('fields.staffMember') },
            ]}
          />
        </FormField>
        <FormField label={borrowerType === 'student' ? t('fields.student') : t('fields.staffMember')} htmlFor="borrower_id" required>
          <Select
            id="borrower_id"
            value={borrowerId ? String(borrowerId) : undefined}
            onValueChange={(value) => setBorrowerId(Number(value))}
            placeholder={borrowerType === 'student' ? t('books.issueModal.selectStudentPlaceholder') : t('books.issueModal.selectStaffPlaceholder')}
            options={
              borrowerType === 'student'
                ? (students?.data ?? []).map((s) => ({ value: String(s.id), label: `${s.full_name} (${s.admission_number})` }))
                : (users?.data ?? []).map((u) => ({ value: String(u.id), label: u.full_name }))
            }
          />
        </FormField>
        <FormField label={t('fields.dueDate')} htmlFor="due_date" required>
          <Input id="due_date" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </FormField>
        <Button type="submit" isLoading={mutation.isPending} disabled={!borrowerId} className="mt-2">
          {t('books.issueModal.submit')}
        </Button>
      </form>
    </Modal>
  )
}
