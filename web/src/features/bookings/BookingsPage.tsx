import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMyBookings } from '@/lib/db'
import type { BookingWithParties } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { formatINR } from '@/lib/money'
import { isMyTurn, nextStepHint } from '@/features/notifications/turns'
import { Alert, Avatar, Card, EmptyState, PageHeader, Spinner, StatusBadge } from '@/components/ui'
import { errMsg, formatDate } from './helpers'

// "My bookings" — both roles share this list; the counterparty shown flips based
// on which side of the booking you're on. Rows needing your action float to the top.
export function BookingsPage() {
  const { profile } = useAuth()
  const [bookings, setBookings] = useState<BookingWithParties[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    listMyBookings()
      .then((rows) => {
        if (active) setBookings(rows)
      })
      .catch((e) => {
        if (active) setError(errMsg(e))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const role = profile?.role
  // listMyBookings already returns newest-updated first; keep that order within
  // each group and just lift the ones waiting on this user.
  const ordered = useMemo(() => {
    if (!role) return bookings
    const mine = bookings.filter((b) => isMyTurn(b.status, role))
    const rest = bookings.filter((b) => !isMyTurn(b.status, role))
    return [...mine, ...rest]
  }, [bookings, role])

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="My bookings"
        subtitle={
          role === 'INFLUENCER'
            ? 'Requests from clients and work in progress.'
            : 'Creators you’ve booked and what’s next.'
        }
      />

      {error && <Alert kind="error">{error}</Alert>}

      {ordered.length === 0 && !error ? (
        <EmptyState title="No bookings yet">
          {role === 'INFLUENCER' ? (
            'Once a client requests you, it shows up here.'
          ) : (
            <>
              <Link to="/" className="font-medium text-indigo-600 hover:underline">
                Find a creator
              </Link>{' '}
              to make your first booking.
            </>
          )}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {ordered.map((b) => {
            const other = role === 'INFLUENCER' ? b.client : b.influencer
            const needsMe = role ? isMyTurn(b.status, role) : false
            const deadline = formatDate(b.deadline)
            return (
              <li key={b.id}>
                <Link to={`/bookings/${b.id}`} className="block">
                  <Card className="transition hover:border-indigo-300 hover:shadow-sm">
                    <div className="flex items-start gap-3">
                      <Avatar name={other?.name ?? 'Unknown'} url={other?.avatar_url ?? undefined} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {other?.name ?? 'Unknown user'}
                          </span>
                          <StatusBadge status={b.status} />
                          {needsMe && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                              Needs you
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-sm text-gray-700">{b.deliverable}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {role ? nextStepHint(b.status, role) : ''}
                          {deadline && ` · Due ${deadline}`}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold text-gray-900">
                        {formatINR(b.price_paise)}
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
