// TypeScript shapes for every JSON payload the Flask API returns.
// They mirror app.py / excel_db.py / budget_db.py in the payment-tracker repo.

export type PaymentStatus = 'Paid' | 'Unpaid'
export type Frequency = 'Weekly' | 'Bi-weekly' | 'Monthly' | 'Quarterly' | 'Yearly'
export type AmountMode = 'total' | 'per_payment'

export const FREQUENCIES: Frequency[] = ['Weekly', 'Bi-weekly', 'Monthly', 'Quarterly', 'Yearly']

export interface Account {
  title: string
  total_amount: number
  start_date: string
  due_date: string
  frequency: string
  instalments: number
  payment_amount: number
  notes: string
}

export interface Payment {
  id: string
  title: string
  amount: number
  date: string
  time: string
  status: PaymentStatus
  due_date: string
  note: string
}

export interface Summary {
  title: string
  account: Account | null
  total_amount: number
  total_paid: number
  total_unpaid: number
  remaining: number
  progress: number
  payment_count: number
  paid_count: number
  unpaid_count: number
  next_due_date: string
  days_until_due: number | null
  overdue: boolean
  last_payment: Payment | null
  has_plan: boolean
  frequency: string
  instalments: number
  per_payment: number
  payments_left: number
  projected_payoff_date: string
  payments: Payment[]
}

export interface SchedulePayload {
  amount: string | number
  instalments: string | number
  frequency: string
  start_date: string
  amount_mode: AmountMode
}

export interface NewAccountPayload extends SchedulePayload {
  title: string
  notes: string
}

export interface SchedulePreview {
  frequency: string
  amount_mode: AmountMode
  instalments: number
  amounts: number[]
  per_payment: number
  final_payment: number
  total: number
  dates: string[]
  first_due: string
  final_due: string
}

export interface NewPaymentPayload {
  title: string
  amount: string | number
  date: string
  time: string
  status: PaymentStatus
  due_date: string
  note: string
}

export interface ServerNow {
  date: string
  time: string
}

export interface HomeStats {
  workbook: string
  payments: {
    accounts: number
    total: number
    paid_count: number
    payment_count: number
    next_due: string | null
  }
  budget: {
    year: number
    revenue: number
    expenses: number
    net: number
    line_count: number
  }
}

// ---- budget ---------------------------------------------------------------

export type BudgetSectionName = 'Revenue' | 'Expense'

export interface BudgetLine {
  id: string
  year: number
  section: BudgetSectionName
  group: string
  item: string
  amounts: number[]
  total: number
  notes: string
}

export interface BudgetGroup {
  name: string
  lines: BudgetLine[]
  monthly: number[]
  total: number
}

export interface BudgetSection {
  name: BudgetSectionName
  label: string
  groups: BudgetGroup[]
  monthly: number[]
  total: number
}

export interface Budget {
  year: number
  months: string[]
  sections: BudgetSection[]
  known_groups: Record<BudgetSectionName, string[]>
  total_revenue: number
  total_expenses: number
  net: number
  net_by_month: number[]
  line_count: number
  years: number[]
}

export interface NewBudgetLinePayload {
  section: BudgetSectionName
  group: string
  item: string
  notes: string
  year: number
}

// ---- report ---------------------------------------------------------------

export interface TimelinePoint {
  date: string
  title: string
  amount: number
  status: PaymentStatus
  cumulative_paid: number
}

export interface TitleProgress {
  title: string
  total: number
  paid: number
  remaining: number
  progress: number
  paid_count: number
  payment_count: number
  frequency: string
  per_payment: number
}

export interface UpcomingPayment {
  title: string
  amount: number
  due_date: string
  days: number
}

export interface NamedTotal {
  name: string
  total: number
  monthly: number[]
}

export interface TopItem {
  item: string
  group: string
  total: number
}

export interface ReportSummary {
  generated_at: string
  workbook: string
  year: number
  years: number[]
  has_data: boolean
  has_payment_data: boolean
  has_budget_data: boolean
  months: string[]
  kpis: {
    tracked_total: number
    paid_total: number
    outstanding: number
    progress: number
    accounts: number
    payment_count: number
    paid_count: number
    unpaid_count: number
    overdue_count: number
    overdue_total: number
    next_due: string | null
    days_until_due: number | null
    budget_revenue: number
    budget_expenses: number
    budget_net: number
    budget_lines: number
  }
  payments: {
    timeline: TimelinePoint[]
    activity: { month: string; paid: number; scheduled: number }[]
    by_title: TitleProgress[]
    upcoming: UpcomingPayment[]
    status_split: { label: string; value: number; count: number }[]
  }
  budget: {
    revenue_monthly: number[]
    expense_monthly: number[]
    net_by_month: number[]
    cumulative_net: number[]
    revenue_groups: NamedTotal[]
    expense_groups: NamedTotal[]
    top_expense_items: TopItem[]
    top_revenue_items: TopItem[]
  }
}

// ---- import ---------------------------------------------------------------

export type ImportKind = 'payments' | 'budget'
export type ImportMode = 'skip' | 'replace'
export type ImportAction = 'add' | 'replace' | 'skip' | 'error'

export interface ImportEntry {
  row?: number
  kind?: string
  item?: string
  action: ImportAction
  reason?: string
  total?: number
  amount?: number
}

export interface ImportPlan {
  entries: ImportEntry[]
  counts: Record<ImportAction, number> & { total?: number }
}