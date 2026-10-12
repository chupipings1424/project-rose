import { afterEach, describe, expect, it, vi } from 'vitest'
import { trackerApi } from './client'

function mockFetch(status: number, body: string) {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(body, { status }))))
}

describe('trackerApi delete endpoints', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends DELETE with the encoded title', async () => {
    mockFetch(200, JSON.stringify({ ok: true, deleted_payments: 3, accounts: [] }))
    const result = await trackerApi.deleteAccount('Car Loan')
    expect(result.deleted_payments).toBe(3)
    expect(fetch).toHaveBeenCalledWith('/api/payment-tracker/accounts/Car%20Loan', expect.objectContaining({ method: 'DELETE' }))
  })

  it('explains when the server is too old to support the endpoint', async () => {
    mockFetch(404, '<!doctype html><title>404 Not Found</title>')
    await expect(trackerApi.deleteBudgetYear(2024)).rejects.toThrow(/does not support this yet/)
  })

  it('keeps real server errors as they are', async () => {
    mockFetch(404, JSON.stringify({ error: 'Title not found.' }))
    await expect(trackerApi.deleteAccount('Nope')).rejects.toThrow('Title not found.')
  })
})
