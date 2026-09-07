import { useEffect, useState } from 'react'
import { Card, Spinner } from '@/components/ui'
import { listMyPayments } from '@/lib/db'
import type { Payment } from '@/lib/types'
import { formatINR, formatLedgerDate } from '@/lib/money'

const KIND_LABEL: Record<Payment['kind'], string> = {
  ESCROW_DEPOSIT: 'Escrow deposit',
  ESCROW_RELEASE: 'Released to creator',
  PLATFORM_FEE: 'Platform fee',
  REFUND: 'Refund issued',
}

// Ledger rows for one booking (payment history in the booking detail page). The
// RPC list_my_payments() is scoped to the caller, so a stranger gets nothing.
export function PaymentHistoryCard({ bookingId }: { bookingId: string }) {
  const [payments, setPayments] = useState<Payment[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setPayments(null)
    setError(null)
    listMyPayments()
      .then((rows) => {
        if (active) setPayments(rows.filter((r) => r.booking_id === bookingId))
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Could not load payments.')
      })
    return () => {
      active = false
    }
  }, [bookingId])

  return (
    <Card>
      <h2 className="text-base font-semibold text-gray-900">Payments on this booking</h2>
      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      {!payments ? (
        <div className="grid place-items-center py-8">
          <Spinner />
        </div>
      ) : payments.length === 0 ? (
        <p className="mt-2 text-sm text-gray-500">
          No ledger entries yet — once escrow is funded, deposits, releases and fees appear here.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100 text-sm">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2">
              <div>
                <p className="font-medium text-gray-900">{KIND_LABEL[p.kind]}</p>
                <p className="text-xs text-gray-500">
                  {formatLedgerDate(p.created_at)} · {p.status}
                  {p.provider === 'RAZORPAY' ? ' · Razorpay' : ''}
                  {p.provider_ref ? ` · ref ${p.provider_ref}` : ''}
                </p>
              </div>
              <span
                className={`font-semibold ${
                  p.kind === 'ESCROW_DEPOSIT' || p.kind === 'ESCROW_RELEASE'
                    ? 'text-gray-900'
                    : 'text-gray-500'
                }`}
              >
                {p.kind === 'PLATFORM_FEE' || p.kind === 'REFUND' ? '−' : '+'}
                {formatINR(p.amount_paise)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}