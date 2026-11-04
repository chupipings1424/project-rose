import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { passwordProblem } from '../auth/authService'
import { useAuth } from '../auth/useAuth'
import { BrandMark } from '../components/Brand'

export default function ChangePasswordPage() {
  const { session, changePassword, logout } = useAuth()
  const navigate = useNavigate()
  const required = session?.mustChangePassword === true

  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [reveal, setReveal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problem = passwordProblem(password, confirmation)
    if (problem) {
      setError(problem)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await changePassword(password)
      navigate('/projects', { replace: true })
    } catch (failure) {
      setError((failure as Error).message)
      setBusy(false)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <BrandMark size={72} />
        <p className="eyebrow">{session?.email}</p>
        <h1 className="login-title" data-text="NEW PASSWORD">
          NEW PASSWORD
        </h1>
        <p className="muted">
          {required
            ? 'You signed in with a temporary password. Choose your own to continue.'
            : 'Choose a new password for your account.'}
        </p>
      </section>

      <form className="card login-card" onSubmit={handleSubmit} noValidate>
        <label htmlFor="new-password" className="field-label">
          New password
        </label>
        <div className="token-row">
          <input
            id="new-password"
            type={reveal ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            autoFocus
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'password-error' : undefined}
          />
          <button
            type="button"
            className="btn ghost"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? 'Hide passwords' : 'Show passwords'}
          >
            {reveal ? 'Hide' : 'Show'}
          </button>
        </div>
        <label htmlFor="confirm-password" className="field-label">
          Type it again
        </label>
        <input
          id="confirm-password"
          type={reveal ? 'text' : 'password'}
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="new-password"
          required
        />
        {error && (
          <p id="password-error" className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn primary btn-block" disabled={busy}>
          {busy ? 'Saving…' : 'Save password'}
        </button>
        <div className="button-row">
          {!required && (
            <button type="button" className="btn ghost" onClick={() => navigate(-1)}>
              Cancel
            </button>
          )}
          <button type="button" className="btn ghost" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </form>
    </div>
  )
}