-- 0011_favorites_availability_analytics.sql
-- Workstream 5 (conversion) + Workstream 3 (creator analytics).
--
--   * favorites     — clients shortlist creators; the saved list is a first-class row.
--   * availability  — creators publish recurring weekly windows so clients see when
--                     they are free before booking.
--   * get_my_analytics — creator dashboard stats computed server-side.
--   * rebook_booking — one-tap rebook of a past completed booking.

-- ============================================================================
-- 1. favorites
-- ============================================================================

create table if not exists public.favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, creator_id)
);

create index if not exists favorites_creator_idx on public.favorites (creator_id);

alter table public.favorites enable row level security;

create policy favorites_select_own on public.favorites
  for select using (user_id = auth.uid());
create policy favorites_insert_own on public.favorites
  for insert with check (user_id = auth.uid());
create policy favorites_delete_own on public.favorites
  for delete using (user_id = auth.uid());

grant select, insert, delete on public.favorites to authenticated;

-- ============================================================================
-- 2. availability (recurring weekly windows)
-- ============================================================================

create table if not exists public.availability (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  note text,
  constraint availability_end_after_start check (end_time > start_time),
  constraint availability_creator_day unique (creator_id, day_of_week)
);

alter table public.availability enable row level security;

-- Anyone may read a creator's availability (like influencer_cards); only the
-- owner may write their own rows.
create policy availability_select_all on public.availability
  for select using (true);
create policy availability_insert_owner on public.availability
  for insert with check (creator_id = auth.uid());
create policy availability_update_owner on public.availability
  for update using (creator_id = auth.uid()) with check (creator_id = auth.uid());
create policy availability_delete_owner on public.availability
  for delete using (creator_id = auth.uid());

grant select, insert, update, delete on public.availability to authenticated;
grant select on public.availability to anon;

-- ============================================================================
-- 3. RPCs: favorites
-- ============================================================================

create or replace function public.toggle_favorite(p_creator_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_fav boolean;
begin
  if not exists (
    select 1 from public.profiles where id = p_creator_id and role = 'INFLUENCER'
  ) then
    raise exception 'Creator not found';
  end if;
  if exists (
    select 1 from public.favorites where user_id = auth.uid() and creator_id = p_creator_id
  ) then
    delete from public.favorites where user_id = auth.uid() and creator_id = p_creator_id;
    v_fav := false;
  else
    insert into public.favorites (user_id, creator_id) values (auth.uid(), p_creator_id);
    v_fav := true;
  end if;
  return v_fav;
end $$;

create or replace function public.is_favorite(p_creator_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  return exists (
    select 1 from public.favorites
    where user_id = auth.uid() and creator_id = p_creator_id
  );
end $$;

-- Full influencer-card shape for the saved list, most recently saved first.
create or replace function public.list_my_favorites()
returns table (
  id uuid, name text, avatar_url text, location text, niches text[],
  avg_rating numeric, review_count bigint, min_price_paise bigint
)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select c.id, c.name, c.avatar_url, c.location, c.niches,
           c.avg_rating, c.review_count, c.min_price_paise::bigint
    from public.influencer_cards c
    join public.favorites f on f.creator_id = c.id
    where f.user_id = auth.uid()
    order by f.created_at desc;
end $$;

-- ============================================================================
-- 4. RPCs: availability
-- ============================================================================

create or replace function public.upsert_availability(
  p_weekday integer,
  p_start time,
  p_end time,
  p_note text default null
)
returns public.availability
language plpgsql security definer set search_path = public as $$
declare a public.availability;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'INFLUENCER'
  ) then
    raise exception 'Only creators can set availability';
  end if;
  if p_weekday is null or p_weekday not between 0 and 6 then
    raise exception 'weekday must be between 0 and 6 (Sunday = 0)';
  end if;
  if p_start is null or p_end is null then
    raise exception 'Start and end times are required';
  end if;
  if p_end <= p_start then
    raise exception 'End time must be after start time';
  end if;

  insert into public.availability (creator_id, day_of_week, start_time, end_time, note)
  values (auth.uid(), p_weekday, p_start, p_end, p_note)
  on conflict (creator_id, day_of_week) do update
    set start_time = excluded.start_time,
        end_time   = excluded.end_time,
        note       = excluded.note
  returning * into a;
  return a;
end $$;

create or replace function public.delete_availability(p_weekday integer)
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.availability where creator_id = auth.uid() and day_of_week = p_weekday;
end $$;

create or replace function public.list_creator_availability(p_creator_id uuid)
returns table (
  day_of_week integer, start_time time, end_time time, note text
)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select a.day_of_week, a.start_time, a.end_time, a.note
    from public.availability a
    where a.creator_id = p_creator_id
    order by a.day_of_week;
end $$;

-- ============================================================================
-- 5. RPC: creator analytics (Workstream 3)
-- ============================================================================

create or replace function public.get_my_analytics()
returns table (
  total_bookings bigint,
  completed_bookings bigint,
  completion_rate numeric,
  active_bookings bigint,
  avg_rating numeric,
  review_count bigint,
  total_earned_paise bigint,
  available_balance_paise bigint
)
language plpgsql security definer set search_path = public as $$
declare
  v_total bigint := 0;
  v_completed bigint := 0;
  v_active bigint := 0;
  v_avg numeric := 0;
  v_reviews bigint := 0;
  v_earned bigint := 0;
  v_available bigint := 0;
begin
  select count(*),
         count(*) filter (where status = 'COMPLETED'),
         count(*) filter (where status in ('REQUESTED','COUNTERED','ACCEPTED','FUNDED','DELIVERED'))
    into v_total, v_completed, v_active
    from public.bookings where influencer_id = auth.uid();

  select coalesce(avg(rating), 0)::numeric(3,2), count(*)
    into v_avg, v_reviews
    from public.reviews where influencer_id = auth.uid();

  select coalesce(sum(p.amount_paise), 0)
    into v_earned
    from public.payments p
    join public.bookings b on b.id = p.booking_id
    where b.influencer_id = auth.uid()
      and p.kind = 'ESCROW_RELEASE' and p.status = 'SUCCEEDED';

  select coalesce(bal.available_paise, 0)
    into v_available
    from public.get_my_balance() bal;

  return query
    select v_total, v_completed,
           case when v_total = 0 then 0::numeric
                else round(100.0 * v_completed / v_total, 1) end,
           v_active, v_avg, v_reviews, v_earned, v_available;
end $$;

-- ============================================================================
-- 6. RPC: rebook a completed booking (Workstream 5)
-- ============================================================================

create or replace function public.rebook_booking(p_booking_id uuid)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  src public.bookings;
  nb public.bookings;
begin
  select * into src from public.bookings where id = p_booking_id;
  if not found then raise exception 'Booking not found'; end if;
  if src.client_id <> auth.uid() then
    raise exception 'Only the client can rebook';
  end if;
  if src.status <> 'COMPLETED' then
    raise exception 'Only completed bookings can be rebooked (current: %)', src.status;
  end if;

  insert into public.bookings (
    client_id, influencer_id, deliverable, deadline, usage_rights, price_paise, status
  ) values (
    src.client_id, src.influencer_id, src.deliverable, null,
    src.usage_rights, src.price_paise, 'REQUESTED'
  ) returning * into nb;

  return nb;
end $$;

-- ============================================================================
-- 7. Grants
-- ============================================================================

grant execute on function
  public.toggle_favorite(uuid),
  public.is_favorite(uuid),
  public.list_my_favorites(),
  public.upsert_availability(integer, time, time, text),
  public.delete_availability(integer),
  public.list_creator_availability(uuid),
  public.get_my_analytics(),
  public.rebook_booking(uuid)
  to authenticated;

grant execute on function public.list_creator_availability(uuid) to anon;