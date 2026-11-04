/**
 * The app used to be called "Project Febvy" and saved settings under `febvy.*`.
 * This copies those settings to the new `rose.*` keys once, so a rename doesn't
 * reset your theme or currency. Old login sessions are deliberately *not*
 * carried over: everyone signs in again.
 */
export const LEGACY_KEYS: Readonly<Record<string, string | null>> = {
  'febvy.theme': 'rose.theme',
  'febvy.currency': 'rose.currency',
  'febvy.session': null,
  // The login animation (and its sound toggle) was removed.
  'febvy.gate.muted': null,
  'rose.gate.muted': null,
  // Old token logins (12 hours). Logins are now Supabase accounts, remembered under rose.login.
  'rose.session': null,
}

export function migrateLegacyStorage(storage: Storage = localStorage): void {
  try {
    for (const [oldKey, newKey] of Object.entries(LEGACY_KEYS)) {
      const value = storage.getItem(oldKey)
      if (value === null) continue
      if (newKey && storage.getItem(newKey) === null) storage.setItem(newKey, value)
      storage.removeItem(oldKey)
    }
  } catch {
    // storage unavailable (private mode): nothing to migrate
  }
}