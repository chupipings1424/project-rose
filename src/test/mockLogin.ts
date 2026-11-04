import { AuthApiError, type SupabaseClient } from '@supabase/supabase-js'
import { vi } from 'vitest'
import { getSupabase } from '../auth/supabase'

export const TEST_EMAIL = 'rose@example.com'
export const TEST_PASSWORD = 'correct horse battery'
export const TEST_JWT = 'supabase-access-token'

/**
 * A fake Supabase login plus a fake ROSE API answering GET /api/auth/session.
 * The test file must call `vi.mock('<path to>/auth/supabase')` first, so
 * getSupabase() is a mock this helper can program.
 *
 * `allowed: false` makes the API answer 403, like an account missing from the allow-list.
 */
export function mockLogin({ allowed = true } = {}) {
  const auth = {
    signInWithPassword: vi.fn(({ email, password }: { email: string; password: string }) =>
      Promise.resolve(
        email === TEST_EMAIL && password === TEST_PASSWORD
          ? { data: { session: { access_token: TEST_JWT }, user: { email } }, error: null }
          : {
              data: { session: null, user: null },
              error: new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'),
            },
      ),
    ),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    getSession: vi.fn(() => Promise.resolve({ data: { session: { access_token: TEST_JWT } }, error: null })),
  }
  vi.mocked(getSupabase).mockResolvedValue({ auth } as unknown as SupabaseClient)

  const fetchMock = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) => {
    const body = allowed
      ? { authenticated: true, email: TEST_EMAIL, expires_at: '2099-01-01T00:00:00Z' }
      : { status: 403, title: 'Forbidden' }
    return Promise.resolve(
      new Response(JSON.stringify(body), { status: allowed ? 200 : 403, headers: { 'Content-Type': 'application/json' } }),
    )
  })
  vi.stubGlobal('fetch', fetchMock)
  return { auth, fetchMock }
}