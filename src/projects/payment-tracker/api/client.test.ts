import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveSession } from '../../../auth/session'
import { trackerApi } from './client'

function mockFetch(status: number, body: string, headers?: HeadersInit) {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(body, { status, headers }))))
}

describe('trackerApi', () => {
  beforeEach(() => saveSession({ accessToken: 'jwt', authenticatedAt: 0, expiresAt: Date.now() + 60_000 }))
  afterEach(() => vi.unstubAllGlobals())

  it('sends DELETE with the encoded title and the session token', async () => {
    mockFetch(200, JSON.stringify({ ok: true, deleted_payments: 3, accounts: [] }))
    const result = await trackerApi.deleteAccount('Car Loan')
    expect(result.deleted_payments).toBe(3)
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('/api/payment-tracker/accounts/Car%20Loan')
    expect(init?.method).toBe('DELETE')
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer jwt')
  })

  it('shows the API message for a missing title', async () => {
    mockFetch(404, JSON.stringify({ status: 404, title: 'Not Found', detail: 'Title not found.' }))
    await expect(trackerApi.deleteAccount('Nope')).rejects.toThrow('Title not found.')
  })

  it('downloads the workbook with the name the API suggests', async () => {
    mockFetch(200, 'xlsx-bytes', { 'Content-Disposition': 'attachment; filename=payments.xlsx' })
    URL.createObjectURL = vi.fn(() => 'blob:rose')
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)

    await trackerApi.download()

    expect(fetch).toHaveBeenCalledWith('/api/payment-tracker/download', expect.anything())
    const link = click.mock.contexts[0] as HTMLAnchorElement
    expect(link.download).toBe('payments.xlsx')
    expect(link.href).toBe('blob:rose')
    click.mockRestore()
  })
})