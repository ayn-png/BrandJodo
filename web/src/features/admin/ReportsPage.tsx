import { useEffect, useState } from 'react'
import { listOpenReports, resolveReport } from '@/lib/db'
import type { OpenReportRow, ReportTargetType } from '@/lib/types'
import { usePageTitle } from '@/lib/seo'
import { Alert, Button, Card, EmptyState, PageHeader, Spinner } from '@/components/ui'
import { AdminGate } from './AdminGate'
import { AdminNav } from './AdminNav'

const TARGET_LABEL: Record<ReportTargetType, string> = {
  PROFILE: 'Profile',
  BOOKING: 'Booking',
  MESSAGE: 'Message',
  REVIEW: 'Review',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Admin moderation queue (Workstream 4). Rows come from list_open_reports() —
// a SECURITY DEFINER RPC that only admins may call — and each row can be
// resolved (action taken) or dismissed (no action).
export function ReportsPage() {
  usePageTitle('Moderation — BrandJodo')
  const [reports, setReports] = useState<OpenReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      setReports(await listOpenReports())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const act = async (id: string, status: 'REVIEWED' | 'DISMISSED') => {
    setBusy(id)
    setError(null)
    try {
      await resolveReport(id, status)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the report.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <AdminGate>
      <div className="space-y-4">
        <PageHeader
          title="Moderation queue"
          subtitle="Content flagged by users"
          action={<AdminNav />}
        />

        {error && <Alert kind="error">{error}</Alert>}

        {loading ? (
          <div className="grid place-items-center py-16">
            <Spinner className="h-8 w-8" />
          </div>
        ) : reports.length === 0 ? (
          <EmptyState title="Queue is clear">
            <p className="text-sm text-gray-500">Every user report in this queue is handled.</p>
          </EmptyState>
        ) : (
          <div className="space-y-4">
            {reports.map((r) => (
              <Card key={r.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                    {TARGET_LABEL[r.target_type]}
                  </span>
                  <span className="text-xs text-gray-500">
                    Reported by {r.reporter_name} · {formatDate(r.created_at)}
                  </span>
                </div>
                <p className="text-sm text-gray-800 italic">&quot;{r.reason}&quot;</p>
                <p className="text-xs text-gray-400">Target ID: {r.target_id}</p>
                <div className="flex gap-2 pt-1">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => void act(r.id, 'REVIEWED')}
                    loading={busy === r.id}
                  >
                    Mark reviewed
                  </Button>
                  <Button variant="secondary" onClick={() => void act(r.id, 'DISMISSED')}>
                    Dismiss
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminGate>
  )
}