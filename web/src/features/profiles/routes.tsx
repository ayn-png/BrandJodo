import type { RouteObject } from 'react-router-dom'
import { Stub } from '@/app/Stub'

// Owned by sub-agent A (auth + profiles). Keep the exported name `profileRoutes`.
export const profileRoutes: RouteObject[] = [
  { path: '/onboarding', element: <Stub title="Onboarding" /> },
  { path: '/profile/edit', element: <Stub title="Edit profile" /> },
]
