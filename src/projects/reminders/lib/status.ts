import type { Reminder } from '../../../../shared/reminders'

export type ReminderStatus = 'ringing' | 'overdue' | 'snoozed' | 'upcoming' | 'done'

/** Which section of the page a reminder belongs in. */
export function statusOf(reminder: Reminder): ReminderStatus {
  if (reminder.done) return 'done'
  if (reminder.ringing) return 'ringing'
  if (reminder.snoozedUntil) return 'snoozed'
  if (reminder.repeat === 'none' && reminder.firedFor === reminder.dueAt) return 'overdue'
  return 'upcoming'
}