import * as Sentry from '@sentry/react'

// Optional runtime error tracking. Nothing happens (no network calls, no UI
// changes) unless VITE_SENTRY_DSN is configured in web/.env.
const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined

export const isSentryConfigured = Boolean(DSN)

export function initSentry(): void {
  if (!DSN) return
  Sentry.init({
    dsn: DSN,
    environment: import.meta.env.MODE,
    // Sample traces lightly; the marketplace is low-traffic, this keeps quotas sane.
    tracesSampleRate: 0.1,
    integrations: [Sentry.browserTracingIntegration()],
  })
}

// Thin wrapper so the rest of the app never touches Sentry when it's disabled.
export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!isSentryConfigured) return
  Sentry.captureException(error, context ? { extra: context } : undefined)
}

export { Sentry }