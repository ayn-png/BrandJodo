import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'

export function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="font-display text-7xl font-semibold text-plum">404</p>
      <p className="mt-2 text-mist">This page doesn’t exist.</p>
      <Link to="/" className="mt-4 inline-block">
        <Button>Back to Discover</Button>
      </Link>
    </div>
  )
}
