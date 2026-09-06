import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  acceptCounter,
  approveBooking,
  cancelBooking,
  createReview,
  deliverBooking,
  getBooking,
  getReviewForBooking,
  openDispute,
  payBooking,
  respondToBooking,
} from '@/lib/db'
import type { Booking, BookingWithParties, Review } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { formatINR, rupeesToPaise } from '@/lib/money'
import { bookingRequestSchema, disputeSchema, reviewSchema } from '@/lib/validation'
import { nextStepHint } from '@/features/notifications/turns'
import { BookingChat } from '@/features/chat/BookingChat'
import { bookingRequestDraft } from './requestMessage'
import {
  Alert,
  Avatar,
  Button,
  Card,
  Field,
  Input,
  PageHeader,
  Spinner,
  StatusBadge,
  Stars,
  Textarea,
} from '@/components/ui'
import { errMsg, formatDate } from './helpers'

// Full booking state machine, role-aware. Every transition goes through a
// SECURITY DEFINER RPC in @/lib/db — the buttons below only decide what to offer,
// the database decides what's allowed.
export function BookingDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const { profile } = useAuth()

  const [booking, setBooking] = useState<BookingWithParties | null>(null)
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const [showCounter, setShowCounter] = useState(false)
  const [counterPrice, setCounterPrice] = useState('')
  const [counterNote, setCounterNote] = useState('')
  const [counterError, setCounterError] = useState<string | null>(null)

  const [showDispute, setShowDispute] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [disputeError, setDisputeError] = useState<string | null>(null)

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [reviewError, setReviewError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    // Everything below is scoped to one booking. Client-side navigation between
    // two bookings reuses this component, so clear it or the previous booking's
    // review and half-typed forms bleed onto the new page.
    setBooking(null)
    setReview(null)
    setShowCounter(false)
    setCounterPrice('')
    setCounterNote('')
    setCounterError(null)
    setShowDispute(false)
    setDisputeReason('')
    setDisputeError(null)
    setRating(0)
    setComment('')
    setReviewError(null)
    getBooking(id)
      .then((b) => {
        if (!active) return
        setBooking(b)
        // A review only exists once the booking is COMPLETED; ignore failures so
        // a missing review never blocks the page.
        if (b?.status === 'COMPLETED') {
          return getReviewForBooking(id)
            .then((r) => {
              if (active) setReview(r)
            })
            .catch(() => undefined)
        }
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
  }, [id])

  // Run a transition, then fold the returned row back into the loaded booking so
  // the embedded party names survive (the RPCs return a bare bookings row).
  const run = async (key: string, fn: () => Promise<Booking>) => {
    setBusy(key)
    setError(null)
    try {
      const updated = await fn()
      setBooking((prev) => (prev ? { ...prev, ...updated } : prev))
      return true
    } catch (e) {
      setError(errMsg(e))
      return false
    } finally {
      setBusy(null)
    }
  }
  const onCounter = async () => {
    setCounterError(null)
    // Reuse the booking request schema's price rule; only the price matters here.
    const parsed = bookingRequestSchema
      .pick({ price_rupees: true })
      .safeParse({ price_rupees: counterPrice })
    if (!parsed.success) {
      setCounterError(parsed.error.issues[0]?.message ?? 'Enter a valid price')
      return
    }
    const ok = await run('counter', () =>
      respondToBooking(id, 'COUNTER', rupeesToPaise(parsed.data.price_rupees), counterNote.trim() || undefined),
    )
    if (ok) {
      setShowCounter(false)
      setCounterPrice('')
      setCounterNote('')
    }
  }

  const onDispute = async () => {
    setDisputeError(null)
    const parsed = disputeSchema.safeParse({ reason: disputeReason })
    if (!parsed.success) {
      setDisputeError(parsed.error.issues[0]?.message ?? 'Please explain the issue')
      return
    }
    const ok = await run('dispute', () => openDispute(id, parsed.data.reason))
    if (ok) {
      setShowDispute(false)
      setDisputeReason('')
    }
  }

  const onReview = async () => {
    setReviewError(null)
    const parsed = reviewSchema.safeParse({ rating, comment })
    if (!parsed.success) {
      setReviewError(parsed.error.issues[0]?.message ?? 'Pick a rating')
      return
    }
    setBusy('review')
    try {
      const saved = await createReview(id, parsed.data.rating, parsed.data.comment ?? undefined)
      setReview(saved)
    } catch (e) {
      setReviewError(errMsg(e))
    } finally {
      setBusy(null)
    }
  }
  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Spinner />
      </div>
    )
  }

  if (!booking) {
    return (
      <div className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        <Card>
          <p className="text-gray-700">This booking doesn’t exist, or you don’t have access.</p>
          <Link to="/bookings" className="mt-2 inline-block text-sm font-medium text-indigo-600 hover:underline">
            Back to my bookings
          </Link>
        </Card>
      </div>
    )
  }

  const role = profile?.role
  const isClient = role === 'CLIENT'
  const isInfluencer = role === 'INFLUENCER'
  const status = booking.status
  const other = isInfluencer ? booking.client : booking.influencer

  // Cancel is allowed pre-escrow only; once FUNDED the money is held and the
  // only exit is a dispute. The DB enforces this too.
  const canCancel = status === 'REQUESTED' || status === 'COUNTERED' || status === 'ACCEPTED'
  const canDispute = status === 'FUNDED' || status === 'DELIVERED'
  const canReview = isClient && status === 'COMPLETED' && !review
  const autoRelease = formatDate(booking.auto_release_at)
  const deadline = formatDate(booking.deadline)
  return (
    <div className="space-y-4">
      <PageHeader title={booking.deliverable} subtitle={role ? nextStepHint(status, role) : undefined} />

      {error && <Alert kind="error">{error}</Alert>}

      <Card>
        <div className="flex items-start gap-3">
          <Avatar name={other?.name ?? 'Unknown'} url={other?.avatar_url ?? undefined} size={44} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {/* A creator needs to know who is hiring them; a client already has
                  the creator's public profile from search, so only this side
                  links out. RLS shows a client row to their counterparty only. */}
              {isInfluencer && other ? (
                <Link
                  to={`/businesses/${other.id}`}
                  className="font-semibold text-indigo-600 hover:underline"
                >
                  {other.name}
                </Link>
              ) : (
                <span className="font-semibold text-gray-900">{other?.name ?? 'Unknown user'}</span>
              )}
              <StatusBadge status={status} />
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {isInfluencer ? 'Client' : 'Creator'} · Requested {formatDate(booking.created_at)}
            </p>
          </div>
          <span className="shrink-0 text-lg font-bold text-gray-900">
            {formatINR(booking.price_paise)}
          </span>
        </div>

        <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-gray-100 pt-4 text-sm sm:grid-cols-2">
          {deadline && (
            <div>
              <dt className="text-gray-500">Deadline</dt>
              <dd className="font-medium text-gray-900">{deadline}</dd>
            </div>
          )}
          {booking.usage_rights && (
            <div>
              <dt className="text-gray-500">Usage rights</dt>
              <dd className="font-medium text-gray-900">{booking.usage_rights}</dd>
            </div>
          )}
          <div>
            <dt className="text-gray-500">Escrow</dt>
            <dd className="font-medium text-gray-900">
              {booking.escrow_released
                ? 'Released to creator'
                : booking.escrow_funded
                  ? 'Funded — held'
                  : 'Not funded'}
            </dd>
          </div>
          {autoRelease && !booking.escrow_released && status === 'DELIVERED' && (
            <div>
              <dt className="text-gray-500">Auto-releases</dt>
              <dd className="font-medium text-gray-900">{autoRelease}</dd>
            </div>
          )}
        </dl>

        {booking.counter_note && (
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
            <span className="font-medium">Counter-offer note:</span> {booking.counter_note}
          </p>
        )}
        {booking.dispute_reason && (
          <div className="mt-3">
            <Alert kind="error">Dispute: {booking.dispute_reason}</Alert>
          </div>
        )}
      </Card>
      <Card>
        <h2 className="text-base font-semibold text-gray-900">What’s next</h2>

        <div className="mt-3 flex flex-wrap gap-2">
          {isInfluencer && (status === 'REQUESTED' || status === 'COUNTERED') && (
            <>
              <Button
                onClick={() => run('accept', () => respondToBooking(id, 'ACCEPT'))}
                loading={busy === 'accept'}
              >
                Accept
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowCounter((v) => !v)}
                disabled={busy !== null}
              >
                {showCounter ? 'Cancel counter' : 'Counter-offer'}
              </Button>
              <Button
                variant="danger"
                onClick={() => run('decline', () => respondToBooking(id, 'DECLINE'))}
                loading={busy === 'decline'}
              >
                Decline
              </Button>
            </>
          )}

          {isClient && status === 'COUNTERED' && (
            <Button onClick={() => run('acceptCounter', () => acceptCounter(id))} loading={busy === 'acceptCounter'}>
              Accept {formatINR(booking.price_paise)}
            </Button>
          )}

          {isClient && status === 'ACCEPTED' && (
            <Button onClick={() => run('pay', () => payBooking(id))} loading={busy === 'pay'}>
              Fund {formatINR(booking.price_paise)} (simulated)
            </Button>
          )}

          {isInfluencer && status === 'FUNDED' && (
            <Button onClick={() => run('deliver', () => deliverBooking(id))} loading={busy === 'deliver'}>
              Mark delivered
            </Button>
          )}

          {isClient && status === 'DELIVERED' && (
            <Button onClick={() => run('approve', () => approveBooking(id))} loading={busy === 'approve'}>
              Approve &amp; release payment
            </Button>
          )}

          {canCancel && (
            <Button
              variant="ghost"
              onClick={() => run('cancel', () => cancelBooking(id))}
              loading={busy === 'cancel'}
            >
              Cancel booking
            </Button>
          )}

          {canDispute && (
            <Button variant="ghost" onClick={() => setShowDispute((v) => !v)} disabled={busy !== null}>
              {showDispute ? 'Never mind' : 'Open a dispute'}
            </Button>
          )}
        </div>
        {showCounter && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            {counterError && <Alert kind="error">{counterError}</Alert>}
            <Field label="Your price (₹)" hint="Replaces the client’s offer if they accept">
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={counterPrice}
                onChange={(e) => setCounterPrice(e.target.value)}
                placeholder="2000"
              />
            </Field>
            <Field label="Note (optional)">
              <Textarea
                rows={2}
                value={counterNote}
                onChange={(e) => setCounterNote(e.target.value)}
                placeholder="Why this price — extra edits, travel, etc."
              />
            </Field>
            <Button onClick={onCounter} loading={busy === 'counter'}>
              Send counter-offer
            </Button>
          </div>
        )}

        {showDispute && (
          <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
            {disputeError && <Alert kind="error">{disputeError}</Alert>}
            <Alert kind="info">
              Funds stay held in escrow while a dispute is open. Auto-release is paused.
            </Alert>
            <Field label="What went wrong?">
              <Textarea
                rows={3}
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Describe the problem so we can help resolve it."
              />
            </Field>
            <Button variant="danger" onClick={onDispute} loading={busy === 'dispute'}>
              Open dispute
            </Button>
          </div>
        )}
      </Card>
      {review && (
        <Card>
          <h2 className="text-base font-semibold text-gray-900">Review</h2>
          <div className="mt-2">
            <Stars rating={review.rating} />
          </div>
          {review.comment && <p className="mt-2 text-sm text-gray-700">{review.comment}</p>}
        </Card>
      )}

      {canReview && (
        <Card>
          <h2 className="text-base font-semibold text-gray-900">Leave a review</h2>
          <p className="mt-1 text-sm text-gray-500">
            Your rating helps other local businesses pick with confidence.
          </p>
          {reviewError && (
            <div className="mt-3">
              <Alert kind="error">{reviewError}</Alert>
            </div>
          )}
          <div className="mt-3 flex gap-1" role="group" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                aria-pressed={rating === n}
                onClick={() => setRating(n)}
                className="rounded p-1 text-2xl leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <span className={n <= rating ? 'text-amber-500' : 'text-gray-300'}>★</span>
              </button>
            ))}
          </div>
          <div className="mt-3">
            <Field label="Comment (optional)">
              <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
            </Field>
          </div>
          <Button className="mt-3" onClick={onReview} loading={busy === 'review'}>
            Submit review
          </Button>
        </Card>
      )}

      <div>
        <h2 className="mb-2 text-base font-semibold text-gray-900">Messages</h2>
        {/* Only the client who just asked, and only while the ask is still
            outstanding: the chat seeds this into the composer if the thread is
            empty, so the creator sees the request rather than a blank thread. */}
        <BookingChat
          bookingId={id}
          initialDraft={
            isClient && status === 'REQUESTED'
              ? bookingRequestDraft(booking, other?.name)
              : undefined
          }
        />
      </div>
    </div>
  )
}
