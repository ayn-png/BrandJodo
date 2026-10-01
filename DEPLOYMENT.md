# BrandJodo production deployment

## Deployment target

The React application is deployed to Vercel from [`web/`](./web/). Supabase remains
the production database, authentication, storage, realtime, and Edge Function
platform. Vercel supports either of these project configurations:

- **Recommended:** set the Vercel Root Directory to `web`; this uses
  [`web/vercel.json`](./web/vercel.json).
- **Repository root:** leave Root Directory blank; the root
  [`vercel.json`](./vercel.json) builds and publishes the `web` application.

## Production environment configuration

Create Vercel Production environment variables from [`web/.env.example`](./web/.env.example):

| Variable | Scope | Required | Source |
| --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Vercel Production | Yes | Supabase Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Vercel Production | Yes | Supabase `anon` public key |
| `VITE_SENTRY_DSN` | Vercel Production | Recommended | Sentry browser project DSN |

Only the Supabase `anon` key belongs in the browser bundle. Never add
`SUPABASE_SERVICE_ROLE_KEY`, database passwords, Resend keys, Razorpay secrets, or
Vercel tokens to Vercel client variables or source control.

Vercel routing, SPA fallback, immutable asset caching, and baseline security
headers are defined in [`web/vercel.json`](./web/vercel.json) and mirrored in the
root [`vercel.json`](./vercel.json) for repository-root projects.

## Build and deployment configuration

The production build is:

```text
cd web
npm ci
npm run build
```

`web/vercel.json` declares the Vite framework, `npm run build`, and `dist` as the
output directory. The CI workflow runs lint, typecheck, tests, and build before
deployment.

The production deploy is opt-in on pushes to `master`. Set the repository variable
`VERCEL_DEPLOY_WEB=true` and the following GitHub Actions **secrets**:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

The workflow pulls production variables from Vercel, builds a prebuilt artifact,
and deploys that artifact. Tokens are never printed or stored in the repository.

## Health check and logging

Vercel exposes `GET /api/health` through [`web/api/health.ts`](./web/api/health.ts).
It returns HTTP 200 and only non-sensitive service metadata:

```json
{"status":"ok","service":"brandjodo-web","timestamp":"..."}
```

Use this endpoint for uptime monitoring and deployment smoke checks. It does not
query Supabase, so it confirms that the Vercel function is serving; use a separate
authenticated application smoke test to verify Supabase connectivity.

Production runtime errors are sent to Sentry when `VITE_SENTRY_DSN` is configured.
Vercel Function logs are available in the Vercel dashboard. Do not log access
tokens, passwords, service-role keys, database connection strings, payment
credentials, or message contents.

## Database migration strategy

Migrations are ordered SQL files under [`supabase/migrations/`](./supabase/migrations/).
[`supabase/scripts/migrate.mjs`](./supabase/scripts/migrate.mjs) records applied
filenames in `public.schema_migrations`, runs each pending migration in its own
transaction, and stops on failure.

Before production:

1. Create a Supabase project and take a database backup/point-in-time restore marker.
2. Review every pending migration in order, including `0013_qa_integrity_fixes.sql`
   and `0014_production_review_fixes.sql`.
3. Run the migration runner from a trusted workstation or a protected CI job using
   `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, and
   `PGSSLROOTCERT` containing the Supabase CA certificate. Certificate verification
   is required outside explicit local development mode.
4. Do not use `--seed` in production.
5. Confirm RLS, RPC grants, storage policies, and the escrow scheduler in Supabase.
6. Run the post-migration smoke checks before enabling public traffic.

Recommended production command:

```powershell
$env:PGHOST="db.<project-ref>.supabase.co"
$env:PGPORT="5432"
$env:PGUSER="postgres"
$env:PGPASSWORD="<provided-out-of-band>"
$env:PGDATABASE="postgres"
$env:SSLMODE="require"
$env:SUPABASE_SKIP_CRON="1"
node supabase/scripts/migrate.mjs
```

The migration runner currently uses TLS with certificate verification disabled
for compatibility with hosted Postgres. Prefer a verified CA configuration when
the production connection environment supports it.

## Rollback strategy

### Web rollback

Vercel keeps previous deployments. If a deployment fails smoke checks, promote the
last known-good deployment from Vercel's Deployments page, or use the Vercel CLI:

```text
vercel rollback <deployment-url> --token <token>
```

Never roll back only the web app if it depends on a destructive database change.

### Database rollback

Migrations are forward-only and are not automatically down-migrated. For a bad
database migration:

1. Stop further deploys and disable affected jobs/functions.
2. Preserve logs and identify the failing migration.
3. Restore the Supabase backup/PITR point if data or schema integrity is at risk.
4. Otherwise deploy a reviewed corrective migration with a higher filename.
5. Re-run authenticated smoke tests before restoring traffic.

## Manual steps before deployment

- [ ] Create the production Supabase project.
- [ ] Configure Supabase Auth redirect URLs for the Vercel production domain.
- [ ] Apply reviewed migrations with production database credentials.
- [ ] Verify RLS policies, RPC grants, storage buckets, and public/private access.
- [ ] Configure `pg_cron` or deploy and schedule `auto-release` every 10 minutes.
- [ ] Configure the `send-email` Edge Function and `RESEND_API_KEY` if email is enabled.
- [ ] Create the Vercel project with root directory `web` and production branch `master`.
- [ ] Add the three Vercel Production environment variables listed above.
- [ ] Create GitHub Actions secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and
  `VERCEL_PROJECT_ID`.
- [ ] Set repository variable `VERCEL_DEPLOY_WEB=true`.
- [ ] Configure a custom domain and HTTPS if required.
- [ ] Configure Sentry alerting and Vercel uptime monitoring for `/api/health`.
- [ ] Execute production smoke tests: login, discovery, booking, chat, escrow
  transition, notification, and logout/session-expiry behavior.
- [ ] Take and verify a database backup before the first production migration.
