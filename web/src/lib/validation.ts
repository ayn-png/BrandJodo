import { z } from 'zod'
import { NICHES, PLATFORMS, BUSINESS_CATEGORIES } from '@/lib/categories'

// Shared form validation (Tier 4). Money is entered in ₹ then converted to paise
// at the call site via rupeesToPaise(). Server-side CHECK constraints + RPC
// guards remain the source of truth — these just give fast, friendly UX.

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(''))

const inVocab = (vocab: readonly string[], msg: string) =>
  z.array(z.string()).refine((arr) => arr.every((v) => vocab.includes(v)), msg)

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
