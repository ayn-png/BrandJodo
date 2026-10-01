import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Spinner } from '@/components/ui'
import { generateInvoice } from '@/lib/db'
import type { Invoice } from '@/lib/types'
import { formatINR, formatLedgerDate } from '@/lib/money'

interface InvoiceCardProps {
  bookingId: string
  onClose: () => void
}

// Tax-invoice modal for a completed booking. Printed via window.print() — the
// `invoice-print` class in index.css makes only this block visible on paper.
export function InvoiceCard({ bookingId, onClose }: InvoiceCardProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setInvoice(await generateInvoice(bookingId))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the invoice.')
    } finally {
      setLoading(false)
    }
  }, [bookingId])

  useEffect(() => {
    void load()
  }, [load])

  const feeBps =
    invoice && invoice.price_paise > 0
      ? Math.round((invoice.platform_fee_paise / invoice.price_paise) * 10000)
      : 0

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 sm:p-8">
      <Card className="w-full max-w-2xl">
        {loading ? (
          <div className="grid place-items-center py-16">
            <Spinner />
          </div>
        ) : error ? (
          <div className="space-y-3">
            <Alert kind="error">{error}</Alert>
            <Button variant="secondary" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : invoice ? (
          <>
            <div className="invoice-print">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-display text-xl font-semibold text-ink">BrandJodo</p>
                  <p className="text-xs text-mist">Creator marketplace · Tax invoice</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-gray-900">Invoice {invoice.invoice_no}</p>
                  <p className="text-mist">Issued {formatLedgerDate(invoice.issued_at)}</p>
                </div>
              </div>

              <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-mist">Billed to</dt>
                  <dd className="font-semibold text-gray-900">{invoice.business_name}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-mist">Creator</dt>
                  <dd className="font-semibold text-gray-900">{invoice.influencer_name}</dd>
                </div>
              </dl>

              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                <p className="font-medium text-gray-900">{invoice.deliverable}</p>
              </div>

              <table className="mt-4 w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1 text-gray-600">Creative services</td>
                    <td className="py-1 text-right font-medium text-gray-900">
                      {formatINR(invoice.price_paise)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1 text-gray-600">
                      Platform fee ({(feeBps / 100).toFixed(1)}%)
                    </td>
                    <td className="py-1 text-right font-medium text-gray-900">
                      {formatINR(invoice.platform_fee_paise)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border-t border-gray-200 pt-2 font-semibold text-gray-900">
                      Total due
                    </td>
                    <td className="border-t border-gray-200 pt-2 text-right font-semibold text-gray-900">
                      {formatINR(invoice.total_paise)}
                    </td>
                  </tr>
                  {invoice.gstin && (
                    <tr>
                      <td className="py-1 text-gray-600">GSTIN</td>
                      <td className="py-1 text-right text-gray-900">{invoice.gstin}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <p className="mt-5 text-xs text-mist">
                Payment in this version is simulated — no real money moves. This document is a
                record of the simulated escrow settlement.
              </p>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-gray-100 pt-4 print:hidden">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button onClick={() => window.print()}>Print / save PDF</Button>
            </div>
          </>
        ) : null}
      </Card>
    </div>
  )
}