import type { RouteObject } from 'react-router-dom'
import { DisputesPage } from './DisputesPage'
import { ReportsPage } from './ReportsPage'

export const adminRoutes: RouteObject[] = [
  { path: '/admin/disputes', element: <DisputesPage /> },
  { path: '/admin/reports', element: <ReportsPage /> },
]
