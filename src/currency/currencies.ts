/**
 * Display currencies. Switching currency only changes the symbol and formatting;
 * amounts are never converted (1,000 stays 1,000).
 */
export interface CurrencyDefinition {
  code: string
  name: string
  symbol: string
}

export const CURRENCIES = [
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
] as const satisfies readonly CurrencyDefinition[]

/** 'PHP' | 'USD' | 'AUD' | 'EUR' - derived from the list, so it can never drift. */
export type CurrencyCode = (typeof CURRENCIES)[number]['code']

export const DEFAULT_CURRENCY: CurrencyCode = 'PHP'
export const CURRENCY_STORAGE_KEY = 'rose.currency'

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return CURRENCIES.some((c) => c.code === value)
}
