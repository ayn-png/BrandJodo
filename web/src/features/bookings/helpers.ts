// Shared helpers for the bookings feature.

// Supabase / PostgREST errors and RPC exceptions both carry a `.message` string.
export function errMsg(e: unknown): string {
  if (
    e &&
    typeof e === 'object' &&
    'message' in e &&
    typeof (e as { message: unknown }).message === 'string'
  ) {
    return (e as { message: string }).message
  }
  return 'Something went wrong. Please try again.'
}

// Format an ISO date / timestamp for display; returns null for empty/invalid input.
export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
