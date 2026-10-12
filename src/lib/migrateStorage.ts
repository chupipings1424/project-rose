/**
 * The app used to be called "Project Febvy" and saved settings under `febvy.*`.
 * This copies those settings to the new `rose.*` keys once, so a rename doesn't
 * reset your theme or currency. The old login session is deliberately *not*
 * carried over: the access token changed, so everyone signs in again.
 */
export const LEGACY_KEYS: Readonly<Record<string, string | null>> = {
  'febvy.theme': 'rose.theme',
  'febvy.currency': 'rose.currency',
  'febvy.gate.muted': 'rose.gate.muted',
  'febvy.session': null,
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