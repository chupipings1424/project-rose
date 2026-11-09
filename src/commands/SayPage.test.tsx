import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '../components/toast/ToastProvider'
import { CurrencyProvider } from '../currency/CurrencyProvider'
import { memoryStorage, setOutboxStorage } from '../lib/outbox'
import SayPage from './SayPage'

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

function Where() {
  const location = useLocation()
  return <output aria-label="location">{location.pathname + location.search}</output>
}

describe('SayPage (the Shortcut screen)', () => {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'POST') return json({ line_id: 'l1' }, 201)
    return String(input).includes('/accounts') ? json([]) : json({ year: 2026, months: [], sections: [], known_groups: {} })
  })

  beforeEach(() => {
    setOutboxStorage(memoryStorage())
    vi.stubGlobal('fetch', fetchMock)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockClear()
  })

  const renderAt = (path: string) =>
    render(
      <CurrencyProvider>
        <ToastProvider>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route
                path="/say"
                element={
                  <>
                    <SayPage />
                    <Where />
                  </>
                }
              />
              <Route path="/today" element={<Where />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </CurrencyProvider>,
    )
  const posts = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')

  it('previews the text a Shortcut sent, without saving yet', async () => {
    renderAt('/say?text=kape%2050')

    const card = await screen.findByRole('group', { name: 'Preview' })
    expect(card).toHaveTextContent('Kape · ₱50.00')
    expect(screen.getByLabelText('Command')).toHaveValue('kape 50')
    expect(screen.getByLabelText('location')).toHaveTextContent(/^\/say$/)
    expect(posts()).toHaveLength(0)
  })

  it('saves after Save and goes to Today', async () => {
    renderAt('/say?text=kape%2050')
    await userEvent.click(await screen.findByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByLabelText('location')).toHaveTextContent('/today'))
    expect(posts()).toHaveLength(1)
  })

  it('opens empty without text (Android shortcut)', () => {
    renderAt('/say')
    expect(screen.getByLabelText('Command')).toHaveValue('')
    expect(screen.queryByRole('group', { name: 'Preview' })).not.toBeInTheDocument()
  })
})