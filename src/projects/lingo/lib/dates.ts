/** Today on this PC as yyyy-MM-dd (not UTC: a card due "today" means your today). */
export function localDay(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Whole days from `today` to `day` (both yyyy-MM-dd). Negative = overdue. */
export function daysBetween(today: string, day: string): number {
  const toUtc = (value: string) => {
    const [y, m, d] = value.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return Math.round((toUtc(day) - toUtc(today)) / 86_400_000)
}

/** "Due now", "Tomorrow", "In 6 days". */
export function dueLabel(dueOn: string, today = localDay()): string {
  const days = daysBetween(today, dueOn)
  if (days <= 0) return 'Due now'
  if (days === 1) return 'Tomorrow'
  return `In ${days} days`
}
