import { useEffect, useState } from 'react'
import {
  deleteAvailability,
  getMyAnalytics,
  listCreatorAvailability,
  upsertAvailability,
} from '@/lib/db'
import type { AvailabilityWindow, CreatorAnalytics } from '@/lib/types'
import { usePageTitle } from '@/lib/seo'
import { useAuth } from '@/lib/auth'
import { formatINR } from '@/lib/money'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
} from '@/components/ui'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function shortTime(value: string): string {
  return value.length >= 5 ? value.slice(0, 5) : value
}

// Creator analytics dashboard (Workstream 3): booking/revenue/rating stats from
// get_my_analytics() plus the recurring weekly availability editor (0011).
export function AnalyticsPage() {
  usePageTitle('My analytics — AInfluencer')
  const { profile } = useAuth()
  const isInfluencer = profile?.role === 'INFLUENCER'

  const [stats, setStats] = useState<CreatorAnalytics | null>(null)
  const [windows, setWindows] = useState<AvailabilityWindow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  // Availability editor state.
  const [day, setDay] = useState(1)
  const [start, setStart] = useState('10:00')
  const [end, setEnd] = useState('18:00')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    if (!profile) return
    setLoading(true)
    setError(null)
    try {
      const [a, w] = await Promise.all([getMyAnalytics(), listCreatorAvailability(profile.id)])
      setStats(a)
      setWindows(w)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your analytics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isInfluencer) void load()
    else setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInfluencer, profile])

  if (!isInfluencer) {
    return (
      <div className="space-y-4">
        <PageHeader title="My analytics" subtitle="Creator-only dashboard" />
        <Card>
          <p className="text-sm text-gray-600">
            Analytics and availability are for creators. If you are a business, head to{' '}
            <a href="/" className="font-medium text-indigo-600 hover:underline">
              discover
            </a>{' '}
            to find the right creator for your next campaign.
          </p>
        </Card>
      </div>
    )
  }

  const onAdd = async () => {
    setBusy('add')
    setSaved(null)
    setError(null)
    try {
      await upsertAvailability({ weekday: day, start, end, note: note.trim() || null })
      setNote('')
      setSaved(`Availability for ${DAYS[day]} saved.`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save availability.')
    } finally {
      setBusy(null)
    }
  }

  const onDelete = async (weekday: number) => {
    setBusy(`del-${weekday}`)
    setSaved(null)
    setError(null)
    try {
      await deleteAvailability(weekday)
      setSaved(`Removed ${DAYS[weekday]}.`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove the slot.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My analytics"
        subtitle="How your bookings, earnings and reviews are trending"
      />

      {error && <Alert>{error}</Alert>}
      {saved && <Alert kind="info">{saved}</Alert>}

      {loading ? (
        <div className="grid place-items-center py-16">
          <Spinner />
        </div>
      ) : stats ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Total bookings" value={String(stats.total_bookings)} />
            <Stat label="Completed" value={String(stats.completed_bookings)} />
            <Stat label="Completion rate" value={`${stats.completion_rate}%`} />
            <Stat label="Active right now" value={String(stats.active_bookings)} />
            <Stat label="Avg rating" value={stats.review_count > 0 ? `${stats.avg_rating} ★` : '—'} />
            <Stat label="Reviews" value={String(stats.review_count)} />
            <Stat label="Total earned" value={formatINR(stats.total_earned_paise)} />
            <Stat label="Available balance" value={formatINR(stats.available_balance_paise)} highlight />
          </div>

          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Availability</h2>
              <span className="text-xs text-gray-500">Recurring every week</span>
            </div>

            {windows.length === 0 ? (
              <EmptyState title="No availability set">
                Add a weekly window below so clients know when you are free.
              </EmptyState>
            ) : (
              <ul className="space-y-2">
                {windows.map((w) => (
                  <li
                    key={w.day_of_week}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{DAYS[w.day_of_week]}</p>
                      <p className="text-sm text-gray-600">
                        {shortTime(w.start_time)}–{shortTime(w.end_time)}
                        {w.note ? ` · ${w.note}` : ''}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      loading={busy === `del-${w.day_of_week}`}
                      onClick={() => void onDelete(w.day_of_week)}
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}

            <div className="grid grid-cols-1 gap-3 rounded-xl bg-lilac/20 p-4 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Day">
                <Select value={day} onChange={(e) => setDay(Number(e.target.value))}>
                  {DAYS.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="From">
                <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
              </Field>
              <Field label="To">
                <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
              </Field>
              <Field label="Note (optional)">
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. shoot days only"
                />
              </Field>
              <div className="flex items-end">
                <Button onClick={onAdd} loading={busy === 'add'} className="w-full">
                  Add / update
                </Button>
              </div>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  )
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <Card className={highlight ? 'border-forest bg-forest/5' : undefined}>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 truncate text-xl font-bold text-gray-900">{value}</p>
    </Card>
  )
}