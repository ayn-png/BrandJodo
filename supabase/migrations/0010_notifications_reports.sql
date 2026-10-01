-- 0010_notifications_reports.sql
-- Workstream 2: durable notifications + Workstream 4: moderation/reporting.
--
-- Notifications are a first-class table (not derived from bookings) so history
-- survives and the bell/page read real rows. Rows are written ONLY by SECURITY
-- DEFINER trigger functions (notify_user) attached to bookings / messages /
-- reviews / payouts — the client never inserts directly.
--
-- Reports are the moderation queue: any user can flag a profile, booking,
-- message or review; admins review and dismiss/resolve in the admin UI.

-- ============================================================================
-- 1. notifications
-- ============================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('booking','message','review','payout','admin')),
  title text not null,
  body text,
  booking_id uuid references public.bookings(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Own rows only. There is deliberately NO insert grant: rows are created by the
-- SECURITY DEFINER notify_user() function, never by the client SDK.
create policy notifications_select_owner on public.notifications
  for select using (user_id = auth.uid());
create policy notifications_update_owner on public.notifications
  for update using (user_id = auth.uid());
create policy notifications_delete_owner on public.notifications
  for delete using (user_id = auth.uid());

grant select, update, delete on public.notifications to authenticated;

-- ============================================================================
-- 2. reports (moderation queue)
-- ============================================================================

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('PROFILE','BOOKING','MESSAGE','REVIEW')),
  target_id uuid not null,
  reason text not null check (char_length(reason) between 10 and 1000),
  status text not null default 'OPEN' check (status in ('OPEN','REVIEWED','DISMISSED')),
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists reports_status_idx on public.reports (status, created_at desc);
create index if not exists reports_reporter_idx on public.reports (reporter_id);

alter table public.reports enable row level security;

create policy reports_insert_own on public.reports
  for insert with check (reporter_id = auth.uid());
create policy reports_select_own_or_admin on public.reports
  for select using (reporter_id = auth.uid() or public.is_admin());
create policy reports_update_admin on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

grant select, insert, update on public.reports to authenticated;

-- ============================================================================
-- 3. notify_user() — the single write path for notifications
-- ============================================================================

create or replace function public.notify_user(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text,
  p_booking_id uuid default null,
  p_data jsonb default '{}'::jsonb
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_user_id is null then return; end if;
  insert into public.notifications (user_id, type, title, body, booking_id, data)
  values (p_user_id, p_type, p_title, p_body, p_booking_id, p_data);
end $$;

-- ============================================================================
-- 4. Trigger: booking lifecycle (insert + status change)
-- ============================================================================

create or replace function public.notify_booking_change()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_client text;
  v_influencer text;
  v_booking_id uuid := new.id;
begin
  select c.name, i.name into v_client, v_influencer
  from public.profiles c, public.profiles i
  where c.id = new.client_id and i.id = new.influencer_id;

  if tg_op = 'INSERT' then
    perform public.notify_user(
      new.influencer_id, 'booking', 'New booking request',
      coalesce(v_client, 'A client') || ' requested "' || new.deliverable || '".',
      v_booking_id, jsonb_build_object('booking_id', v_booking_id)
    );
    return new;
  end if;

  if old.status = new.status then return new; end if;

  if new.status = 'COUNTERED' then
    perform public.notify_user(
      new.client_id, 'booking', 'New counter-offer',
      coalesce(v_influencer, 'The creator') || ' sent a counter-offer for "' || new.deliverable || '".',
      v_booking_id, jsonb_build_object('booking_id', v_booking_id)
    );
  elsif new.status = 'ACCEPTED' and old.status in ('REQUESTED','COUNTERED') then
    perform public.notify_user(
      new.client_id, 'booking', 'Booking accepted',
      coalesce(v_influencer, 'The creator') || ' accepted your booking "' || new.deliverable || '". Fund it to get started.',
      v_booking_id, jsonb_build_object('booking_id', v_booking_id)
    );
  elsif new.status = 'DECLINED' then
    perform public.notify_user(
      new.client_id, 'booking', 'Booking declined',
      coalesce(v_influencer, 'The creator') || ' declined "' || new.deliverable || '".',
      v_booking_id, jsonb_build_object('booking_id', v_booking_id)
    );
  elsif new.status = 'FUNDED' and old.status = 'ACCEPTED' then
    perform public.notify_user(
      new.influencer_id, 'booking', 'Booking funded',
      coalesce(v_client, 'The client') || ' funded "' || new.deliverable || '". Funds are held in escrow — start work.',
      v_booking_id, jsonb_build_object('booking_id', v_booking_id)
    );
  elsif new.status = 'DELIVERED' and old.status = 'FUNDED' then
    perform public.notify_user(
      new.client_id, 'booking', 'Work delivered',
      coalesce(v_influencer, 'The creator') || ' delivered "' || new.deliverable || '". Review and approve to release payment.',
      v_booking_id, jsonb_build_object('booking_id', v_booking_id)
    );
  elsif new.status = 'COMPLETED' then
    perform public.notify_user(
      new.influencer_id, 'booking', 'Payment released',
      'Your payout for "' || new.deliverable || '" was released to escrow balance.',
      v_booking_id, jsonb_build_object('booking_id', v_booking_id)
    );
  elsif new.status = 'DISPUTED' then
    perform public.notify_user(
      new.influencer_id, 'booking', 'Dispute opened',
      'A dispute was opened on "' || new.deliverable || '". Funds stay held while it is reviewed.',
      v_booking_id, jsonb_build_object('booking_id', v_booking_id)
    );
  elsif new.status = 'REFUND_OWED' then
    perform public.notify_user(
      new.client_id, 'booking', 'Dispute resolved — refund',
      'Your booking "' || new.deliverable || '" was refunded.',
      v_booking_id, jsonb_build_object('booking_id', v_booking_id)
    );
  elsif new.status = 'CANCELLED' then
    perform public.notify_user(
      new.influencer_id, 'booking', 'Booking cancelled',
      'The booking "' || new.deliverable || '" was cancelled.',
      v_booking_id, jsonb_build_object('booking_id', v_booking_id)
    );
  elsif new.status = 'FUNDED' and old.status = 'DISPUTED' then
    -- admin re-opened a dispute
    perform public.notify_user(
      new.influencer_id, 'booking', 'Booking re-opened',
      'Your dispute on "' || new.deliverable || '" was resolved — the booking is open again.',
      v_booking_id, jsonb_build_object('booking_id', v_booking_id)
    );
  end if;

  return new;
end $$;

create trigger bookings_notify_change
  after insert or update of status on public.bookings
  for each row execute function public.notify_booking_change();

-- ============================================================================
-- 5. Trigger: new message notifies the other participant
-- ============================================================================

create or replace function public.notify_message()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
  v_other uuid;
  v_sender text;
begin
  select * into b from public.bookings where id = new.booking_id;
  if not found then return new; end if;
  v_other := case when b.client_id = new.sender_id then b.influencer_id else b.client_id end;
  select name into v_sender from public.profiles where id = new.sender_id;
  perform public.notify_user(
    v_other, 'message', 'New message from ' || coalesce(v_sender, 'someone'),
    left(new.text, 140), new.booking_id, jsonb_build_object('booking_id', new.booking_id)
  );
  return new;
end $$;

create trigger messages_notify
  after insert on public.messages
  for each row execute function public.notify_message();

-- ============================================================================
-- 6. Trigger: review notifies the influencer
-- ============================================================================

create or replace function public.notify_review()
returns trigger
language plpgsql security definer set search_path = public as $$
declare v_client text;
begin
  select name into v_client from public.profiles where id = new.client_id;
  perform public.notify_user(
    new.influencer_id, 'review', 'New review from ' || coalesce(v_client, 'a client'),
    'They rated your booking ' || new.rating || ' out of 5.',
    new.booking_id, jsonb_build_object('booking_id', new.booking_id, 'rating', new.rating)
  );
  return new;
end $$;

create trigger reviews_notify
  after insert on public.reviews
  for each row execute function public.notify_review();

-- ============================================================================
-- 7. Trigger: payout status change notifies the influencer
-- ============================================================================

create or replace function public.notify_payout()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status <> new.status and new.status in ('PROCESSING','PAID','FAILED') then
    perform public.notify_user(
      new.influencer_id, 'payout', 'Payout ' || new.status,
      'Your payout request is now ' || new.status || '.',
      null, jsonb_build_object('payout_id', new.id, 'amount_paise', new.amount_paise)
    );
  end if;
  return new;
end $$;

create trigger payouts_notify
  after update of status on public.payouts
  for each row execute function public.notify_payout();

-- ============================================================================
-- 8. RPCs: read + mark-as-read (security definer so reads stay row-scoped)
-- ============================================================================

create or replace function public.list_my_notifications()
returns table (
  id uuid, type text, title text, body text, booking_id uuid, data jsonb,
  read_at timestamptz, created_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  return query
    select n.id, n.type, n.title, n.body, n.booking_id, n.data, n.read_at, n.created_at
    from public.notifications n
    where n.user_id = auth.uid()
    order by n.created_at desc;
end $$;

create or replace function public.unread_notification_count()
returns bigint
language plpgsql security definer set search_path = public as $$
declare v_count bigint;
begin
  select count(*) into v_count
    from public.notifications
    where user_id = auth.uid() and read_at is null;
  return v_count;
end $$;

create or replace function public.mark_notification_read(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.notifications
    set read_at = now()
    where id = p_id and user_id = auth.uid();
end $$;

create or replace function public.mark_all_notifications_read()
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.notifications
    set read_at = now()
    where user_id = auth.uid() and read_at is null;
end $$;

-- ============================================================================
-- 9. RPCs: report creation + admin moderation
-- ============================================================================

create or replace function public.create_report(
  p_target_type text,
  p_target_id uuid,
  p_reason text
)
returns public.reports
language plpgsql security definer set search_path = public as $$
declare rep public.reports;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_target_type not in ('PROFILE','BOOKING','MESSAGE','REVIEW') then
    raise exception 'Invalid target type';
  end if;
  if not (
    (p_target_type = 'PROFILE' and exists (
      select 1 from public.profiles where id = p_target_id
    ))
    or (p_target_type = 'BOOKING' and exists (
      select 1 from public.bookings
      where id = p_target_id
        and (client_id = auth.uid() or influencer_id = auth.uid())
    ))
    or (p_target_type = 'MESSAGE' and exists (
      select 1
      from public.messages m
      join public.bookings b on b.id = m.booking_id
      where m.id = p_target_id
        and (b.client_id = auth.uid() or b.influencer_id = auth.uid())
    ))
    or (p_target_type = 'REVIEW' and exists (
      select 1
      from public.reviews r
      join public.bookings b on b.id = r.booking_id
      where r.id = p_target_id
        and (b.client_id = auth.uid() or b.influencer_id = auth.uid())
    ))
  ) then
    raise exception 'Report target not found or not accessible';
  end if;
  if char_length(p_reason) < 10 then
    raise exception 'Please add a bit more detail (min 10 characters).';
  end if;
  if (select count(*) from public.reports
      where reporter_id = auth.uid()
        and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Report rate limit exceeded; try again later';
  end if;
  if exists (
    select 1 from public.reports
    where reporter_id = auth.uid()
      and target_type = p_target_type
      and target_id = p_target_id
      and status = 'OPEN'
  ) then
    raise exception 'An open report already exists for this target';
  end if;
  insert into public.reports (reporter_id, target_type, target_id, reason)
  values (auth.uid(), p_target_type, p_target_id, p_reason)
  returning * into rep;
  return rep;
end $$;

create or replace function public.list_open_reports()
returns table (
  id uuid, reporter_id uuid, reporter_name text, target_type text, target_id uuid,
  reason text, status text, created_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
    select r.id, r.reporter_id, pr.name, r.target_type, r.target_id,
           r.reason, r.status, r.created_at
    from public.reports r
    join public.profiles pr on pr.id = r.reporter_id
    where r.status = 'OPEN'
    order by r.created_at desc;
end $$;

create or replace function public.resolve_report(
  p_report_id uuid,
  p_status text,
  p_note text default null
)
returns public.reports
language plpgsql security definer set search_path = public as $$
declare rep public.reports;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_status not in ('REVIEWED','DISMISSED') then raise exception 'Invalid status'; end if;
  update public.reports
    set status = p_status, admin_note = p_note, resolved_at = now()
    where id = p_report_id returning * into rep;
  if not found then raise exception 'Report not found'; end if;
  return rep;
end $$;

-- ============================================================================
-- 10. Grants
-- ============================================================================

-- notify_user is an internal helper for triggers: a direct call from a client
-- would let them inject notifications for any user. Revoke the default PUBLIC
-- execute grant (trigger firing does not require an execute grant).
revoke all on function
  public.notify_user(uuid, text, text, text, uuid, jsonb)
  from public, anon, authenticated;

grant execute on function
  public.notify_booking_change(),
  public.notify_message(),
  public.notify_review(),
  public.notify_payout(),
  public.list_my_notifications(),
  public.unread_notification_count(),
  public.mark_notification_read(uuid),
  public.mark_all_notifications_read(),
  public.create_report(text, uuid, text),
  public.list_open_reports(),
  public.resolve_report(uuid, text, text)
  to authenticated;
