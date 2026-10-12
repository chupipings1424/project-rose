import { vi } from 'vitest'

export const TEST_TOKEN = 'test-token-123'

/** Replaces fetch with a fake POST /api/auth/login that accepts TEST_TOKEN only. */
export function mockLoginApi() {
  const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
    const { token } = JSON.parse(String(init?.body ?? '{}')) as { token?: string }
    const ok = token === TEST_TOKEN
    const body = ok
      ? { access_token: 'session-jwt', token_type: 'Bearer', expires_at: '2099-01-01T00:00:00.000Z' }
      : { status: 401, title: 'Unauthorized', detail: 'Access denied - that token is not valid.' }
    return Promise.resolve(
      new Response(JSON.stringify(body), { status: ok ? 200 : 401, headers: { 'Content-Type': 'application/json' } }),
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}