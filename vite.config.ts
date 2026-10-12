/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv reads .env files. The '' prefix means "give me every variable",
  // not only the VITE_* ones that are exposed to the browser.
  const env = loadEnv(mode, process.cwd(), '')
  const apiUrl = env.ROSE_API_URL || 'http://127.0.0.1:5175'

  // The browser calls /api/* on our own origin and Vite forwards it to the
  // ROSE API (the .NET backend in project-rose-api). Same origin = no CORS.
  const proxy = { '/api': { target: apiUrl, changeOrigin: true } }

  return {
    plugins: [react()],
    server: { port: 5180, proxy },
    preview: { port: 5180, proxy },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      css: false,
    },
  }
})