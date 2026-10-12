import type {
  Account,
  Budget,
  BudgetLine,
  HomeStats,
  ImportKind,
  ImportMode,
  ImportPlan,
  NewAccountPayload,
  NewBudgetLinePayload,
  NewPaymentPayload,
  PaymentStatus,
  ReportSummary,
  SchedulePayload,
  SchedulePreview,
  ServerNow,
  Summary,
} from './types'

/** Vite proxies this prefix to the Flask server (see vite.config.ts). */
export const API_BASE = '/api/payment-tracker'

export class ApiError extends Error {
  readonly status: number
  /** True when the Flask app itself answered with a JSON `{ error }` message. */
  readonly fromServer: boolean

  constructor(message: string, status: number, fromServer = false) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fromServer = fromServer
  }
}

const OFFLINE_MESSAGE =
  'Cannot reach the Payment Tracker server. Start it with "npm start" (or run start.cmd in the payment-tracker folder).'

const BACKEND_UPDATE_MESSAGE =
  'Your Payment Tracker server does not support this yet. Apply backend-patches/payment-tracker-delete.patch (see README) and restart it.'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    const isForm = init?.body instanceof FormData
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      // FormData sets its own multipart Content-Type header, so only set JSON for JSON bodies.
      headers: isForm ? init?.headers : { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    throw new ApiError(OFFLINE_MESSAGE, 0)
  }

  const text = await response.text()
  let body: unknown = undefined
  try {
    body = text ? JSON.parse(text) : undefined
  } catch {
    // not JSON - usually the dev proxy saying the backend is down
  }

  if (!response.ok) {
    const serverMessage = (body as { error?: string } | undefined)?.error
    if (!serverMessage && response.status >= 500) throw new ApiError(OFFLINE_MESSAGE, response.status)
    throw new ApiError(serverMessage ?? `Request failed (${response.status})`, response.status, Boolean(serverMessage))
  }
  if (body === undefined) throw new ApiError(OFFLINE_MESSAGE, response.status)
  return body as T
}

/**
 * For endpoints added after the original Payment Tracker: an older server answers
 * with a plain 404/405 page (no JSON), which we turn into a helpful message.
 */
async function newerEndpoint<T>(call: Promise<T>): Promise<T> {
  try {
    return await call
  } catch (error) {
    if (error instanceof ApiError && !error.fromServer && (error.status === 404 || error.status === 405)) {
      throw new ApiError(BACKEND_UPDATE_MESSAGE, error.status)
    }
    throw error
  }
}

const json = (method: string, data: unknown): RequestInit => ({ method, body: JSON.stringify(data) })
const yearQuery = (year?: number | string | null) => (year ? `?year=${encodeURIComponent(year)}` : '')

/** Every endpoint of the payment tracker, fully typed. Components never call fetch directly. */
export const trackerApi = {
  homeStats: () => request<HomeStats>('/home-stats'),
  now: () => request<ServerNow>('/now'),

  // payments
  accounts: () => request<Account[]>('/accounts'),
  createAccount: (payload: NewAccountPayload) => request<Account[]>('/accounts', json('POST', payload)),
  /** Deletes a title and every payment under it. */
  deleteAccount: (title: string) =>
    newerEndpoint(
      request<{ ok: true; deleted_payments: number; accounts: Account[] }>(`/accounts/${encodeURIComponent(title)}`, {
        method: 'DELETE',
      }),
    ),
  previewSchedule: (payload: SchedulePayload) =>
    request<SchedulePreview>('/accounts/preview', json('POST', payload)),
  summary: (title: string) => request<Summary>(`/summary/${encodeURIComponent(title)}`),
  addPayment: (payload: NewPaymentPayload) =>
    request<{ id: string; summary: Summary }>('/payments', json('POST', payload)),
  setPaymentStatus: (id: string, status: PaymentStatus, title: string) =>
    request<{ ok: true; summary: Summary }>(`/payments/${encodeURIComponent(id)}`, json('PATCH', { status, title })),
  deletePayment: (id: string) =>
    request<{ ok: true }>(`/payments/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  // budget
  budget: (year?: number | string | null) => request<Budget>(`/budget${yearQuery(year)}`),
  addBudgetLine: (payload: NewBudgetLinePayload) =>
    request<{ id: string; budget: Budget }>('/budget/lines', json('POST', payload)),
  updateBudgetCell: (id: string, month: number, value: string, year: number) =>
    request<{ ok: true; budget: Budget }>(`/budget/lines/${encodeURIComponent(id)}`, json('PATCH', { month, value, year })),
  updateBudgetLine: (id: string, changes: Pick<BudgetLine, 'item' | 'group' | 'notes'>, year: number) =>
    request<{ ok: true; budget: Budget }>(`/budget/lines/${encodeURIComponent(id)}`, json('PATCH', { ...changes, year })),
  deleteBudgetLine: (id: string, year: number) =>
    request<{ ok: true; budget: Budget }>(`/budget/lines/${encodeURIComponent(id)}${yearQuery(year)}`, {
      method: 'DELETE',
    }),
  copyBudgetYear: (from: number, to: number, includeAmounts: boolean) =>
    request<{ copied: number; budget: Budget }>(
      '/budget/copy-year',
      json('POST', { from, to, include_amounts: includeAmounts }),
    ),
  /** Deletes every budget line in a year; returns the current year's budget. */
  deleteBudgetYear: (year: number) =>
    newerEndpoint(
      request<{ ok: true; deleted: number; budget: Budget }>(`/budget/years/${year}`, { method: 'DELETE' }),
    ),

  // report
  report: (year?: number | string | null) => request<ReportSummary>(`/report/summary${yearQuery(year)}`),

  // import / export
  importFile: (kind: ImportKind, options: { file: File; mode: ImportMode; dryRun: boolean; year?: string }) => {
    const form = new FormData()
    form.append('file', options.file)
    form.append('mode', options.mode)
    form.append('dry_run', options.dryRun ? '1' : '0')
    if (options.year) form.append('year', options.year)
    return request<ImportPlan>(`/import/${kind}`, { method: 'POST', body: form })
  },
  downloadUrl: `${API_BASE}/download`,
  sampleUrl: (kind: ImportKind) => `${API_BASE}/import/sample/${kind}`,
}