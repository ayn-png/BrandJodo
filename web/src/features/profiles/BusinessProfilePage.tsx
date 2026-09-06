import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getBusinessProfile } from '@/lib/db'
import type { Profile } from '@/lib/types'
import { safeExternalUrl } from '@/lib/social'
import { Alert, Avatar, Button, Card, EmptyState, Spinner } from '@/components/ui'

// Who is booking me? A creator opens this from a booking to see the business
// behind the request before accepting. Protected, and RLS narrows it further:
// migration 0005 only exposes a CLIENT row to the counterparty of a booking, so
// for anyone else the fetch comes back empty and this renders "not found" —
// there is no public directory of businesses.
export function BusinessProfilePage() {
  const { id } = useParams<{ id: string }>()

  const [business, setBusiness] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    setLoadError(null)
    getBusinessProfile(id)
      .then((p) => active && setBusiness(p))
      .catch(
        (err) =>
          active && setLoadError(err instanceof Error ? err.message : 'Failed to load business.'),
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  const back = (
    <Link to="/bookings" className="inline-block text-sm text-indigo-600 hover:underline">
      &larr; Back to bookings
    </Link>
  )

  if (loadError) {
    return (
      <div className="space-y-4">
        <Alert>{loadError}</Alert>
        {back}
      </div>
    )
  }

  if (!business) {
    return (
      <div className="space-y-4">
        <EmptyState title="Business not found">
          You can only view a business you have a booking with.
        </EmptyState>
        {back}
      </div>
    )
  }

  // Normalised on write and constrained in the database; checked once more here
  // because React puts an href in the DOM verbatim.
  const website = safeExternalUrl(business.website)

  return (
    <div className="space-y-6">
      {back}

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar name={business.name} url={business.avatar_url} size={72} />
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">{business.name}</h1>
            {business.business_category && (
              <span className="inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700">
                {business.business_category}
              </span>
            )}
            {business.location && <p className="text-sm text-gray-500">{business.location}</p>}
            {business.bio && (
              <p className="whitespace-pre-line text-sm text-gray-700">{business.bio}</p>
            )}
          </div>
        </div>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Contact</h2>
        {business.phone || website ? (
          <Card className="space-y-2 text-sm">
            {business.phone && (
              <p>
                <span className="text-gray-500">Phone: </span>
                <a className="text-indigo-600 hover:underline" href={`tel:${business.phone}`}>
                  {business.phone}
                </a>
              </p>
            )}
            {website && (
              <p className="min-w-0 break-all">
                <span className="text-gray-500">Website: </span>
                <a
                  className="text-indigo-600 hover:underline"
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  {website}
                </a>
              </p>
            )}
          </Card>
        ) : (
          <EmptyState title="No contact details yet">
            Message them in the booking thread instead.
          </EmptyState>
        )}
      </section>

      <Link to="/bookings">
        <Button variant="secondary">Back to bookings</Button>
      </Link>
    </div>
  )
}
