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
  | 'REFUND_OWED'

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

// ---- Money ledger (migration 0009) -----------------------------------------

export type PaymentKind = 'ESCROW_DEPOSIT' | 'ESCROW_RELEASE' | 'PLATFORM_FEE' | 'REFUND'

export interface Payment {
  id: string
  booking_id: string
  kind: PaymentKind
  amount_paise: number
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED'
  provider: 'SIMULATED' | 'RAZORPAY'
  provider_ref: string | null
  created_at: string
  settled_at: string | null
  // Joins from list_my_payments / list_all_payments.
  deliverable: string
  book_status: BookingStatus
}

export type PayoutStatus = 'REQUESTED' | 'PROCESSING' | 'PAID' | 'FAILED'

export interface Payout {
  id: string
  amount_paise: number
  status: PayoutStatus
  method: string
  note: string | null
  requested_at: string
  paid_at: string | null
}

export interface PayoutAccount {
  id: string
  influencer_id: string
  upi_id: string
  account_holder: string
  created_at: string
  updated_at: string
}

export interface Balance {
  available_paise: number
  escrow_held_paise: number
  total_paid_out_paise: number
}

export interface Invoice {
  id: string
  booking_id: string
  invoice_no: string
  client_id: string
  influencer_id: string
  business_name: string
  influencer_name: string
  deliverable: string
  price_paise: number
  platform_fee_paise: number
  total_paise: number
  gstin: string | null
  issued_at: string
}

// Row shape of the admin list_all_payments() RPC (names are joined in SQL).
export interface AdminPaymentRow {
  id: string
  booking_id: string
  kind: PaymentKind
  amount_paise: number
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED'
  provider: 'SIMULATED' | 'RAZORPAY'
  provider_ref: string | null
  created_at: string
  settled_at: string | null
  deliverable: string
  client_name: string
  influencer_name: string
}

// ---- Durable notifications (migration 0010) ---------------------------------
// Rows are produced by SECURITY DEFINER DB triggers (booking/message/review/
// payout events), never by the client. `data` carries event-specific ids.

export type NotificationType = 'booking' | 'message' | 'review' | 'payout' | 'admin'

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string | null
  booking_id: string | null
  data: Record<string, unknown>
  read_at: string | null
  created_at: string
}

// ---- Moderation / reporting (migration 0010) --------------------------------

export type ReportTargetType = 'PROFILE' | 'BOOKING' | 'MESSAGE' | 'REVIEW'
export type ReportStatus = 'OPEN' | 'REVIEWED' | 'DISMISSED'

export interface Report {
  id: string
  reporter_id: string
  target_type: ReportTargetType
  target_id: string
  reason: string
  status: ReportStatus
  admin_note: string | null
  created_at: string
  resolved_at: string | null
}

// Admin moderation queue row (list_open_reports() joins the reporter name).
export interface OpenReportRow {
  id: string
  reporter_id: string
  reporter_name: string
  target_type: ReportTargetType
  target_id: string
  reason: string
  status: ReportStatus
  created_at: string
}

// ---- Favorites + availability (migration 0011) ------------------------------

export interface FavoriteCard {
  id: string
  name: string
  avatar_url: string | null
  location: string | null
  niches: string[]
  avg_rating: number
  review_count: number
  min_price_paise: number | null
}

export interface AvailabilityWindow {
  day_of_week: number // 0 = Sunday … 6 = Saturday
  start_time: string
  end_time: string
  note: string | null
}

export interface CreatorAnalytics {
  total_bookings: number
  completed_bookings: number
  completion_rate: number
  active_bookings: number
  avg_rating: number
  review_count: number
  total_earned_paise: number
  available_balance_paise: number
}
