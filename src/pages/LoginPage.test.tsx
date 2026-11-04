import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { mockLogin, TEST_EMAIL, TEST_PASSWORD } from '../test/mockLogin'
import { ThemeProvider } from '../theme/ThemeProvider'
import LoginPage from './LoginPage'

vi.mock('../auth/supabase')

function renderApp(startAt = '/projects') {
  return render(
    <MemoryRouter initialEntries={[startAt]}>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/projects" element={<h1>Projects hub</h1>} />
            </Route>
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear()
    mockLogin()
  })
  afterEach(() => vi.unstubAllGlobals())

  it('redirects a visitor without a session to the login page', () => {
    renderApp('/projects')
    expect(screen.getByRole('heading', { name: 'PROJECT ROSE' })).toBeInTheDocument()
  })

  it('shows an error for a wrong password and stays on the login page', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.type(screen.getByLabelText('Email'), TEST_EMAIL)
    await user.type(screen.getByLabelText('Password'), 'not-the-password')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong email or password.')
    expect(screen.queryByText('Projects hub')).not.toBeInTheDocument()
  })

  it('signs in with the right password and lands where you were going', async () => {
    const user = userEvent.setup()
    renderApp('/projects')

    await user.type(screen.getByLabelText('Email'), TEST_EMAIL)
    await user.type(screen.getByLabelText('Password'), TEST_PASSWORD)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Projects hub')).toBeInTheDocument()
  })

  it('switches theme from the picker', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('radio', { name: /Matrix/ }))

    expect(document.documentElement.dataset.theme).toBe('matrix')
    expect(localStorage.getItem('rose.theme')).toBe('matrix')
  })
})