import type { RouteObject } from 'react-router-dom'
import { EarningsPage } from '@/features/money/EarningsPage'

// Workstream 1 route: creator earnings/ledger. Client auth can reach the URL but
// the page explains that earnings are creator-only (RLS + RPCs still protect the
// rows server-side regardless).
export const moneyRoutes: RouteObject[] = [{ path: '/earnings', element: <EarningsPage /> }]