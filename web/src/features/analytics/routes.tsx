import type { RouteObject } from 'react-router-dom'
import { AnalyticsPage } from './AnalyticsPage'

// Creator analytics + availability (0011). Route is reachable by anyone but the
// page gates on the INFLUENCER role (RPCs enforce auth server-side regardless).
export const analyticsRoutes: RouteObject[] = [
  { path: '/analytics', element: <AnalyticsPage /> },
]