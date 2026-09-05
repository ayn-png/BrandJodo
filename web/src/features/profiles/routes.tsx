import type { RouteObject } from 'react-router-dom'
import { OnboardingPage } from '@/features/profiles/OnboardingPage'
import { EditProfilePage } from '@/features/profiles/EditProfilePage'

// Owned by sub-agent A (auth + profiles). Keep the exported name `profileRoutes`.
export const profileRoutes: RouteObject[] = [
  { path: '/onboarding', element: <OnboardingPage /> },
  { path: '/profile/edit', element: <EditProfilePage /> },
]
