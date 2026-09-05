import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMyBookings } from '@/lib/db'
import type { BookingWithParties, Role } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { Alert, Avatar, EmptyState, PageHeader, Spinner, StatusBadge } from '@/components/ui'
import { isMyTurn, nextStepHint } from '@/features/notifications/turns'

// "/notifications" — activity derived from bookings (there is no notifications
// table). Bookings needing this user's action are surfaced first, then the rest.
// Owned by sub-agent D.
export function NotificationsPage() {
  const { profile } = useAuth()
  const [bookings, setBookings] = useState<BookingWithParties[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    listMyBookings()
      .then((rows) => {
        if (active) setBookings(rows)
      })
      .catch(() => {
        if (!active) return
        setError('Could not load your activity.')
        setBookings([])
      })
    return () => {
      active = false
    }
  }, [])

  const role: Role | null = profile?.role ?? null

  if (bookings === null || role === null) {
    return (
      <div>
        <PageHeader title="Notifications" subtitle="What needs your attention" />
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      </div>
    )
  }

  const actionable = bookings.filter((b) => isMyTurn(b.status, role))
  const others = bookings.filter((b) => !isMyTurn(b.status, role))
  const empty = actionable.length === 0 && others.length === 0

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={
          actionable.length > 0
            ? `${actionable.length} ${actionable.length === 1 ? 'item needs' : 'items need'} your attention`
            : 'You are all caught up'
        }
      />
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {empty ? (
        <EmptyState title="Nothing to see yet">
          When a booking needs your action, it will show up here.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {actionable.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-700">Needs your attention</h2>
              {actionable.map((b) => (
                <ActivityRow key={b.id} booking={b} role={role} />
              ))}
            </section>
          )}
          {others.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-700">Recent activity</h2>
              {others.map((b) => (
                <ActivityRow key={b.id} booking={b} role={role} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function ActivityRow({ booking, role }: { booking: BookingWithParties; role: Role }) {
  const other = role === 'CLIENT' ? booking.influencer : booking.client
  const name = other?.name ?? 'Unknown'
  return (
    <Link
      to={`/bookings/${booking.id}`}
      className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 transition hover:border-indigo-300 hover:bg-indigo-50/40"
    >
      <Avatar name={name} url={other?.avatar_url} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-gray-900">{name}</span>
          <StatusBadge status={booking.status} />
        </div>
        <p className="truncate text-sm text-gray-600">{booking.deliverable}</p>
        <p className="mt-0.5 text-xs text-gray-500">{nextStepHint(booking.status, role)}</p>
      </div>
    </Link>
  )
}
