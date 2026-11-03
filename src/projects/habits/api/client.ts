import { requestJson } from '../../../api/http'
import type { Habit, HabitInput, HabitKind } from '../model'

export const HABITS_API = '/api/habits'

/** The wire format (snake_case). Only this file knows about it. */
interface HabitDto {
  id: string
  name: string
  icon: string
  kind: HabitKind
  target: number
  unit: string
  remind_at: string | null
  today: number
  done_today: boolean
  current_streak: number
  best_streak: number
  log: Record<string, number> | null
  created_at: string
  updated_at: string
}

export const fromDto = (dto: HabitDto): Habit => ({
  id: dto.id,
  name: dto.name,
  icon: dto.icon,
  kind: dto.kind,
  target: dto.target,
  unit: dto.unit,
  remindAt: dto.remind_at,
  today: dto.today,
  doneToday: dto.done_today,
  currentStreak: dto.current_streak,
  bestStreak: dto.best_streak,
  log: dto.log ?? {},
  createdAt: dto.created_at,
  updatedAt: dto.updated_at,
})

const toDto = (input: HabitInput) => ({
  name: input.name,
  icon: input.icon,
  kind: input.kind,
  target: input.target,
  unit: input.unit,
  remind_at: input.remindAt,
})

function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  return requestJson<T>(`${HABITS_API}${path}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const habit = async (pending: Promise<HabitDto>) => fromDto(await pending)
const id = (value: string) => encodeURIComponent(value)

/** Every habits endpoint, typed. Components never call fetch directly. */
export const habitsApi = {
  list: async () => (await call<HabitDto[]>('/items')).map(fromDto),
  create: (input: HabitInput) => habit(call('/items', 'POST', toDto(input))),
  update: (habitId: string, input: HabitInput) => habit(call(`/items/${id(habitId)}`, 'PATCH', toDto(input))),
  remove: (habitId: string) => call<{ ok: true }>(`/items/${id(habitId)}`, 'DELETE'),
  /** Idempotent: PUT the new amount for one day (0 clears it). */
  setDay: (habitId: string, date: string, value: number) =>
    habit(call(`/items/${id(habitId)}/days/${id(date)}`, 'PUT', { value })),
}