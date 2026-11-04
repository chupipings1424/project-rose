import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { temporaryPassword, usersApi, type RoseUser } from '../admin/usersApi'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ErrorState, LoadingState } from '../components/States'
import { useToast } from '../components/toast/useToast'

/** The temporary password to hand over, shown once after adding or resetting an account. */
interface Handover {
  email: string
  password: string
}

function status(user: RoseUser): { label: string; className: string } {
  if (user.isAdmin) return { label: 'Admin', className: 'badge badge-due' }
  if (user.mustChangePassword) return { label: 'Temporary password', className: 'badge' }
  return { label: 'Active', className: 'badge badge-clear' }
}

/** Admins add, reset and remove ROSE accounts here. Each account only ever sees its own data. */
export default function AdminUsersPage() {
  const notify = useToast()
  const [users, setUsers] = useState<RoseUser[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState(temporaryPassword)
  const [busy, setBusy] = useState(false)
  const [handover, setHandover] = useState<Handover | null>(null)
  const [removing, setRemoving] = useState<RoseUser | null>(null)

  const fetchUsers = useCallback(
    () => usersApi.list().then(setUsers, (error: Error) => setLoadError(error.message)),
    [],
  )
  const load = useCallback(() => {
    setLoadError(null)
    void fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    try {
      const added = await usersApi.add(email, password)
      setHandover({ email: added.email, password })
      setEmail('')
      setPassword(temporaryPassword())
      notify(`${added.email} can now sign in`, 'success')
      load()
    } catch (error) {
      notify((error as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleReset(user: RoseUser) {
    const next = temporaryPassword()
    setBusy(true)
    try {
      await usersApi.resetPassword(user.id, next)
      setHandover({ email: user.email, password: next })
      notify(`New temporary password for ${user.email}`, 'success')
      load()
    } catch (error) {
      notify((error as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (!removing) return
    setBusy(true)
    try {
      await usersApi.remove(removing.id)
      notify(`${removing.email} was removed`, 'success')
      if (handover?.email === removing.email) setHandover(null)
      setRemoving(null)
      load()
    } catch (error) {
      notify((error as Error).message, 'error')
    } finally {
      setBusy(false)
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      notify('Copied', 'success')
    } catch {
      notify('Could not copy - select the password and copy it yourself', 'error')
    }
  }

  return (
    <div className="stack">
      <header className="hub-head">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="display">Users</h1>
          <p className="muted">Everyone gets every project, but only ever sees their own data.</p>
        </div>
      </header>

      <form className="card grid-form" onSubmit={handleAdd} aria-label="Add a user">
        <div>
          <label htmlFor="new-user-email" className="field-label">
            Email
          </label>
          <input
            id="new-user-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="friend@example.com"
            autoComplete="off"
            required
          />
        </div>
        <div>
          <label htmlFor="new-user-password" className="field-label">
            Temporary password
          </label>
          <div className="token-row">
            <input
              id="new-user-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              minLength={8}
              required
            />
            <button type="button" className="btn ghost" onClick={() => setPassword(temporaryPassword())}>
              New
            </button>
          </div>
        </div>
        <div className="form-actions span-all">
          <button type="submit" className="btn primary" disabled={busy}>
            Add user
          </button>
          <span className="muted small">They must choose their own password the first time they sign in.</span>
        </div>
      </form>

      {handover && (
        <section className="card" aria-live="polite">
          <h2 className="section-title">Send this to {handover.email}</h2>
          <p className="muted small">Shown only now. Send it privately (not in a group chat).</p>
          <div className="button-row">
            <code className="display" aria-label="Temporary password">
              {handover.password}
            </code>
            <button type="button" className="btn ghost" onClick={() => void copy(handover.password)}>
              Copy
            </button>
            <button type="button" className="btn ghost" onClick={() => setHandover(null)}>
              Done
            </button>
          </div>
        </section>
      )}

      {loadError ? (
        <ErrorState error={loadError} onRetry={load} />
      ) : !users ? (
        <LoadingState label="Loading users…" />
      ) : (
        <section className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const badge = status(user)
                  return (
                    <tr key={user.id}>
                      <td>{user.email}</td>
                      <td>
                        <span className={badge.className}>{badge.label}</span>
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td>
                        {!user.isAdmin && (
                          <div className="button-row">
                            <button type="button" className="btn ghost" disabled={busy} onClick={() => void handleReset(user)}>
                              Reset password
                            </button>
                            <button type="button" className="btn danger" disabled={busy} onClick={() => setRemoving(user)}>
                              Remove
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={removing !== null}
        title="Remove user"
        confirmLabel="Yes, remove them"
        busy={busy}
        onConfirm={() => void handleRemove()}
        onCancel={() => setRemoving(null)}
      >
        <p>
          Remove <strong>{removing?.email}</strong>? Their login and all their reminders, payments, budget, savings goals
          and habits are deleted. This cannot be undone.
        </p>
      </ConfirmDialog>
    </div>
  )
}