import { useEffect, useState } from 'react'
import { clearSession } from '../auth/session'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PowerIcon } from '../components/icons'
import { fetchSystemInfo, keepPresence, requestShutdown } from './system'

type Phase = 'running' | 'confirm' | 'closing' | 'closed'

/**
 * Lives on every page (login included): keeps ROSE alive while this tab is open,
 * and shows the small power button that closes ROSE completely.
 */
export function PowerControl() {
  const [canClose, setCanClose] = useState(false)
  const [phase, setPhase] = useState<Phase>('running')
  const [error, setError] = useState<string | null>(null)
  const closed = phase === 'closed'

  useEffect(() => {
    if (closed) return
    const controller = new AbortController()
    const refreshInfo = () =>
      void fetchSystemInfo()
        .then((info) => !controller.signal.aborted && setCanClose(info.shutdownEnabled))
        .catch(() => undefined)
    void keepPresence(controller.signal, refreshInfo)
    return () => controller.abort()
  }, [closed])

  async function close() {
    setPhase('closing')
    setError(null)
    try {
      await requestShutdown()
      clearSession()
      setPhase('closed')
      // Only works if the browser lets scripts close this tab; otherwise the message below stays.
      window.close()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setPhase('confirm')
    }
  }

  if (closed) {
    return (
      <div className="rose-closed" role="status">
        <PowerIcon size={42} />
        <h1 className="display">ROSE is closed</h1>
        <p className="muted">The API and the web UI have stopped. You can close this tab.</p>
        <p className="muted">Start again with start-rose.bat.</p>
      </div>
    )
  }

  if (!canClose) return null

  return (
    <>
      <button
        type="button"
        className="power-btn no-print"
        title="Close ROSE"
        aria-label="Close ROSE"
        onClick={() => setPhase('confirm')}
      >
        <PowerIcon />
      </button>
      <ConfirmDialog
        open={phase === 'confirm' || phase === 'closing'}
        title="Close ROSE?"
        confirmLabel="Yes, close ROSE"
        busy={phase === 'closing'}
        onConfirm={() => void close()}
        onCancel={() => {
          setError(null)
          setPhase('running')
        }}
      >
        <p>This stops the ROSE API and the web UI and closes the ROSE window.</p>
        <p className="muted">Reminders will not ring until you start ROSE again.</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </ConfirmDialog>
    </>
  )
}