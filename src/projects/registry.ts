import { BUDGET_BASE } from './budget/paths'
import { shortDate } from '../lib/format'
import { habitsApi } from './habits/api/client'
import { HABITS_BASE } from './habits/paths'
import { loansApi } from './loans/api/client'
import { summarize as summarizeLoans } from './loans/lib/summary'
import { LOANS_BASE } from './loans/paths'
import { TRACKER_BASE } from './payment-tracker/paths'
import { remindersApi } from './reminders/api/client'
import { friendlyTime } from './reminders/lib/time'
import { REMINDERS_BASE } from './reminders/paths'
import { savingsApi } from './savings/api/client'
import { summarize } from './savings/lib/summary'
import { SAVINGS_BASE } from './savings/paths'
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
      'To-dos with a time. The cloud API rings them on time and sends a push notification to your phone and PC.',
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
    id: 'savings',
    name: 'Savings Goals',
    tagline: 'Goals · Deposits · Forecast',
    description:
      'Save towards goals, log deposits and withdrawals, and see what to put aside each month to make the deadline.',
    path: SAVINGS_BASE,
    icon: '◈',
    loadStats: async () => {
      const goals = await savingsApi.list()
      const summary = summarize(goals)
      return [
        { label: 'Saved', amount: summary.totalSaved },
        { label: 'Goals', value: String(summary.active) },
        { label: 'Reached', value: String(summary.reached) },
      ]
    },
  },
  {
    id: 'habits',
    name: 'Habit Tracker',
    tagline: 'Streaks · Heatmap · Nudges',
    description:
      'Tick off daily habits or count towards a target, keep streaks alive and get nudged when one is still open.',
    path: HABITS_BASE,
    icon: '◎',
    loadStats: async () => {
      const habits = await habitsApi.list()
      return [
        { label: 'Done today', value: `${habits.filter((h) => h.doneToday).length} / ${habits.length}` },
        { label: 'Top streak', value: `${Math.max(0, ...habits.map((h) => h.currentStreak))} days` },
        { label: 'Habits', value: String(habits.length) },
      ]
    },
  },
  {
    id: 'loans',
    name: 'Loan Tracker',
    tagline: 'Coop \u00B7 Pag-IBIG \u00B7 SSS',
    description:
      'Enter a loan once - its monthly payments count themselves on the loan date, with balance, finish date and a report.',
    path: LOANS_BASE,
    icon: '\u25A4',
    loadStats: async () => {
      const summary = summarizeLoans(await loansApi.list())
      return [
        { label: 'Balance', amount: summary.balance },
        { label: 'Loans', value: String(summary.running) },
        { label: 'Next due', value: summary.nextDue ? shortDate(summary.nextDue) : 'None' },
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