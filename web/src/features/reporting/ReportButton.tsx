import { useState } from 'react'
import { createReport } from '@/lib/db'
import type { ReportTargetType } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { Alert, Button, Field, Modal, Textarea } from '@/components/ui'

// "Report" affordance (Workstream 4). Renders a ghost button that opens a modal
// asking why the user is flagging a profile / booking / message / review. The
// SECURITY DEFINER create_report() RPC stores the row; admins triage it in the
// moderation queue (/admin/reports).
export function ReportButton({
  targetType,
  targetId,
  label = 'Report',
  className,
}: {
  targetType: ReportTargetType
  targetId: string
  label?: string
  className?: string
}) {
  const { session } = useAuth()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await createReport(targetType, targetId, reason.trim())
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit the report.')
    } finally {
      setBusy(false)
    }
  }

  const close = () => {
    setOpen(false)
    setReason('')
    setError(null)
    setDone(false)
  }

  if (!session) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:border-gray-300 hover:text-gray-900 ${className ?? ''}`}
      >
        ⚑ {label}
      </button>

      {open && (
        <Modal title="Report this content" subtitle="Reports are reviewed by our moderation team.">
          {done ? (
            <div className="space-y-3">
              <Alert kind="info">Thanks — we have received your report.</Alert>
              <Button variant="secondary" onClick={close}>
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {error && <Alert kind="error">{error}</Alert>}
              <Field label="What went wrong?">
                <Textarea
                  rows={4}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tell us what is wrong with this content (min 10 characters)."
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={close}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => void submit()}
                  loading={busy}
                  disabled={reason.trim().length < 10}
                >
                  Submit report
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}