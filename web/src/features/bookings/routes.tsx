import type { RouteObject } from 'react-router-dom'
import { BookingsPage } from '@/features/bookings/BookingsPage'
import { BookingDetailPage } from '@/features/bookings/BookingDetailPage'

// Owned by sub-agent C (bookings). Keep the exported name `bookingRoutes`.
export const bookingRoutes: RouteObject[] = [
  { path: '/bookings', element: <BookingsPage /> },
  { path: '/bookings/:id', element: <BookingDetailPage /> },
]
