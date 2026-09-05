-- 0003_functions.sql — booking state machine as SECURITY DEFINER RPCs, plus the
-- escrow auto-release job. Transitions live here (not in table UPDATE policies)
-- so the state machine is enforced server-side and auth-checked in one place.

-- Influencer responds to a request: ACCEPT | DECLINE | COUNTER
create or replace function public.respond_to_booking(
  p_booking_id uuid, p_action text,
  p_counter_price_paise integer default null, p_counter_note text default null)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if b.influencer_id <> auth.uid() then raise exception 'Only the influencer can respond'; end if;
  if b.status not in ('REQUESTED','COUNTERED') then
    raise exception 'Booking is % (expected REQUESTED/COUNTERED)', b.status; end if;

  if p_action = 'ACCEPT' then
    update bookings set status='ACCEPTED' where id=p_booking_id returning * into b;
  elsif p_action = 'DECLINE' then
    update bookings set status='DECLINED' where id=p_booking_id returning * into b;
  elsif p_action = 'COUNTER' then
    update bookings set status='COUNTERED',
      price_paise  = coalesce(p_counter_price_paise, price_paise),
      counter_note = p_counter_note
      where id=p_booking_id returning * into b;
  else
    raise exception 'action must be ACCEPT, DECLINE, or COUNTER';
  end if;
  return b;
end $$;

-- Client accepts a counter-offer
create or replace function public.accept_counter(p_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from bookings where id=p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if b.client_id <> auth.uid() then raise exception 'Only the client can accept'; end if;
  if b.status <> 'COUNTERED' then raise exception 'Booking is % (expected COUNTERED)', b.status; end if;
  update bookings set status='ACCEPTED' where id=p_booking_id returning * into b;
  return b;
end $$;

-- Client funds escrow (SIMULATED — no real money in v1)
create or replace function public.pay_booking(p_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from bookings where id=p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if b.client_id <> auth.uid() then raise exception 'Only the client can pay'; end if;
  if b.status <> 'ACCEPTED' then raise exception 'Booking is % (expected ACCEPTED)', b.status; end if;
  update bookings set status='FUNDED', escrow_funded=true, funded_at=now()
    where id=p_booking_id returning * into b;
  return b;
end $$;

-- Influencer marks delivered; starts the 6-day auto-release clock
create or replace function public.deliver_booking(p_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from bookings where id=p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if b.influencer_id <> auth.uid() then raise exception 'Only the influencer can deliver'; end if;
  if b.status <> 'FUNDED' then raise exception 'Booking is % (expected FUNDED)', b.status; end if;
  update bookings set status='DELIVERED', delivered_at=now(),
    auto_release_at = now() + interval '6 days'
    where id=p_booking_id returning * into b;
  return b;
end $$;

-- Client approves; releases escrow
create or replace function public.approve_booking(p_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from bookings where id=p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if b.client_id <> auth.uid() then raise exception 'Only the client can approve'; end if;
  if b.status <> 'DELIVERED' then raise exception 'Booking is % (expected DELIVERED)', b.status; end if;
  update bookings set status='COMPLETED', escrow_released=true
    where id=p_booking_id returning * into b;
  return b;
end $$;

-- Client leaves a review after completion (one per booking, enforced by unique)
create or replace function public.create_review(
  p_booking_id uuid, p_rating integer, p_comment text default null)
returns public.reviews language plpgsql security definer set search_path = public as $$
declare b public.bookings; rv public.reviews;
begin
  select * into b from bookings where id=p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if b.client_id <> auth.uid() then raise exception 'Only the client can review'; end if;
  if b.status <> 'COMPLETED' then raise exception 'Booking is % (expected COMPLETED)', b.status; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'rating must be 1-5'; end if;
  insert into reviews (booking_id, influencer_id, client_id, rating, comment)
    values (b.id, b.influencer_id, b.client_id, p_rating, coalesce(p_comment,''))
    returning * into rv;
  return rv;
end $$;

-- Only logged-in users may call the transition RPCs.
revoke all on function
  public.respond_to_booking(uuid,text,integer,text), public.accept_counter(uuid),
  public.pay_booking(uuid), public.deliver_booking(uuid),
  public.approve_booking(uuid), public.create_review(uuid,integer,text)
  from public, anon;
grant execute on function
  public.respond_to_booking(uuid,text,integer,text), public.accept_counter(uuid),
  public.pay_booking(uuid), public.deliver_booking(uuid),
  public.approve_booking(uuid), public.create_review(uuid,integer,text)
  to authenticated;

-- Escrow auto-release: complete bookings stuck in DELIVERED past their window.
create or replace function public.release_due_escrow()
returns void language sql security definer set search_path = public as $$
  update public.bookings set status='COMPLETED', escrow_released=true
  where status='DELIVERED' and escrow_released=false
    and auto_release_at is not null and now() > auto_release_at;
$$;

-- Schedule it (run once, after: create extension if not exists pg_cron;):
-- select cron.schedule('release-due-escrow', '*/10 * * * *',
--   $$select public.release_due_escrow();$$);
