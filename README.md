# BrandJodo — Local Creator & Brand Marketplace

A two-sided marketplace where local businesses hire content creators (food, fitness,
fashion, travel, …) through escrowed bookings. React + Vite + Supabase; money is
always stored as **integer paise**.

## Repo layout

```
web/                    React SPA (Vite + TypeScript + Tailwind). All UI lives here.
supabase/migrations/    SQL schema, RLS, and SECURITY DEFINER RPCs, 0001 → 0012+.
supabase/seed.sql       Idempotent demo data (run after migrations).
supabase/scripts/       Migration runner (Node + pg). No Docker / CLI required.
supabase/functions/     Supabase Edge Functions (email-worker, auto-release, …).
.github/workflows/      CI (lint, typecheck, test, build) + optional Vercel deploy.
```

Framework decisions up front (keep these):

- **RLS everywhere, RPCs for state changes.** The booking state machine is enforced
  server-side (`0003`/`0004`/`0008`). The client calls RPCs; it never mutates
  bookings, payments, or payouts directly.
- **Money as integer paise.** Never floats. `web/src/lib/money.ts` converts/renders.
- **`web/src/lib/db.ts` is the only data-access layer.** Features import from here,
  never `supabase` directly (exceptions: realtime subscriptions, admin).
- **One migration per concern cluster.** Read each file's header comment before
  writing new SQL.

## Setup

1. `cd web && cp .env.example .env` and fill in the Supabase URL + anon key
   (defaults are the local CLI values).
2. Create the database schema against your Supabase project:

   ```bash
   # PowerShell (Windows)
   $env:PGHOST="db.<ref>.supabase.co"; $env:PGPORT="5432"
   $env:PGUSER="postgres"; $env:PGPASSWORD="<db password>"; $env:PGDATABASE="postgres"
   $env:SSLMODE="require"
   node supabase/scripts/migrate.mjs
   ```

   The runner records applied files in `public.schema_migrations`, so re-runs are no-ops.
3. Load demo data (optional but recommended):

   ```bash
   node supabase/scripts/migrate.mjs --seed
   ```

   Seed accounts (all password `demo-pass-123!`):
   `client1@demo.in` · `client2@demo.in` · `creator1@demo.in` … `creator6@demo.in` ·
   `admin@brandjodo.in`
4. `cd web && npm install && npm run dev`

## Testing & quality

```bash
cd web
npm run lint     # oxlint
npx tsc -b       # typecheck
npm test         # vitest (unit tests for money, validation, social links…)
npm run build    # typecheck + production build
```

## Scheduling the escrow auto-release

`release_due_escrow()` frees DELIVERED bookings that pass their window. The migration
runner attempts to register it with `pg_cron` when the extension exists (hosted
Supabase has it). Fallback: deploy `supabase/functions/auto-release` and schedule it
(cron job in Supabase Dashboard → Integrations → Cron).

## Deploying

- **Web**: Vercel project pointing at `web/`; env vars `VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, and optionally `VITE_SENTRY_DSN`. See
  [`DEPLOYMENT.md`](./DEPLOYMENT.md) for production setup, health checks,
  migration, CI/CD, and rollback procedures.
- **Database**: `node supabase/scripts/migrate.mjs` against the production
  `PG*` env vars, then `--seed` once (or upgrade SQL by writing a new migration).

## Roadmap status

See `web/README.md` and the header comment of each migration.

- ① payments ledger + payouts + invoices + real scheduler — **done** (`0009`)
- ② durable notifications + email — **done** (`0010`, `0012`, `send-email`)
- ③ creator analytics — **done** (`0011`, `/analytics`)
- ④ moderation/reporting — **done** (`0010`, `/admin/reports`)
- ⑤ conversion (shortlist, re-book, availability, SEO) — **done** (`0011`, `/saved`)
- ⑥ ops (seed, CI, Sentry, legal) — **done**

Remaining beyond the plan: real Razorpay wiring (`razorpay-webhook`), an email
provider key (`RESEND_API_KEY`), and OTP/OAuth auth options (Supabase dashboard).