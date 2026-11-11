import { downloadFile, requestJson } from '../../../api/http'
import type { Loan, LoanInput, LoanInstalment, LoanStatus } from '../model'

export const LOANS_API = '/api/loans'

/** The wire format (snake_case). Only this file knows about it. */
interface InstalmentDto {
  number: number
  due_date: string
  amount: number
  balance_after: number
  paid: boolean
}

interface LoanDto {
  id: string
  name: string
  type: string
  loan_date: string
  term: number
  monthly_amortization: number
  amount: number
  total_payable: number
  interest: number
  payments_made: number
  payments_left: number
  paid: number
  balance: number
  percent: number
  last_payment_date: string | null
  next_due_date: string | null
  finish_date: string
  status: LoanStatus
  schedule: InstalmentDto[]
  created_at: string
  updated_at: string
}

const fromInstalment = (dto: InstalmentDto): LoanInstalment => ({
  number: dto.number,
  dueDate: dto.due_date,
  amount: dto.amount,
  balanceAfter: dto.balance_after,
  paid: dto.paid,
})

export const fromDto = (dto: LoanDto): Loan => ({
  id: dto.id,
  name: dto.name,
  type: dto.type,
  loanDate: dto.loan_date,
  term: dto.term,
  monthlyAmortization: dto.monthly_amortization,
  amount: dto.amount,
  totalPayable: dto.total_payable,
  interest: dto.interest,
  paymentsMade: dto.payments_made,
  paymentsLeft: dto.payments_left,
  paid: dto.paid,
  balance: dto.balance,
  percent: dto.percent,
  lastPaymentDate: dto.last_payment_date,
  nextDueDate: dto.next_due_date,
  finishDate: dto.finish_date,
  status: dto.status,
  schedule: (dto.schedule ?? []).map(fromInstalment),
  createdAt: dto.created_at,
  updatedAt: dto.updated_at,
})

const toDto = (input: LoanInput) => ({
  name: input.name,
  type: input.type,
  loan_date: input.loanDate,
  term: input.term,
  monthly_amortization: input.monthlyAmortization,
  amount: input.amount,
})

function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  return requestJson<T>(`${LOANS_API}${path}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const loan = async (pending: Promise<LoanDto>) => fromDto(await pending)
const id = (value: string) => encodeURIComponent(value)

/** Every loan endpoint, typed. Components never call fetch directly. */
export const loansApi = {
  list: async () => (await call<LoanDto[]>('')).map(fromDto),
  create: (input: LoanInput) => loan(call('', 'POST', toDto(input))),
  update: (loanId: string, input: LoanInput) => loan(call(`/${id(loanId)}`, 'PATCH', toDto(input))),
  remove: (loanId: string) => call<{ ok: true }>(`/${id(loanId)}`, 'DELETE'),
  /** loans.xlsx: a summary sheet plus one schedule sheet per loan, built by the API. */
  downloadReport: () => downloadFile(`${LOANS_API}/report`, 'loans.xlsx'),
}
