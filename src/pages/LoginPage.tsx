import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import { BrandMark } from '../components/Brand'
import { useEntrance } from '../intro/useEntrance'
import { ThemePicker } from '../theme/ThemePicker'

interface LocationState {
  from?: string
}

export default function LoginPage() {
  const { isAuthenticated, login } = useAuth()
  const entrance = useEntrance()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as LocationState | null)?.from ?? '/projects'

  // "Controlled inputs": React state is the single source of truth for the field.
  const [token, setToken] = useState('')
  const [reveal, setReveal] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)

  if (isAuthenticated) return <Navigate to={from} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault() // stop the browser doing a full page reload
    setBusy(true)
    setError(null)
    const result = await login(token)
    setBusy(false)
    if (result.ok) {
      // The gate overlay lives above the router, so it keeps playing while we navigate underneath.
      entrance.open()
      navigate(from, { replace: true })
    } else {
      entrance.deny()
      setError(result.error)
      setShakeKey((k) => k + 1) // changing `key` re-mounts the card, replaying the shake animation
    }
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <BrandMark size={72} />
        <p className="eyebrow">Personal command center</p>
        <h1 className="login-title" data-text="PROJECT ROSE">
          PROJECT ROSE
        </h1>
        <p className="muted">Authenticate to access your projects.</p>
      </section>

      <form key={shakeKey} className={`card login-card${error ? ' shake' : ''}`} onSubmit={handleSubmit}>
        <label htmlFor="token" className="field-label">
          Access token
        </label>
        <div className="token-row">
          <input
            id="token"
            type={reveal ? 'text' : 'password'}
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="••••••••••••"
            autoComplete="current-password"
            autoFocus
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'login-error' : undefined}
          />
          <button
            type="button"
            className="btn ghost"
            onClick={() => setReveal((r) => !r)}
            aria-label={reveal ? 'Hide token' : 'Show token'}
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
          {busy ? 'Verifying…' : 'Authenticate'}
        </button>
      </form>

      <section className="login-themes">
        <h2 className="section-title">Choose your interface</h2>
        <ThemePicker />
      </section>
    </div>
  )
}