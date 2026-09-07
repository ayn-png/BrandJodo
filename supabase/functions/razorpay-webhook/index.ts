// supabase/functions/razorpay-webhook/index.ts
// PLACEHOLDER for the real-money gateway webhook (Workstream 1.5).
//
// The ledger is SIMULATED (payments.provider = 'SIMULATED') until this is wired.
// When flipping to RAZORPAY, this function must:
//   1. Verify `X-Razorpay-Signature` with the webhook secret (Razorpay sends the
//      Webhook-Signature header in production; validate via hmac over body).
//   2. Map Razorpay order.paid events to ESCROW_DEPOSIT rows by provider_ref.
//   3. Map payout events (via RazorpayX) to payouts.status = PAID.
//   4. Idempotently update rows (match on provider_ref so retries are no-ops).
//   5. Never trust the client: all mutations go through the 0009 SECURITY DEFINER RPCs
//      or direct service-role writes only after signature verification.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const url = Deno.env.get('SUPABASE_URL') ?? ''
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

// Deno.serve allows this stub to be deployed and receive webhooks immediately;
// the handler intentionally fails closed until signature verification exists.
const client: SupabaseClient = createClient(url, key)
void client // reserved for verified handlers

Deno.serve(async (req) => {
  if (!url || !key) {
    return new Response('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY', { status: 500 })
  }
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }
  const event = (body as { event?: string })?.event ?? 'unknown'
  return new Response(
    JSON.stringify({ ok: false, error: 'webhook_not_wired', event }),
    { status: 501, headers: { 'Content-Type': 'application/json' } },
  )
})