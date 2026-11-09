import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../auth/authContext'
import { newSession, saveSession } from '../auth/session'
import { CurrencyProvider } from '../currency/CurrencyProvider'
import { memoryStorage, setOutboxStorage, submit, type OutboxStorage } from '../lib/outbox'
import { ThemeProvider } from '../theme/ThemeProvider'
import { AppShell } from './AppShell'
import { ToastProvider } from './toast/ToastProvider'

vi.mock('../auth/supabase', () => ({ accessToken: vi.fn(() => Promise.resolve('test-token')) }))

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

function Where() {
  const location = useLocation()
  return <output aria-label="location">{location.pathname + location.search}</output>
}

describe('AppShell', () => {
  const logout = vi.fn()
  const session = newSession('me@rose.test', { isAdmin: false, mustChangePassword: false })
  const auth: AuthContextValue = {
    session,
    isAuthenticated: true,
    login: vi.fn(),
    logout,
    changePassword: vi.fn(),
  }
  let storage: OutboxStorage
  let online = true

  beforeAll(() => {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.open = true
    }
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.open = false
    }
  })
  beforeEach(() => {
    saveSession(session)
    storage = memoryStorage()
    setOutboxStorage(storage)
    online = true
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online)
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => (String(input).includes('/accounts') ? json([]) : json({ id: 'x' }))),
    )
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    logout.mockClear()
  })

  const renderShell = (path = '/today') =>
    render(
      <ThemeProvider>
        <CurrencyProvider>
          <ToastProvider>
            <AuthContext.Provider value={auth}>
              <MemoryRouter initialEntries={[path]}>
                <Routes>
                  <Route element={<AppShell />}>
                    <Route path="/today" element={<Where />} />
                  </Route>
                  <Route path="/login" element={<Where />} />
                </Routes>
              </MemoryRouter>
            </AuthContext.Provider>
          </ToastProvider>
        </CurrencyProvider>
      </ThemeProvider>,
    )

  async function queueOne() {
    online = false
    await submit({ kind: 'expense', label: 'Expense · Kape · ₱50.00', url: '/api/payment-tracker/budget/expenses', body: {} })
  }

  it('logs out straight away when nothing is waiting', async () => {
    renderShell()
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(logout).toHaveBeenCalled()
    expect(screen.getByLabelText('location')).toHaveTextContent('/login')
  })

  it('warns before deleting saves that have not synced', async () => {
    await queueOne()
    renderShell()
    expect(await screen.findByRole('button', { name: /1 waiting to sync/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(screen.getByText(/Logging out deletes it/)).toBeInTheDocument()
    expect(logout).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(logout).not.toHaveBeenCalled()
    expect(await storage.all()).toHaveLength(1)

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete them and log out' }))
    expect(logout).toHaveBeenCalled()
    await waitFor(async () => expect(await storage.all()).toHaveLength(0))
  })

  it('asks before deleting one waiting entry', async () => {
    await queueOne()
    renderShell()
    await userEvent.click(await screen.findByRole('button', { name: /1 waiting to sync/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Delete Expense · Kape · ₱50.00' }))

    expect(screen.getByText(/never saved/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete it' }))

    await waitFor(async () => expect(await storage.all()).toHaveLength(0))
  })

  it('sends waiting saves once back online', async () => {
    await queueOne()
    renderShell()
    await screen.findByRole('button', { name: /1 waiting to sync/ })

    online = true
    window.dispatchEvent(new Event('online'))

    await waitFor(async () => expect(await storage.all()).toHaveLength(0))
    expect(await screen.findByText('Synced 1 saved entry')).toBeInTheDocument()
  })

  it('opens quick add from the home-screen shortcut (?quick=1)', async () => {
    renderShell('/today?quick=1')
    expect(await screen.findByRole('heading', { name: 'Quick add' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('location')).toHaveTextContent(/^\/today$/))
  })

  it('keeps (+) available offline', () => {
    online = false
    renderShell()
    expect(screen.getByRole('button', { name: 'Quick add' })).toBeInTheDocument()
  })
})