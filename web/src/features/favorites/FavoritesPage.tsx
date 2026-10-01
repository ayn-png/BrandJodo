import { useEffect, useState } from 'react'
import { listMyFavorites, toggleFavorite } from '@/lib/db'
import type { FavoriteCard } from '@/lib/types'
import { usePageTitle } from '@/lib/seo'
import { useAuth } from '@/lib/auth'
import { Alert, Button, EmptyState, PageHeader, Spinner } from '@/components/ui'
import { CreatorCard } from '@/features/discovery/CreatorCard'

// "/saved" — a client's shortlist of creators (migration 0011). One card per
// creator with an in-place remove so the list behaves like a queue.
export function FavoritesPage() {
  usePageTitle('Saved creators — BrandJodo')
  const { profile } = useAuth()
  const [cards, setCards] = useState<FavoriteCard[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    listMyFavorites()
      .then((rows) => active && setCards(rows))
      .catch(() => active && setError('Could not load your saved creators.'))
      .finally(() => active && setCards((prev) => prev ?? []))
    return () => {
      active = false
    }
  }, [])

  const remove = async (id: string) => {
    try {
      const nowFav = await toggleFavorite(id)
      if (!nowFav) setCards((prev) => prev?.filter((c) => c.id !== id) ?? prev)
    } catch {
      setError('Could not update your saved list.')
    }
  }

  if (cards === null || profile === null) {
    return (
      <div>
        <PageHeader title="Saved creators" subtitle="Your shortlist" />
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Saved creators"
        subtitle={
          cards.length > 0
            ? `${cards.length} ${cards.length === 1 ? 'creator' : 'creators'} on your shortlist`
            : 'Creators you save for later'
        }
      />
      {error && <Alert>{error}</Alert>}

      {cards.length === 0 ? (
        <EmptyState title="No saved creators yet">
          <p className="text-sm text-gray-500">
            Tap ♡ on any creator&apos;s profile to shortlist them here.
          </p>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((fav) => (
            <div key={fav.id} className="flex flex-col gap-2">
              <CreatorCard
                card={{
                  ...fav,
                  bio: null,
                  platforms: [],
                  follower_count: null,
                  portfolio: [],
                  featured_until: null,
                }}
              />
              <Button variant="ghost" onClick={() => void remove(fav.id)} className="self-end text-rose-600">
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}