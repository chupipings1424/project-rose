/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // loadEnv reads .env files. The '' prefix means "give me every variable",
  // not only the VITE_* ones that are exposed to the browser.
  const env = loadEnv(mode, process.cwd(), '')
  const trackerUrl = env.PAYMENT_TRACKER_URL || 'http://127.0.0.1:5174'

  // The browser talks to /api/payment-tracker/* on our own origin and Vite
  // forwards it to the Flask server. That avoids CORS entirely and gives every
  // future project its own namespace (/api/<project-id>/...).
  const remindersUrl = `http://127.0.0.1:${env.REMINDERS_PORT || '5176'}`

  const proxy = {
    '/api/payment-tracker': {
      target: trackerUrl,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api\/payment-tracker/, '/api'),
    },
    // The reminders worker (server/index.ts) already serves /api/reminders/*, so no rewrite.
    '/api/reminders': { target: remindersUrl, changeOrigin: true },
  }

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