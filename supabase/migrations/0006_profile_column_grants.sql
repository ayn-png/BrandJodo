-- 0006_profile_column_grants.sql
-- Column-level privileges on public.profiles.
--
-- RLS is row-level: it decides *which rows* a role may touch, never which columns.
-- Supabase ships a table-wide `grant all on all tables in schema public to anon,
-- authenticated`, and a table-wide privilege silently overrides any column-level
-- REVOKE — so the only way to fence off a column is to drop the table-level grant
-- and re-grant the allowed columns explicitly. That is what this migration does.
--
-- Two concrete holes it closes, both on rows RLS already lets the caller reach:
--
--   * profiles.email was world-readable. Influencer rows are public by design
--     (that is the discovery feed), so `GET /rest/v1/profiles?select=email` with
--     the anon key — which ships inside the browser bundle — returned every
--     creator's email address to anyone who asked. The column is a redundant copy
--     of auth.users.email, which GoTrue only ever discloses to its owner, and
--     nothing in the app reads it. Rows are left untouched; only API access goes.
--
--   * role and featured_until were self-writable. profiles_update_self (0002)
--     lets you update your own row, and with a table-wide UPDATE grant that
--     included every column: a user could flip their own role, or — once
--     featured listings become a paid placement — hand themselves free promotion
--     with a one-line PATCH. Both are now server-owned columns.

revoke select, insert, update, delete on public.profiles from anon, authenticated;

-- Readable by everyone; still row-filtered by the 0002/0005 SELECT policies.
grant select (
  id, role, name, business_category, bio, location, niches, platforms,
  follower_count, portfolio, avatar_url, featured_until, created_at, updated_at
) on public.profiles to anon, authenticated;

-- Onboarding writes the row once. `role` is insertable but not updatable, so the
-- account type is chosen at signup and fixed thereafter.
grant insert (
  id, role, name, business_category, bio, location, niches, platforms,
  follower_count, portfolio, avatar_url
) on public.profiles to authenticated;

-- Edit-profile. Omits id/role/email/featured_until/created_at/updated_at:
-- identity and server-owned fields are not user-editable. `updated_at` is still
-- maintained by the profiles_set_updated_at trigger, which assigns to NEW rather
-- than naming the column in the statement, so it needs no grant here.
grant update (
  name, business_category, bio, location, niches, platforms,
  follower_count, portfolio, avatar_url
) on public.profiles to authenticated;

-- anon gets no write privileges at all, and nobody gets DELETE: there is no
-- DELETE policy on profiles, and account removal cascades from auth.users.
