import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatINR } from '@/lib/money'
import { Alert, Button, Card, EmptyState, PageHeader, Spinner, StatusBadge } from '@/components/ui'
import { AdminGate } from './AdminGate'
import { AdminNav } from './AdminNav'
import type { BookingWithParties } from '@/lib/types'

const BOOKING_WITH_PARTIES =
  '*, client:profiles!bookings_client_id_fkey(id,name,avatar_url), influencer:profiles!bookings_influencer_id_fkey(id,name,avatar_url)'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ResolutionDialog({
  bookingId,
  onResolved,
}: {
  bookingId: string
  onResolved: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resolve = async (resolution: string) => {
    setBusy(resolution)
    setError(null)
    try {
      const { error: rpcError } = await supabase.rpc('resolve_dispute', {
        p_booking_id: bookingId,
        p_resolution: resolution,
      })
      if (rpcError) throw rpcError
      onResolved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Resolution failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-3 space-y-3">
      {error && <Alert kind="error">{error}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => resolve('release')}
          loading={busy === 'release'}
          className="bg-green-600 hover:bg-green-700"
        >
          Release to creator
        </Button>
        <Button
          variant="danger"
          onClick={() => resolve('refund')}
          loading={busy === 'refund'}
        >
          Refund client
        </Button>
        <Button
          variant="secondary"
          onClick={() => resolve('re_open')}
          loading={busy === 're_open'}
        >
          Re-open booking
        </Button>
      </div>
    </div>
  )
}

export function DisputesPage() {
  const [bookings, setBookings] = useState<BookingWithParties[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: rpcError } = await supabase
        .from('bookings')
        .select(BOOKING_WITH_PARTIES)
        .eq('status', 'DISPUTED')
        .order('updated_at', { ascending: false })
      if (rpcError) throw rpcError
      setBookings((data ?? []) as unknown as BookingWithParties[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load disputes.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <AdminGate>
      <div className="space-y-4">
        <PageHeader
          title="Dispute Resolution"
          subtitle="Bookings where a client has raised a dispute. Resolve by releasing funds, refunding, or re-opening."
          action={<AdminNav />}
        />

        {error && <Alert kind="error">{error}</Alert>}

        {loading ? (
          <div className="grid place-items-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : bookings.length === 0 ? (
          <EmptyState title="No open disputes">
            <p className="text-sm text-gray-500">All clear — no bookings are currently disputed.</p>
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const other = b.influencer
              return (
                <Card key={b.id}>
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to={`/bookings/${b.id}`} className="font-semibold text-gray-900 hover:underline">
                          {other?.name ?? 'Unknown'}
                        </Link>
                        <StatusBadge status={b.status} />
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{b.deliverable}</p>
                      {b.dispute_reason && (
                        <p className="mt-1 text-sm text-gray-700 italic">
                          &quot;{b.dispute_reason}&quot;
                        </p>
                      )}
                      <p className="mt-2 text-xs text-gray-500">
                        Client: {b.client?.name ?? '—'} · Created: {formatDate(b.created_at)} ·{' '}
                        {formatINR(b.price_paise)}
                      </p>
                    </div>
                  </div>
                  <ResolutionDialog bookingId={b.id} onResolved={load} />
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </AdminGate>
  )
}
