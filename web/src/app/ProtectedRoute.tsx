import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { SocialLinksGate } from '@/features/profiles/SocialLinksGate'
import { Spinner } from '@/components/ui'

// Gate for authenticated routes. Signed-out users go to /login; signed-in users
// without a profile row are sent to /onboarding to finish setup.
export function ProtectedRoute() {
  const { loading, session, profile } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Spinner />
      </div>
    )
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (!profile && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  // The gate renders nothing unless this is a creator with no social links yet.
  return (
    <>
      <Outlet />
      <SocialLinksGate />
    </>
  )
}
