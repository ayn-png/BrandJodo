-- supabase/seed.sql — idempotent demo data for BrandJodo.
--
-- Run AFTER migrations:  node supabase/scripts/migrate.mjs --seed
-- Safe to re-run (every statement is `on conflict do nothing`).
--
-- Demo accounts — password for ALL accounts: demo-pass-123!
--   client1@demo.in, client2@demo.in        (businesses)
--   creator1@demo.in … creator6@demo.in     (creators)
--   admin@brandjodo.in                     (admin / dispute resolver)

-- ---------------------------------------------------------------------------
-- 1. Auth users + identities (so the accounts can actually sign in)
-- ---------------------------------------------------------------------------

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, recovery_token,
  email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-00000000000a', 'authenticated', 'authenticated', 'admin@brandjodo.in',    extensions.crypt('demo-pass-123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'client1@demo.in',        extensions.crypt('demo-pass-123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'c0000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'client2@demo.in',        extensions.crypt('demo-pass-123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'f0000000-0000-4000-8000-000000000101', 'authenticated', 'authenticated', 'creator1@demo.in',       extensions.crypt('demo-pass-123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'f0000000-0000-4000-8000-000000000102', 'authenticated', 'authenticated', 'creator2@demo.in',       extensions.crypt('demo-pass-123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'f0000000-0000-4000-8000-000000000103', 'authenticated', 'authenticated', 'creator3@demo.in',       extensions.crypt('demo-pass-123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'f0000000-0000-4000-8000-000000000104', 'authenticated', 'authenticated', 'creator4@demo.in',       extensions.crypt('demo-pass-123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'f0000000-0000-4000-8000-000000000105', 'authenticated', 'authenticated', 'creator5@demo.in',       extensions.crypt('demo-pass-123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'f0000000-0000-4000-8000-000000000106', 'authenticated', 'authenticated', 'creator6@demo.in',       extensions.crypt('demo-pass-123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id
) values
  ('a0000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-00000000000a', jsonb_build_object('sub','a0000000-0000-4000-8000-00000000000a','email','admin@brandjodo.in'),    'email', now(), now(), now(), 'a0000000-0000-4000-8000-00000000000a'),
  ('c0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', jsonb_build_object('sub','c0000000-0000-4000-8000-000000000001','email','client1@demo.in'),        'email', now(), now(), now(), 'c0000000-0000-4000-8000-000000000001'),
  ('c0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002', jsonb_build_object('sub','c0000000-0000-4000-8000-000000000002','email','client2@demo.in'),        'email', now(), now(), now(), 'c0000000-0000-4000-8000-000000000002'),
  ('f0000000-0000-4000-8000-000000000101', 'f0000000-0000-4000-8000-000000000101', jsonb_build_object('sub','f0000000-0000-4000-8000-000000000101','email','creator1@demo.in'),       'email', now(), now(), now(), 'f0000000-0000-4000-8000-000000000101'),
  ('f0000000-0000-4000-8000-000000000102', 'f0000000-0000-4000-8000-000000000102', jsonb_build_object('sub','f0000000-0000-4000-8000-000000000102','email','creator2@demo.in'),       'email', now(), now(), now(), 'f0000000-0000-4000-8000-000000000102'),
  ('f0000000-0000-4000-8000-000000000103', 'f0000000-0000-4000-8000-000000000103', jsonb_build_object('sub','f0000000-0000-4000-8000-000000000103','email','creator3@demo.in'),       'email', now(), now(), now(), 'f0000000-0000-4000-8000-000000000103'),
  ('f0000000-0000-4000-8000-000000000104', 'f0000000-0000-4000-8000-000000000104', jsonb_build_object('sub','f0000000-0000-4000-8000-000000000104','email','creator4@demo.in'),       'email', now(), now(), now(), 'f0000000-0000-4000-8000-000000000104'),
  ('f0000000-0000-4000-8000-000000000105', 'f0000000-0000-4000-8000-000000000105', jsonb_build_object('sub','f0000000-0000-4000-8000-000000000105','email','creator5@demo.in'),       'email', now(), now(), now(), 'f0000000-0000-4000-8000-000000000105'),
  ('f0000000-0000-4000-8000-000000000106', 'f0000000-0000-4000-8000-000000000106', jsonb_build_object('sub','f0000000-0000-4000-8000-000000000106','email','creator6@demo.in'),       'email', now(), now(), now(), 'f0000000-0000-4000-8000-000000000106')
on conflict (provider_id, provider) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Admin + profiles
-- ---------------------------------------------------------------------------

insert into public.admins (user_id) values ('a0000000-0000-4000-8000-00000000000a')
on conflict do nothing;

insert into public.profiles (
  id, role, name, email, business_category, bio, location, niches, platforms,
  follower_count, portfolio, avatar_url, featured_until, created_at, updated_at
) values
  ('c0000000-0000-4000-8000-000000000001', 'CLIENT', 'The Bombay Canteen', 'client1@demo.in', 'Restaurant', null, null, '{}', '{}', null, '{}', null, null, now(), now()),
  ('c0000000-0000-4000-8000-000000000002', 'CLIENT', 'FitHub Gym',         'client2@demo.in', 'Gym / Fitness studio', null, null, '{}', '{}', null, '{}', null, null, now(), now()),
  ('f0000000-0000-4000-8000-000000000101', 'INFLUENCER', 'Priya Kulkarni', 'creator1@demo.in', null,
    'Pune food storyteller. 3 reels a week from local kitchens, street stalls and new menus.',
    'Pune', ARRAY['food','lifestyle'], ARRAY['Instagram','YouTube'], 87000,
    ARRAY['https://picsum.photos/seed/ai-f1/640/420','https://picsum.photos/seed/ai-f2/640/420','https://picsum.photos/seed/ai-f3/640/420'],
    'https://i.pravatar.cc/300?img=47', now() + interval '30 days', now(), now()),
  ('f0000000-0000-4000-8000-000000000102', 'INFLUENCER', 'Arjun Mehta',    'creator2@demo.in', null,
    'Mumbai-based fitness creator. Workout routines, gym tours and nutrition basics in Hindi + English.',
    'Mumbai', ARRAY['fitness','health'], ARRAY['Instagram','YouTube'], 124000,
    ARRAY['https://picsum.photos/seed/ai-f4/640/420','https://picsum.photos/seed/ai-f5/640/420'],
    'https://i.pravatar.cc/300?img=12', null, now(), now()),
  ('f0000000-0000-4000-8000-000000000103', 'INFLUENCER', 'Sneha Iyer',     'creator3@demo.in', null,
    'Beauty & self-care for South Asian skin. Honest reviews, tutorials and new-product first looks.',
    'Bengaluru', ARRAY['beauty'], ARRAY['Instagram','YouTube'], 56000,
    ARRAY['https://picsum.photos/seed/ai-f6/640/420','https://picsum.photos/seed/ai-f7/640/420','https://picsum.photos/seed/ai-f8/640/420'],
    'https://i.pravatar.cc/300?img=32', now() + interval '30 days', now(), now()),
  ('f0000000-0000-4000-8000-000000000104', 'INFLUENCER', 'Rohan Das',      'creator4@demo.in', null,
    'Fintech and small-business tools explained simply. UGC testimonials and screen-recorded walkthroughs.',
    'Pune', ARRAY['tech','business'], ARRAY['YouTube','LinkedIn'], 41000,
    ARRAY['https://picsum.photos/seed/ai-f9/640/420'],
    'https://i.pravatar.cc/300?img=15', null, now(), now()),
  ('f0000000-0000-4000-8000-000000000105', 'INFLUENCER', 'Meera Nair',     'creator5@demo.in', null,
    'Kochi-born travel + fashion. Weekend getaways, boutique stays and sustainable slow fashion.',
    'Kochi', ARRAY['travel','fashion'], ARRAY['Instagram','YouTube'], 98000,
    ARRAY['https://picsum.photos/seed/ai-f10/640/420','https://picsum.photos/seed/ai-f11/640/420'],
    'https://i.pravatar.cc/300?img=44', null, now(), now()),
  ('f0000000-0000-4000-8000-000000000106', 'INFLUENCER', 'Kabir Singh',    'creator6@demo.in', null,
    'Delhi creator covering street food, events and city culture. Fast turnaround, punchy edits.',
    'Delhi', ARRAY['food','events'], ARRAY['Instagram','YouTube'], 133000,
    ARRAY['https://picsum.photos/seed/ai-f12/640/420','https://picsum.photos/seed/ai-f13/640/420','https://picsum.photos/seed/ai-f14/640/420'],
    'https://i.pravatar.cc/300?img=59', null, now(), now())
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Rate cards + social links
-- ---------------------------------------------------------------------------

insert into public.rate_card_items (influencer_id, deliverable, price_paise) values
  ('f0000000-0000-4000-8000-000000000101', '1 Instagram reel (15–30s)',         15000),
  ('f0000000-0000-4000-8000-000000000101', '3 reels + 3 stories package',       35000),
  ('f0000000-0000-4000-8000-000000000101', 'In-store shoot day (8h)',           60000),
  ('f0000000-0000-4000-8000-000000000102', '1 workout reel',                      8000),
  ('f0000000-0000-4000-8000-000000000102', 'Gym tour reel (with shoot)',         20000),
  ('f0000000-0000-4000-8000-000000000102', 'Monthly fitness content (4 posts)',  55000),
  ('f0000000-0000-4000-8000-000000000103', 'Product feature reel',               12000),
  ('f0000000-0000-4000-8000-000000000103', 'Tutorial + stories',                 18000),
  ('f0000000-0000-4000-8000-000000000104', 'UGC testimonial (60s)',              10000),
  ('f0000000-0000-4000-8000-000000000104', 'Screen-recorded walkthrough',        15000),
  ('f0000000-0000-4000-8000-000000000105', 'Travel vlog (up to 5 min)',          25000),
  ('f0000000-0000-4000-8000-000000000105', 'Fashion lookbook post',                9000),
  ('f0000000-0000-4000-8000-000000000106', 'Event coverage reel',                 12000),
  ('f0000000-0000-4000-8000-000000000106', 'Food review + 3 stories',             15000),
  ('f0000000-0000-4000-8000-000000000106', 'Full city-event coverage day',        45000)
on conflict do nothing;

insert into public.social_links (profile_id, platform, url) values
  ('f0000000-0000-4000-8000-000000000101', 'Instagram', 'https://instagram.com/priya.eats.pune'),
  ('f0000000-0000-4000-8000-000000000101', 'YouTube',    'https://youtube.com/@priyaeatspune'),
  ('f0000000-0000-4000-8000-000000000102', 'Instagram', 'https://instagram.com/arjun.fitness'),
  ('f0000000-0000-4000-8000-000000000102', 'YouTube',    'https://youtube.com/@arjunfitness'),
  ('f0000000-0000-4000-8000-000000000103', 'Instagram', 'https://instagram.com/sneha.glow'),
  ('f0000000-0000-4000-8000-000000000104', 'YouTube',    'https://youtube.com/@ohansdas'),
  ('f0000000-0000-4000-8000-000000000104', 'LinkedIn',   'https://linkedin.com/in/rohandas'),
  ('f0000000-0000-4000-8000-000000000105', 'Instagram', 'https://instagram.com/meera.wanders'),
  ('f0000000-0000-4000-8000-000000000105', 'YouTube',    'https://youtube.com/@meerawanders'),
  ('f0000000-0000-4000-8000-000000000106', 'Instagram', 'https://instagram.com/kabir.shoots.delhi')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4. Bookings across every interesting state of the state machine
-- ---------------------------------------------------------------------------

insert into public.bookings (
  id, client_id, influencer_id, deliverable, deadline, usage_rights, price_paise,
  status, counter_note, dispute_reason, disputed_at, cancel_reason, cancelled_at,
  escrow_funded, escrow_released, funded_at, delivered_at, auto_release_at, created_at, updated_at
) values
  -- REQUESTED — creator has not answered yet
  ('b1000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000101',
   '3 reels + 3 stories for our Diwali menu launch', (now() + interval '10 days')::date,
   'Social + in-store screens', 35000, 'REQUESTED', null, null, null, null, null,
   false, false, null, null, null, now() - interval '2 days', now()),
  -- COUNTERED — creator floated a higher price
  ('b2000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000102',
   'Gym tour reel + 2 workout clips', (now() + interval '14 days')::date,
   'Social only', 30000, 'COUNTERED',
   'Includes a full gym walkthrough with b-roll and a trainer interview — my standard rate for that combo is 32000.',
   null, null, null, null, false, false, null, null, null, now() - interval '3 days', now()),
  -- ACCEPTED — waiting for the client to fund escrow
  ('b3000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000103',
   'Product launch grid + 2 stories', (now() + interval '7 days')::date,
   'Social + website', 28000, 'ACCEPTED', null, null, null, null, null,
   false, false, null, null, null, now() - interval '4 days', now()),
  -- FUNDED — money in escrow, creator to deliver
  ('b4000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000104',
   'UGC testimonial for our new PT program', (now() + interval '5 days')::date,
   'Social only', 22000, 'FUNDED', null, null, null, null, null,
   true, false, now() - interval '1 day', null, null, now() - interval '1 day', now()),
  -- DELIVERED past its auto-release window — release_due_escrow() will complete it
  ('b5000000-0000-4000-8000-000000000005', 'c0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000105',
   'Kochi weekend itinerary vlog (up to 5 min)', (now() + interval '3 days')::date,
   'Social + website', 45000, 'DELIVERED', null, null, null, null, null,
   true, false, now() - interval '3 days', now() - interval '7 days', now() - interval '1 day',
   now() - interval '8 days', now()),
  -- COMPLETED with review + invoice + clean ledger (creator1)
  ('b6000000-0000-4000-8000-000000000006', 'c0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000101',
   'Menu-reveal reel + 3 stories from our tasting session', (now() - interval '9 days')::date,
   'Social + in-store screens', 25000, 'COMPLETED', null, null, null, null, null,
   true, true, now() - interval '15 days', now() - interval '12 days', null,
   now() - interval '16 days', now()),
  -- DISPUTED — funds held, admin resolves
  ('b7000000-0000-4000-8000-000000000007', 'c0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000106',
   'City festival campaign reel', (now() - interval '2 days')::date,
   'Social only', 40000, 'DISPUTED',
   null, 'Reel missed the deadline and reused licensed music without clearance.',
   now() - interval '2 days', null, null, true, false, now() - interval '10 days', null, null,
   now() - interval '11 days', now()),
  -- CANCELLED pre-funding (client backed out)
  ('b8000000-0000-4000-8000-000000000008', 'c0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000106',
   'Reel bundle for our relaunch week', (now() + interval '2 days')::date,
   'Social only', 18000, 'CANCELLED', null, null, null,
   'Budget moved to print ads', now() - interval '6 days', false, false, null, null, null,
   now() - interval '7 days', now()),
  -- COMPLETED with release (creator2, client2) — shows a second released booking
  ('b9000000-0000-4000-8000-000000000009', 'c0000000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000102',
   '3 reels for our monsoon fitness series', (now() - interval '20 days')::date,
   'Social only', 20000, 'COMPLETED', null, null, null, null, null,
   true, true, now() - interval '30 days', now() - interval '25 days', null,
   now() - interval '31 days', now())
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Messages + reviews
-- ---------------------------------------------------------------------------

insert into public.messages (booking_id, sender_id, text, sent_at) values
  ('b1000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
   'Hi Priya! We are launching our Diwali menu on the 1st — can you do 3 reels around the tasting next week?', now() - interval '2 days'),
  ('b1000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000101',
   'Definitely — I am free for a shoot on Tuesday or Wednesday. Could we also do a quick intro call Friday?', now() - interval '1 day')
on conflict do nothing;

insert into public.reviews (booking_id, influencer_id, client_id, rating, comment, created_at) values
  ('b6000000-0000-4000-8000-000000000006', 'f0000000-0000-4000-8000-000000000101', 'c0000000-0000-4000-8000-000000000001', 5,
   'Beautiful edit, delivered early, and the reel genuinely boosted weekend footfall.', now() - interval '8 days'),
  ('b9000000-0000-4000-8000-000000000009', 'f0000000-0000-4000-8000-000000000102', 'c0000000-0000-4000-8000-000000000002', 4,
   'Good energy and quick turnaround — a couple of clips needed a reshoot but final output was strong.', now() - interval '19 days')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 6. Money ledger (payments + one invoice) — mirrors booking states in §4.
-- Fees are 5% (platform_config default = 500 bps).
-- ---------------------------------------------------------------------------

insert into public.payments (booking_id, kind, amount_paise, status, provider, provider_ref, created_at, settled_at)
select x.booking_id::uuid, x.kind, x.amount_paise, 'SUCCEEDED', 'SIMULATED', x.provider_ref, t.settled_at, t.settled_at
from (values
  ('b4000000-0000-4000-8000-000000000004', 'ESCROW_DEPOSIT', 22000, 'sim_0000000000000004'),
  ('b5000000-0000-4000-8000-000000000005', 'ESCROW_DEPOSIT', 45000, 'sim_0000000000000005'),
  ('b6000000-0000-4000-8000-000000000006', 'ESCROW_DEPOSIT', 25000, 'sim_0000000000000006a'),
  ('b6000000-0000-4000-8000-000000000006', 'ESCROW_RELEASE', 23750, 'sim_0000000000000006b'),
  ('b6000000-0000-4000-8000-000000000006', 'PLATFORM_FEE',    1250, 'sim_0000000000000006c'),
  ('b7000000-0000-4000-8000-000000000007', 'ESCROW_DEPOSIT', 40000, 'sim_0000000000000007'),
  ('b9000000-0000-4000-8000-000000000009', 'ESCROW_DEPOSIT', 20000, 'sim_0000000000000009a'),
  ('b9000000-0000-4000-8000-000000000009', 'ESCROW_RELEASE', 19000, 'sim_0000000000000009b'),
  ('b9000000-0000-4000-8000-000000000009', 'PLATFORM_FEE',    1000, 'sim_0000000000000009c')
) as x (booking_id, kind, amount_paise, provider_ref),
     (values (now() - interval '2 days')) as t (settled_at)
where not exists (
  select 1 from public.payments p
  where p.booking_id = x.booking_id::uuid and p.kind = x.kind
);

-- A real invoice so the booking detail page can demo the download immediately.
insert into public.invoices (
  booking_id, invoice_no, client_id, influencer_id, business_name, influencer_name,
  deliverable, price_paise, platform_fee_paise, total_paise, issued_at
) values (
  'b6000000-0000-4000-8000-000000000006',
  'AIF-2026-000001',
  'c0000000-0000-4000-8000-000000000001',
  'f0000000-0000-4000-8000-000000000101',
  'The Bombay Canteen', 'Priya Kulkarni',
  'Menu-reveal reel + 3 stories from our tasting session',
  25000, 1250, 26250, now() - interval '8 days'
) on conflict (booking_id) do nothing;

-- ---------------------------------------------------------------------------
-- 7. Favorites + availability (migration 0011)
--    client1 shortlists three creators; creators 101/102 publish weekly windows.
-- ---------------------------------------------------------------------------

insert into public.favorites (user_id, creator_id, created_at) values
  ('c0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000101', now() - interval '9 days'),
  ('c0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000104', now() - interval '5 days'),
  ('c0000000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000106', now() - interval '2 days')
on conflict (user_id, creator_id) do nothing;

insert into public.availability (creator_id, day_of_week, start_time, end_time, note) values
  ('f0000000-0000-4000-8000-000000000101', 1, '10:00', '18:00', 'Shoots + editing reviews'),
  ('f0000000-0000-4000-8000-000000000101', 3, '09:00', '17:00', null),
  ('f0000000-0000-4000-8000-000000000101', 6, '11:00', '20:00', 'Weekend food content'),
  ('f0000000-0000-4000-8000-000000000102', 2, '06:30', '11:00', 'Gym shoots, mornings only'),
  ('f0000000-0000-4000-8000-000000000102', 5, '16:00', '21:00', null)
on conflict (creator_id, day_of_week) do nothing;

-- ---------------------------------------------------------------------------
-- 8. Sample notifications (migration 0010). Inserted directly so re-runs are
--    idempotent; the 0012 trigger enqueues matching email_outbox rows.
-- ---------------------------------------------------------------------------

insert into public.notifications (id, user_id, type, title, body, booking_id, data, read_at, created_at) values
  ('a5a10000-0000-4000-8000-000000000001', 'f0000000-0000-4000-8000-000000000101', 'booking',
   'New booking request',
   'The Bombay Canteen requested "3 reels + 3 stories for our Diwali menu launch".',
   'b1000000-0000-4000-8000-000000000001', '{"booking_id":"b1000000-0000-4000-8000-000000000001"}'::jsonb,
   null, now() - interval '2 days'),
  ('a5a10000-0000-4000-8000-000000000002', 'f0000000-0000-4000-8000-000000000101', 'review',
   'New review from The Bombay Canteen',
   'They rated your booking 5 out of 5.',
   'b6000000-0000-4000-8000-000000000006', '{"booking_id":"b6000000-0000-4000-8000-000000000006","rating":5}'::jsonb,
   now() - interval '7 days', now() - interval '8 days'),
  ('a5a10000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001', 'booking',
   'Payment released',
   'Your payout for "Menu-reveal reel + 3 stories from our tasting session" was released.',
   'b6000000-0000-4000-8000-000000000006', '{"booking_id":"b6000000-0000-4000-8000-000000000006"}'::jsonb,
   null, now() - interval '3 days'),
  ('a5a10000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000002', 'message',
   'New message from Kabir Singh',
   'Hi! I can cover the relaunch week — are Saturdays best for the shoot?',
   'b8000000-0000-4000-8000-000000000008', '{"booking_id":"b8000000-0000-4000-8000-000000000008"}'::jsonb,
   null, now() - interval '1 day')
on conflict (id) do nothing;