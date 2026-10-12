import { randomUUID } from 'node:crypto'
import { collectDue, type Reminder, type ReminderInput } from '../../shared/reminders.ts'
import type { JsonFile } from './jsonFile.ts'

export class NotFoundError extends Error {}

/**
 * All the rules for changing reminders. The HTTP layer only parses requests and
 * calls these methods, so the rules can be tested without a server.
 */
export class ReminderService {
  private readonly file: JsonFile<Reminder[]>
  private reminders: Reminder[]

  constructor(file: JsonFile<Reminder[]>) {
    this.file = file
    this.reminders = file.read()
  }

  list(): Reminder[] {
    return [...this.reminders].sort((a, b) => Date.parse(a.dueAt) - Date.parse(b.dueAt))
  }

  create(input: ReminderInput, now = new Date()): Reminder {
    const stamp = now.toISOString()
    const reminder: Reminder = {
      id: randomUUID(),
      text: input.text,
      dueAt: input.dueAt,
      repeat: input.repeat,
      weekDays: input.weekDays ?? [],
      snoozedUntil: null,
      ringing: false,
      firedFor: null,
      lastFiredAt: null,
      done: false,
      createdAt: stamp,
      updatedAt: stamp,
    }
    this.reminders.push(reminder)
    this.save()
    return reminder
  }

  update(id: string, input: ReminderInput, now = new Date()): Reminder {
    const reminder = this.get(id)
    const timeChanged = reminder.dueAt !== input.dueAt || reminder.repeat !== input.repeat
    Object.assign(reminder, input, { weekDays: input.weekDays ?? [], updatedAt: now.toISOString() })
    if (timeChanged) {
      // A new time means it should ring again, even if the old time already rang.
      Object.assign(reminder, { firedFor: null, ringing: false, snoozedUntil: null, done: false })
    }
    this.save()
    return reminder
  }

  remove(id: string): void {
    this.get(id)
    this.reminders = this.reminders.filter((r) => r.id !== id)
    this.save()
  }

  /** One-off: mark done. Repeating: just silence this ring; it keeps its schedule. */
  complete(id: string, now = new Date()): Reminder {
    const reminder = this.get(id)
    Object.assign(reminder, { ringing: false, snoozedUntil: null, updatedAt: now.toISOString() })
    if (reminder.repeat === 'none') reminder.done = true
    this.save()
    return reminder
  }

  /** Silence it (and cancel any snooze) without finishing: it stays overdue / on its schedule. */
  dismiss(id: string, now = new Date()): Reminder {
    const reminder = this.get(id)
    Object.assign(reminder, { ringing: false, snoozedUntil: null, updatedAt: now.toISOString() })
    this.save()
    return reminder
  }

  snooze(id: string, minutes: number, now = new Date()): Reminder {
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 24 * 60) {
      throw new RangeError('Snooze between 1 minute and 24 hours.')
    }
    const reminder = this.get(id)
    Object.assign(reminder, {
      ringing: false,
      snoozedUntil: new Date(now.getTime() + minutes * 60_000).toISOString(),
      updatedAt: now.toISOString(),
    })
    this.save()
    return reminder
  }

  /** Called by the scheduler. Returns what must ring now (and saves the new state). */
  tick(now = new Date()): Reminder[] {
    const fired = collectDue(this.reminders, now)
    if (fired.length) this.save()
    return fired
  }

  private get(id: string): Reminder {
    const reminder = this.reminders.find((r) => r.id === id)
    if (!reminder) throw new NotFoundError('That reminder no longer exists.')
    return reminder
  }

  private save(): void {
    this.file.write(this.reminders)
  }
}