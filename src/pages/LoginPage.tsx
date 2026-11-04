import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { BrandMark } from '../components/Brand'
import { ThemePicker } from '../theme/ThemePicker'

interface LocationState {
  from?: string
}

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState | null)?.from ?? '/projects'

  // "Controlled inputs": React state is the single source of truth for each field.
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (isAuthenticated) return <Navigate to={from} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault() // stop the browser doing a full page reload
    setBusy(true)
    setError(null)
    const result = await login(email, password)
    setBusy(false)
    if (result.ok) navigate(from, { replace: true })
    else setError(result.error)
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <BrandMark size={72} />
        <p className="eyebrow">Personal command center</p>
        <h1 className="login-title" data-text="PROJECT ROSE">
          PROJECT ROSE
        </h1>
        <p className="muted">Sign in to access your projects.</p>
      </section>

      <form className="card login-card" onSubmit={handleSubmit}>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="username"
          autoFocus
          required
        />
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <div className="token-row">
          <input
            id="password"
            type={reveal ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
          />
          <button
            type="button"
            className="btn ghost"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? 'Hide password' : 'Show password'}
          >
            {reveal ? 'Hide' : 'Show'}
          </button>
        </div>
        {error && (
          <p id="login-error" className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn primary btn-block" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="muted small">You stay signed in on this device for 30 days.</p>
      </form>

      <section className="login-themes">
        <h2 className="section-title">Choose your interface</h2>
        <ThemePicker />
      </section>
    </div>
  )
}