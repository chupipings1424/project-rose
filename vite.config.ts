/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Writes dist/precache.json: every file the build produced under assets/ (minus the old
 * .woff fonts - every phone uses the .woff2 copies). The service
 * worker (public/sw.js) saves them so ROSE opens offline, including pages you have
 * not visited yet (their code is split into separate files).
 */
function precacheManifest(): Plugin {
  return {
    name: 'rose-precache-manifest',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((file) => file.startsWith('assets/') && !file.endsWith('.woff')).sort()
      this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify(files) })
    },
  }
}

/**
 * Writes dist/version.json with this build's id. An open app compares it with the id it was
 * built with (src/lib/updates.ts) and offers a reload after a new deploy.
 */
function buildVersion(id: string): Plugin {
  return {
    name: 'rose-build-version',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id }) })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv reads .env files. The '' prefix means "give me every variable",
  // not only the VITE_* ones that are exposed to the browser.
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.ROSE_API_URL || 'http://127.0.0.1:5175'

  // The browser calls /api/* on our own origin and Vite forwards it to the
  // ROSE API (the .NET backend in project-rose-api). Same origin = no CORS.
  const proxy = { '/api': { target: apiUrl, changeOrigin: true } }

  // Unique per build, so a deployed app can tell it is out of date.
  const buildId = Date.now().toString(36)

  return {
    plugins: [react(), precacheManifest(), buildVersion(buildId)],
    define: { __BUILD_ID__: JSON.stringify(buildId) },
    server: { port: 5180, proxy },
    preview: { port: 5180, proxy },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: false,
      // jsdom + user-event page tests run in parallel and can take >5 s each on a busy laptop.
      testTimeout: 20_000,
    },
  }
})