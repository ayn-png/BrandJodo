import { supabase } from '@/lib/supabase'
import type {
  Booking,
  BookingWithParties,
  InfluencerCard,
  Message,
  Profile,
  RateCardItem,
  Review,
  Role,
  SocialLink,
} from '@/lib/types'

// Single typed data-access layer over Supabase. Every feature imports from here
// so query shapes, embeds, and RPC names stay consistent. RLS + SECURITY DEFINER
// RPCs (supabase/migrations) enforce authorization — these are conveniences.

// ---- Profiles --------------------------------------------------------------
async function requireUid(): Promise<string> {
  const { data } = await supabase.auth.getUser()
  const uid = data.user?.id
  if (!uid) throw new Error('You must be signed in.')
  return uid
}

// Every profile column except `email`. profiles.email duplicates auth.users.email
// and 0005 revokes the column privilege (it was world-readable on influencer rows),
// so `select('*')` here would fail with "permission denied for column email".
const PROFILE_COLUMNS =
  'id,role,name,business_category,bio,location,phone,website,niches,platforms,follower_count,portfolio,avatar_url,featured_until,created_at,updated_at'

export async function getMyProfile(): Promise<Profile | null> {
  const { data: auth } = await supabase.auth.getUser()
  const uid = auth.user?.id
  if (!uid) return null
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', uid)
    .maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export interface ProfileInput {
  role: Role
  name: string
  business_category?: string | null
  bio?: string | null
  location?: string | null
  phone?: string | null
  website?: string | null
  niches?: string[]
  platforms?: string[]
  follower_count?: number | null
}

export async function createMyProfile(input: ProfileInput): Promise<Profile> {
  const uid = await requireUid()
  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: uid, ...input })
    .select(PROFILE_COLUMNS)
    .single()
  if (error) throw error
  return data as Profile
}

export async function updateMyProfile(patch: Partial<ProfileInput>): Promise<Profile> {
  const uid = await requireUid()
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', uid)
    .select(PROFILE_COLUMNS)
    .single()
  if (error) throw error
  return data as Profile
}

// A client's profile, for the creator they are transacting with. Returns null
// when the row is out of reach: RLS (0005) only exposes a CLIENT row to the
// counterparty of a booking, so this 404s for everyone else by design.
export async function getBusinessProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', id)
    .eq('role', 'CLIENT')
    .maybeSingle()
  if (error) throw error
  return data as Profile | null
}

// ---- Social links ----------------------------------------------------------
export interface SocialLinkInput {
  platform: string
  url: string
}

export async function listSocialLinks(profileId: string): Promise<SocialLink[]> {
  const { data, error } = await supabase
    .from('social_links')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as SocialLink[]
}

// Replace the signed-in user's whole set of links. Delete-then-insert rather than
// an upsert plus a diff: a user only ever edits their own handful of rows, and it
// keeps `unique (profile_id, platform)` out of the picture. If the insert fails
// after the delete the profile is left with none, which the gate re-prompts for.
export async function replaceSocialLinks(links: SocialLinkInput[]): Promise<SocialLink[]> {
  const uid = await requireUid()
  const { error: delError } = await supabase.from('social_links').delete().eq('profile_id', uid)
  if (delError) throw delError
  if (links.length === 0) return []
  const { data, error } = await supabase
    .from('social_links')
    .insert(links.map((l) => ({ profile_id: uid, platform: l.platform, url: l.url })))
    .select('*')
  if (error) throw error
  return (data ?? []) as SocialLink[]
}

// ---- Rate card -------------------------------------------------------------
export async function listRateCard(influencerId: string): Promise<RateCardItem[]> {
  const { data, error } = await supabase
    .from('rate_card_items')
    .select('*')
    .eq('influencer_id', influencerId)
    .order('price_paise', { ascending: true })
  if (error) throw error
  return (data ?? []) as RateCardItem[]
}

export async function addRateCardItem(
  deliverable: string,
  pricePaise: number,
): Promise<RateCardItem> {
  const uid = await requireUid()
  const { data, error } = await supabase
    .from('rate_card_items')
    .insert({ influencer_id: uid, deliverable, price_paise: pricePaise })
    .select('*')
    .single()
  if (error) throw error
  return data as RateCardItem
}

export async function deleteRateCardItem(id: string): Promise<void> {
  const { error } = await supabase.from('rate_card_items').delete().eq('id', id)
  if (error) throw error
}

// ---- Discovery / search ----------------------------------------------------
export type SortKey = 'price_asc' | 'price_desc' | 'rating' | 'followers'

export interface SearchParams {
  q?: string
  niche?: string
  location?: string
  platform?: string
  sort?: SortKey
  page?: number
  pageSize?: number
}

export interface SearchResult {
  cards: InfluencerCard[]
  total: number
  page: number
  pageSize: number
}

export async function searchInfluencers(params: SearchParams): Promise<SearchResult> {
  const page = Math.max(1, params.page ?? 1)
  const pageSize = params.pageSize ?? 12
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query = supabase.from('influencer_cards').select('*', { count: 'exact' })

  if (params.q) {
    // Strip PostgREST-significant chars before using the value as an ilike pattern.
    const safe = params.q.replace(/[%,()]/g, ' ').trim()
    if (safe) query = query.ilike('name', `%${safe}%`)
  }
  if (params.location) {
    const safe = params.location.replace(/[%,()]/g, ' ').trim()
    if (safe) query = query.ilike('location', `%${safe}%`)
  }
  if (params.niche) query = query.contains('niches', [params.niche])
  if (params.platform) query = query.contains('platforms', [params.platform])

  switch (params.sort) {
    case 'price_desc':
      query = query.order('min_price_paise', { ascending: false, nullsFirst: false })
      break
    case 'rating':
      query = query.order('avg_rating', { ascending: false })
      break
    case 'followers':
      query = query.order('follower_count', { ascending: false, nullsFirst: false })
      break
    case 'price_asc':
    default:
      query = query.order('min_price_paise', { ascending: true, nullsFirst: false })
  }

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  return { cards: (data ?? []) as InfluencerCard[], total: count ?? 0, page, pageSize }
}

export async function getInfluencerCard(id: string): Promise<InfluencerCard | null> {
  const { data, error } = await supabase
    .from('influencer_cards')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as InfluencerCard | null
}

export async function listReviewsForInfluencer(influencerId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('influencer_id', influencerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Review[]
}

// ---- Bookings --------------------------------------------------------------
// Two FKs point at profiles, so embeds are disambiguated by constraint name.
const BOOKING_WITH_PARTIES =
  '*, client:profiles!bookings_client_id_fkey(id,name,avatar_url), influencer:profiles!bookings_influencer_id_fkey(id,name,avatar_url)'

export interface BookingInput {
  influencerId: string
  deliverable: string
  pricePaise: number
  deadline?: string | null
  usageRights?: string | null
}

export async function createBooking(input: BookingInput): Promise<Booking> {
  const uid = await requireUid()
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      client_id: uid,
      influencer_id: input.influencerId,
      deliverable: input.deliverable,
      price_paise: input.pricePaise,
      deadline: input.deadline || null,
      usage_rights: input.usageRights || null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as Booking
}

export async function listMyBookings(): Promise<BookingWithParties[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_WITH_PARTIES)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as BookingWithParties[]
}

export async function getBooking(id: string): Promise<BookingWithParties | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_WITH_PARTIES)
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data as unknown as BookingWithParties | null
}

// State transitions — all go through SECURITY DEFINER RPCs (never direct UPDATE).
export type RespondAction = 'ACCEPT' | 'DECLINE' | 'COUNTER'

export async function respondToBooking(
  id: string,
  action: RespondAction,
  counterPricePaise?: number,
  counterNote?: string,
): Promise<Booking> {
  const { data, error } = await supabase.rpc('respond_to_booking', {
    p_booking_id: id,
    p_action: action,
    p_counter_price_paise: counterPricePaise ?? null,
    p_counter_note: counterNote ?? null,
  })
  if (error) throw error
  return data as Booking
}

export async function acceptCounter(id: string): Promise<Booking> {
  const { data, error } = await supabase.rpc('accept_counter', { p_booking_id: id })
  if (error) throw error
  return data as Booking
}

export async function payBooking(id: string): Promise<Booking> {
  const { data, error } = await supabase.rpc('pay_booking', { p_booking_id: id })
  if (error) throw error
  return data as Booking
}

export async function deliverBooking(id: string): Promise<Booking> {
  const { data, error } = await supabase.rpc('deliver_booking', { p_booking_id: id })
  if (error) throw error
  return data as Booking
}

export async function approveBooking(id: string): Promise<Booking> {
  const { data, error } = await supabase.rpc('approve_booking', { p_booking_id: id })
  if (error) throw error
  return data as Booking
}

// cancel_booking + open_dispute are added in migration 0004.
export async function cancelBooking(id: string, reason?: string): Promise<Booking> {
  const { data, error } = await supabase.rpc('cancel_booking', {
    p_booking_id: id,
    p_reason: reason ?? null,
  })
  if (error) throw error
  return data as Booking
}

export async function openDispute(id: string, reason: string): Promise<Booking> {
  const { data, error } = await supabase.rpc('open_dispute', {
    p_booking_id: id,
    p_reason: reason,
  })
  if (error) throw error
  return data as Booking
}

// ---- Reviews ---------------------------------------------------------------
export async function createReview(
  bookingId: string,
  rating: number,
  comment?: string,
): Promise<Review> {
  const { data, error } = await supabase.rpc('create_review', {
    p_booking_id: bookingId,
    p_rating: rating,
    p_comment: comment ?? null,
  })
  if (error) throw error
  return data as Review
}

export async function getReviewForBooking(bookingId: string): Promise<Review | null> {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle()
  if (error) throw error
  return data as Review | null
}

// ---- Messages / realtime chat ---------------------------------------------
export async function listMessages(bookingId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('booking_id', bookingId)
    .order('sent_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Message[]
}

export async function sendMessage(bookingId: string, text: string): Promise<Message> {
  const uid = await requireUid()
  const { data, error } = await supabase
    .from('messages')
    .insert({ booking_id: bookingId, sender_id: uid, text })
    .select('*')
    .single()
  if (error) throw error
  return data as Message
}

// Subscribe to new messages on a booking. Returns an unsubscribe function.
export function subscribeToMessages(
  bookingId: string,
  onInsert: (message: Message) => void,
): () => void {
  const channel = supabase
    .channel(`messages:${bookingId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `booking_id=eq.${bookingId}` },
      (payload) => onInsert(payload.new as Message),
    )
    .subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}
