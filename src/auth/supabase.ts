/**
 * The Supabase client - Supabase Auth checks your email and password and hands out
 * short-lived access tokens (JWTs) that the ROSE API verifies on every request.
 *
 * The Supabase URL and public key are not baked into the build: the API serves them
 * from GET /api/config, so the same build works locally and in the cloud.
 * The client keeps its own session (access + refresh token) in localStorage and
 * refreshes the access token by itself before it expires.
 *
 * supabase-js is loaded with a dynamic import(), so Vite puts it in its own chunk and
 * the first page load stays small.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { loadSession } from './session'

export const CONFIG_URL = '/api/config'

interface ClientConfig {
  supabase_url: string
  supabase_key: string
}

let client: Promise<SupabaseClient> | undefined

async function create(): Promise<SupabaseClient> {
  const response = await fetch(CONFIG_URL)
  if (!response.ok) throw new Error(`GET ${CONFIG_URL} failed (${response.status})`)
  const config = (await response.json()) as ClientConfig
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(config.supabase_url, config.supabase_key, {
    auth: { storageKey: 'rose.supabase', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  })
}

/** The one shared client, created on first use. A failed attempt is retried next time. */
export function getSupabase(): Promise<SupabaseClient> {
  client ??= create().catch((error: unknown) => {
    client = undefined
    throw error
  })
  return client
}

/** A valid access token for the ROSE API, or null when nobody is logged in. */
export async function accessToken(): Promise<string | null> {
  if (!loadSession()) return null // logged out: don't even load the client
  // Offline: refreshing the token would retry for ~30 s; the service worker answers from its saved copy anyway.
  if (navigator.onLine === false) return null
  try {
    const { data } = await (await getSupabase()).auth.getSession() // refreshes when needed
    return data.session?.access_token ?? null
  } catch {
    return null
  }
}