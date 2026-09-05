import type { RouteObject } from 'react-router-dom'
import { Stub } from '@/app/Stub'

// Owned by sub-agent C (bookings). Keep the exported name `bookingRoutes`.
export const bookingRoutes: RouteObject[] = [
  { path: '/bookings', element: <Stub title="My bookings" /> },
  { path: '/bookings/:id', element: <Stub title="Booking detail" /> },
]
