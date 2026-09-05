-- 0004_dispute_cancel.sql
-- Adds the DISPUTED state + cancel/dispute RPCs, and surfaces the minimum
-- rate-card price on the discovery view for price-first sorting.
-- Safe to re-apply: guards with IF EXISTS / IF NOT EXISTS / CREATE OR REPLACE.

-- 1) Allow DISPUTED in the bookings.status CHECK constraint ------------------
-- The inline check from 0001 is auto-named public.bookings_status_check.
alter table public.bookings
  drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check check (
    status in (
      'REQUESTED', 'COUNTERED', 'ACCEPTED', 'DECLINED',
      'FUNDED', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED'
    )
  );

-- 2) Columns to record a cancel / dispute -----------------------------------
alter table public.bookings
  add column if not exists dispute_reason text,
  add column if not exists disputed_at    timestamptz,
  add column if not exists cancel_reason  text,
  add column if not exists cancelled_at   timestamptz;

-- 3) cancel_booking: either party may cancel before funds are escrowed -------
create or replace function public.cancel_booking(p_booking_id uuid, p_reason text default null)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings;
  uid uuid := auth.uid();
begin
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found';
  end if;
  if uid is null or (uid <> b.client_id and uid <> b.influencer_id) then
    raise exception 'Not authorized for this booking';
  end if;
  -- Terminal states cannot be cancelled.
  if b.status in ('COMPLETED', 'CANCELLED', 'DECLINED', 'DISPUTED') then
    raise exception 'Cannot cancel a % booking', b.status;
  end if;
  -- Money is escrowed once FUNDED; those must go through dispute, not cancel.
  if b.status in ('FUNDED', 'DELIVERED') then
    raise exception 'Funded bookings must be disputed, not cancelled';
  end if;

  update public.bookings
     set status = 'CANCELLED',
         cancel_reason = p_reason,
         cancelled_at = now()
   where id = p_booking_id
   returning * into b;
  return b;
end;
$$;

-- 4) open_dispute: raise a dispute while funds are held in escrow ------------
create or replace function public.open_dispute(p_booking_id uuid, p_reason text)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.bookings;
  uid uuid := auth.uid();
begin
  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'A dispute reason is required';
  end if;

  select * into b from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'Booking not found';
  end if;
  if uid is null or (uid <> b.client_id and uid <> b.influencer_id) then
    raise exception 'Not authorized for this booking';
  end if;
  -- Only meaningful while funds are held (FUNDED) or delivery is under review.
  if b.status not in ('FUNDED', 'DELIVERED') then
    raise exception 'Only funded or delivered bookings can be disputed';
  end if;

  update public.bookings
     set status = 'DISPUTED',
         dispute_reason = p_reason,
         disputed_at = now()
   where id = p_booking_id
   returning * into b;
  return b;
end;
$$;

revoke all on function public.cancel_booking(uuid, text) from public, anon;
revoke all on function public.open_dispute(uuid, text) from public, anon;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
grant execute on function public.open_dispute(uuid, text) to authenticated;

-- NOTE: release_due_escrow() (0003) only touches status='DELIVERED', so a
-- DISPUTED booking is already skipped by it — no change needed there.

-- 5) Recreate influencer_cards with min_price_paise -------------------------
-- Preserves every column from the 0001 view and adds the cheapest rate-card
-- price so discovery can sort by price. security_invoker keeps base-table RLS.
drop view if exists public.influencer_cards;
create view public.influencer_cards
  with (security_invoker = true) as
select
  p.id, p.name, p.bio, p.location, p.niches, p.platforms,
  p.follower_count, p.portfolio, p.avatar_url, p.featured_until,
  coalesce(r.avg_rating, 0)::numeric(3,2) as avg_rating,
  coalesce(r.review_count, 0) as review_count,
  rc.min_price_paise
from public.profiles p
left join (
  select influencer_id, avg(rating) as avg_rating, count(*) as review_count
  from public.reviews group by influencer_id
) r on r.influencer_id = p.id
left join (
  select influencer_id, min(price_paise) as min_price_paise
  from public.rate_card_items group by influencer_id
) rc on rc.influencer_id = p.id
where p.role = 'INFLUENCER';

grant select on public.influencer_cards to anon, authenticated;
