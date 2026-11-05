import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from '../api/http'
import { OfflineBanner } from '../components/OfflineBanner'
import { API_CACHE, clearOfflineData, isOffline, noteResponse, OFFLINE_HEADER, VIEW_ONLY_MESSAGE } from './offline'

const saved = () => new Response('{}', { headers: { [OFFLINE_HEADER]: '1' } })
const fresh = () => new Response('{}')

describe('offline mode', () => {
  afterEach(() => {
    noteResponse(fresh())
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('counts a saved (service worker) answer as offline until a fresh one arrives', () => {
    expect(isOffline()).toBe(false)
    noteResponse(saved())
    expect(isOffline()).toBe(true)
    noteResponse(fresh())
    expect(isOffline()).toBe(false)
  })

  it('shows the banner while offline and hides it when back online', () => {
    render(<OfflineBanner />)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    act(() => noteResponse(saved()))
    expect(screen.getByRole('status')).toHaveTextContent(/Offline/)

    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('blocks saving while offline but still reads', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const fetchMock = vi.fn(() => Promise.resolve(fresh()))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiFetch('/api/reminders/items', { method: 'POST', body: '{}' })).rejects.toThrow(VIEW_ONLY_MESSAGE)
    expect(fetchMock).not.toHaveBeenCalled()

    await apiFetch('/api/reminders/items')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('forgets the saved answers on log out', async () => {
    const remove = vi.fn(() => Promise.resolve(true))
    vi.stubGlobal('caches', { delete: remove })
    await clearOfflineData()
    expect(remove).toHaveBeenCalledWith(API_CACHE)
  })
})