import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  // Server tests run in the `node` environment, which has no localStorage.
  globalThis.localStorage?.clear()
  vi.unstubAllEnvs()
})