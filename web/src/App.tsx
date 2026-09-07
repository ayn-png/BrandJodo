import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import { router } from '@/app/router'
import { ErrorBoundary } from '@/app/ErrorBoundary'

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </AuthProvider>
  )
}
