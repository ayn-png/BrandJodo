-- 0002_rls.sql — Row Level Security. Enable on every table, then add policies.
-- Model: influencer profiles + rate cards + reviews are PUBLIC (discovery);
-- bookings + messages are PRIVATE to their two participants. Booking state
-- transitions go through SECURITY DEFINER functions in 0003 (not direct UPDATEs).

alter table public.profiles        enable row level security;
alter table public.rate_card_items enable row level security;
alter table public.bookings        enable row level security;
alter table public.messages        enable row level security;
alter table public.reviews         enable row level security;

-- profiles ------------------------------------------------------------------
-- Anyone may read influencer profiles; users may always read their own row.
create policy profiles_select_public on public.profiles
  for select using (role = 'INFLUENCER' or id = auth.uid());
-- A user may create/edit only their own profile row.
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- rate_card_items -----------------------------------------------------------
create policy ratecard_select_public on public.rate_card_items
  for select using (true);
create policy ratecard_write_owner on public.rate_card_items
  for all using (influencer_id = auth.uid()) with check (influencer_id = auth.uid());

-- bookings ------------------------------------------------------------------
-- Only the two participants can see a booking.
create policy bookings_select_participants on public.bookings
  for select using (client_id = auth.uid() or influencer_id = auth.uid());
-- A client creates their own REQUESTED booking. All later transitions are RPCs.
create policy bookings_insert_client on public.bookings
  for insert with check (
    client_id = auth.uid()
    and status = 'REQUESTED'
    and exists (select 1 from public.profiles p where p.id = client_id     and p.role = 'CLIENT')
    and exists (select 1 from public.profiles p where p.id = influencer_id and p.role = 'INFLUENCER')
  );
-- No UPDATE/DELETE policy on bookings: state changes only via 0003 functions.

-- messages ------------------------------------------------------------------
create policy messages_select_participants on public.messages
  for select using (exists (
    select 1 from public.bookings b
    where b.id = booking_id and (b.client_id = auth.uid() or b.influencer_id = auth.uid())
  ));
create policy messages_insert_participant on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and (b.client_id = auth.uid() or b.influencer_id = auth.uid())
    )
  );

-- reviews -------------------------------------------------------------------
-- Public to read; created only via create_review() in 0003 (SECURITY DEFINER).
create policy reviews_select_public on public.reviews
  for select using (true);
