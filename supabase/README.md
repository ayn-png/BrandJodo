# Supabase — BrandJodo backend

This folder *is* the backend: Postgres schema, Row Level Security, the booking
state-machine RPCs, and the escrow auto-release job. There is no separate app
server — the React app in `../web` talks to Supabase directly.

## Apply the migrations
**Option A — SQL Editor (quickest):** open your project → SQL Editor and run, in
order: `migrations/0001_schema.sql`, then `0002_rls.sql`, then `0003_functions.sql`.

**Option B — Supabase CLI:**
```
supabase link --project-ref <your-ref>
supabase db push
```

## Enable the auto-release job (optional for now)
In the SQL Editor:
```
create extension if not exists pg_cron;
select cron.schedule('release-due-escrow', '*/10 * * * *',
  $$select public.release_due_escrow();$$);
```

## Frontend env
Copy `../web/.env.example` to `../web/.env` and fill in your project URL and the
**anon** key (Project Settings → API). Never put the `service_role` key in the
web app — it bypasses RLS.

## Design notes
- Money is stored as integer **paise** (₹1 = 100 paise). Never float.
- Influencer profiles, rate cards, and reviews are world-readable (discovery).
  Bookings and messages are visible only to their two participants (RLS).
- Booking transitions happen **only** through the SECURITY DEFINER functions in
  `0003_functions.sql`, which check `auth.uid()` and the current status, so the
  state machine cannot be bypassed by direct table writes.
