import type { RouteObject } from 'react-router-dom'
import { OnboardingPage } from '@/features/profiles/OnboardingPage'
import { EditProfilePage } from '@/features/profiles/EditProfilePage'
import { BusinessProfilePage } from '@/features/profiles/BusinessProfilePage'

// Owned by sub-agent A (auth + profiles). Keep the exported name `profileRoutes`.
// These all sit inside ProtectedRoute (see app/router.tsx) — /businesses/:id in
// particular must, since RLS only shows a client row to their counterparty.
export const profileRoutes: RouteObject[] = [
  { path: '/onboarding', element: <OnboardingPage /> },
  { path: '/profile/edit', element: <EditProfilePage /> },
  { path: '/businesses/:id', element: <BusinessProfilePage /> },
]
