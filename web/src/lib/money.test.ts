import {
  formatINR,
  formatLedgerDate,
  invoiceTotals,
  paiseToRupees,
  platformFee,
  rupeesToPaise,
} from '@/lib/money'

describe('paiseToRupees', () => {
  it('converts integer paise to rupees', () => {
    expect(paiseToRupees(100)).toBe(1)
    expect(paiseToRupees(150000)).toBe(1500)
    expect(paiseToRupees(1999)).toBe(19.99)
    expect(paiseToRupees(0)).toBe(0)
  })
})

describe('rupeesToPaise', () => {
  it('converts whole rupees to paise', () => {
    expect(rupeesToPaise(1)).toBe(100)
    expect(rupeesToPaise(1500)).toBe(150000)
    expect(rupeesToPaise(0)).toBe(0)
  })

  it('has no floating-point drift on typical fractional rupees', () => {
    expect(rupeesToPaise(19.99)).toBe(1999)
    expect(rupeesToPaise(0.1)).toBe(10)
    expect(rupeesToPaise(1500.5)).toBe(150050)
  })

  it('rounds sub-paise fractions to the nearest paise', () => {
    expect(rupeesToPaise(1.236)).toBe(124)
    expect(rupeesToPaise(1.234)).toBe(123)
  })

  it('round-trips cleanly through paiseToRupees', () => {
    expect(paiseToRupees(rupeesToPaise(19.99))).toBe(19.99)
    expect(paiseToRupees(rupeesToPaise(2500))).toBe(2500)
  })
})

describe('formatINR', () => {
  it('renders the ₹ symbol', () => {
    expect(formatINR(150000)).toContain('₹')
  })

  it('omits decimals for whole-rupee amounts', () => {
    const out = formatINR(150000) // ₹1,500
    expect(out).toContain('1,500')
    expect(out).not.toContain('.')
  })

  it('shows two decimals for fractional amounts', () => {
    expect(formatINR(150050)).toContain('1,500.50') // ₹1,500.50
    expect(formatINR(199)).toContain('1.99')
  })

  it('uses Indian digit grouping (lakh style)', () => {
    // 100000000 paise = ₹10,00,000 (ten lakh), grouped 2-2-3.
    expect(formatINR(100000000)).toContain('10,00,000')
  })

  it('formats zero without decimals', () => {
    expect(formatINR(0)).toContain('0')
    expect(formatINR(0)).not.toContain('.')
  })
})

describe('platformFee', () => {
  it('charges the default 5% (500 bps)', () => {
    expect(platformFee(10000)).toBe(500)
    expect(platformFee(25000)).toBe(1250)
    expect(platformFee(0)).toBe(0)
  })

  it('rounds to the nearest paise like the SQL platform_fee()', () => {
    expect(platformFee(101, 500)).toBe(5) // 5.05 → 5
    expect(platformFee(333, 500)).toBe(17) // 16.65 → 17
    expect(platformFee(1, 500)).toBe(0) // 0.05 → 0
  })

  it('respects custom fee bps (e.g. 7%)', () => {
    expect(platformFee(10000, 700)).toBe(700)
  })
})

describe('invoiceTotals', () => {
  it('builds price + fee = total', () => {
    expect(invoiceTotals(25000)).toEqual({ pricePaise: 25000, feePaise: 1250, totalPaise: 26250 })
    expect(invoiceTotals(0)).toEqual({ pricePaise: 0, feePaise: 0, totalPaise: 0 })
  })

  it('reconstructs the exact booking price from release + fee', () => {
    const { feePaise, pricePaise } = invoiceTotals(45000)
    expect(pricePaise - feePaise + feePaise).toBe(pricePaise)
  })
})

describe('formatLedgerDate', () => {
  it('formats dates and handles null', () => {
    expect(formatLedgerDate('2026-08-12T10:00:00Z')).toMatch(/12 Aug 2026/)
    expect(formatLedgerDate(null)).toBe('—')
  })
})
