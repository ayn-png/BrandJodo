import { describe, expect, it, vi } from 'vitest'
import { formatNotificationTime, notificationHref } from './format'
import type { AppNotification } from '@/lib/types'

function notif(overrides: Partial<AppNotification>): AppNotification {
  return {
    id: 'n1',
    type: 'booking',
    title: 't',
    body: null,
    booking_id: null,
    data: {},
    read_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('formatNotificationTime', () => {
  it('clamps to the largest whole unit', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'))
    try {
      expect(formatNotificationTime(new Date('2026-01-01T12:00:30Z').toISOString())).toBe('just now')
      expect(formatNotificationTime(new Date('2026-01-01T11:59:00Z').toISOString())).toBe('1m ago')
      expect(formatNotificationTime(new Date('2026-01-01T10:00:00Z').toISOString())).toBe('2h ago')
      expect(formatNotificationTime(new Date('2025-12-30T12:00:00Z').toISOString())).toBe('2d ago')
      expect(formatNotificationTime(new Date('2025-12-20T12:00:00Z').toISOString())).toBe('1w ago')
    } finally {
      vi.useRealTimers()
    }
  })

  it('returns empty for garbage timestamps', () => {
    expect(formatNotificationTime('not-a-date')).toBe('')
  })
})

describe('notificationHref', () => {
  it('deep-links when the row has a booking', () => {
    expect(notificationHref(notif({ booking_id: 'b1' }))).toBe('/bookings/b1')
  })
  it('falls back to null for non-booking rows', () => {
    expect(notificationHref(notif({ type: 'payout', booking_id: null }))).toBeNull()
  })
})