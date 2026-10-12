import { describe, expect, it } from 'vitest'
import { migrateLegacyStorage } from './migrateStorage'

describe('migrateLegacyStorage', () => {
  it('moves febvy.* settings to rose.* and drops the old session', () => {
    localStorage.setItem('febvy.theme', 'matrix')
    localStorage.setItem('febvy.currency', 'EUR')
    localStorage.setItem('febvy.session', '{"authenticatedAt":1,"expiresAt":2}')

    migrateLegacyStorage()

    expect(localStorage.getItem('rose.theme')).toBe('matrix')
    expect(localStorage.getItem('rose.currency')).toBe('EUR')
    expect(localStorage.getItem('rose.session')).toBeNull()
    expect(Object.keys(localStorage).filter((key) => key.startsWith('febvy.'))).toEqual([])
  })

  it('never overwrites a setting that already exists under the new name', () => {
    localStorage.setItem('rose.theme', 'solar')
    localStorage.setItem('febvy.theme', 'matrix')

    migrateLegacyStorage()

    expect(localStorage.getItem('rose.theme')).toBe('solar')
    expect(localStorage.getItem('febvy.theme')).toBeNull()
  })
})