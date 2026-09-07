-- 0008_admin_dispute_resolution_and_uploads.sql
-- Two things: admin role for dispute resolution, and Storage buckets for
-- profile media uploads (avatars + portfolio images).

-- ==========================================================================
-- 1. Admin role for dispute resolution
-- ==========================================================================

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create policy admins_select_admin_only on public.admins
  for select using (
    exists (select 1 from public.admins a where a.user_id = auth.uid())
  );

-- RPC so the client can check admin status without a service key.
create or replace function public.is_admin()
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid())
$$;

grant execute on function public.is_admin() to authenticated;

-- Resolve a dispute: admin releases to creator, refunds client, or re-opens.
create or replace function public.resolve_dispute(
  p_booking_id uuid,
  p_resolution text,
  p_note text default null
)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
begin
  if not public.is_admin() then
    raise exception 'Only admins can resolve disputes';
  end if;

  select * into b from public.bookings where id = p_booking_id;

  if not found then
    raise exception 'Booking not found';
  end if;
  if b.status <> 'DISPUTED' then
    raise exception 'Booking is % (expected DISPUTED)', b.status;
  end if;

  if p_resolution = 'release' then
    update public.bookings
      set status = 'COMPLETED', escrow_released = true,
          dispute_reason = coalesce(p_note, dispute_reason)
      where id = p_booking_id returning * into b;
  elsif p_resolution = 'refund' then
    update public.bookings
      set status = 'REFUND_OWED',
          dispute_reason = coalesce(p_note, dispute_reason)
      where id = p_booking_id returning * into b;
  elsif p_resolution = 're_open' then
    update public.bookings
      set status = 'FUNDED',
          dispute_reason = coalesce(p_note, dispute_reason),
          auto_release_at = now() + interval '6 days'
      where id = p_booking_id returning * into b;
  else
    raise exception 'Invalid resolution: %', p_resolution;
  end if;

  return b;
end $$;

grant execute on function public.resolve_dispute(uuid, text, text) to authenticated;

-- Extend the auto-release window (for DELIVERED bookings).
create or replace function public.extend_auto_release(
  p_booking_id uuid,
  p_days integer default 3
)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
begin
  select * into b from public.bookings where id = p_booking_id;
  if not found then raise exception 'Booking not found'; end if;
  if b.client_id <> auth.uid() and b.influencer_id <> auth.uid() then
    raise exception 'Only participants can extend the window';
  end if;
  if b.status <> 'DELIVERED' then
    raise exception 'Can only extend when delivery is pending (current: %)', b.status;
  end if;
  if b.auto_release_at is null then
    raise exception 'No auto-release window to extend';
  end if;
  if p_days < 1 or p_days > 30 then
    raise exception 'Days must be between 1 and 30';
  end if;

  update public.bookings
    set auto_release_at = b.auto_release_at + (p_days || ' days')::interval
    where id = p_booking_id returning * into b;
  return b;
end $$;

grant execute on function public.extend_auto_release(uuid, integer) to authenticated;

-- Add REFUND_OWED to the valid status check.
alter table public.bookings drop constraint if exists bookings_status_check;
alter table public.bookings
  add constraint bookings_status_check check (
    status in (
      'REQUESTED','COUNTERED','ACCEPTED','DECLINED',
      'FUNDED','DELIVERED','COMPLETED','CANCELLED','DISPUTED','REFUND_OWED'
    )
  );

-- Admins (0002 participant-only policies) may read every booking and profile
-- row. The check is the SECURITY DEFINER is_admin(), so it is enforced
-- server-side regardless of who runs the query.
create policy bookings_select_admin on public.bookings
  for select using (public.is_admin());

create policy profiles_select_admin on public.profiles
  for select using (public.is_admin());

-- ==========================================================================
-- 2. Storage buckets for profile media
-- ==========================================================================

-- Avatars: profile pictures. Public read, owner write.
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true) on conflict (id) do nothing;

create policy avatar_select_public on storage.objects
  for select using (bucket_id = 'avatars');

create policy avatar_insert_owner on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy avatar_delete_owner on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Portfolio: creator work samples. Public read, owner write.
insert into storage.buckets (id, name, public)
  values ('portfolio', 'portfolio', true) on conflict (id) do nothing;

create policy portfolio_select_public on storage.objects
  for select using (bucket_id = 'portfolio');

create policy portfolio_insert_owner on storage.objects
  for insert with check (
    bucket_id = 'portfolio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy portfolio_delete_owner on storage.objects
  for delete using (
    bucket_id = 'portfolio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

grant insert, delete on storage.objects to authenticated;
