import type { Habit } from '../model'

/**
 * All the page's habit state in one place, changed only through actions. useReducer is a
 * good fit here because one click ("tick today") changes several things together and
 * may later have to be undone (optimistic update + rollback).
 */
export interface HabitsState {
  habits: Habit[] | null
  error: Error | null
  /** habit id -> requests still in flight. The server's answer only wins once none are left. */
  pending: Record<string, number>
}

export type HabitsAction =
  | { type: 'loaded'; habits: Habit[] }
  | { type: 'failed'; error: Error }
  | { type: 'added'; habit: Habit }
  | { type: 'replaced'; habit: Habit }
  | { type: 'removed'; id: string }
  /** Optimistic: show the change straight away, before the API answers. */
  | { type: 'dayChanged'; id: string; date: string; value: number; today: string }
  | { type: 'dayConfirmed'; habit: Habit }
  /** The API refused: put the day back as it was. */
  | { type: 'dayFailed'; id: string; date: string; previous: number; today: string }

export const initialHabitsState: HabitsState = { habits: null, error: null, pending: {} }

/** A copy of `habit` with one day changed. Never mutates - React compares by reference. */
export function withDay(habit: Habit, date: string, value: number, today: string): Habit {
  const log = { ...habit.log }
  if (value > 0) log[date] = value
  else delete log[date]
  if (date !== today) return { ...habit, log }
  return { ...habit, log, today: value, doneToday: value >= habit.target }
}

const mapHabit = (habits: Habit[] | null, id: string, change: (habit: Habit) => Habit) =>
  habits?.map((h) => (h.id === id ? change(h) : h)) ?? null

function settle(pending: Record<string, number>, id: string) {
  const left = (pending[id] ?? 1) - 1
  const next = { ...pending }
  if (left > 0) next[id] = left
  else delete next[id]
  return { next, left }
}

export function habitsReducer(state: HabitsState, action: HabitsAction): HabitsState {
  switch (action.type) {
    case 'loaded':
      return { ...state, habits: action.habits, error: null }
    case 'failed':
      return { ...state, error: action.error }
    case 'added':
      return { ...state, habits: [...(state.habits ?? []), action.habit] }
    case 'replaced':
      return { ...state, habits: mapHabit(state.habits, action.habit.id, () => action.habit) }
    case 'removed':
      return { ...state, habits: state.habits?.filter((h) => h.id !== action.id) ?? null }
    case 'dayChanged':
      return {
        ...state,
        habits: mapHabit(state.habits, action.id, (h) => withDay(h, action.date, action.value, action.today)),
        pending: { ...state.pending, [action.id]: (state.pending[action.id] ?? 0) + 1 },
      }
    case 'dayConfirmed': {
      const { next, left } = settle(state.pending, action.habit.id)
      // While more clicks are in flight, keep the optimistic copy so the screen doesn't flicker back.
      const habits = left > 0 ? state.habits : mapHabit(state.habits, action.habit.id, () => action.habit)
      return { ...state, habits, pending: next }
    }
    case 'dayFailed': {
      const { next } = settle(state.pending, action.id)
      return {
        ...state,
        habits: mapHabit(state.habits, action.id, (h) => withDay(h, action.date, action.previous, action.today)),
        pending: next,
      }
    }
  }
}