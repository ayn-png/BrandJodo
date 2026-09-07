// Money helpers. Stored as integer paise (₹1 = 100 paise); never float in the DB.
export const paiseToRupees = (paise: number): number => paise / 100

export const rupeesToPaise = (rupees: number): number => Math.round(rupees * 100)

// Format integer paise as ₹ using Indian digit grouping. Whole-rupee amounts
// render without decimals (₹1,500), fractional ones with two (₹1,500.50).
export const formatINR = (paise: number): string => {
  const rupees = paise / 100
  const opts: Intl.NumberFormatOptions = Number.isInteger(rupees)
    ? { maximumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    ...opts,
  }).format(rupees)
}

// Platform fee for a price — the display-side mirror of public.platform_fee()
// in supabase/migrations/0009 (round(price × bps / 10000)). The database is the
// source of truth; this exists so previews and tests can match it exactly.
export const platformFee = (pricePaise: number, feeBps = 500): number =>
  Math.round((pricePaise * feeBps) / 10000)

// Invoice breakdown shown to the client. Same formula as generate_invoice().
export const invoiceTotals = (pricePaise: number, feeBps = 500) => {
  const feePaise = platformFee(pricePaise, feeBps)
  return { pricePaise, feePaise, totalPaise: pricePaise + feePaise }
}

// Compact date for ledger rows, e.g. "12 Aug 2026".
export const formatLedgerDate = (iso: string | null): string => {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
