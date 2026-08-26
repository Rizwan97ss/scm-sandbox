import type { TFunction } from 'i18next'

export interface Book {
  id: number
  title: string
  author: string | null
  isbn: string | null
  category: string | null
  total_copies: number
  available_copies: number
  is_active: boolean
  created_at: string
}

export interface BookPayload {
  title: string
  author?: string | null
  isbn?: string | null
  category?: string | null
  total_copies: number
  is_active?: boolean
}

export const BOOK_ISSUE_STATUSES = ['issued', 'returned', 'overdue'] as const
export type BookIssueStatus = (typeof BOOK_ISSUE_STATUSES)[number]
export const getBookIssueStatusLabels = (t: TFunction): Record<BookIssueStatus, string> => ({
  issued: t('common:enums.bookIssueStatus.issued'),
  returned: t('common:enums.bookIssueStatus.returned'),
  overdue: t('common:enums.bookIssueStatus.overdue'),
})

export interface BookIssue {
  id: number
  book?: { id: number; title: string }
  student?: { id: number; full_name: string } | null
  user?: { id: number; full_name: string } | null
  borrower_name: string
  issue_date: string
  due_date: string
  return_date: string | null
  fine_amount: number
  status: BookIssueStatus
  status_label: string
  created_at: string
}

export interface IssueBookPayload {
  student_id?: number | null
  user_id?: number | null
  due_date: string
}
