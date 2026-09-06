import { bookingRequestDraft } from '@/features/bookings/requestMessage'

const booking = { deliverable: '3 Story frames', price_paise: 180000, deadline: null }

describe('bookingRequestDraft', () => {
  it('names the creator, the deliverable and the price', () => {
    const out = bookingRequestDraft(booking, 'Meera')
    expect(out).toContain('Hi Meera')
    expect(out).toContain('3 Story frames')
    expect(out).toContain('1,800')
    expect(out).toContain('Can you confirm?')
  })

  it('adds the deadline when the booking has one', () => {
    const out = bookingRequestDraft({ ...booking, deadline: '2026-09-20' }, 'Meera')
    // en-IN renders the month as either "Sep" or "Sept" depending on the ICU build.
    expect(out).toContain('by 20 Sep')
    expect(out).toContain('2026')
  })

  it('drops the deadline clause when there is none', () => {
    expect(bookingRequestDraft(booking, 'Meera')).not.toContain('by')
  })

  it('still reads as a sentence without a creator name', () => {
    const out = bookingRequestDraft(booking, null)
    expect(out.startsWith('Hi — I')).toBe(true)
  })

  it('ignores a whitespace-only name', () => {
    expect(bookingRequestDraft(booking, '   ').startsWith('Hi — ')).toBe(true)
  })
})
