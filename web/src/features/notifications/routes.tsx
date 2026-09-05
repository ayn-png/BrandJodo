import type { RouteObject } from 'react-router-dom'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'

// Owned by sub-agent D (chat + notifications). Keep the exported name `notificationRoutes`.
export const notificationRoutes: RouteObject[] = [
  { path: '/notifications', element: <NotificationsPage /> },
]
