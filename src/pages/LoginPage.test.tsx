import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { ProtectedRoute } from '../auth/ProtectedRoute'
import { EntranceProvider } from '../intro/EntranceProvider'
import { mockLoginApi, TEST_TOKEN } from '../test/mockLoginApi'
import { ThemeProvider } from '../theme/ThemeProvider'
import LoginPage from './LoginPage'

function renderApp(startAt = '/projects') {
  return render(
    <MemoryRouter initialEntries={[startAt]}>
      <ThemeProvider>
        <AuthProvider>
          <EntranceProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/projects" element={<h1>Projects hub</h1>} />
              </Route>
            </Routes>
          </EntranceProvider>
        </AuthProvider>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => mockLoginApi())
  afterEach(() => vi.unstubAllGlobals())

  it('redirects a visitor without a session to the login page', () => {
    renderApp('/projects')
    expect(screen.getByRole('heading', { name: 'PROJECT ROSE' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows an error for a wrong token and keeps the gate shut', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.type(screen.getByLabelText('Access token'), 'not-the-token')
    await user.click(screen.getByRole('button', { name: 'Authenticate' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/denied/i)
    expect(document.querySelector('.login-card')).toHaveClass('shake')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Projects hub')).not.toBeInTheDocument()
  })

  it('opens the gate on the right token and lands where you were going', async () => {
    const user = userEvent.setup()
    renderApp('/projects')

    await user.type(screen.getByLabelText('Access token'), TEST_TOKEN)
    await user.click(screen.getByRole('button', { name: 'Authenticate' }))

    expect(await screen.findByText('Projects hub')).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: /access granted/i })).toBeInTheDocument()
  })

  it('switches theme from the picker', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('radio', { name: /Matrix/ }))

    expect(document.documentElement.dataset.theme).toBe('matrix')
    expect(localStorage.getItem('rose.theme')).toBe('matrix')
  })
})