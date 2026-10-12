import type { CurrencyCode } from '../currency/currencies'

type Numberish = number | string | null | undefined

// Intl.NumberFormat is relatively expensive to build, so keep one per currency.
// A fixed 'en-US' locale gives unambiguous symbols: ₱, $, A$, €.
const fullFormats = new Map<CurrencyCode, Intl.NumberFormat>()
const compactFormats = new Map<CurrencyCode, Intl.NumberFormat>()

function cached(cache: Map<CurrencyCode, Intl.NumberFormat>, currency: CurrencyCode, options: Intl.NumberFormatOptions) {
  let format = cache.get(currency)
  if (!format) {
    format = new Intl.NumberFormat('en-US', { style: 'currency', currency, ...options })
    cache.set(currency, format)
  }
  return format
}

/** In components prefer `useCurrency().money`, which follows the user's chosen currency. */
export function formatMoney(value: Numberish, currency: CurrencyCode): string {
  return cached(fullFormats, currency, {}).format(Number(value) || 0)
}

export function formatCompactMoney(value: Numberish, currency: CurrencyCode): string {
  const amount = Number(value) || 0
  return Math.abs(amount) >= 1000
    ? cached(compactFormats, currency, { notation: 'compact', maximumFractionDigits: 1 }).format(amount)
    : formatMoney(amount, currency)
}

/**
 * Parses "2026-10-07" as a *local* date. `new Date("2026-10-07")` would be read
 * as UTC midnight and can show up as the previous day in Asia/America.
 */
export function parseIsoDate(iso: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

export function longDate(iso: string | null | undefined): string {
  const date = parseIsoDate(iso)
  return date
    ? date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '—'
}

export function shortDate(iso: string | null | undefined): string {
  const date = parseIsoDate(iso)
  return date ? date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'
}

export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export function nowTime(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`
}