import type { TFunction } from 'i18next'

export interface FeeCategory {
  id: number
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface FeeCategoryPayload {
  name: string
  description?: string | null
  is_active?: boolean
}

export const FEE_FREQUENCIES = ['one_time', 'monthly', 'quarterly', 'term', 'annual'] as const
export type FeeFrequency = (typeof FEE_FREQUENCIES)[number]
export const getFeeFrequencyLabels = (t: TFunction): Record<FeeFrequency, string> => ({
  one_time: t('common:enums.feeFrequency.one_time'),
  monthly: t('common:enums.feeFrequency.monthly'),
  quarterly: t('common:enums.feeFrequency.quarterly'),
  term: t('common:enums.feeFrequency.term'),
  annual: t('common:enums.feeFrequency.annual'),
})

export interface FeeStructure {
  id: number
  academic_year_id: number
  grade_level: { id: number; name: string } | null
  fee_category: { id: number; name: string }
  name: string
  amount: number
  frequency: FeeFrequency
  frequency_label: string
  due_day_of_month: number | null
  is_active: boolean
  created_at: string
}

export interface FeeStructurePayload {
  academic_year_id: number
  grade_level_id?: number | null
  fee_category_id: number
  name: string
  amount: number
  frequency: FeeFrequency
  due_day_of_month?: number | null
  is_active?: boolean
}

export const DISCOUNT_TYPES = ['none', 'percentage', 'fixed'] as const
export type DiscountType = (typeof DISCOUNT_TYPES)[number]
export const getDiscountTypeLabels = (t: TFunction): Record<DiscountType, string> => ({
  none: t('common:enums.discountType.none'),
  percentage: t('common:enums.discountType.percentage'),
  fixed: t('common:enums.discountType.fixed'),
})

export interface StudentFeeAssignment {
  id: number
  student: { id: number; full_name: string }
  fee_structure: { id: number; name: string; amount: number }
  discount_type: DiscountType
  discount_value: number
  reason: string | null
  effective_amount: number | null
  created_at: string
}

export interface StudentFeeAssignmentPayload {
  student_id: number
  fee_structure_id: number
  discount_type: DiscountType
  discount_value?: number | null
  reason?: string | null
}

export const INVOICE_STATUSES = ['draft', 'issued', 'partially_paid', 'paid', 'void'] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]
export const getInvoiceStatusLabels = (t: TFunction): Record<InvoiceStatus, string> => ({
  draft: t('common:enums.invoiceStatus.draft'),
  issued: t('common:enums.invoiceStatus.issued'),
  partially_paid: t('common:enums.invoiceStatus.partially_paid'),
  paid: t('common:enums.invoiceStatus.paid'),
  void: t('common:enums.invoiceStatus.void'),
})

export const PAYMENT_METHODS = ['cash', 'cheque', 'bank_transfer', 'upi', 'card', 'other'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export const getPaymentMethodLabels = (t: TFunction): Record<PaymentMethod, string> => ({
  cash: t('common:enums.paymentMethod.cash'),
  cheque: t('common:enums.paymentMethod.cheque'),
  bank_transfer: t('common:enums.paymentMethod.bank_transfer'),
  upi: t('common:enums.paymentMethod.upi'),
  card: t('common:enums.paymentMethod.card'),
  other: t('common:enums.paymentMethod.other'),
})

export interface InvoiceItem {
  id: number
  fee_category: { id: number; name: string } | null
  fee_structure_id: number | null
  description: string
  quantity: number
  unit_amount: number
  amount: number
}

export interface Payment {
  id: number
  invoice_id: number
  student?: { id: number; full_name: string }
  payment_number: string
  amount: number
  method: PaymentMethod
  method_label: string
  gateway: string
  reference_number: string | null
  paid_at: string
  notes: string | null
  received_by?: { id: number; full_name: string }
  created_at: string
}

export interface CreditNote {
  id: number
  invoice_id: number
  credit_note_number: string
  amount: number
  reason: string
  issued_by?: { id: number; full_name: string }
  issued_at: string
  created_at: string
}

export interface Invoice {
  id: number
  student?: { id: number; full_name: string; admission_number: string }
  academic_year_id: number
  invoice_number: string
  issue_date: string
  due_date: string
  status: InvoiceStatus
  status_label: string
  is_overdue: boolean
  subtotal: number
  discount_total: number
  total: number
  amount_paid: number
  credit_total: number
  balance: number
  notes: string | null
  items: InvoiceItem[]
  payments: Payment[]
  credit_notes: CreditNote[]
  created_by?: { id: number; full_name: string }
  created_at: string
}

export interface InvoiceItemInput {
  fee_category_id: number
  fee_structure_id?: number | null
  description: string
  quantity?: number
  unit_amount: number
}

export interface InvoicePayload {
  student_id: number
  academic_year_id: number
  issue_date: string
  due_date: string
  notes?: string | null
  items: InvoiceItemInput[]
}

export interface RecordPaymentPayload {
  amount: number
  method: PaymentMethod
  reference_number?: string | null
  paid_at: string
  notes?: string | null
}

export interface IssueCreditNotePayload {
  amount: number
  reason: string
}

export interface GenerateInvoicesPayload {
  section_id?: number | null
  issue_date: string
  due_date: string
}

export interface GenerateInvoicesResult {
  created_count: number
  skipped_count: number
}

export interface FeeStatement {
  invoices: Invoice[]
  summary: {
    total_billed: number
    total_paid: number
    total_credited: number
    total_outstanding: number
  }
}

export interface CollectionSummary {
  from_date: string
  to_date: string
  total_collected: number
  payment_count: number
  by_method: Record<string, number>
  by_category: Record<string, number>
}

export interface OutstandingDues {
  total_outstanding: number
  overdue_count: number
  invoice_count: number
  by_grade_level: Record<string, number>
}
