-- 0014_production_review_fixes.sql
-- Apply production-safe payout transitions and report abuse protections to
-- databases that already recorded migrations 0009 and 0010 as applied.

create table if not exists public.payout_status_history (
  id bigint generated always as identity primary key,
  payout_id uuid not null references public.payouts(id) on delete cascade,
  from_status text not null,
  to_status text not null,
  changed_by uuid not null references public.profiles(id),
  changed_at timestamptz not null default now()
);

create index if not exists payout_status_history_payout_idx
  on public.payout_status_history (payout_id, changed_at);

alter table public.payout_status_history enable row level security;

revoke all on public.payout_status_history from public, anon, authenticated;

create or replace function public.mark_payout_status(p_payout_id uuid, p_status text)
returns public.payouts
language plpgsql
security definer
set search_path = public
as $$
declare
  payout_row public.payouts;
  previous_status text;
  allowed boolean;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_status not in ('PROCESSING','PAID','FAILED') then
    raise exception 'Invalid payout status';
  end if;

  select * into payout_row
  from public.payouts
  where id = p_payout_id
  for update;
  if not found then raise exception 'Payout not found'; end if;
  if payout_row.status = p_status then
    return payout_row;
  end if;

  previous_status := payout_row.status;
  allowed := (payout_row.status = 'REQUESTED' and p_status in ('PROCESSING','FAILED'))
    or (payout_row.status = 'PROCESSING' and p_status in ('PAID','FAILED'));
  if not allowed then
    raise exception 'Invalid payout transition from % to %', payout_row.status, p_status;
  end if;

  update public.payouts
    set status = p_status,
        paid_at = case when p_status = 'PAID' then now() else null end
    where id = p_payout_id
    returning * into payout_row;
  insert into public.payout_status_history
    (payout_id, from_status, to_status, changed_by)
  values
    (payout_row.id, previous_status, p_status, auth.uid());
  return payout_row;
end
$$;

create or replace function public.create_report(
  p_target_type text,
  p_target_id uuid,
  p_reason text
)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  rep public.reports;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_target_type not in ('PROFILE','BOOKING','MESSAGE','REVIEW') then
    raise exception 'Invalid target type';
  end if;
  if char_length(p_reason) < 10 then
    raise exception 'Please add a bit more detail (min 10 characters).';
  end if;

  -- Serialize report creation per user so duplicate checks and rate limits
  -- remain effective under concurrent requests.
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text, 1));

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
end
$$;

grant execute on function public.mark_payout_status(uuid, text) to authenticated;
grant execute on function public.create_report(text, uuid, text) to authenticated;
