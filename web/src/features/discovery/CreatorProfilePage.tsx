import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  createBooking,
  getInfluencerCard,
  listCreatorAvailability,
  listRateCard,
  listReviewsForInfluencer,
  listSocialLinks,
} from '@/lib/db'
import type { AvailabilityWindow, InfluencerCard, RateCardItem, Review, SocialLink } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { formatINR } from '@/lib/money'
import { safeExternalUrl } from '@/lib/social'
import { Alert, Avatar, Button, Card, EmptyState, Spinner, Stars } from '@/components/ui'
import { FavoriteButton } from '@/features/favorites/FavoriteButton'
import { ReportButton } from '@/features/reporting/ReportButton'

function formatFollowers(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CreatorProfilePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { session, profile } = useAuth()

  const [card, setCard] = useState<InfluencerCard | null>(null)
  const [rateCard, setRateCard] = useState<RateCardItem[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([])
  const [availability, setAvailability] = useState<AvailabilityWindow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [pendingItemId, setPendingItemId] = useState<string | null>(null)
  const [bookingError, setBookingError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true
    setLoading(true)
    setLoadError(null)
    Promise.all([
      getInfluencerCard(id),
      listRateCard(id),
      listReviewsForInfluencer(id),
      listSocialLinks(id),
      listCreatorAvailability(id),
    ])
      .then(([c, rc, rv, sl, av]) => {
        if (!active) return
        setCard(c)
        setRateCard(rc)
        setReviews(rv)
        setSocialLinks(sl)
        setAvailability(av)
      })
      .catch(
        (err) => active && setLoadError(err instanceof Error ? err.message : 'Failed to load creator.'),
      )
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  const isInfluencer = profile?.role === 'INFLUENCER'

  const requestBooking = async (item: RateCardItem) => {
    if (!id) return
    if (!session) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    if (isInfluencer) return
    setBookingError(null)
    setPendingItemId(item.id)
    try {
      const booking = await createBooking({
        influencerId: id,
        deliverable: item.deliverable,
        pricePaise: item.price_paise,
      })
      navigate(`/bookings/${booking.id}`)
    } catch (err) {
      setBookingError(
        err instanceof Error ? err.message : 'Could not create booking. Please try again.',
      )
    } finally {
      setPendingItemId(null)
    }
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <Alert>{loadError}</Alert>
        <Link to="/">
          <Button variant="secondary">Back to discover</Button>
        </Link>
      </div>
    )
  }

  if (!card) {
    return (
      <EmptyState title="Creator not found">
        <div className="mt-3">
          <Link to="/">
            <Button variant="secondary">Back to discover</Button>
          </Link>
        </div>
      </EmptyState>
    )
  }

  // `platforms` is only a claim; social_links is the proof a business can click
  // through to. Show the union so a link on a platform they forgot to tick still
  // appears, and re-check every URL — React drops an href into the DOM verbatim.
  const linkByPlatform = new Map<string, string | null>(
    socialLinks.map((l) => [l.platform, safeExternalUrl(l.url)]),
  )
  const platformChips = [
    ...card.platforms,
    ...socialLinks.map((l) => l.platform).filter((p) => !card.platforms.includes(p)),
  ]

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-block text-sm text-indigo-600 hover:underline">
        &larr; Back to discover
      </Link>

      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar name={card.name} url={card.avatar_url} size={72} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-2xl font-bold text-gray-900">{card.name}</h1>
              <Stars rating={card.avg_rating} count={card.review_count} />
            </div>
            {card.location && <p className="text-sm text-gray-500">{card.location}</p>}
            {typeof card.follower_count === 'number' && (
              <p className="text-sm text-gray-500">
                {formatFollowers(card.follower_count)} followers
              </p>
            )}
            {card.bio && <p className="whitespace-pre-line text-sm text-gray-700">{card.bio}</p>}
            {card.niches.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {card.niches.map((n) => (
                  <span
                    key={n}
                    className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700"
                  >
                    {n}
                  </span>
                ))}
              </div>
            )}
            {platformChips.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {platformChips.map((p) => {
                  const url = linkByPlatform.get(p)
                  return url ? (
                    <a
                      key={p}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-indigo-700 hover:bg-gray-200 hover:underline"
                    >
                      {p}
                      <span aria-hidden="true"> ↗</span>
                    </a>
                  ) : (
                    <span
                      key={p}
                      className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {p}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <FavoriteButton creatorId={id ?? ''} />
        {profile?.id !== id && (
          <ReportButton targetType="PROFILE" targetId={id ?? ''} label="Report creator" />
        )}
      </div>

      {availability.length > 0 && (
        <Card>
          <h2 className="text-base font-semibold text-gray-900">Availability</h2>
          <p className="mt-1 text-sm text-gray-600">
            Usually available on {availability.map((w) => DAY_SHORT[w.day_of_week]).join(', ')}.
          </p>
        </Card>
      )}

      {card.portfolio.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Portfolio</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {card.portfolio.map((url) => (
              <img
                key={url}
                src={url}
                alt="Portfolio item"
                className="aspect-square w-full rounded-lg object-cover"
              />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Rate card</h2>
        {isInfluencer && <Alert kind="info">Only clients can book creators.</Alert>}
        {bookingError && <Alert>{bookingError}</Alert>}
        {rateCard.length === 0 ? (
          <EmptyState title="No rate card yet">This creator hasn&apos;t listed any prices.</EmptyState>
        ) : (
          <div className="space-y-2">
            {rateCard.map((item) => (
              <Card key={item.id} className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{item.deliverable}</p>
                  <p className="text-lg font-bold text-forest">{formatINR(item.price_paise)}</p>
                </div>
                <Button
                  onClick={() => requestBooking(item)}
                  disabled={isInfluencer || pendingItemId !== null}
                  loading={pendingItemId === item.id}
                  title={isInfluencer ? 'Only clients can book creators.' : undefined}
                >
                  Request booking
                </Button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Reviews ({card.review_count})</h2>
        {reviews.length === 0 ? (
          <EmptyState title="No reviews yet">Reviews appear after a completed booking.</EmptyState>
        ) : (
          <div className="space-y-2">
            {reviews.map((r) => (
              <Card key={r.id} className="space-y-1">
                <Stars rating={r.rating} />
                {r.comment && (
                  <p className="whitespace-pre-line text-sm text-gray-700">{r.comment}</p>
                )}
                <p className="text-xs text-gray-400">{formatDate(r.created_at)}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
