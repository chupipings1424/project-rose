import { CURRENCIES, type CurrencyCode } from './currencies'
import { useCurrency } from './useCurrency'

export function CurrencyPicker() {
  const { currency, setCurrency } = useCurrency()
  return (
    <label className="theme-compact" title="Display currency (no conversion)">
      <span className="sr-only">Currency</span>
      <select value={currency} onChange={(event) => setCurrency(event.target.value as CurrencyCode)}>
        {CURRENCIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.symbol} {c.code}
          </option>
        ))}
      </select>
    </label>
  )
}
