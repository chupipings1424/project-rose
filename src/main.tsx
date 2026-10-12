import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/cinzel/700.css'
import '@fontsource/cinzel/900.css'
import '@fontsource/orbitron/500.css'
import '@fontsource/orbitron/700.css'
import '@fontsource/orbitron/900.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import './styles/global.css'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { ToastProvider } from './components/toast/ToastProvider'
import { CurrencyProvider } from './currency/CurrencyProvider'
import { EntranceProvider } from './intro/EntranceProvider'
import { migrateLegacyStorage } from './lib/migrateStorage'
import { registerServiceWorker } from './lib/serviceWorker'
import { ThemeProvider } from './theme/ThemeProvider'

// Must run before the providers read their saved settings.
migrateLegacyStorage()
// Needed for reminder push notifications (public/sw.js).
registerServiceWorker()

// Providers wrap the app so any component can reach theme, currency, auth, toasts and the
// entrance gate through hooks (useTheme, useCurrency, useAuth, useToast, useEntrance).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <CurrencyProvider>
          <AuthProvider>
            <ToastProvider>
              <EntranceProvider>
                <App />
              </EntranceProvider>
            </ToastProvider>
          </AuthProvider>
        </CurrencyProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)