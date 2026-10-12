import { BUDGET_BASE } from './budget/paths'
import { TRACKER_BASE } from './payment-tracker/paths'
import { remindersApi } from './reminders/api/client'
import { friendlyTime } from './reminders/lib/time'
import { REMINDERS_BASE } from './reminders/paths'
import { workbookApi } from './workbook/api/client'

/** A stat is either ready-made text or a money amount the hub formats in the chosen currency. */
export type ProjectStat = { label: string; value: string } | { label: string; amount: number }

export interface ProjectInfo {
  id: string
  name: string
  tagline: string
  description: string
  /** Route inside ROSE. Omit for projects that are not built yet. */
  path?: string
  icon: string
  /** Optional live numbers for the hub card. Each project decides what to show. */
  loadStats?: () => Promise<ProjectStat[]>
}

/**
 * Every project in the hub. To add a new one:
 *   1. build it under src/projects/<id>/
 *   2. add a lazy route for it in App.tsx
 *   3. add an entry here
 * The hub page never needs to change (Open/Closed principle).
 */
export const PROJECTS: ProjectInfo[] = [
  {
    id: 'payment-tracker',
    name: 'Payment Tracker',
    tagline: 'Loans · Instalments · Report',
    description:
      'Track instalment plans and loans, log each payment, watch the balance fall and chart your repayments.',
    path: TRACKER_BASE,
    icon: '◉',
    loadStats: async () => {
      const stats = await workbookApi.homeStats()
      return [
        { label: 'Titles', value: String(stats.payments.accounts) },
        { label: 'Tracked', amount: stats.payments.total },
        { label: 'Next due', value: stats.payments.next_due ?? 'None' },
      ]
    },
  },
  {
    id: 'budget',
    name: 'Personal Budget',
    tagline: 'Revenue · Expenses · Cash flow',
    description:
      'Plan a full year month by month: revenue and expenses in sections, running totals and a cash-flow report.',
    path: BUDGET_BASE,
    icon: '▣',
    loadStats: async () => {
      const { budget } = await workbookApi.homeStats()
      return [
        { label: 'Revenue', amount: budget.revenue },
        { label: 'Expenses', amount: budget.expenses },
        { label: `Net ${budget.year}`, amount: budget.net },
      ]
    },
  },
  {
    id: 'reminders',
    name: 'Reminders',
    tagline: 'Alarms · Repeats · Notifications',
    description:
      'To-dos with a time. A background worker rings them as an always-on-top popup and a Windows notification.',
    path: REMINDERS_BASE,
    icon: '◷',
    loadStats: async () => {
      const items = await remindersApi.list()
      const active = items.filter((r) => !r.done)
      const now = new Date().toISOString()
      const next = active
        .filter((r) => !r.ringing)
        .map((r) => r.snoozedUntil ?? r.dueAt)
        .filter((at) => at > now)
        .sort()[0]
      return [
        { label: 'Ringing', value: String(active.filter((r) => r.ringing).length) },
        { label: 'Active', value: String(active.length) },
        { label: 'Next', value: next ? friendlyTime(next) : 'None' },
      ]
    },
  },
  {
    id: 'coming-soon',
    name: 'Next project',
    tagline: 'Slot reserved',
    description: 'Your next idea lands here. Follow "Adding a project" in LEARNING.md to plug it in.',
    icon: '✦',
  },
]