import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from '@/lib/auth'
import { router } from '@/app/router'

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  )
}
