import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import type { Reminder } from '../../shared/reminders.ts'

interface LegacyTask {
  id?: unknown
  text?: unknown
  done?: unknown
  dueAt?: unknown
  fired?: unknown
  createdAt?: unknown
}

/**
 * Converts the old To-Do & Alarms `tasks.json` into reminders. Tasks without a
 * time are skipped (a reminder needs one). Past, unfinished tasks come in as
 * already rung, so a months-old alarm does not go off the moment ROSE starts.
 */
export function convertLegacyTasks(tasks: unknown, now = new Date()): Reminder[] {
  if (!Array.isArray(tasks)) return []
  const stamp = now.toISOString()
  return (tasks as LegacyTask[]).flatMap((task) => {
    const text = typeof task.text === 'string' ? task.text.trim().slice(0, 200) : ''
    const due = typeof task.dueAt === 'string' ? Date.parse(task.dueAt) : Number.NaN
    if (!text || Number.isNaN(due)) return []
    const dueAt = new Date(due).toISOString()
    const created = typeof task.createdAt === 'number' ? new Date(task.createdAt).toISOString() : stamp
    const alreadyRang = task.fired === true || due <= now.getTime()
    return [
      {
        id: typeof task.id === 'string' && task.id ? task.id : randomUUID(),
        text,
        dueAt,
        repeat: 'none',
        weekDays: [],
        snoozedUntil: null,
        ringing: false,
        firedFor: alreadyRang ? dueAt : null,
        lastFiredAt: null,
        done: task.done === true,
        createdAt: created,
        updatedAt: stamp,
      } satisfies Reminder,
    ]
  })
}

export function readLegacyTasks(file: string): Reminder[] {
  return convertLegacyTasks(JSON.parse(readFileSync(file, 'utf8')))
}