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
