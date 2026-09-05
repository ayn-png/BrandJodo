import { Link } from 'react-router-dom'
import type { InfluencerCard } from '@/lib/types'
import { formatINR } from '@/lib/money'
import { Avatar, Card, Stars } from '@/components/ui'

// One search result. Whole card links to the creator's profile. Price is the
// most prominent element — price transparency is the product's north star.
export function CreatorCard({ card }: { card: InfluencerCard }) {
  const niches = card.niches.slice(0, 3)
  const extraNiches = card.niches.length - niches.length
  const featured = card.featured_until != null && new Date(card.featured_until).getTime() > Date.now()

  return (
    <Link
      to={`/creators/${card.id}`}
      className="block h-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
    >
      <Card className="flex h-full flex-col gap-3 transition hover:border-indigo-300 hover:shadow-md">
        <div className="flex items-start gap-3">
          <Avatar name={card.name} url={card.avatar_url} size={48} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-gray-900">{card.name}</p>
              {featured && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  Featured
                </span>
              )}
            </div>
            {card.location && <p className="truncate text-sm text-gray-500">{card.location}</p>}
          </div>
        </div>

        {niches.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {niches.map((n) => (
              <span key={n} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                {n}
              </span>
            ))}
            {extraNiches > 0 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                +{extraNiches}
              </span>
            )}
          </div>
        )}

        <Stars rating={card.avg_rating} count={card.review_count} />

        <div className="mt-auto pt-1">
          {card.min_price_paise != null ? (
            <p className="text-sm text-gray-500">
              from{' '}
              <span className="text-lg font-bold text-indigo-600">
                {formatINR(card.min_price_paise)}
              </span>
            </p>
          ) : (
            <p className="text-sm text-gray-400">No rate card yet</p>
          )}
        </div>
      </Card>
    </Link>
  )
}
