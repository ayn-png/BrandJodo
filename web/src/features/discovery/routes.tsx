import type { RouteObject } from 'react-router-dom'
import { DiscoverPage } from '@/features/discovery/DiscoverPage'
import { CreatorProfilePage } from '@/features/discovery/CreatorProfilePage'

// Owned by sub-agent B (discovery). Keep the exported name `discoveryRoutes`.
export const discoveryRoutes: RouteObject[] = [
  { index: true, element: <DiscoverPage /> },
  { path: '/creators/:id', element: <CreatorProfilePage /> },
]
