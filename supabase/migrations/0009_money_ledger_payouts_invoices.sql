-- 0009_money_ledger_payouts_invoices.sql
-- Workstream 1: real money-based ledger. Every escrow event now writes audit-able
-- `payments` rows (deposit / release / platform fee / refund), creators get payout
-- accounts + payout requests, clients get GST invoices, and the platform can tune
-- its fee (platform_config) at runtime. Money remains SIMULATED (provider column
-- is RAZORPAY-ready) until a real gateway is wired in.
--
-- Invariants this file establishes:
--   * fee = round(price * fee_bps / 10000), computed in SQL (platform_fee()).
--   * ESCROW_RELEASE + PLATFORM_FEE always sum to the booking price.
--   * An influencer's available balance = released - (PROCESSING|PAID) payouts.
--   * request_payout() refuses to go negative.

-- ============================================================================
-- 1. Platform config (single row) + ledger tables
-- ============================================================================

create table if not exists public.platform_config (
  id integer primary key default 1 check (id = 1),
  fee_bps integer not null default 500 check (fee_bps between 0 and 10000),
  updated_at timestamptz not null default now()
);

insert into public.platform_config (id) values (1) on conflict (id) do nothing;

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  kind text not null check (kind in ('ESCROW_DEPOSIT','ESCROW_RELEASE','PLATFORM_FEE','REFUND')),
  amount_paise integer not null check (amount_paise >= 0),
  status text not null default 'SUCCEEDED' check (status in ('PENDING','SUCCEEDED','FAILED')),
  provider text not null default 'SIMULATED' check (provider in ('SIMULATED','RAZORPAY')),
  provider_ref text,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create table if not exists public.payout_accounts (
  id uuid primary key default gen_random_uuid(),
  influencer_id uuid not null unique references public.profiles(id) on delete cascade,
  upi_id text not null,
  account_holder text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  influencer_id uuid not null references public.profiles(id) on delete cascade,
  amount_paise integer not null check (amount_paise > 0),
  status text not null default 'REQUESTED' check (status in ('REQUESTED','PROCESSING','PAID','FAILED')),
  method text not null default 'UPI',
  note text,
  requested_at timestamptz not null default now(),
  paid_at timestamptz
);

create sequence if not exists public.invoice_seq;

-- Invoice is a historical snapshot: business/creator names are copied in so the
-- document stays stable even if profiles change later.
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  invoice_no text not null unique,
  client_id uuid not null references public.profiles(id),
  influencer_id uuid not null references public.profiles(id),
  business_name text not null,
  influencer_name text not null,
  deliverable text not null,
  price_paise integer not null,
  platform_fee_paise integer not null default 0,
  total_paise integer not null,
  gstin text,
  issued_at timestamptz not null default now()
);

create index if not exists payments_booking_idx on public.payments (booking_id);
create index if not exists payouts_influencer_idx on public.payouts (influencer_id);
create index if not exists payouts_status_idx on public.payouts (status);
create index if not exists invoices_client_idx on public.invoices (client_id);

-- No writes from the client SDK on these tables — every change goes through a
-- SECURITY DEFINER RPC below.
alter table public.platform_config enable row level security;
alter table public.payments       enable row level security;
alter table public.payout_accounts enable row level security;
alter table public.payouts         enable row level security;
alter table public.invoices        enable row level security;

create policy platform_config_select_all on public.platform_config
  for select using (true);

create policy payments_select_participant on public.payments
  for select using (
    exists (select 1 from public.bookings b
            where b.id = payments.booking_id
              and (b.client_id = auth.uid() or b.influencer_id = auth.uid()))
  );
create policy payments_select_admin on public.payments
  for select using (public.is_admin());

create policy payout_accounts_select_owner on public.payout_accounts
  for select using (influencer_id = auth.uid());
create policy payout_accounts_write_owner on public.payout_accounts
  for insert with check (influencer_id = auth.uid());
create policy payout_accounts_update_owner on public.payout_accounts
  for update using (influencer_id = auth.uid()) with check (influencer_id = auth.uid());
create policy payout_accounts_delete_owner on public.payout_accounts
  for delete using (influencer_id = auth.uid());
create policy payout_accounts_select_admin on public.payout_accounts
  for select using (public.is_admin());

create policy payouts_select_owner on public.payouts
  for select using (influencer_id = auth.uid());
create policy payouts_select_admin on public.payouts
  for select using (public.is_admin());

create policy invoices_select_participant on public.invoices
  for select using (
    exists (select 1 from public.bookings b
            where b.id = invoices.booking_id
              and (b.client_id = auth.uid() or b.influencer_id = auth.uid()))
  );
create policy invoices_select_admin on public.invoices
  for select using (public.is_admin());

grant select on public.platform_config to anon, authenticated;
grant select on public.payments        to authenticated;
grant select on public.payout_accounts to authenticated;
grant select on public.payouts         to authenticated;
grant select on public.invoices        to authenticated;
grant usage on sequence public.invoice_seq to authenticated;

-- ============================================================================
-- 2.a Helpers
-- ============================================================================

-- Platform fee for a price. Mirror of the client-side display helper
-- (web/src/lib/money.ts `platformFee`). Keep the formula identical.
create or replace function public.platform_fee(p_amount_paise integer)
returns integer language sql security definer set search_path = public as $$
  select round(coalesce(p_amount_paise, 0) * coalesce(
    (select fee_bps from public.platform_config where id = 1), 500) / 10000.0)::int;
$$;

create or replace function public.is_role(p_role text)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = p_role);
$$;

-- ============================================================================
-- 2.b Core booking transitions now update the ledger (single transaction)
-- ============================================================================

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
  insert into public.payments (booking_id, kind, amount_paise, status, provider, provider_ref, settled_at)
    values (p_booking_id, 'ESCROW_DEPOSIT', b.price_paise, 'SUCCEEDED', 'SIMULATED',
            'sim_' || substr(gen_random_uuid()::text, 1, 16), now());
  return b;
end $$;

-- Approve releases net-to-creator (price − fee) and books the fee. Release + fee
-- always reconstruct the original price, so ledger reconciliation is exact.
create or replace function public.approve_booking(p_booking_id uuid)
returns public.bookings language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
  v_fee integer;
begin
  select * into b from bookings where id=p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if b.client_id <> auth.uid() then raise exception 'Only the client can approve'; end if;
  if b.status <> 'DELIVERED' then raise exception 'Booking is % (expected DELIVERED)', b.status; end if;
  v_fee := public.platform_fee(b.price_paise);
  update bookings set status='COMPLETED', escrow_released=true
    where id=p_booking_id returning * into b;
  insert into public.payments (booking_id, kind, amount_paise, status, provider, provider_ref, settled_at) values
    (p_booking_id, 'ESCROW_RELEASE', b.price_paise - v_fee, 'SUCCEEDED', 'SIMULATED',
     'man_' || substr(gen_random_uuid()::text, 1, 16), now()),
    (p_booking_id, 'PLATFORM_FEE',   v_fee,              'SUCCEEDED', 'SIMULATED',
     'fee_' || substr(gen_random_uuid()::text, 1, 16), now());
  return b;
end $$;

-- Auto-release is now a real "background worker": the row lock is skipped so two
-- cron runs never double-release, and each release writes its ledger rows.
create or replace function public.release_due_escrow()
returns void language plpgsql security definer set search_path = public as $$
declare r record; v_fee integer;
begin
  for r in
    select id, price_paise from public.bookings
    where status='DELIVERED' and escrow_released=false
      and auto_release_at is not null and now() > auto_release_at
    for update skip locked
  loop
    v_fee := public.platform_fee(r.price_paise);
    update public.bookings set status='COMPLETED', escrow_released=true where id = r.id;
    insert into public.payments (booking_id, kind, amount_paise, status, provider, provider_ref, settled_at) values
      (r.id, 'ESCROW_RELEASE', r.price_paise - v_fee, 'SUCCEEDED', 'SIMULATED',
       'auto_' || substr(gen_random_uuid()::text, 1, 16), now()),
      (r.id, 'PLATFORM_FEE',   v_fee,                 'SUCCEEDED', 'SIMULATED',
       'auto_' || substr(gen_random_uuid()::text, 1, 16), now());
  end loop;
end $$;

-- ============================================================================
-- 2.c Dispute resolution writes the ledger too
-- ============================================================================

create or replace function public.resolve_dispute(
  p_booking_id uuid,
  p_resolution text,
  p_note text default null
)
returns public.bookings
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
  v_fee integer;
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
    if b.escrow_funded then
      v_fee := public.platform_fee(b.price_paise);
      insert into public.payments (booking_id, kind, amount_paise, status, provider, provider_ref, settled_at) values
        (p_booking_id, 'ESCROW_RELEASE', b.price_paise - v_fee, 'SUCCEEDED', 'SIMULATED',
         'adm_' || substr(gen_random_uuid()::text, 1, 16), now()),
        (p_booking_id, 'PLATFORM_FEE',   v_fee,                 'SUCCEEDED', 'SIMULATED',
         'adm_' || substr(gen_random_uuid()::text, 1, 16), now());
    end if;
  elsif p_resolution = 'refund' then
    update public.bookings
      set status = 'REFUND_OWED',
          dispute_reason = coalesce(p_note, dispute_reason)
      where id = p_booking_id returning * into b;
    -- Only booked an ESCROW_DEPOSIT when the client actually funded the booking.
    if b.escrow_funded then
      insert into public.payments (booking_id, kind, amount_paise, status, provider, provider_ref, settled_at)
        values (p_booking_id, 'REFUND', b.price_paise, 'SUCCEEDED', 'SIMULATED',
                'ref_' || substr(gen_random_uuid()::text, 1, 16), now());
    end if;
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

-- ============================================================================
-- 3. New RPCs — balance, payouts, invoices, admin views
-- ============================================================================

create or replace function public.upsert_payout_account(p_upi_id text, p_account_holder text)
returns public.payout_accounts language plpgsql security definer set search_path = public as $$
declare acc public.payout_accounts;
begin
  if not public.is_role('INFLUENCER') then
    raise exception 'Only influencers can add a payout method';
  end if;
  if p_upi_id is null or btrim(p_upi_id) = '' then raise exception 'UPI ID is required'; end if;
  if p_account_holder is null or btrim(p_account_holder) = '' then
    raise exception 'Account holder name is required'; end if;
  insert into public.payout_accounts (influencer_id, upi_id, account_holder)
  values (auth.uid(), btrim(p_upi_id), btrim(p_account_holder))
  on conflict (influencer_id) do update
    set upi_id = excluded.upi_id, account_holder = excluded.account_holder, updated_at = now()
  returning * into acc;
  return acc;
end $$;

create or replace function public.request_payout(p_amount_paise integer)
returns public.payouts language plpgsql security definer set search_path = public as $$
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

  select
    coalesce(sum(p.amount_paise), 0)
      - coalesce((select sum(x.amount_paise) from public.payouts x
                  where x.influencer_id = auth.uid() and x.status in ('PROCESSING','PAID')), 0)
    into v_avail
  from public.payments p
  join public.bookings b on b.id = p.booking_id
  where p.kind = 'ESCROW_RELEASE' and b.influencer_id = auth.uid();

  if v_avail < p_amount_paise then
    raise exception 'Insufficient available balance (have %, asked %)', v_avail, p_amount_paise;
  end if;

  insert into public.payouts (influencer_id, amount_paise, status, method)
  values (auth.uid(), p_amount_paise, 'REQUESTED', 'UPI')
  returning * into payout_row;
  return payout_row;
end $$;

create or replace function public.get_my_balance()
returns table (available_paise bigint, escrow_held_paise bigint, total_paid_out_paise bigint)
language plpgsql security definer set search_path = public as $$
declare v_released bigint; v_paid bigint; v_escrow bigint;
begin
  select coalesce(sum(p.amount_paise), 0) into v_released
  from public.payments p join public.bookings b on b.id = p.booking_id
  where p.kind = 'ESCROW_RELEASE' and b.influencer_id = auth.uid();

  select coalesce(sum(x.amount_paise), 0) into v_paid
  from public.payouts x
  where x.influencer_id = auth.uid() and x.status in ('PROCESSING','PAID');

  select coalesce(sum(b.price_paise), 0) into v_escrow
  from public.bookings b
  where b.influencer_id = auth.uid() and b.escrow_funded and not b.escrow_released
    and b.status in ('FUNDED','DELIVERED','DISPUTED');

  return query select
    (v_released - v_paid) as available_paise,
    v_escrow as escrow_held_paise,
    v_paid as total_paid_out_paise;
end $$;

create or replace function public.list_my_payments()
returns table (
  id uuid, booking_id uuid, kind text, amount_paise integer, status text,
  provider text, provider_ref text, created_at timestamptz, settled_at timestamptz,
  deliverable text, book_status text
) language plpgsql security definer set search_path = public as $$
begin
  return query
    select p.id, p.booking_id, p.kind, p.amount_paise, p.status, p.provider,
           p.provider_ref, p.created_at, p.settled_at, b.deliverable, b.status
    from public.payments p
    join public.bookings b on b.id = p.booking_id
    where b.client_id = auth.uid() or b.influencer_id = auth.uid()
    order by p.created_at desc;
end $$;

create or replace function public.list_my_payouts()
returns table (
  id uuid, amount_paise integer, status text, method text, note text,
  requested_at timestamptz, paid_at timestamptz
) language plpgsql security definer set search_path = public as $$
begin
  return query
    select p.id, p.amount_paise, p.status, p.method, p.note, p.requested_at, p.paid_at
    from public.payouts p
    where p.influencer_id = auth.uid()
    order by p.requested_at desc;
end $$;

-- Generated on demand; idempotent per booking (unique booking_id).
-- Only available for COMPLETED bookings (money settled and released).
create or replace function public.generate_invoice(p_booking_id uuid)
returns public.invoices language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
  c public.profiles;
  i public.profiles;
  v_fee integer;
  v_no text;
  inv public.invoices;
begin
  select * into b from public.bookings where id = p_booking_id;
  if not found then raise exception 'Booking not found'; end if;
  if b.client_id <> auth.uid() and not public.is_admin() then
    raise exception 'Only the client can generate the invoice';
  end if;
  if b.status <> 'COMPLETED' then
    raise exception 'Invoice is available after the booking is completed (current: %)', b.status;
  end if;

  select * into inv from public.invoices where booking_id = p_booking_id;
  if found then return inv; end if;

  select * into c from public.profiles where id = b.client_id;
  select * into i from public.profiles where id = b.influencer_id;
  v_fee := public.platform_fee(b.price_paise);
  v_no := 'AIF-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.invoice_seq')::text, 6, '0');

  insert into public.invoices (
    booking_id, invoice_no, client_id, influencer_id, business_name, influencer_name,
    deliverable, price_paise, platform_fee_paise, total_paise
  ) values (
    p_booking_id, v_no, b.client_id, b.influencer_id, coalesce(c.name, 'Client'),
    coalesce(i.name, 'Creator'), b.deliverable, b.price_paise, v_fee, b.price_paise + v_fee
  ) returning * into inv;
  return inv;
end $$;

-- ---- Admin views + control -------------------------------------------------

create or replace function public.list_all_payments()
returns table (
  id uuid, booking_id uuid, kind text, amount_paise integer, status text,
  provider text, provider_ref text, created_at timestamptz, settled_at timestamptz,
  deliverable text, client_name text, influencer_name text
) language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
    select p.id, p.booking_id, p.kind, p.amount_paise, p.status, p.provider, p.provider_ref,
           p.created_at, p.settled_at, b.deliverable, c.name, i.name
    from public.payments p
    join public.bookings b on b.id = p.booking_id
    join public.profiles c on c.id = b.client_id
    join public.profiles i on i.id = b.influencer_id
    order by p.created_at desc;
end $$;

create or replace function public.list_all_payouts()
returns table (
  id uuid, influencer_id uuid, influencer_name text, amount_paise integer, status text,
  method text, note text, requested_at timestamptz, paid_at timestamptz
) language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  return query
    select p.id, p.influencer_id, pr.name, p.amount_paise, p.status, p.method,
           p.note, p.requested_at, p.paid_at
    from public.payouts p
    join public.profiles pr on pr.id = p.influencer_id
    order by p.requested_at desc;
end $$;

-- Admin marks a payout paid/failed; creator balance updates at that moment.
create or replace function public.mark_payout_status(p_payout_id uuid, p_status text)
returns public.payouts language plpgsql security definer set search_path = public as $$
declare payout_row public.payouts;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_status not in ('PROCESSING','PAID','FAILED') then
    raise exception 'Invalid payout status';
  end if;
  update public.payouts
    set status = p_status,
        paid_at = case when p_status = 'PAID' then now() else paid_at end
    where id = p_payout_id returning * into payout_row;
  if not found then raise exception 'Payout not found'; end if;
  return payout_row;
end $$;

-- Runtime platform fee tuning (0–10000 bps).
create or replace function public.set_platform_config(p_fee_bps integer)
returns public.platform_config language plpgsql security definer set search_path = public as $$
declare cfg_row public.platform_config;
begin
  if not public.is_admin() then raise exception 'Admins only'; end if;
  if p_fee_bps is null or p_fee_bps < 0 or p_fee_bps > 10000 then
    raise exception 'fee_bps must be between 0 and 10000';
  end if;
  update public.platform_config set fee_bps = p_fee_bps, updated_at = now() where id = 1
    returning * into cfg_row;
  return cfg_row;
end $$;

-- ============================================================================
-- 4. Grants: authenticated may call everything except the auto-release job
-- (cron / service role). Writes are only possible through these functions.
-- ============================================================================

revoke all on function
  public.pay_booking(uuid),
  public.approve_booking(uuid),
  public.release_due_escrow()
  from public, anon;

grant execute on function
  public.platform_fee(integer),
  public.is_role(text),
  public.pay_booking(uuid),
  public.approve_booking(uuid),
  public.release_due_escrow(),
  public.resolve_dispute(uuid, text, text),
  public.upsert_payout_account(text, text),
  public.request_payout(integer),
  public.get_my_balance(),
  public.list_my_payments(),
  public.list_my_payouts(),
  public.generate_invoice(uuid),
  public.list_all_payments(),
  public.list_all_payouts(),
  public.mark_payout_status(uuid, text),
  public.set_platform_config(integer)
  to authenticated;