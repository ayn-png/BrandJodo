-- 0013_qa_integrity_fixes.sql
-- Integrity and failure-handling fixes identified during QA.

-- Roles are selected during onboarding and cannot be changed by profile updates.
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
as $$
begin
  if new.role <> old.role then
    raise exception 'Profile role cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
  before update on public.profiles
  for each row execute function public.prevent_profile_role_change();

-- Replace links in one transaction so a failed insert cannot erase the old set.
create or replace function public.replace_social_links(p_links jsonb)
returns setof public.social_links
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_role('INFLUENCER') then
    raise exception 'Only influencers can edit social links';
  end if;

  delete from public.social_links where profile_id = auth.uid();

  return query
    insert into public.social_links (profile_id, platform, url)
    select auth.uid(), x.platform, x.url
    from jsonb_to_recordset(coalesce(p_links, '[]'::jsonb))
      as x(platform text, url text)
    returning *;
end;
$$;

grant execute on function public.replace_social_links(jsonb) to authenticated;

-- Create a request from a published rate-card item and derive its price server-side.
drop policy if exists bookings_insert_client on public.bookings;

create or replace function public.create_booking_from_rate_card(
  p_rate_card_id uuid,
  p_deadline date default null,
  p_usage_rights text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  item public.rate_card_items;
  b public.bookings;
begin
  if not public.is_role('CLIENT') then
    raise exception 'Only clients can create bookings';
  end if;

  select * into item
  from public.rate_card_items
  where id = p_rate_card_id
  for share;

  if not found then
    raise exception 'Rate-card item not found';
  end if;

  insert into public.bookings (
    client_id, influencer_id, deliverable, deadline, usage_rights, price_paise, status
  )
  values (
    uid, item.influencer_id, item.deliverable, p_deadline, p_usage_rights, item.price_paise, 'REQUESTED'
  )
  returning * into b;
  return b;
end;
$$;

grant execute on function public.create_booking_from_rate_card(uuid, date, text) to authenticated;

-- Reserve REQUESTED payouts as well as payouts already being processed.
create or replace function public.request_payout(p_amount_paise integer)
returns public.payouts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_avail bigint;
  payout_row public.payouts;
begin
  if not public.is_role('INFLUENCER') then
    raise exception 'Only influencers can request a payout';
  end if;
  if p_amount_paise is null or p_amount_paise <= 0 then
    raise exception 'Amount must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 0));

  select coalesce(sum(p.amount_paise), 0)
    - coalesce((select sum(x.amount_paise) from public.payouts x
               where x.influencer_id = auth.uid()
                 and x.status in ('REQUESTED','PROCESSING','PAID')), 0)
    into v_avail
  from public.payments p
  join public.bookings b on b.id = p.booking_id
  where p.kind = 'ESCROW_RELEASE'
    and p.status = 'SUCCEEDED'
    and b.influencer_id = auth.uid();

  if v_avail < p_amount_paise then
    raise exception 'Insufficient available balance (have %, asked %)', v_avail, p_amount_paise;
  end if;

  insert into public.payouts (influencer_id, amount_paise, status, method)
  values (auth.uid(), p_amount_paise, 'REQUESTED', 'UPI')
  returning * into payout_row;
  return payout_row;
end;
$$;

create or replace function public.get_my_balance()
returns table (available_paise bigint, escrow_held_paise bigint, total_paid_out_paise bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_released bigint;
  v_paid bigint;
  v_escrow bigint;
begin
  select coalesce(sum(p.amount_paise), 0) into v_released
  from public.payments p
  join public.bookings b on b.id = p.booking_id
  where p.kind = 'ESCROW_RELEASE'
    and p.status = 'SUCCEEDED'
    and b.influencer_id = auth.uid();

  select coalesce(sum(x.amount_paise), 0) into v_paid
  from public.payouts x
  where x.influencer_id = auth.uid()
    and x.status in ('REQUESTED','PROCESSING','PAID');

  select coalesce(sum(b.price_paise), 0) into v_escrow
  from public.bookings b
  where b.influencer_id = auth.uid()
    and b.escrow_funded
    and not b.escrow_released
    and b.status in ('FUNDED','DELIVERED','DISPUTED');

  return query select v_released - v_paid, v_escrow, v_paid;
end;
$$;
