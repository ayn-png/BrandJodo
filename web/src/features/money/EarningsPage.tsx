import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card, Field, Input, Spinner } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import {
  getMyBalance,
  getMyPayoutAccount,
  listMyPayments,
  listMyPayouts,
  requestPayout,
  upsertPayoutAccount,
} from '@/lib/db'
import type { Balance, Payment, Payout, PayoutAccount } from '@/lib/types'
import { formatINR, formatLedgerDate, rupeesToPaise } from '@/lib/money'

const KIND_LABEL: Record<Payment['kind'], string> = {
  ESCROW_DEPOSIT: 'Escrow deposit',
  ESCROW_RELEASE: 'Released to you',
  PLATFORM_FEE: 'Platform fee',
  REFUND: 'Refund issued',
}

const PAYOUT_STATUS_LABEL: Record<Payout['status'], string> = {
  REQUESTED: 'Requested',
  PROCESSING: 'Processing',
  PAID: 'Paid',
  FAILED: 'Failed',
}

// Creator earnings dashboard: available balance, payout method, withdrawals and
// a full ledger of every escrow event. All reads come from SECURITY DEFINER RPCs
// (0009) so a wrong role can never see someone else's money rows.
export function EarningsPage() {
  const { profile } = useAuth()
  const isInfluencer = profile?.role === 'INFLUENCER'

  const [balance, setBalance] = useState<Balance | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [account, setAccount] = useState<PayoutAccount | null>(null)

  const [upiId, setUpiId] = useState('')
  const [accountHolder, setAccountHolder] = useState('')
  const [payoutAmount, setPayoutAmount] = useState('')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [b, p, ps, acc] = await Promise.all([
        getMyBalance(),
        listMyPayments(),
        listMyPayouts(),
        getMyPayoutAccount(),
      ])
      setBalance(b)
      setPayments(p)
      setPayouts(ps)
      setAccount(acc)
      if (acc) {
        setUpiId(acc.upi_id)
        setAccountHolder(acc.account_holder)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your earnings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isInfluencer) void load()
    else setLoading(false)
  }, [isInfluencer])

  const onSaveAccount = async () => {
    setBusy('account')
    setSaved(null)
    setError(null)
    try {
      const acc = await upsertPayoutAccount(upiId.trim(), accountHolder.trim())
      setAccount(acc)
      setSaved('Payout method saved.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the payout method.')
    } finally {
      setBusy(null)
    }
  }

  const available = balance?.available_paise ?? 0

  const onRequestPayout = async () => {
    setBusy('payout')
    setSaved(null)
    setError(null)
    const paise = rupeesToPaise(Number(payoutAmount))
    if (!Number.isFinite(paise) || paise <= 0) {
      setError('Enter an amount greater than zero.')
      setBusy(null)
      return
    }
    if (paise > available) {
      setError(`You can request at most ${formatINR(available)} right now.`)
      setBusy(null)
      return
    }
    try {
      await requestPayout(paise)
      setPayoutAmount('')
      setSaved('Payout request submitted — an admin will process it.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not request the payout.')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="grid place-items-center py-20">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Earnings</h1>
        <p className="mt-1 text-sm text-mist">Escrow releases, platform fees and payouts.</p>
      </div>

      {!isInfluencer && (
        <Card>
          <Alert kind="info">
            Earnings are a creator feature. Your paid invoices instead live on each{' '}
            <Link className="underline" to="/bookings">
              booking
            </Link>
            .
          </Alert>
        </Card>
      )}

      {isInfluencer && (
        <>
          {error && <Alert kind="error">{error}</Alert>}
          {saved && <Alert kind="success">{saved}</Alert>}

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <h2 className="text-sm font-semibold text-gray-500">Available to withdraw</h2>
              <p className="mt-1 font-display text-3xl font-semibold text-forest">
                {formatINR(available)}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                After {formatINR(balance?.total_paid_out_paise ?? 0)} paid out so far.
              </p>
            </Card>
            <Card>
              <h2 className="text-sm font-semibold text-gray-500">Held in escrow</h2>
              <p className="mt-1 font-display text-3xl font-semibold text-gray-900">
                {formatINR(balance?.escrow_held_paise ?? 0)}
              </p>
              <p className="mt-1 text-xs text-gray-500">Funded bookings not yet released.</p>
            </Card>
            <Card>
              <h2 className="text-sm font-semibold text-gray-500">Paid out</h2>
              <p className="mt-1 font-display text-3xl font-semibold text-gray-900">
                {formatINR(balance?.total_paid_out_paise ?? 0)}
              </p>
              <p className="mt-1 text-xs text-gray-500">Withdrawals completed over time.</p>
            </Card>
          </div>

          <Card>
            <h2 className="text-base font-semibold text-gray-900">Payout method</h2>
            <p className="mt-1 text-sm text-gray-500">
              UPI details we send withdrawals to. You can change these anytime.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <Field label="UPI ID">
                  <Input
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="yourname@okhdfcbank"
                    inputMode="email"
                    autoComplete="off"
                  />
                </Field>
              </div>
              <div>
                <Field label="Account holder">
                  <Input
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    placeholder="Name as on your bank account"
                    autoComplete="name"
                  />
                </Field>
              </div>
            </div>
            <Button className="mt-4" onClick={onSaveAccount} loading={busy === 'account'}>
              {account ? 'Update payout method' : 'Save payout method'}
            </Button>
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-gray-900">Request a payout</h2>
            <p className="mt-1 text-sm text-gray-500">
              Withdraw from your available balance. Requests reach admins and are settled
              manually in this version.
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="w-48">
                <Field label="Amount (₹)">
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={payoutAmount}
                    onChange={(e) => setPayoutAmount(e.target.value)}
                    placeholder="0"
                  />
                </Field>
              </div>
              <Button onClick={onRequestPayout} loading={busy === 'payout'} disabled={available <= 0}>
                Request payout
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-gray-900">Payout history</h2>
            {payouts.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">No withdrawals yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100 text-sm">
                {payouts.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatINR(p.amount_paise)} via {p.method}
                      </p>
                      <p className="text-xs text-gray-500">
                        Requested {formatLedgerDate(p.requested_at)}
                        {p.paid_at ? ` · paid ${formatLedgerDate(p.paid_at)}` : ''}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        p.status === 'PAID'
                          ? 'bg-forest-50 text-forest'
                          : p.status === 'FAILED'
                            ? 'bg-red-50 text-red-600'
                            : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {PAYOUT_STATUS_LABEL[p.status]}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-base font-semibold text-gray-900">Payment activity</h2>
            {payments.length === 0 ? (
              <p className="mt-2 text-sm text-gray-500">
                Nothing in your ledger yet — fund escrow and complete bookings to see movement.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100 text-sm">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                    <div>
                      <p className="font-medium text-gray-900">{KIND_LABEL[p.kind]}</p>
                      <p className="text-xs text-gray-500">
                        {p.deliverable} · {formatLedgerDate(p.created_at)} · {p.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatINR(p.amount_paise)}</p>
                      <Link
                        to={`/bookings/${p.booking_id}`}
                        className="text-xs text-indigo-600 hover:underline"
                      >
                        View booking
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  )
}