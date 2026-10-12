/**
 * Lets ROSE close itself. Two ways, both handled by the API (Lifetime/ in project-rose-api):
 *
 *   - presence: every open ROSE page holds one long request open. When the last
 *     page is closed, the API waits 20 seconds (a reload reconnects well within
 *     that) and then shuts down. The launcher sees that and closes everything.
 *   - the power button: asks the API to shut down right away.
 *
 * Both only work when ROSE was started by start-rose.bat / npm start.
 */
import { errorMessage } from '../api/http'

export const SYSTEM_API = '/api/system'
/** A custom header makes the browser block other websites from sending this request. */
const CLIENT_HEADERS = { 'X-Rose-Client': '1' }
const RECONNECT_MS = 3_000

export interface SystemInfo {
  shutdownEnabled: boolean
  idleTimeoutSeconds: number
}

export async function fetchSystemInfo(): Promise<SystemInfo> {
  const response = await fetch(`${SYSTEM_API}/info`, { headers: CLIENT_HEADERS })
  if (!response.ok) throw new Error(`System info failed (${response.status})`)
  const body = (await response.json()) as { shutdown_enabled: boolean; idle_timeout_seconds: number }
  return { shutdownEnabled: body.shutdown_enabled, idleTimeoutSeconds: body.idle_timeout_seconds }
}

export async function requestShutdown(): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${SYSTEM_API}/shutdown`, { method: 'POST', headers: CLIENT_HEADERS })
  } catch {
    throw new Error('ROSE is not running any more.')
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined)
    throw new Error(errorMessage(body) ?? `Could not close ROSE (${response.status}).`)
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    })
  })
}

/**
 * Holds the presence stream open until `signal` aborts, reconnecting whenever it
 * drops (API restart, laptop sleep). Calls `onConnected` each time it (re)connects.
 */
export async function keepPresence(signal: AbortSignal, onConnected: () => void): Promise<void> {
  while (!signal.aborted) {
    try {
      const response = await fetch(`${SYSTEM_API}/presence`, { headers: CLIENT_HEADERS, cache: 'no-store', signal })
      if (response.ok && response.body) {
        onConnected()
        const reader = response.body.getReader()
        // The API only sends a ": ping" now and then; we just wait for the stream to end.
        while (!(await reader.read()).done) {
          /* still here */
        }
      }
    } catch {
      // offline, or aborted because the page is closing
    }
    if (!signal.aborted) await sleep(RECONNECT_MS, signal)
  }
}