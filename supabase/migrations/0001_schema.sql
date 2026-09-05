-- 0001_schema.sql — AInfluencer core schema
-- Money is stored as INTEGER paise (₹1 = 100 paise). Never use float for money.

-- profiles: one row per user, keyed to Supabase auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('CLIENT','INFLUENCER')),
  name text not null,
  email text,
  -- client-only
  business_category text,
  -- influencer-only
  bio text,
  location text,
  niches text[] not null default '{}',
  platforms text[] not null default '{}',
  follower_count bigint,
  portfolio text[] not null default '{}',
  avatar_url text,
  featured_until timestamptz,            -- reserved for a future "featured listing" revenue model
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rate_card_items (
  id uuid primary key default gen_random_uuid(),
  influencer_id uuid not null references public.profiles(id) on delete cascade,
  deliverable text not null,
  price_paise integer not null check (price_paise >= 0),
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id),
  influencer_id uuid not null references public.profiles(id),
  deliverable text not null,
  deadline date,
  usage_rights text,
  price_paise integer not null check (price_paise >= 0),
  status text not null default 'REQUESTED'
    check (status in ('REQUESTED','COUNTERED','ACCEPTED','DECLINED','FUNDED','DELIVERED','COMPLETED','CANCELLED')),
  counter_note text,
  escrow_funded boolean not null default false,
  escrow_released boolean not null default false,
  funded_at timestamptz,
  delivered_at timestamptz,
  auto_release_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_self_booking check (client_id <> influencer_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  text text not null,
  sent_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  influencer_id uuid not null references public.profiles(id),
  client_id uuid not null references public.profiles(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- Indexes for search & lookups
create index profiles_role_idx      on public.profiles (role);
create index profiles_location_idx  on public.profiles (lower(location));
create index profiles_followers_idx on public.profiles (follower_count);
create index profiles_niches_idx    on public.profiles using gin (niches);
create index profiles_platforms_idx on public.profiles using gin (platforms);
create index ratecard_influencer_idx on public.rate_card_items (influencer_id);
create index bookings_client_idx     on public.bookings (client_id);
create index bookings_influencer_idx on public.bookings (influencer_id);
create index bookings_status_idx     on public.bookings (status);
create index messages_booking_idx    on public.messages (booking_id);
create index reviews_influencer_idx  on public.reviews (influencer_id);

-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger bookings_set_updated_at before update on public.bookings
  for each row execute function public.set_updated_at();

-- Public influencer "card" view with rating rollup (used by search/discovery).
-- security_invoker => the querying user's RLS on the base tables still applies.
create view public.influencer_cards
  with (security_invoker = true) as
select
  p.id, p.name, p.bio, p.location, p.niches, p.platforms,
  p.follower_count, p.portfolio, p.avatar_url, p.featured_until,
  coalesce(r.avg_rating, 0)::numeric(3,2) as avg_rating,
  coalesce(r.review_count, 0) as review_count
from public.profiles p
left join (
  select influencer_id, avg(rating) as avg_rating, count(*) as review_count
  from public.reviews group by influencer_id
) r on r.influencer_id = p.id
where p.role = 'INFLUENCER';
