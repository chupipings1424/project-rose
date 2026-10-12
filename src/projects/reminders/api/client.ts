import { requestJson } from '../../../api/http'
import type { Reminder, ReminderInput, RepeatRule } from '../model'

/** The reminders part of the ROSE API (Vite proxies /api, see vite.config.ts). */
export const REMINDERS_API = '/api/reminders'

/**
 * The API speaks snake_case JSON (`due_at`), the page uses camelCase (`dueAt`).
 * These "DTO" (data transfer object) types describe the wire format exactly, and
 * the two small mapping functions below are the only place the names differ.
 */
interface ReminderDto {
  id: string
  text: string
  due_at: string
  repeat: RepeatRule
  week_days: number[]
  snoozed_until: string | null
  ringing: boolean
  fired_for: string | null
  last_fired_at: string | null
  done: boolean
  created_at: string
  updated_at: string
}

interface StatusDto {
  ok: true
  devices: number
  native_alarms: boolean
  now: string
}

export interface WorkerStatus {
  ok: true
  devices: number
  nativeAlarms: boolean
  now: string
}

export const fromDto = (dto: ReminderDto): Reminder => ({
  id: dto.id,
  text: dto.text,
  dueAt: dto.due_at,
  repeat: dto.repeat,
  weekDays: dto.week_days ?? [],
  snoozedUntil: dto.snoozed_until,
  ringing: dto.ringing,
  firedFor: dto.fired_for,
  lastFiredAt: dto.last_fired_at,
  done: dto.done,
  createdAt: dto.created_at,
  updatedAt: dto.updated_at,
})

const toDto = (input: ReminderInput) => ({
  text: input.text,
  due_at: input.dueAt,
  repeat: input.repeat,
  week_days: input.weekDays ?? [],
})

function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  return requestJson<T>(`${REMINDERS_API}${path}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const reminder = async (pending: Promise<ReminderDto>) => fromDto(await pending)
const id = (value: string) => encodeURIComponent(value)

/** Every reminders endpoint, typed. Components never call fetch directly. */
export const remindersApi = {
  status: async (): Promise<WorkerStatus> => {
    const dto = await call<StatusDto>('/status')
    return { ok: dto.ok, devices: dto.devices, nativeAlarms: dto.native_alarms, now: dto.now }
  },
  list: async () => (await call<ReminderDto[]>('/items')).map(fromDto),
  create: (input: ReminderInput) => reminder(call('/items', 'POST', toDto(input))),
  update: (reminderId: string, input: ReminderInput) => reminder(call(`/items/${id(reminderId)}`, 'PATCH', toDto(input))),
  remove: (reminderId: string) => call<{ ok: true }>(`/items/${id(reminderId)}`, 'DELETE'),
  complete: (reminderId: string) => reminder(call(`/items/${id(reminderId)}/complete`, 'POST')),
  dismiss: (reminderId: string) => reminder(call(`/items/${id(reminderId)}/dismiss`, 'POST')),
  snooze: (reminderId: string, minutes: number) => reminder(call(`/items/${id(reminderId)}/snooze`, 'POST', { minutes })),

  pushKey: async () => ({ publicKey: (await call<{ public_key: string }>('/push/key')).public_key }),
  /** The subscription object is the browser's own format and is sent unchanged. */
  subscribe: (subscription: PushSubscriptionJSON, label: string) =>
    call<{ ok: true; devices: number }>('/push/subscribe', 'POST', { subscription, label }),
  unsubscribe: (endpoint: string) => call<{ ok: true; devices: number }>('/push/unsubscribe', 'POST', { endpoint }),
  testPush: () => call<{ sent: number; failed: number }>('/push/test', 'POST'),
}