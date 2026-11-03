/**
 * Savings goals as the page sees them (camelCase). The maths - pace, monthly amount
 * needed, estimated finish, status - lives in the ROSE API (SavingsRules.cs) and
 * arrives ready-made; api/client.ts converts the API's snake_case JSON.
 */

export const GOAL_STATUSES = ['on-track', 'behind', 'overdue', 'no-deadline', 'done'] as const
export type GoalStatus = (typeof GOAL_STATUSES)[number]

export interface SavingsEntry {
  id: string
  /** yyyy-MM-dd */
  date: string
  /** Deposits are positive, withdrawals negative. */
  amount: number
  note: string
}

export interface SavingsGoal {
  id: string
  name: string
  icon: string
  target: number
  /** yyyy-MM-dd, or null for "no deadline". */
  deadline: string | null
  saved: number
  remaining: number
  /** 0 - 100 */
  percent: number
  /** What to save each month to make the deadline. Null without a future deadline. */
  monthlyNeeded: number | null
  /** When you reach the target at your recent pace. Null when not saving. */
  estimatedFinish: string | null
  status: GoalStatus
  /** Newest first. */
  entries: SavingsEntry[]
  createdAt: string
  updatedAt: string
}

export interface GoalInput {
  name: string
  icon: string
  target: number
  deadline: string | null
}

export type EntryKind = 'deposit' | 'withdraw'

export interface EntryInput {
  kind: EntryKind
  amount: number
  date: string
  note: string
}

export const STATUS_LABELS: Record<GoalStatus, string> = {
  'on-track': 'On track',
  behind: 'Behind',
  overdue: 'Past deadline',
  'no-deadline': 'No deadline',
  done: 'Reached',
}