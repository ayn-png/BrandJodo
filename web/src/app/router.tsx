import { createBrowserRouter } from 'react-router-dom'
import { Layout } from '@/app/Layout'
import { ProtectedRoute } from '@/app/ProtectedRoute'
import { NotFound } from '@/app/NotFound'
import { authRoutes } from '@/features/auth/routes'
import { discoveryRoutes } from '@/features/discovery/routes'
import { legalRoutes } from '@/features/legal/routes'
import { profileRoutes } from '@/features/profiles/routes'
import { bookingRoutes } from '@/features/bookings/routes'
import { notificationRoutes } from '@/features/notifications/routes'

// Public routes render directly under Layout; everything under ProtectedRoute
// requires a signed-in user (and a completed profile).
export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      ...discoveryRoutes,
      ...authRoutes,
      ...legalRoutes,
      {
        element: <ProtectedRoute />,
        children: [...profileRoutes, ...bookingRoutes, ...notificationRoutes],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])
