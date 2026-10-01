# BrandJodo — CLAUDE.md

## What we're building
A lightweight, **price-first marketplace** connecting **local businesses/brands (clients)** with **local content creators (influencers)**. Not an enterprise tool — it's for small, budget-conscious local users who mainly care about finding the right creator at the right price, fast.

**North star:** a client goes from "I need a creator" to "booked and paid" in minutes with transparent fixed prices; a creator sets up a profile + rate card and starts receiving paid bookings just as fast.

### Target users
- **Clients:** local shops, cafes, gyms, salons — small budgets, price-sensitive, not marketing experts.
- **Creators:** local/micro-influencers who want simple, fair bookings and guaranteed payment.
- **Region/currency:** India-first, prices in ₹ (INR). Optimize for mobile browsers on modest devices/networks.

### Product principles
1. **Price transparency first** — fixed rate cards, sort-by-cheapest, clear totals, no hidden fees.
2. **Trust by default** — escrow-style flow so neither side gets burned.
3. **Dead-simple, mobile-first UX** — minimal steps, low-friction onboarding.
4. **Free to run** — only free-tier tools until there's revenue.

## Chosen stack (decided)
- **Backend + DB + Auth + Storage + Realtime: Supabase (free tier).** Postgres for the relational data, Supabase Auth for login, **Row Level Security (RLS)** for authorization, Storage for portfolio media, Realtime for chat, and pg_cron / Edge Functions for the escrow auto-release job.
  - *Why Supabase over Firebase:* our data and queries are relational (search/filter/join across creators, rate cards, bookings, reviews) — Postgres's strength, and awkward + per-read-costly in Firestore. Supabase bundles auth/storage/realtime free and matches the Postgres-oriented design the demo was already written toward. Firebase only wins for offline-first mobile / heavy realtime, which isn't our bottleneck.
- **Frontend: responsive web app — React + Vite + TypeScript + Tailwind CSS.** Talks directly to Supabase via `@supabase/supabase-js`. Mobile-first. Free hosting on Vercel or Netlify.
- **Payments: simulated escrow for v1** — keep the fund → deliver → approve → auto-release state machine as status flags, no real money yet. Design it so **Razorpay** (India) can slot in later without reworking the flow.

### Current state (legacy demo — being replaced)
`marketplace/` holds the original MVP: a plain-Java (JDK, no Spring) in-memory REST API + a single-file vanilla HTML/JS frontend. It works and captures the intended domain logic, but has no auth, no persistence, and known bugs. **Treat it as the spec/reference, not the foundation.** Carry the domain logic forward (booking state machine, search filters, escrow steps); replace transport/auth/UI with the Supabase + React stack above.

## Repo structure
```
marketplace/
  backend/    Java demo API — reference for domain logic + API shape
  frontend/   Vanilla single-page demo — reference for flows + UX
```
Target: add a `web/` React app and a `supabase/` folder (migrations + RLS policies).

## Domain model (carry forward)
- **User**: role CLIENT or INFLUENCER. Influencers have bio, location, niches[], platforms[], followerCount, portfolio[], rateCard[].
- **RateCardItem**: deliverable (e.g. "1 Reel") + fixed ₹ price.
- **Booking** state machine: `REQUESTED → (COUNTERED ⇄) → ACCEPTED → FUNDED → DELIVERED → COMPLETED`, or `DECLINED`; plus `CANCELLED`. Escrow flags: funded/released; auto-release after a window (currently 6 days).
- **Message**: booking-scoped chat. **Review**: client→influencer, 1–5 + comment, only after COMPLETED; rolls up into avgRating.

## Conventions
- TypeScript on the frontend. Enforce anything security-relevant server-side (RLS / DB constraints), never with client checks alone.
- Money as integer paise or `numeric(10,2)` — **never float** — formatted as ₹ for display.
- Escape all user content (React does this by default — do not `dangerouslySetInnerHTML` user data).
- Secrets in `.env` (never commit); commit `.env.example`. The Supabase `service_role` key is server-only — never ship it to the browser.
- Use git from day one (repo is currently not version-controlled).

## How to run the legacy demo (reference only)
```
cd marketplace/backend
java Build.java
java -cp out com.marketplace.Main 8080
```
Open `marketplace/frontend/index.html` and point the API base at `http://localhost:8080`.

## Roadmap (high level)
1. **Foundation:** git repo, Supabase project, schema + RLS, Auth, React app skeleton.
2. **Port core flows:** onboarding, search (sort-by-price + pagination), booking state machine, Realtime chat, simulated escrow, reviews.
3. **Fill gaps:** counter-offer UI, notifications, profile media upload, edit-profile, categories as controlled vocab.
4. **Trust/ops:** validation, dispute/cancel flow, automated tests, monitoring, legal pages.
5. **Monetization:** platform fee / featured listings; then real Razorpay payments.

## Known issues in the legacy demo (fix or supersede in the rebuild)
- **Auth/authorization absent** — anyone can act on any booking (Supabase Auth + RLS supersedes).
- **Stored XSS** via unescaped innerHTML (React supersedes).
- **"Leave Review" button never hides** — UI reads `clientReview`, API sends `reviewed` (field mismatch).
- **Counter-offer flow** implemented in backend but unreachable in the UI.
- **Missing-field inputs throw 500 instead of 400** — thin validation.
- **In-memory store** — data lost on restart.
