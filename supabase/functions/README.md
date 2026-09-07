# supabase/functions — Edge Functions

Deno-based serverless functions deployed per directory.

| Function | Purpose | Status |
|---|---|---|
| `auto-release` | Frees DELIVERED bookings past their release window (fallback when `pg_cron` isn't usable; the SQL is `public.release_due_escrow()` from migration 0009). | Ready |
| `razorpay-webhook` | Verifies real-money gateway events and writes `RAZORPAY` ledger rows. | Placeholder — fails closed |
| `send-email` | Drains the `email_outbox` table (migration 0012) and sends notification emails via Resend. Without `RESEND_API_KEY` it drains in dev mode (marks SENT without sending). | Ready |

Deploy: `npx supabase functions deploy auto-release`, then schedule it (dashboard →
Integrations → Cron) every 10 minutes, or keep the runner's `pg_cron` wiring in
`supabase/scripts/migrate.mjs`. `send-email` runs on the same 5-minute cron.

Env vars used: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (automatic on hosted
deploys; set manually via `npx supabase secrets set` for self-hosted setups).
`send-email` additionally reads `RESEND_API_KEY`. Required for workers:
`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.