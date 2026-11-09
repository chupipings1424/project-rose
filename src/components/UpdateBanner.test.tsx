import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BUILD_ID } from '../lib/updates'
import { UpdateBanner } from './UpdateBanner'

function serverHas(id: string) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id }), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function comeBackToTheApp() {
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
}

describe('UpdateBanner', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('offers a reload when the server has a newer build', async () => {
    const fetchMock = serverHas('a-newer-build')
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })
    render(<UpdateBanner enabled />)

    await comeBackToTheApp()

    expect(fetchMock).toHaveBeenCalledWith('/version.json', { cache: 'no-store' })
    await userEvent.click(await screen.findByRole('button', { name: /new version of ROSE is ready/i }))
    expect(reload).toHaveBeenCalled()
  })

  it('stays hidden while the build is current', async () => {
    serverHas(BUILD_ID)
    render(<UpdateBanner enabled />)

    await comeBackToTheApp()

    expect(screen.queryByRole('button', { name: /new version/i })).not.toBeInTheDocument()
  })

  it('does not check outside a production build', async () => {
    const fetchMock = serverHas('a-newer-build')
    render(<UpdateBanner enabled={false} />)

    await comeBackToTheApp()

    expect(fetchMock).not.toHaveBeenCalled()
  })
})