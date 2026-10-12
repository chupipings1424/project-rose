import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { formatCompactMoney, formatMoney } from '../lib/format'
import { CURRENCY_STORAGE_KEY, DEFAULT_CURRENCY, isCurrencyCode, type CurrencyCode } from './currencies'
import { CurrencyContext, type CurrencyContextValue } from './currencyContext'

function readSavedCurrency(): CurrencyCode {
  try {
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY)
    return isCurrencyCode(saved) ? saved : DEFAULT_CURRENCY
  } catch {
    return DEFAULT_CURRENCY
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<CurrencyCode>(readSavedCurrency)

  useEffect(() => {
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency)
    } catch {
      // storage unavailable - the choice still applies for this visit
    }
  }, [currency])

  // Components read `money` from context, so changing currency re-renders every
  // amount on screen instantly - no data is re-fetched.
  const value = useMemo<CurrencyContextValue>(
    () => ({
      currency,
      setCurrency,
      money: (amount) => formatMoney(amount, currency),
      compactMoney: (amount) => formatCompactMoney(amount, currency),
    }),
    [currency],
  )
  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}
