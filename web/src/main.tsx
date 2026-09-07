import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from '@/App'
import { initSentry } from '@/lib/sentry'

// Best-effort: no-op unless VITE_SENTRY_DSN is set. Must run before first render
// so the boundary in App can report the very first errors.
initSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
