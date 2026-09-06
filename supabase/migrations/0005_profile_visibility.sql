-- 0005_profile_visibility.sql
-- A creator could not see who had booked them ---------------------------------
-- profiles_select_public (0002) allows `role = 'INFLUENCER' or id = auth.uid()`,
-- so a CLIENT row is invisible to the influencer they are transacting with. The
-- `client:profiles!bookings_client_id_fkey(...)` embed came back null and the UI
-- rendered "Unknown user" on the bookings list and detail page.
-- Permissive policies are OR-ed, so this only widens SELECT to the counterparty
-- of a booking you are already a party to. The subquery is itself subject to
-- bookings' RLS (participants only), and bookings' policies never reference
-- profiles, so there is no recursion.
create policy profiles_select_counterparty on public.profiles
  for select using (
    exists (
      select 1
      from public.bookings b
      where (b.client_id     = profiles.id and b.influencer_id = auth.uid())
         or (b.influencer_id = profiles.id and b.client_id     = auth.uid())
    )
  );

