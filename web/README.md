# web — BrandJodo SPA

React 19 + Vite + TypeScript + Tailwind CSS 4 SPA talking to a Supabase backend.

See the [root README](../README.md) for full setup, deployment, and migration docs.

## Commands

```bash
npm run dev       # local dev server
npm run lint      # oxlint
npx tsc -b        # typecheck (no emit)
npm test          # vitest unit tests
npm run build     # tsc -b && vite build
```

## Environment

`web/.env` (copy `.env.example`):

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — project anon key
- `VITE_SENTRY_DSN` — *optional*; enables runtime error reporting via Sentry

No service-role key ever lives in this bundle. Privileged actions are authorized
by SECURITY DEFINER RPCs in `supabase/migrations`. A Content-Security-Policy
header is injected into the production build (see `vite.config.ts`).

## Structure

```
src/
  app/        Layout, router, guards, ErrorBoundary
  components/ shared UI kit (ui.tsx) + ImagePicker
  features/   one folder per domain (auth, discovery, bookings, chat, notifications,
              profiles, admin, money, legal, analytics, favorites, reporting)
  lib/        db.ts (single typed data layer), types.ts, auth.tsx, money.ts,
              validation.ts, categories.ts, social.ts, seo.ts
```

Rules:

- Import UI from `@/components/ui`, data from `@/lib/db`, types from `@/lib/types`.
- Money crosses the UI boundary as integer paise; format with `formatINR`.
- Feature pages expose `routes.tsx` exporting `xxxRoutes: RouteObject[]`; wire them
  in `app/router.tsx`.