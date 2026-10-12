import { useEffect, useState } from 'react'
import { useToast } from '../../../components/toast/useToast'
import { remindersApi } from '../api/client'
import { disablePush, enablePush, getPushState, type PushState } from '../lib/push'

const HELP: Record<PushState, string> = {
  on: 'This browser shows a Windows notification whenever a reminder rings.',
  off: 'Turn on notifications to get a Windows notification for each reminder, even when the ROSE tab is closed.',
  install: 'Phones are not supported yet. Use ROSE on your PC for reminder notifications.',
  insecure: 'Notifications only work at http://localhost:5180 on this PC.',
  denied: 'Notifications are blocked. Click the lock icon in the address bar → Notifications → Allow.',
  unsupported: 'This browser cannot receive push notifications. The desktop popup on your PC still works.',
}

/** Shows whether this device will get push notifications and lets you turn them on. */
export function NotificationCard() {
  const notify = useToast()
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    getPushState().then(
      (next) => !cancelled && setState(next),
      () => !cancelled && setState('unsupported'),
    )
    return () => {
      cancelled = true
    }
  }, [])

  async function run(action: () => Promise<void>, success: string) {
    setBusy(true)
    try {
      await action()
      setState(await getPushState())
      notify(success, 'success')
    } catch (error) {
      notify((error as Error).message, 'error')
      setState(await getPushState().catch(() => 'unsupported' as const))
    } finally {
      setBusy(false)
    }
  }

  if (!state) return null

  return (
    <section className={`card push-card is-${state}`} aria-live="polite">
      <div className="push-card-text">
        <h2 className="section-title">Browser notifications</h2>
        <p className="muted small">{HELP[state]}</p>
      </div>
      <div className="button-row">
        {state === 'off' && (
          <button type="button" className="btn primary" disabled={busy} onClick={() => void run(enablePush, 'Notifications are on')}>
            🔔 Enable notifications
          </button>
        )}
        {state === 'on' && (
          <>
            <button
              type="button"
              className="btn primary"
              disabled={busy}
              onClick={() => void run(async () => void (await remindersApi.testPush()), 'Test sent - check your notifications')}
            >
              Send a test
            </button>
            <button type="button" className="btn ghost" disabled={busy} onClick={() => void run(disablePush, 'Notifications are off')}>
              Turn off
            </button>
          </>
        )}
      </div>
    </section>
  )
}