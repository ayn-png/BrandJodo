// supabase/functions/auto-release/index.ts
// Fallback scheduler for the escrow auto-release, used when pg_cron is unavailable
// (local dev without the extension, or a host that blocks cron grants).
//
// Salient behavior is intentionally in SQL (public.release_due_escrow in 0009):
// row locks with `skip locked` make overlapping runs safe, and each release writes
// its ESCROW_RELEASE + PLATFORM_FEE ledger rows atomically.
//
// Deploy: `npx supabase functions deploy auto-release`, then add a scheduled job
// (Supabase dashboard → Integrations → Cron, pg_cron via the dashboard or an Edge
// Function schedule) running this function every 10 minutes.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const url = Deno.env.get('SUPABASE_URL') ?? ''
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const client: SupabaseClient = createClient(url, key)

Deno.serve(async () => {
  if (!url || !key) {
    return new Response('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY', { status: 500 })
  }
  const { data, error } = await client.rpc('release_due_escrow')
  if (error) {
    return new Response(`release_due_escrow failed: ${error.message}`, { status: 500 })
  }
  return new Response(JSON.stringify({ ok: true, result: data }), {
    headers: { 'Content-Type': 'application/json' },
  })
})