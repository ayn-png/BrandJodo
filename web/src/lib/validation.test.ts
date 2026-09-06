import {
  credentialsSchema,
  clientProfileSchema,
  influencerProfileSchema,
  rateCardItemSchema,
  bookingRequestSchema,
  reviewSchema,
  messageSchema,
  disputeSchema,
  validateSocialLinkDrafts,
} from '@/lib/validation'
import { NICHES, PLATFORMS, BUSINESS_CATEGORIES } from '@/lib/categories'

const longString = (n: number) => 'a'.repeat(n)

describe('credentialsSchema', () => {
  it('accepts a valid email and password', () => {
    expect(credentialsSchema.safeParse({ email: 'user@example.com', password: 'password123' }).success).toBe(true)
  })

  it('rejects an invalid email', () => {
    expect(credentialsSchema.safeParse({ email: 'not-an-email', password: 'password123' }).success).toBe(false)
  })

  it('rejects a password shorter than 8 characters', () => {
    expect(credentialsSchema.safeParse({ email: 'user@example.com', password: 'short' }).success).toBe(false)
  })
})

describe('clientProfileSchema', () => {
  it('accepts a valid client profile', () => {
    const ok = clientProfileSchema.safeParse({
      name: 'Cafe Mocha',
      business_category: BUSINESS_CATEGORIES[0],
      location: 'Mumbai',
    })
    expect(ok.success).toBe(true)
  })

  it('accepts an omitted optional location', () => {
    expect(
      clientProfileSchema.safeParse({ name: 'Cafe Mocha', business_category: BUSINESS_CATEGORIES[0] }).success,
    ).toBe(true)
  })

  it('rejects a too-short name', () => {
    expect(
      clientProfileSchema.safeParse({ name: 'A', business_category: BUSINESS_CATEGORIES[0] }).success,
    ).toBe(false)
  })

  it('rejects a business category outside the controlled vocab', () => {
    expect(
      clientProfileSchema.safeParse({ name: 'Cafe Mocha', business_category: 'Spaceship Repair' }).success,
    ).toBe(false)
  })

  it('rejects a name over the max length', () => {
    expect(
      clientProfileSchema.safeParse({ name: longString(81), business_category: BUSINESS_CATEGORIES[0] }).success,
    ).toBe(false)
  })

  const business = { name: 'Cafe Mocha', business_category: BUSINESS_CATEGORIES[0] }

  it('accepts business contact details', () => {
    expect(
      clientProfileSchema.safeParse({
        ...business,
        bio: 'A neighbourhood cafe in Bandra.',
        phone: '+91 98765 43210',
        website: 'sunrisecafe.in',
      }).success,
    ).toBe(true)
  })

  it('accepts blank contact details', () => {
    expect(clientProfileSchema.safeParse({ ...business, bio: '', phone: '', website: '' }).success).toBe(true)
  })

  it('accepts a bare 10-digit Indian mobile number', () => {
    expect(clientProfileSchema.safeParse({ ...business, phone: '9876543210' }).success).toBe(true)
  })

  it('rejects a phone number that is not a phone number', () => {
    expect(clientProfileSchema.safeParse({ ...business, phone: 'call me maybe' }).success).toBe(false)
    expect(clientProfileSchema.safeParse({ ...business, phone: '123' }).success).toBe(false)
  })

  it('rejects a website that would not be safe in an href', () => {
    expect(clientProfileSchema.safeParse({ ...business, website: 'javascript:alert(1)' }).success).toBe(false)
    expect(clientProfileSchema.safeParse({ ...business, website: 'not a url' }).success).toBe(false)
  })
})

const validInfluencer = {
  name: 'Priya K',
  bio: 'Local food creator',
  location: 'Delhi',
  niches: [NICHES[0]],
  platforms: [PLATFORMS[0]],
  follower_count: 12000,
}

describe('influencerProfileSchema', () => {
  it('accepts a valid influencer profile', () => {
    expect(influencerProfileSchema.safeParse(validInfluencer).success).toBe(true)
  })

  it('accepts a profile without the optional bio and follower_count', () => {
    expect(
      influencerProfileSchema.safeParse({
        name: 'Priya K',
        location: 'Delhi',
        niches: [NICHES[0]],
        platforms: [PLATFORMS[0]],
      }).success,
    ).toBe(true)
  })

  it('rejects an empty niches list', () => {
    expect(influencerProfileSchema.safeParse({ ...validInfluencer, niches: [] }).success).toBe(false)
  })

  it('rejects more than 6 niches', () => {
    expect(influencerProfileSchema.safeParse({ ...validInfluencer, niches: NICHES.slice(0, 7) }).success).toBe(false)
  })

  it('rejects a niche outside the controlled vocab', () => {
    expect(influencerProfileSchema.safeParse({ ...validInfluencer, niches: ['Underwater Basketry'] }).success).toBe(
      false,
    )
  })

  it('rejects a platform outside the controlled vocab', () => {
    expect(influencerProfileSchema.safeParse({ ...validInfluencer, platforms: ['MySpace'] }).success).toBe(false)
  })

  it('rejects an empty location', () => {
    expect(influencerProfileSchema.safeParse({ ...validInfluencer, location: '' }).success).toBe(false)
  })

  it('rejects a negative follower_count', () => {
    expect(influencerProfileSchema.safeParse({ ...validInfluencer, follower_count: -5 }).success).toBe(false)
  })
})

describe('rateCardItemSchema', () => {
  it('accepts a valid rate card item', () => {
    expect(rateCardItemSchema.safeParse({ deliverable: '1 Reel', price_rupees: 1500 }).success).toBe(true)
  })

  it('accepts a zero price (schema allows 0, only negatives are rejected)', () => {
    expect(rateCardItemSchema.safeParse({ deliverable: '1 Reel', price_rupees: 0 }).success).toBe(true)
  })

  it('rejects a too-short deliverable', () => {
    expect(rateCardItemSchema.safeParse({ deliverable: 'A', price_rupees: 1500 }).success).toBe(false)
  })

  it('rejects a negative price', () => {
    expect(rateCardItemSchema.safeParse({ deliverable: '1 Reel', price_rupees: -1 }).success).toBe(false)
  })

  it('rejects a price over the max', () => {
    expect(rateCardItemSchema.safeParse({ deliverable: '1 Reel', price_rupees: 20_000_000 }).success).toBe(false)
  })
})

describe('bookingRequestSchema', () => {
  it('accepts a full valid request', () => {
    const ok = bookingRequestSchema.safeParse({
      deliverable: '2 Reels + 1 Story',
      price_rupees: 5000,
      deadline: '2026-10-01',
      usage_rights: 'Organic use for 30 days',
    })
    expect(ok.success).toBe(true)
  })

  it('accepts a minimal request without optional fields', () => {
    expect(bookingRequestSchema.safeParse({ deliverable: 'One Reel', price_rupees: 5000 }).success).toBe(true)
  })

  it('rejects a too-short deliverable', () => {
    expect(bookingRequestSchema.safeParse({ deliverable: 'A', price_rupees: 5000 }).success).toBe(false)
  })

  it('rejects a negative price', () => {
    expect(bookingRequestSchema.safeParse({ deliverable: 'One Reel', price_rupees: -100 }).success).toBe(false)
  })
})

describe('reviewSchema', () => {
  it('accepts a valid rating with comment', () => {
    expect(reviewSchema.safeParse({ rating: 5, comment: 'Great work' }).success).toBe(true)
  })

  it('accepts a rating without a comment', () => {
    expect(reviewSchema.safeParse({ rating: 3 }).success).toBe(true)
  })

  it('rejects a rating below 1', () => {
    expect(reviewSchema.safeParse({ rating: 0 }).success).toBe(false)
  })

  it('rejects a rating above 5', () => {
    expect(reviewSchema.safeParse({ rating: 6 }).success).toBe(false)
  })

  it('rejects a non-integer rating', () => {
    expect(reviewSchema.safeParse({ rating: 3.5 }).success).toBe(false)
  })
})

describe('messageSchema', () => {
  it('accepts a normal message', () => {
    expect(messageSchema.safeParse({ text: 'Hello there' }).success).toBe(true)
  })

  it('rejects an empty or whitespace-only message', () => {
    expect(messageSchema.safeParse({ text: '' }).success).toBe(false)
    expect(messageSchema.safeParse({ text: '   ' }).success).toBe(false)
  })

  it('rejects a message over the max length', () => {
    expect(messageSchema.safeParse({ text: longString(2001) }).success).toBe(false)
  })
})

describe('disputeSchema', () => {
  it('accepts a sufficiently detailed reason', () => {
    expect(disputeSchema.safeParse({ reason: 'The deliverable was never provided.' }).success).toBe(true)
  })

  it('rejects a reason shorter than 10 characters', () => {
    expect(disputeSchema.safeParse({ reason: 'short' }).success).toBe(false)
  })

  it('rejects a reason over the max length', () => {
    expect(disputeSchema.safeParse({ reason: longString(501) }).success).toBe(false)
  })
})

describe('validateSocialLinkDrafts', () => {
  it('normalises a handle into a full URL', () => {
    const out = validateSocialLinkDrafts([{ platform: 'Instagram', url: '@sunrisecafe' }])
    expect(out.formError).toBeNull()
    expect(out.links).toEqual([{ platform: 'Instagram', url: 'https://instagram.com/sunrisecafe' }])
  })

  it('ignores rows the user never filled in', () => {
    const out = validateSocialLinkDrafts([
      { platform: 'Instagram', url: '@sunrisecafe' },
      { platform: '', url: '' },
    ])
    expect(out.formError).toBeNull()
    expect(out.links).toHaveLength(1)
  })

  it('requires at least one link', () => {
    expect(validateSocialLinkDrafts([]).formError).toBe('Add at least one social profile link.')
    expect(validateSocialLinkDrafts([{ platform: '', url: '' }]).formError).not.toBeNull()
  })

  it('reports the offending row by index and returns no links', () => {
    const out = validateSocialLinkDrafts([
      { platform: 'Instagram', url: '@sunrisecafe' },
      { platform: 'YouTube', url: 'javascript:alert(1)' },
    ])
    expect(out.links).toEqual([])
    expect(out.errors[1]).toBeTruthy()
    expect(out.errors[0]).toBeUndefined()
  })

  it('rejects a platform outside the controlled vocab', () => {
    const out = validateSocialLinkDrafts([{ platform: 'Myspace', url: '@cafe' }])
    expect(out.errors[0]).toBe('Pick a platform')
  })

  it('rejects a row with a platform but no link', () => {
    expect(validateSocialLinkDrafts([{ platform: 'Instagram', url: '' }]).errors[0]).toBeTruthy()
  })

  // unique (profile_id, platform) in migration 0007 would reject the insert.
  it('rejects two links for the same platform', () => {
    const out = validateSocialLinkDrafts([
      { platform: 'Instagram', url: '@one' },
      { platform: 'Instagram', url: '@two' },
    ])
    expect(out.errors[1]).toContain('already added')
  })
})

