import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchInfluencers } from '@/lib/db'
import type { SearchResult, SortKey } from '@/lib/db'
import { NICHES, PLATFORMS } from '@/lib/categories'
import { Alert, Button, EmptyState, Field, Input, PageHeader, Select, Spinner } from '@/components/ui'
import { CreatorCard } from '@/features/discovery/CreatorCard'

const PAGE_SIZE = 12

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top rated' },
  { value: 'followers', label: 'Most followers' },
]

function parseSort(value: string | null): SortKey {
  return value === 'price_desc' || value === 'rating' || value === 'followers' ? value : 'price_asc'
}

export function DiscoverPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // The URL is the source of truth so results are shareable and the back button works.
  const q = searchParams.get('q') ?? ''
  const niche = searchParams.get('niche') ?? ''
  const platform = searchParams.get('platform') ?? ''
  const location = searchParams.get('location') ?? ''
  const sort = parseSort(searchParams.get('sort'))
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const hasFilters = Boolean(q || niche || platform || location)

  // Text fields commit to the URL on submit; resync when the URL changes (back button).
  const [qInput, setQInput] = useState(q)
  const [locationInput, setLocationInput] = useState(location)
  useEffect(() => setQInput(q), [q])
  useEffect(() => setLocationInput(location), [location])

  const [result, setResult] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    searchInfluencers({
      q: q || undefined,
      niche: niche || undefined,
      platform: platform || undefined,
      location: location || undefined,
      sort,
      page,
      pageSize: PAGE_SIZE,
    })
      .then((res) => active && setResult(res))
      .catch((err) => active && setError(err instanceof Error ? err.message : 'Something went wrong.'))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [q, niche, platform, location, sort, page])

  // Merge a patch into the URL, carrying pending text edits and resetting to page 1.
  const applyFilters = (patch: Record<string, string>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      const merged: Record<string, string> = {
        q: qInput.trim(),
        location: locationInput.trim(),
        ...patch,
      }
      for (const [key, value] of Object.entries(merged)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      next.delete('page')
      return next
    })
  }

  const goToPage = (nextPage: number) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (nextPage <= 1) next.delete('page')
      else next.set('page', String(nextPage))
      return next
    })
  }

  const total = result?.total ?? 0
  const pageSize = result?.pageSize ?? PAGE_SIZE
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <PageHeader
        title="Find a creator"
        subtitle="Browse local creators and book at transparent, fixed prices."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault()
          applyFilters({})
        }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        <Field label="Search">
          <Input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search by name"
            aria-label="Search creators by name"
          />
        </Field>
        <Field label="Location">
          <Input
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            placeholder="City or area"
          />
        </Field>
        <Field label="Niche">
          <Select value={niche} onChange={(e) => applyFilters({ niche: e.target.value })}>
            <option value="">All niches</option>
            {NICHES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Platform">
          <Select value={platform} onChange={(e) => applyFilters({ platform: e.target.value })}>
            <option value="">All platforms</option>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Sort by">
          <Select
            value={sort}
            onChange={(e) => applyFilters({ sort: e.target.value === 'price_asc' ? '' : e.target.value })}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex items-end">
          <Button type="submit" className="w-full sm:w-auto">
            Search
          </Button>
        </div>
      </form>

      {loading ? (
        <div className="grid place-items-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <Alert>{error}</Alert>
      ) : result && result.cards.length > 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            {total} creator{total === 1 ? '' : 's'} found
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.cards.map((card) => (
              <CreatorCard key={card.id} card={card} />
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 pt-2">
            <Button variant="secondary" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
              Prev
            </Button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : (
        <EmptyState title="No creators found">
          <div className="space-y-3">
            <p>Try adjusting your search or filters.</p>
            {hasFilters && (
              <Button variant="secondary" onClick={() => setSearchParams({})}>
                Clear filters
              </Button>
            )}
          </div>
        </EmptyState>
      )}
    </div>
  )
}
