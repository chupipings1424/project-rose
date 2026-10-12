/** Converts between ISO timestamps and the value format of <input type="datetime-local">. */
export function toLocalInput(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** `new Date('2026-10-12T09:30')` is read as *local* time - exactly what the input means. */
export function fromLocalInput(value: string): string {
  return new Date(value).toISOString()
}

/** A sensible default: the next full hour. */
export function nextHour(now = new Date()): string {
  const date = new Date(now)
  date.setHours(date.getHours() + 1, 0, 0, 0)
  return date.toISOString()
}

/** "Today 9:30 AM", "Tomorrow 7:00 AM", "Wed, Oct 14 6:00 PM" */
export function friendlyTime(iso: string, now = new Date()): string {
  const date = new Date(iso)
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000)
  if (days === 0) return `Today ${time}`
  if (days === 1) return `Tomorrow ${time}`
  if (days === -1) return `Yesterday ${time}`
  const sameYear = date.getFullYear() === now.getFullYear()
  const day = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric' })
  return `${day} ${time}`
}