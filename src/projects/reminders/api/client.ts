import type { Reminder, ReminderInput } from '../../../../shared/reminders'

/** Vite proxies this prefix to the reminders worker (server/index.ts). */
export const REMINDERS_API = '/api/reminders'

const OFFLINE = 'Cannot reach the reminders worker. Start ROSE with "npm start".'

async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${REMINDERS_API}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new Error(OFFLINE)
  }
  const data = (await response.json().catch(() => undefined)) as (T & { error?: string }) | undefined
  if (!response.ok || data === undefined) throw new Error(data?.error ?? OFFLINE)
  return data
}

export interface WorkerStatus {
  ok: true
  devices: number
  nativeAlarms: boolean
  now: string
}

/** Every reminders endpoint, typed. The types come from shared/ - the same file the worker uses. */
export const remindersApi = {
  status: () => request<WorkerStatus>('/status'),
  list: () => request<Reminder[]>('/items'),
  create: (input: ReminderInput) => request<Reminder>('/items', 'POST', input),
  update: (id: string, input: ReminderInput) => request<Reminder>(`/items/${id}`, 'PATCH', input),
  remove: (id: string) => request<{ ok: true }>(`/items/${id}`, 'DELETE'),
  complete: (id: string) => request<Reminder>(`/items/${id}/complete`, 'POST'),
  dismiss: (id: string) => request<Reminder>(`/items/${id}/dismiss`, 'POST'),
  snooze: (id: string, minutes: number) => request<Reminder>(`/items/${id}/snooze`, 'POST', { minutes }),

  pushKey: () => request<{ publicKey: string }>('/push/key'),
  subscribe: (subscription: PushSubscriptionJSON, label: string) =>
    request<{ ok: true; devices: number }>('/push/subscribe', 'POST', { subscription, label }),
  unsubscribe: (endpoint: string) => request<{ ok: true; devices: number }>('/push/unsubscribe', 'POST', { endpoint }),
  testPush: () => request<{ sent: number; failed: number }>('/push/test', 'POST'),
}