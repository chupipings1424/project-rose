import { useContext } from 'react'
import { CurrencyContext } from './currencyContext'

/** `const { money } = useCurrency()` then `money(1234)` -> '₱1,234.00' */
export function useCurrency() {
  const context = useContext(CurrencyContext)
  if (!context) throw new Error('useCurrency must be used inside <CurrencyProvider>')
  return context
}
