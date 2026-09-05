import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'

export function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="text-6xl font-black text-gray-300">404</p>
      <p className="mt-2 text-gray-600">This page doesn’t exist.</p>
      <Link to="/" className="mt-4 inline-block">
        <Button>Back to Discover</Button>
      </Link>
    </div>
  )
}
