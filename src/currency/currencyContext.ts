import { createContext } from 'react'
import type { CurrencyCode } from './currencies'

export interface CurrencyContextValue {
  currency: CurrencyCode
  setCurrency: (currency: CurrencyCode) => void
  /** Full amount, e.g. ₱1,234.50 */
  money: (value: number | string | null | undefined) => string
  /** Short amount for tight spaces, e.g. ₱1.2K */
  compactMoney: (value: number | string | null | undefined) => string
}

export const CurrencyContext = createContext<CurrencyContextValue | null>(null)
