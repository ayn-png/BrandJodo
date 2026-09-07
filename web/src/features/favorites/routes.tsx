import type { RouteObject } from 'react-router-dom'
import { FavoritesPage } from './FavoritesPage'

// Client shortlist (Workstream 5). The RPCs are SECURITY DEFINER so a wrong role
// simply sees an empty list here.
export const favoriteRoutes: RouteObject[] = [
  { path: '/saved', element: <FavoritesPage /> },
]