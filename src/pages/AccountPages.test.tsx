import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { AdminRoute, ProtectedRoute } from '../auth/ProtectedRoute'
import { loadSession, newSession, saveSession } from '../auth/session'
import { AppShell } from '../components/AppShell'
import { ToastProvider } from '../components/toast/ToastProvider'
import { ThemeProvider } from '../theme/ThemeProvider'
import AdminUsersPage from './AdminUsersPage'
import ChangePasswordPage from './ChangePasswordPage'

vi.mock('../auth/supabase')

const ADMIN = 'rose@example.com'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

const wireUser = (email: string, extra: Record<string, unknown> = {}) => ({
  id: `id-${email}`,
  email,
  is_admin: false,
  must_change_password: false,
  created_at: '2026-11-01T00:00:00Z',
  ...extra,
})

/** A fake ROSE API: "METHOD /url" -> response. */
function fakeApi(routes: Record<string, (init?: RequestInit) => Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${String(input)}`
    const route = routes[key]
    return Promise.resolve(route ? route(init) : json({ detail: `Unexpected ${key}` }, 500))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const signedInAs = (email: string, flags: { isAdmin?: boolean; mustChangePassword?: boolean } = {}) =>
  saveSession(newSession(email, { isAdmin: flags.isAdmin ?? false, mustChangePassword: flags.mustChangePassword ?? false }))

function renderApp(startAt: string) {
  return render(
    <MemoryRouter initialEntries={[startAt]}>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/login" element={<h1>Login page</h1>} />
              <Route element={<ProtectedRoute />}>
                <Route path="/change-password" element={<ChangePasswordPage />} />
                <Route element={<AppShell />}>
                  <Route path="/projects" element={<h1>Projects hub</h1>} />
                  <Route element={<AdminRoute />}>
                    <Route path="/admin/users" element={<AdminUsersPage />} />
                  </Route>
                </Route>
              </Route>
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe('accounts', () => {
  beforeEach(() => {
    // jsdom lacks showModal()/close(); this minimal polyfill makes dialogs open like a browser.
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.open = true
    }
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.open = false
    }
  })
  afterEach(() => vi.unstubAllGlobals())

  it('makes someone on a temporary password choose their own before anything else', async () => {
    const user = userEvent.setup()
    signedInAs('bob@example.com')
    const fetchMock = fakeApi({
      'GET /api/auth/session': () => json({ authenticated: true, email: 'bob@example.com', is_admin: false, must_change_password: true }),
      'POST /api/auth/password': () => new Response(null, { status: 204 }),
    })
    renderApp('/projects')

    expect(await screen.findByRole('heading', { name: 'NEW PASSWORD' }, { timeout: 5_000 })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('New password'), 'short')
    await user.type(screen.getByLabelText('Type it again'), 'short')
    await user.click(screen.getByRole('button', { name: 'Save password' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Use at least 8 characters.')

    await user.clear(screen.getByLabelText('New password'))
    await user.clear(screen.getByLabelText('Type it again'))
    await user.type(screen.getByLabelText('New password'), 'my own password')
    await user.type(screen.getByLabelText('Type it again'), 'my own pasword')
    await user.click(screen.getByRole('button', { name: 'Save password' }))
    expect(screen.getByRole('alert')).toHaveTextContent('The two passwords do not match.')

    await user.clear(screen.getByLabelText('Type it again'))
    await user.type(screen.getByLabelText('Type it again'), 'my own password')
    await user.click(screen.getByRole('button', { name: 'Save password' }))

    expect(await screen.findByText('Projects hub')).toBeInTheDocument()
    const call = fetchMock.mock.calls.find(([url]) => url === '/api/auth/password')
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ new_password: 'my own password' })
    expect(loadSession()?.mustChangePassword).toBe(false)
  })

  it('logs out when the admin removed the account', async () => {
    signedInAs('bob@example.com')
    fakeApi({ 'GET /api/auth/session': () => json({ status: 403 }, 403) })
    renderApp('/projects')

    expect(await screen.findByText('Login page')).toBeInTheDocument()
    expect(loadSession()).toBeNull()
  })

  it('keeps the Users page and its link for admins only', async () => {
    signedInAs('bob@example.com')
    fakeApi({ 'GET /api/auth/session': () => json({ authenticated: true, email: 'bob@example.com', is_admin: false, must_change_password: false }) })
    renderApp('/admin/users')

    expect(await screen.findByText('Projects hub')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument()
  })

  it('lets the admin add, reset and remove users', async () => {
    const user = userEvent.setup()
    signedInAs(ADMIN, { isAdmin: true })
    let users = [wireUser(ADMIN, { is_admin: true }), wireUser('bob@example.com')]
    const fetchMock = fakeApi({
      'GET /api/auth/session': () => json({ authenticated: true, email: ADMIN, is_admin: true, must_change_password: false }),
      'GET /api/admin/users': () => json(users),
      'POST /api/admin/users': (init) => {
        const body = JSON.parse(String(init?.body)) as { email: string }
        const added = wireUser(body.email, { must_change_password: true })
        users = [...users, added]
        return json(added, 201)
      },
      'POST /api/admin/users/id-bob%40example.com/password': () => json(wireUser('bob@example.com', { must_change_password: true })),
      'DELETE /api/admin/users/id-bob%40example.com': () => {
        users = users.filter((u) => u.email !== 'bob@example.com')
        return new Response(null, { status: 204 })
      },
    })
    renderApp('/admin/users')

    expect(await screen.findByText('bob@example.com')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument()
    const adminRow = screen.getByText(ADMIN).closest('tr')!
    expect(within(adminRow).queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()

    // Add: the generated temporary password is sent and shown once to hand over.
    const temporary = (screen.getByLabelText('Temporary password') as HTMLInputElement).value
    expect(temporary).toMatch(/^[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}-[a-zA-Z2-9]{4}$/)
    await user.type(screen.getByLabelText('Email'), 'carol@example.com')
    await user.click(screen.getByRole('button', { name: 'Add user' }))
    expect(await screen.findByRole('heading', { name: 'Send this to carol@example.com' })).toBeInTheDocument()
    expect(screen.getByText(temporary)).toBeInTheDocument()
    const added = fetchMock.mock.calls.find(([url, init]) => url === '/api/admin/users' && init?.method === 'POST')
    expect(JSON.parse(String(added?.[1]?.body))).toEqual({ email: 'carol@example.com', temporary_password: temporary })
    expect(await screen.findByText('carol@example.com')).toBeInTheDocument()

    // Reset: a fresh temporary password to hand over.
    const bobRow = screen.getByText('bob@example.com').closest('tr')!
    await user.click(within(bobRow).getByRole('button', { name: 'Reset password' }))
    expect(await screen.findByRole('heading', { name: 'Send this to bob@example.com' })).toBeInTheDocument()

    // Remove: only after confirming.
    await user.click(within(screen.getByText('bob@example.com', { selector: 'td' }).closest('tr')!).getByRole('button', { name: 'Remove' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('all their reminders, payments, budget, savings goals and habits')
    await user.click(screen.getByRole('button', { name: 'Yes, remove them' }))
    await waitFor(() => expect(screen.queryByText('bob@example.com', { selector: 'td' })).not.toBeInTheDocument())
    expect(fetchMock.mock.calls.some(([url, init]) => url === '/api/admin/users/id-bob%40example.com' && init?.method === 'DELETE')).toBe(true)
  })
})