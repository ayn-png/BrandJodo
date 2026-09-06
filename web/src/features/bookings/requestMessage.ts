import type { Booking } from '@/lib/types'
import { formatINR } from '@/lib/money'
import { formatDate } from './helpers'

// The opening message a client sees pre-typed in the composer on a booking they
// have just requested. Nothing is written to the thread until they press Send —
// it is a draft they can edit, not a system message — so the creator always sees
// the ask in the client's own words instead of an empty thread.
//
// There is no quantity column: rate_card_items is one fixed price per
// deliverable, and the count lives inside the deliverable text a creator wrote
// ("3 Story frames"), so it reads naturally without one.
export function bookingRequestDraft(
  booking: Pick<Booking, 'deliverable' | 'price_paise' | 'deadline'>,
  creatorName?: string | null,
): string {
  const name = creatorName?.trim()
  const greeting = name ? `Hi ${name} — ` : 'Hi — '
  const by = formatDate(booking.deadline)
  const when = by ? `, by ${by}` : ''
  return `${greeting}I’d like to book ${booking.deliverable} for ${formatINR(
    booking.price_paise,
  )}${when}. Can you confirm?`
}
