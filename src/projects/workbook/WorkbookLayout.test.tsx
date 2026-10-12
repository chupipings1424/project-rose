import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { trackerPaths, TRACKER_BASE } from '../payment-tracker/paths'
import { WorkbookLayout } from './WorkbookLayout'

vi.mock('./api/client', () => ({
  workbookApi: { now: () => Promise.resolve({ date: '2026-10-07', time: '12:00' }), download: vi.fn() },
}))

const TABS = [
  { to: trackerPaths.payments, label: 'Payments', end: true },
  { to: trackerPaths.report, label: 'Report' },
]

function CurrentPath() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

// Mirrors the real setup: a splat route in App.tsx with nested <Routes> inside.
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={`${TRACKER_BASE}/*`}
          element={
            <Routes>
              <Route element={<WorkbookLayout eyebrow="Project 01" title="Payment Tracker" tabs={TABS} />}>
                <Route path="*" element={<CurrentPath />} />
              </Route>
            </Routes>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('WorkbookLayout tabs', () => {
  it('navigates between tabs without stacking URL segments', async () => {
    const user = userEvent.setup()
    renderAt(trackerPaths.report)
    const path = () => screen.getByTestId('path').textContent

    expect(screen.getByRole('heading', { name: 'Payment Tracker' })).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'Payments' }))
    expect(path()).toBe(TRACKER_BASE)
    expect(screen.getByRole('link', { name: 'Payments' })).toHaveAttribute('aria-current', 'page')

    await user.click(screen.getByRole('link', { name: 'Report' }))
    expect(path()).toBe(trackerPaths.report)
    expect(screen.getByRole('link', { name: 'Payments' })).not.toHaveAttribute('aria-current')
  })
})