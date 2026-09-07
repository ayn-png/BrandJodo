import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui'
import { captureException } from '@/lib/sentry'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// Top-level error boundary. Renders a friendly recovery screen instead of a
// blank page and forwards the stack to Sentry (when configured).
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    captureException(error, { componentStack: info.componentStack })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-ink font-display text-xl font-semibold text-white">
            A
          </span>
          <h1 className="font-display text-2xl font-semibold text-ink">Something went wrong</h1>
          <p className="max-w-md text-sm text-mist">
            An unexpected error occurred. Reload the page to continue — if it keeps happening,
            our team has been notified automatically.
          </p>
          <div className="flex items-center gap-3">
            <Button onClick={() => window.location.reload()}>Reload page</Button>
            <Button variant="secondary" onClick={() => (window.location.href = '/')}>
              Back to home
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}