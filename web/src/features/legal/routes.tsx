import type { RouteObject } from 'react-router-dom'
import { PrivacyPolicy } from '@/features/legal/PrivacyPolicy'
import { TermsOfService } from '@/features/legal/TermsOfService'

// Owned by sub-agent E (Tier 4: legal + tests). Keep the exported name `legalRoutes`.
export const legalRoutes: RouteObject[] = [
  { path: '/privacy', element: <PrivacyPolicy /> },
  { path: '/terms', element: <TermsOfService /> },
]
