import { describe, expect, it } from 'vitest'
import type { Habit } from '../model'
import { habitsReducer, initialHabitsState, withDay, type HabitsState } from './reducer'

const TODAY = '2026-11-10'

const habit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'h1',
  name: 'Water',
  icon: '',
  kind: 'count',
  target: 8,
  unit: 'glasses',
  remindAt: null,
  today: 0,
  doneToday: false,
  currentStreak: 0,
  bestStreak: 0,
  log: {},
  createdAt: '',
  updatedAt: '',
  ...overrides,
})

const loaded = (h: Habit): HabitsState => habitsReducer(initialHabitsState, { type: 'loaded', habits: [h] })

describe('withDay', () => {
  it('updates today and removes zero days without mutating', () => {
    const before = habit({ log: { '2026-11-09': 3 } })
    const after = withDay(before, TODAY, 8, TODAY)

    expect(after).toMatchObject({ today: 8, doneToday: true, log: { '2026-11-09': 3, [TODAY]: 8 } })
    expect(before.log).toEqual({ '2026-11-09': 3 })
    expect(withDay(after, '2026-11-09', 0, TODAY).log).toEqual({ [TODAY]: 8 })
  })
})

describe('habitsReducer', () => {
  it('shows a change at once and counts it as pending', () => {
    const state = habitsReducer(loaded(habit()), { type: 'dayChanged', id: 'h1', date: TODAY, value: 1, today: TODAY })

    expect(state.habits?.[0].today).toBe(1)
    expect(state.pending).toEqual({ h1: 1 })
  })

  it('takes the server copy once nothing else is in flight', () => {
    let state = loaded(habit())
    state = habitsReducer(state, { type: 'dayChanged', id: 'h1', date: TODAY, value: 1, today: TODAY })
    state = habitsReducer(state, { type: 'dayChanged', id: 'h1', date: TODAY, value: 2, today: TODAY })

    // The first answer arrives while the second click is still in flight: keep showing 2.
    state = habitsReducer(state, { type: 'dayConfirmed', habit: habit({ today: 1, log: { [TODAY]: 1 } }) })
    expect(state.habits?.[0].today).toBe(2)

    state = habitsReducer(state, { type: 'dayConfirmed', habit: habit({ today: 2, log: { [TODAY]: 2 }, currentStreak: 0 }) })
    expect(state.habits?.[0].today).toBe(2)
    expect(state.pending).toEqual({})
  })

  it('rolls a failed change back', () => {
    let state = loaded(habit({ today: 3, log: { [TODAY]: 3 } }))
    state = habitsReducer(state, { type: 'dayChanged', id: 'h1', date: TODAY, value: 4, today: TODAY })
    state = habitsReducer(state, { type: 'dayFailed', id: 'h1', date: TODAY, previous: 3, today: TODAY })

    expect(state.habits?.[0]).toMatchObject({ today: 3, log: { [TODAY]: 3 } })
    expect(state.pending).toEqual({})
  })

  it('adds, replaces and removes habits', () => {
    let state = loaded(habit())
    state = habitsReducer(state, { type: 'added', habit: habit({ id: 'h2', name: 'Read' }) })
    state = habitsReducer(state, { type: 'replaced', habit: habit({ name: 'More water' }) })
    state = habitsReducer(state, { type: 'removed', id: 'h2' })

    expect(state.habits?.map((h) => h.name)).toEqual(['More water'])
  })
})