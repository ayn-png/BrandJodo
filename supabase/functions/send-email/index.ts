// supabase/functions/send-email/index.ts
// Workstream 2 email worker: drains the durable email_outbox table (migration
// 0012) and sends each row with Resend (or marks SENT in dev when no API key is
// configured — money is SIMULATED, and so are emails until keys are added).
//
// Deploy: `npx supabase functions deploy send-email`, then add a scheduled job
// (dashboard → Integrations → Cron) running it every 5 minutes.
// Secrets: RESEND_API_KEY (optional in dev; without it rows are just drained).

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const url = Deno.env.get('SUPABASE_URL') ?? ''
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''

const client: SupabaseClient = createClient(url, key)

interface OutboxRow {
  id: string
  email: string
  subject: string
  body: string
}

async function sendViaResend(row: OutboxRow): Promise<boolean> {
  if (!resendKey) {
    // Demo mode: accept and drop. Swap for a real API call when keys exist.
    console.log(`[send-email] dev mode, skipping ${row.email}: ${row.subject}`)
    return true
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'AInfluencer <no-reply@ainfluencer.in>',
      to: [row.email],
      subject: row.subject,
      text: row.body,
    }),
  })
  return res.ok
}

Deno.serve(async () => {
  if (!url || !key) {
    return new Response('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY', { status: 500 })
  }

  const { data, error } = await client.rpc('claim_pending_emails', { p_limit: 10 })
  if (error) {
    return new Response(`claim_pending_emails failed: ${error.message}`, { status: 500 })
  }

  const rows = (data ?? []) as OutboxRow[]
  let sent = 0
  let failed = 0

  for (const row of rows) {
    const ok = await sendViaResend(row)
    const rpc = ok ? 'mark_email_sent' : 'mark_email_failed'
    const { error: markError } = await client.rpc(rpc, { p_outbox_id: row.id })
    if (markError) {
      console.error(`[send-email] mark ${row.id} (${rpc}) failed: ${markError.message}`)
      failed += 1
      continue
    }
    if (ok) sent += 1
    else failed += 1
  }

  return new Response(JSON.stringify({ ok: true, claimed: rows.length, sent, failed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})