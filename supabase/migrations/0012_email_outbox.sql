-- 0012_email_outbox.sql
-- Workstream 2 (email half of durable notifications): a small outbox table the
-- send-email Edge Function drains. Every notification (except chat messages)
-- enqueues one row; the worker claims batches (CLAIMED), sends, then marks
-- SENT / FAILED. No client can touch this table — only the service role via
-- the SECURITY DEFINER RPCs below.

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  subject text not null,
  body text not null,
  status text not null default 'PENDING' check (status in ('PENDING','CLAIMED','SENT','FAILED')),
  attempts integer not null default 0,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  sent_at timestamptz
);

create index if not exists email_outbox_status_idx
  on public.email_outbox (status, created_at);

alter table public.email_outbox enable row level security;

-- No client policies on purpose: only SECURITY DEFINER functions write/read.

-- ============================================================================
-- 1. Enqueue hook: notification insert → email_outbox row
-- ============================================================================

create or replace function public.enqueue_notification_email()
returns trigger
language plpgsql security definer set search_path = public as $$
declare v_email text;
begin
  -- Chat notifications are not emails: they would be noise for every reply.
  if new.type = 'message' then return new; end if;

  select email into v_email from auth.users where id = new.user_id;
  if v_email is null then return new; end if;

  insert into public.email_outbox (user_id, email, subject, body)
  values (new.user_id, v_email, new.title, coalesce(new.body, new.title));
  return new;
end $$;

create trigger notifications_enqueue_email
  after insert on public.notifications
  for each row execute function public.enqueue_notification_email();

-- ============================================================================
-- 2. Worker RPCs (service role only)
-- ============================================================================

create or replace function public.claim_pending_emails(p_limit integer default 10)
returns table (
  id uuid, email text, subject text, body text
)
language plpgsql security definer set search_path = public as $$
begin
  return query
    with picked as (
      select e.id
      from public.email_outbox e
      where e.status = 'PENDING'
      order by e.created_at
      limit greatest(1, least(p_limit, 50))
      -- The worker may re-claim after a crash; a single row lock keeps runs safe.
      for update skip locked
    )
    update public.email_outbox e
      set status = 'CLAIMED', claimed_at = now(), attempts = e.attempts + 1
      from picked
      where e.id = picked.id
      returning e.id, e.email, e.subject, e.body;
end $$;

create or replace function public.mark_email_sent(p_outbox_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.email_outbox
    set status = 'SENT', sent_at = now()
    where id = p_outbox_id;
end $$;

create or replace function public.mark_email_failed(p_outbox_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.email_outbox
    set status = 'FAILED'
    where id = p_outbox_id;
end $$;

-- ============================================================================
-- 3. Grants: worker RPCs for the service role only
-- ============================================================================

-- Revoke the default PUBLIC execute grant: the worker RPCs expose other users'
-- email addresses and message bodies, so clients must never reach them.
revoke all on function
  public.claim_pending_emails(integer),
  public.mark_email_sent(uuid),
  public.mark_email_failed(uuid)
  from public, anon, authenticated;

grant execute on function
  public.claim_pending_emails(integer),
  public.mark_email_sent(uuid),
  public.mark_email_failed(uuid)
  to service_role;

-- notify_user write path stays as the trigger owner (postgres); force it to be
-- revocable rather than granting table INSERT to any client.
revoke insert on public.email_outbox from anon, authenticated;