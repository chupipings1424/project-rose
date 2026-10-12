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

import { downloadFile, requestJson } from '../../../api/http'

/** The payment tracker's part of the ROSE API (Vite proxies /api, see vite.config.ts). */
export const API_BASE = '/api/payment-tracker'

const request = <T>(path: string, init?: RequestInit) => requestJson<T>(`${API_BASE}${path}`, init)

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
    request<{ ok: true; deleted_payments: number; accounts: Account[] }>(`/accounts/${encodeURIComponent(title)}`, {
      method: 'DELETE',
    }),
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
    request<{ ok: true; deleted: number; budget: Budget }>(`/budget/years/${year}`, { method: 'DELETE' }),

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
  /** Saves the whole workbook (payments.xlsx) to the browser's downloads. */
  download: () => downloadFile(`${API_BASE}/download`, 'payments.xlsx'),
  downloadSample: (kind: ImportKind) => downloadFile(`${API_BASE}/import/sample/${kind}`, `sample-${kind}.csv`),
}