import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { formatCompactMoney, formatMoney } from '../lib/format'
import { CURRENCY_STORAGE_KEY } from './currencies'
import { CurrencyPicker } from './CurrencyPicker'
import { CurrencyProvider } from './CurrencyProvider'
import { useCurrency } from './useCurrency'

describe('formatMoney', () => {
  it.each([
    ['PHP', '₱1,234.50'],
    ['USD', '$1,234.50'],
    ['AUD', 'A$1,234.50'],
    ['EUR', '€1,234.50'],
  ] as const)('formats %s without converting', (code, expected) => {
    expect(formatMoney(1234.5, code)).toBe(expected)
  })

  it('treats blanks and junk as zero', () => {
    expect(formatMoney(null, 'PHP')).toBe('₱0.00')
    expect(formatMoney('abc', 'PHP')).toBe('₱0.00')
  })

  it('only compacts amounts of 1,000 or more', () => {
    expect(formatCompactMoney(999, 'PHP')).toBe('₱999.00')
    expect(formatCompactMoney(1_234_567, 'PHP')).toBe('₱1.2M')
  })
})

function Amount() {
  return <output>{useCurrency().money(1000)}</output>
}

function renderWithProvider() {
  return render(
    <CurrencyProvider>
      <CurrencyPicker />
      <Amount />
    </CurrencyProvider>,
  )
}

describe('CurrencyProvider', () => {
  beforeEach(() => localStorage.clear())

  it('defaults to Philippine Peso', () => {
    renderWithProvider()
    expect(screen.getByRole('status')).toHaveTextContent('₱1,000.00')
  })

  it('switches every amount and remembers the choice', async () => {
    renderWithProvider()
    await userEvent.selectOptions(screen.getByRole('combobox'), 'EUR')
    expect(screen.getByRole('status')).toHaveTextContent('€1,000.00')
    expect(localStorage.getItem(CURRENCY_STORAGE_KEY)).toBe('EUR')
  })

  it('restores a saved currency and ignores junk', () => {
    localStorage.setItem(CURRENCY_STORAGE_KEY, 'AUD')
    const { unmount } = renderWithProvider()
    expect(screen.getByRole('status')).toHaveTextContent('A$1,000.00')
    unmount()
    localStorage.setItem(CURRENCY_STORAGE_KEY, 'XYZ')
    renderWithProvider()
    expect(screen.getByRole('status')).toHaveTextContent('₱1,000.00')
  })
})
