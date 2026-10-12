import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SESSION_KEY, saveSession } from '../auth/session'
import { PowerControl } from './PowerControl'
import { SYSTEM_API, keepPresence, requestShutdown } from './system'

/** A presence stream that stays open until the request is aborted, like the real one. */
function openStream(signal?: AbortSignal | null) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      signal?.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')))
    },
  })
}

function fakeApi({ enabled = true, shutdownStatus = 202 } = {}) {
  const fetchMock = vi.fn((url: string, init?: RequestInit) => {
    if (url === `${SYSTEM_API}/info`)
      return Promise.resolve(Response.json({ shutdown_enabled: enabled, idle_timeout_seconds: 20 }))
    if (url === `${SYSTEM_API}/presence`) return Promise.resolve(new Response(openStream(init?.signal)))
    if (url === `${SYSTEM_API}/shutdown`)
      return Promise.resolve(
        shutdownStatus === 202
          ? new Response(null, { status: 202 })
          : Response.json({ detail: 'Auto-close is off.' }, { status: shutdownStatus }),
      )
    return Promise.reject(new Error(`unexpected ${url}`))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const callsTo = (fetchMock: ReturnType<typeof fakeApi>, path: string) =>
  fetchMock.mock.calls.filter(([url]) => url === `${SYSTEM_API}/${path}`)

describe('PowerControl', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('stays hidden when ROSE was not started by the launcher', async () => {
    const fetchMock = fakeApi({ enabled: false })
    render(<PowerControl />)

    await waitFor(() => expect(callsTo(fetchMock, 'info')).toHaveLength(1))
    expect(screen.queryByRole('button', { name: 'Close ROSE' })).not.toBeInTheDocument()
    expect(callsTo(fetchMock, 'presence')).toHaveLength(1)
  })

  it('closes ROSE after confirming, and forgets the login', async () => {
    const fetchMock = fakeApi()
    vi.spyOn(window, 'close').mockImplementation(() => undefined)
    saveSession({ accessToken: 'jwt', authenticatedAt: 0, expiresAt: Date.now() + 60_000 })
    render(<PowerControl />)

    await userEvent.click(await screen.findByRole('button', { name: 'Close ROSE' }))
    expect(callsTo(fetchMock, 'shutdown')).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: 'Yes, close ROSE', hidden: true }))

    expect(await screen.findByText('ROSE is closed')).toBeInTheDocument()
    const [, init] = callsTo(fetchMock, 'shutdown')[0]
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('X-Rose-Client')).toBe('1')
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull()
    expect(window.close).toHaveBeenCalled()
  })

  it('shows the API message when closing is refused', async () => {
    fakeApi({ shutdownStatus: 409 })
    render(<PowerControl />)

    await userEvent.click(await screen.findByRole('button', { name: 'Close ROSE' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes, close ROSE', hidden: true }))

    expect(await screen.findByText('Auto-close is off.')).toBeInTheDocument()
    expect(screen.queryByText('ROSE is closed')).not.toBeInTheDocument()
  })
})

describe('system', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('reconnects the presence stream when it drops', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(() => Promise.resolve(new Response('')))
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    const connected = vi.fn()

    const done = keepPresence(controller.signal, connected)
    await vi.advanceTimersByTimeAsync(3_100)
    controller.abort()
    await done

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(connected).toHaveBeenCalledTimes(2)
  })

  it('explains when ROSE is already gone', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(requestShutdown()).rejects.toThrow('ROSE is not running any more.')
  })
})