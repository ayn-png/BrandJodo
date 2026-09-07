import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMyNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/db'
import type { AppNotification, NotificationType } from '@/lib/types'
import { usePageTitle } from '@/lib/seo'
import { useAuth } from '@/lib/auth'
import { Alert, EmptyState, PageHeader, Spinner } from '@/components/ui'
import { COMPACT_PLURAL, formatNotificationTime, notificationHref } from '@/features/notifications/format'

// "/notifications" — durable rows from migration 0010, produced by DB triggers on
// bookings / messages / reviews / payouts. Visiting marks everything read; the
// bell count comes from unread_notification_count(). Owned by sub-agent D.
export function NotificationsPage() {
  usePageTitle('Notifications — AInfluencer')
  const { profile } = useAuth()
  const [items, setItems] = useState<AppNotification[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    try {
      const rows = await listMyNotifications()
      setItems(rows)
      // Opening the page acknowledges everything.
      if (rows.some((n) => n.read_at === null)) {
        await markAllNotificationsRead()
        setItems(rows.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })))
      }
    } catch {
      setError('Could not load notifications.')
      setItems([])
    }
  }

  useEffect(() => {
    void load()
    return () => {
      setItems(null)
      setError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const markRead = async (n: AppNotification) => {
    if (n.read_at !== null) return
    setItems(
      (prev) => prev?.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)) ?? null,
    )
    try {
      await markNotificationRead(n.id)
    } catch {
      // Best-effort: failing to acknowledge is not worth blocking navigation.
    }
  }

  const groups = useMemo(() => {
    if (!items) return null
    const unread = items.filter((n) => n.read_at === null)
    const read = items.filter((n) => n.read_at !== null)
    return { unread, read }
  }, [items])

  if (items === null || groups === null || profile === null) {
    return (
      <div>
        <PageHeader title="Notifications" subtitle="Your activity" />
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      </div>
    )
  }

  const empty = groups.unread.length === 0 && groups.read.length === 0

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={
          empty
            ? 'You are all caught up'
            : groups.unread.length > 0
              ? `${groups.unread.length} unread ${groups.unread.length === 1 ? 'item' : 'items'}`
              : 'Everything is read'
        }
      />
      {error && (
        <div className="mb-4">
          <Alert>{error}</Alert>
        </div>
      )}
      {empty ? (
        <EmptyState title="Nothing to see yet">
          Booking activity, messages and payout updates will show up here.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          {groups.unread.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-700">Unread</h2>
              {groups.unread.map((n) => (
                <NotificationRow key={n.id} notification={n} onOpen={markRead} />
              ))}
            </section>
          )}
          {groups.read.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-gray-700">Earlier</h2>
              {groups.read.map((n) => (
                <NotificationRow key={n.id} notification={n} onOpen={markRead} />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function NotificationRow({
  notification,
  onOpen,
}: {
  notification: AppNotification
  onOpen: (n: AppNotification) => void
}) {
  const href = notificationHref(notification)
  const inner = (
    <>
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lilac text-base"
        aria-hidden
      >
        {TYPE_ICON[notification.type] ?? '🔔'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-gray-900">{notification.title}</span>
        </div>
        {notification.body && (
          <p className="truncate text-sm text-gray-600">{notification.body}</p>
        )}
        <p className="mt-0.5 text-xs text-gray-400">
          {COMPACT_PLURAL[notification.type] ?? notification.type} ·{' '}
          {formatNotificationTime(notification.created_at)}
        </p>
      </div>
    </>
  )

  const cls =
    'flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-3 transition hover:border-indigo-300 hover:bg-indigo-50/40'

  if (href) {
    return (
      <Link to={href} className={cls} onClick={() => onOpen(notification)}>
        {inner}
      </Link>
    )
  }
  return (
    <div className={cls}>
      <div className="w-full">{inner}</div>
    </div>
  )
}

const TYPE_ICON: Record<NotificationType, string> = {
  booking: '📅',
  message: '💬',
  review: '⭐',
  payout: '💰',
  admin: '🛡️',
}
