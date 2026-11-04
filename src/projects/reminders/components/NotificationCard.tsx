import { useCallback, useEffect, useState } from 'react'
import { useToast } from '../../../components/toast/useToast'
import { remindersApi, type PushDevice } from '../api/client'
import { currentEndpoint, disablePush, enablePush, getPushState, type PushState } from '../lib/push'

const HELP: Record<PushState, string> = {
  on: 'This device gets a notification whenever a reminder rings or a habit nudges.',
  off: 'Turn on notifications on the phones where you want a pop-up. Leave it off on this device to get emails only.',
  install: 'On iPhone, add ROSE to your Home Screen first (Share > Add to Home Screen), open it from there and turn notifications on.',
  insecure: 'Notifications need a secure connection: open ROSE from its https:// address (or http://localhost).',
  denied: 'Notifications are blocked. Click the lock icon in the address bar → Notifications → Allow.',
  unsupported: 'This browser cannot receive push notifications. On iPhone, add ROSE to your Home Screen first (Share > Add to Home Screen) and open it from there.',
}

/**
 * Whether this device gets push notifications (turn them on/off), plus every device of yours
 * that does. Reminders are also emailed, so a device without notifications misses nothing.
 */
export function NotificationCard() {
  const notify = useToast()
  const [state, setState] = useState<PushState | null>(null)
  const [devices, setDevices] = useState<PushDevice[]>([])
  const [here, setHere] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const showDevices = useCallback(([list, endpoint]: [PushDevice[], string | null]) => {
    setDevices(list)
    setHere(endpoint)
  }, [])
  const refreshDevices = useCallback(
    () => Promise.all([remindersApi.devices().catch(() => []), currentEndpoint()]).then(showDevices),
    [showDevices],
  )

  useEffect(() => {
    let cancelled = false
    getPushState().then(
      (next) => !cancelled && setState(next),
      () => !cancelled && setState('unsupported'),
    )
    Promise.all([remindersApi.devices().catch(() => []), currentEndpoint()]).then(
      (found) => !cancelled && showDevices(found),
      () => undefined,
    )
    return () => {
      cancelled = true
    }
  }, [showDevices])

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
      await refreshDevices()
      setBusy(false)
    }
  }

  const removeDevice = (device: PushDevice) =>
    run(async () => {
      if (device.endpoint === here) await disablePush()
      else await remindersApi.unsubscribe(device.endpoint)
    }, `${device.label} will not get notifications any more`)

  if (!state) return null

  return (
    <section className={`card push-card is-${state}`} aria-live="polite">
      <div className="push-card-text">
        <h2 className="section-title">Notifications</h2>
        <p className="muted small">{HELP[state]}</p>
        <p className="muted small">Every reminder and habit nudge is also emailed to you the first time it rings.</p>
        {devices.length > 0 && (
          <ul className="push-devices" aria-label="Devices with notifications">
            {devices.map((device) => (
              <li key={device.endpoint}>
                <span>
                  {device.label}
                  {device.endpoint === here && <span className="badge badge-clear">This device</span>}
                </span>
                <button
                  type="button"
                  className="btn ghost"
                  disabled={busy}
                  onClick={() => void removeDevice(device)}
                  aria-label={`Remove ${device.label}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
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