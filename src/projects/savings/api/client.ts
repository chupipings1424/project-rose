import { requestJson } from '../../../api/http'
import type { EntryInput, GoalInput, GoalStatus, SavingsEntry, SavingsGoal } from '../model'

export const SAVINGS_API = '/api/savings'

/** The wire format (snake_case). Only this file knows about it. */
interface GoalDto {
  id: string
  name: string
  icon: string
  target: number
  deadline: string | null
  saved: number
  remaining: number
  percent: number
  monthly_needed: number | null
  estimated_finish: string | null
  status: GoalStatus
  entries: SavingsEntry[]
  created_at: string
  updated_at: string
}

export const fromDto = (dto: GoalDto): SavingsGoal => ({
  id: dto.id,
  name: dto.name,
  icon: dto.icon,
  target: dto.target,
  deadline: dto.deadline,
  saved: dto.saved,
  remaining: dto.remaining,
  percent: dto.percent,
  monthlyNeeded: dto.monthly_needed,
  estimatedFinish: dto.estimated_finish,
  status: dto.status,
  entries: dto.entries ?? [],
  createdAt: dto.created_at,
  updatedAt: dto.updated_at,
})

function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  return requestJson<T>(`${SAVINGS_API}${path}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const goal = async (pending: Promise<GoalDto>) => fromDto(await pending)
const id = (value: string) => encodeURIComponent(value)

/** Every savings endpoint, typed. Components never call fetch directly. */
export const savingsApi = {
  list: async () => (await call<GoalDto[]>('/goals')).map(fromDto),
  create: (input: GoalInput) => goal(call('/goals', 'POST', input)),
  update: (goalId: string, input: GoalInput) => goal(call(`/goals/${id(goalId)}`, 'PATCH', input)),
  remove: (goalId: string) => call<{ ok: true }>(`/goals/${id(goalId)}`, 'DELETE'),
  addEntry: (goalId: string, input: EntryInput) => goal(call(`/goals/${id(goalId)}/entries`, 'POST', input)),
  removeEntry: (goalId: string, entryId: string) =>
    goal(call(`/goals/${id(goalId)}/entries/${id(entryId)}`, 'DELETE')),
}