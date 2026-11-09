import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { announceDataChanged } from '../lib/dataEvents'
import { useAutoRefresh } from './useAutoRefresh'

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useAutoRefresh', () => {
  it('reloads after a change is announced (e.g. a quick add save)', () => {
    const reload = vi.fn()
    renderHook(() => useAutoRefresh(reload))

    announceDataChanged()

    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('reloads when the app comes back to the foreground, not when it goes away', () => {
    const reload = vi.fn()
    renderHook(() => useAutoRefresh(reload))

    setVisibility('hidden')
    expect(reload).not.toHaveBeenCalled()
    setVisibility('visible')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('stops listening once the page is closed', () => {
    const reload = vi.fn()
    const { unmount } = renderHook(() => useAutoRefresh(reload))

    unmount()
    announceDataChanged()
    setVisibility('visible')

    expect(reload).not.toHaveBeenCalled()
  })
})