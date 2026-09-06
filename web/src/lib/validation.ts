import { z } from 'zod'
import { NICHES, PLATFORMS, BUSINESS_CATEGORIES } from '@/lib/categories'
import { isKnownPlatform, normalizeSocialUrl, normalizeWebsiteUrl } from '@/lib/social'

// Shared form validation (Tier 4). Money is entered in ₹ then converted to paise
// at the call site via rupeesToPaise(). Server-side CHECK constraints + RPC
// guards remain the source of truth — these just give fast, friendly UX.

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(''))

const inVocab = (vocab: readonly string[], msg: string) =>
  z.array(z.string()).refine((arr) => arr.every((v) => vocab.includes(v)), msg)

// India-first and deliberately loose: `+91 98765 43210`, `9876543210` and
// `(080) 4123-4567` all pass. Real verification would be an OTP, not a regex.
const PHONE_RE = /^\+?[\d ()-]{7,20}$/

const optionalPhone = z
  .string()
  .trim()
  .refine((v) => v === '' || PHONE_RE.test(v), 'Enter a valid phone number, e.g. +91 98765 43210')
  .optional()

// Normalised with normalizeWebsiteUrl() at the call site; this only decides
// whether it *can* be, so an unusable scheme never reaches an href.
const optionalWebsite = z
  .string()
  .trim()
  .max(300, 'That link is too long')
  .refine((v) => v === '' || normalizeWebsiteUrl(v) !== null, 'Enter a valid website, e.g. sunrisecafe.in')
  .optional()

export const credentialsSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const clientProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(80),
  business_category: z
    .string()
    .refine((v) => (BUSINESS_CATEGORIES as readonly string[]).includes(v), 'Pick a category'),
  location: optionalText(120),
  bio: optionalText(500),
  phone: optionalPhone,
  website: optionalWebsite,
})

export const influencerProfileSchema = z.object({
  name: z.string().trim().min(2, 'Name is required').max(80),
  bio: optionalText(500),
  location: z.string().trim().min(1, 'Location helps local clients find you').max(120),
  niches: inVocab(NICHES, 'Invalid niche selected')
    .refine((a) => a.length >= 1, 'Pick at least one niche')
    .refine((a) => a.length <= 6, 'Pick up to 6 niches'),
  platforms: inVocab(PLATFORMS, 'Invalid platform selected').refine(
    (a) => a.length >= 1,
    'Pick at least one platform',
  ),
  follower_count: z.coerce
    .number()
    .int('Must be a whole number')
    .min(0, 'Cannot be negative')
    .max(1_000_000_000)
    .optional(),
})

export const rateCardItemSchema = z.object({
  deliverable: z.string().trim().min(2, 'Describe the deliverable').max(120),
  price_rupees: z.coerce
    .number()
    .min(0, 'Price cannot be negative')
    .max(10_000_000, 'Price looks too high'),
})

export const bookingRequestSchema = z.object({
  deliverable: z.string().trim().min(2, 'Describe what you need').max(160),
  price_rupees: z.coerce.number().min(0, 'Price cannot be negative').max(10_000_000),
  deadline: z.string().optional().or(z.literal('')),
  usage_rights: optionalText(300),
})

export const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1, 'Pick a rating').max(5),
  comment: optionalText(500),
})

export const messageSchema = z.object({
  text: z.string().trim().min(1, 'Type a message').max(2000),
})

export const disputeSchema = z.object({
  reason: z.string().trim().min(10, 'Please explain the issue (min 10 chars)').max(500),
})

// ---- Social links ----------------------------------------------------------
export const socialLinkSchema = z.object({
  platform: z.string().refine(isKnownPlatform, 'Pick a platform'),
  url: z
    .string()
    .trim()
    .min(1, 'Paste your profile link or @handle')
    .max(300, 'That link is too long'),
})

export interface SocialLinkDraft {
  platform: string
  url: string
}

export interface SocialLinkDraftResult {
  /** Normalised, de-duplicated links — empty whenever `formError` is set. */
  links: SocialLinkDraft[]
  /** Per-row message, keyed by index in the input array. */
  errors: Record<number, string>
  formError: string | null
}

// The one place the "every creator needs at least one working link" rule lives —
// onboarding, the catch-up gate and edit-profile all call this. Not enforced in
// Postgres: a cross-table minimum needs a trigger, and this is profile
// completeness rather than authorization, so a hand-written API call can skip it.
export function validateSocialLinkDrafts(
  drafts: readonly SocialLinkDraft[],
): SocialLinkDraftResult {
  const links: SocialLinkDraft[] = []
  const errors: Record<number, string> = {}

  drafts.forEach((draft, i) => {
    // A row the user never filled in is not an error, just not a link.
    if (!draft.platform && !draft.url.trim()) return
    const parsed = socialLinkSchema.safeParse(draft)
    if (!parsed.success) {
      errors[i] = parsed.error.issues[0]?.message ?? 'Check this link'
      return
    }
    const url = normalizeSocialUrl(parsed.data.platform, parsed.data.url)
    if (!url) {
      errors[i] = 'Enter an http(s) link or an @handle'
      return
    }
    if (links.some((l) => l.platform === parsed.data.platform)) {
      errors[i] = `You already added a ${parsed.data.platform} link`
      return
    }
    links.push({ platform: parsed.data.platform, url })
  })

  if (Object.keys(errors).length > 0) {
    return { links: [], errors, formError: 'Fix the highlighted links.' }
  }
  if (links.length === 0) {
    return { links: [], errors, formError: 'Add at least one social profile link.' }
  }
  return { links, errors, formError: null }
}
