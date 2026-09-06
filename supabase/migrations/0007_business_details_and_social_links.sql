-- 0007_business_details_and_social_links.sql
-- Three things: business profile details, a check that keeps creator PII out of
-- the public feed, and a social_links child table so a business can actually
-- open a creator's feed before paying them.

-- 1. Business details -------------------------------------------------------
-- `bio` (description) and `avatar_url` (logo) already exist and carry no role
-- constraint, so only contact details are new.
alter table public.profiles
  add column phone   text,
  add column website text;

-- profiles rows with role = 'INFLUENCER' are world-readable — that is the
-- discovery feed — so a phone number on one would be a public phone number.
-- Client rows are only visible to their own booking counterparty (0005), which
-- is exactly who should see it. Enforce the split in the schema rather than
-- trusting the form to only offer the field to one role.
alter table public.profiles
  add constraint profiles_phone_client_only check (phone is null or role = 'CLIENT');

-- `website` is rendered as an href. React does not sanitise URLs, so a stored
-- `javascript:` value would execute on click; the app normalises on write and
-- re-checks on render, and this is the backstop under both.
alter table public.profiles
  add constraint profiles_website_http check (website is null or website ~* '^https?://');

-- 0006 dropped the table-wide grant in favour of an explicit column list, so a
-- newly added column has no privileges at all until it is named here. Without
-- this the client profile form fails with `42501 permission denied for table
-- profiles`. `phone` is safe to grant to anon because the check constraint above
-- guarantees it is null on every row anon can read.
grant select (phone, website) on public.profiles to anon, authenticated;
grant insert (phone, website) on public.profiles to authenticated;
grant update (phone, website) on public.profiles to authenticated;

-- 2. social_links -----------------------------------------------------------
-- Mirrors rate_card_items: a public child table owned by one profile. Public to
-- read (a business checks the feed before booking, often before signing up),
-- writable only by the profile it belongs to.
create table public.social_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  platform text not null check (length(platform) between 1 and 40),
  -- Same href reasoning as profiles.website above.
  url text not null check (url ~* '^https?://' and length(url) <= 500),
  created_at timestamptz not null default now(),
  -- One link per platform, so a profile cannot list Instagram twice.
  unique (profile_id, platform)
);

create index social_links_profile_idx on public.social_links (profile_id);

alter table public.social_links enable row level security;

create policy social_links_select_public on public.social_links
  for select using (true);
create policy social_links_write_owner on public.social_links
  for all using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- Supabase's default privileges would grant this new table to anon and
-- authenticated wholesale. Nothing here is secret, so this is only about keeping
-- `id` and `created_at` server-assigned — and about matching the 0006
-- convention, so the next person adding a column has to think about who reads it.
revoke select, insert, update, delete on public.social_links from anon, authenticated;
grant select (id, profile_id, platform, url, created_at) on public.social_links to anon, authenticated;
grant insert (profile_id, platform, url) on public.social_links to authenticated;
-- profile_id is updatable so a PostgREST upsert (which SETs every column in the
-- payload) works; RLS still pins it to auth.uid() on both sides of the write.
grant update (profile_id, platform, url) on public.social_links to authenticated;
grant delete on public.social_links to authenticated;
