import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  console.warn(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy web/.env.example to web/.env',
  )
}

// createClient() throws synchronously on an empty URL/key, which would blank the
// whole page at import time. When unconfigured we hand it harmless placeholders
// so the module loads and App.tsx can surface the unconfigured state in the UI.
// All real usage is gated on isSupabaseConfigured, so the placeholder client is
// never actually called.
export const supabase: SupabaseClient = createClient(
  url ?? 'http://localhost:54321',
  anonKey ?? 'placeholder-anon-key',
)
