import type { RouteObject } from 'react-router-dom'
import { LoginPage } from './LoginPage'
import { SignupPage } from './SignupPage'

// Owned by sub-agent A (auth + profiles). Keep the exported name `authRoutes`.
export const authRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
]
