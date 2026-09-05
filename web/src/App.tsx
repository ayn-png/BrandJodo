import { useEffect, useState } from 'react'
import { isSupabaseConfigured, supabase } from './lib/supabase'

type Status = 'checking' | 'ok' | 'unconfigured' | 'error'

export default function App() {
  const [status, setStatus] = useState<Status>(
    isSupabaseConfigured ? 'checking' : 'unconfigured',
  )
  const [detail, setDetail] = useState('')

  useEffect(() => {
    if (!isSupabaseConfigured) return
    // Cheap connectivity + schema check: read the public influencer_cards view.
    supabase
      .from('influencer_cards')
      .select('id', { count: 'exact', head: true })
      .then(({ error }) => {
        if (error) {
          setStatus('error')
          setDetail(error.message)
        } else {
          setStatus('ok')
        }
      })
  }, [])

  return (
    <main className="shell">
      <header className="topbar">
        <span className="logo">A</span>
        <h1>
          AInfluencer <span>Marketplace</span>
        </h1>
      </header>

      <section className="card">
        <h2>Project skeleton is live 🎉</h2>
        <p>
          A price-first, local creator ↔ brand marketplace. Coming next: auth,
          creator discovery, and the booking + escrow flow.
        </p>
        <div className={`badge ${status}`}>
          {status === 'checking' && 'Checking Supabase connection…'}
          {status === 'ok' && 'Supabase connected — schema reachable ✓'}
          {status === 'unconfigured' &&
            'Supabase not configured — copy web/.env.example to web/.env'}
          {status === 'error' && `Supabase reachable but schema not applied yet: ${detail}`}
        </div>
      </section>
    </main>
  )
}
