// Domain types — mirror the Postgres schema (supabase/migrations). Money is
// always integer paise. `dispute_reason` + the DISPUTED status arrive in 0004.
export type Role = 'CLIENT' | 'INFLUENCER'

export type BookingStatus =
  | 'REQUESTED'
  | 'COUNTERED'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'FUNDED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED'

export interface Profile {
  id: string
  role: Role
  name: string
  business_category: string | null
  bio: string | null
  location: string | null
  // Client-only contact details. `phone` is constrained to CLIENT rows in 0007:
  // influencer rows are world-readable, client rows only reach a counterparty.
  phone: string | null
  website: string | null
  niches: string[]
  platforms: string[]
  follower_count: number | null
  portfolio: string[]
  avatar_url: string | null
  featured_until: string | null
  created_at: string
  updated_at: string
}

// A creator's link to one of their actual feeds. Public to read (a business
// checks before booking); writable only by its owner.
export interface SocialLink {
  id: string
  profile_id: string
  platform: string
  url: string
  created_at: string
}

export interface RateCardItem {
  id: string
  influencer_id: string
  deliverable: string
  price_paise: number
  created_at: string
}

export interface InfluencerCard {
  id: string
  name: string
  bio: string | null
  location: string | null
  niches: string[]
  platforms: string[]
  follower_count: number | null
  portfolio: string[]
  avatar_url: string | null
  featured_until: string | null
  avg_rating: number
  review_count: number
  min_price_paise: number | null
}

export interface Booking {
  id: string
  client_id: string
  influencer_id: string
  deliverable: string
  deadline: string | null
  usage_rights: string | null
  price_paise: number
  status: BookingStatus
  counter_note: string | null
  dispute_reason: string | null
  escrow_funded: boolean
  escrow_released: boolean
  funded_at: string | null
  delivered_at: string | null
  auto_release_at: string | null
  created_at: string
  updated_at: string
}

export interface PartyRef {
  id: string
  name: string
  avatar_url: string | null
}

export interface BookingWithParties extends Booking {
  client: PartyRef | null
  influencer: PartyRef | null
}

export interface Message {
  id: string
  booking_id: string
  sender_id: string
  text: string
  sent_at: string
}

export interface Review {
  id: string
  booking_id: string
  influencer_id: string
  client_id: string
  rating: number
  comment: string | null
  created_at: string
}
