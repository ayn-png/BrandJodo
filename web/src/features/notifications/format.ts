import type { AppNotification, NotificationType } from '@/lib/types'

// Small presentation helpers for the durable notifications feature (0010);
// pure + unit-tested so time formatting stays stable.

export const COMPACT_PLURAL: Record<NotificationType, string> = {
  booking: 'Booking',
  message: 'Message',
  review: 'Review',
  payout: 'Payout',
  admin: 'Admin',
}

// A tiny human-readable "time ago", clamped to whole units. For real timestamps
// inside a demo SPA a bespoke formatter beats pulling in a date library.
export function formatNotificationTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w ago`
  const date = new Date(iso)
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// Which link a notification should navigate to, or null when the row has no
// related booking. Booking rows deep-link; everything else goes to /notifications.
export function notificationHref(n: AppNotification): string | null {
  return n.booking_id ? `/bookings/${n.booking_id}` : null
}