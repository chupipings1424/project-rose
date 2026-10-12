import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TrackerLayout } from './TrackerLayout'
import { TRACKER_BASE } from './paths'

vi.mock('./api/client', () => ({
  trackerApi: { now: () => Promise.resolve({ date: '2026-10-07', time: '12:00' }), download: vi.fn() },
}))

function CurrentPath() {
  return <output data-testid="path">{useLocation().pathname}</output>
}

// Mirrors the real setup: a splat route in App.tsx with nested <Routes> inside.
function renderTrackerAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={`${TRACKER_BASE}/*`}
          element={
            <Routes>
              <Route element={<TrackerLayout />}>
                <Route path="*" element={<CurrentPath />} />
              </Route>
            </Routes>
          }
        />
      </Routes>
    </MemoryRouter>,
  )
}

describe('TrackerLayout tabs', () => {
  it('navigates between tabs without stacking URL segments', async () => {
    const user = userEvent.setup()
    renderTrackerAt(`${TRACKER_BASE}/payments`)
    const path = () => screen.getByTestId('path').textContent

    await user.click(screen.getByRole('link', { name: 'Budget' }))
    expect(path()).toBe(`${TRACKER_BASE}/budget`)

    await user.click(screen.getByRole('link', { name: 'Report' }))
    expect(path()).toBe(`${TRACKER_BASE}/report`)

    await user.click(screen.getByRole('link', { name: 'Overview' }))
    expect(path()).toBe(TRACKER_BASE)
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
  })
})
