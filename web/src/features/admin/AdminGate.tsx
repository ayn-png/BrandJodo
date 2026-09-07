import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { Spinner } from '@/components/ui'

// Thin gate: checks the is_admin() SECURITY DEFINER RPC. Renders nothing
// and navigates away if the user is not an admin. All authorization is
// enforced server-side via the RPC + RLS — this is a UX convenience only.
export function AdminGate({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    let active = true
    const check = async () => {
      try {
        const { data } = await supabase.rpc('is_admin')
        if (active) setAdmin(data === true)
      } catch {
        if (active) setAdmin(false)
      }
    }
    void check()
    return () => { active = false }
  }, [])

  if (admin === null) {
    return (
      <div className="grid place-items-center py-20">
        <Spinner />
      </div>
    )
  }

  if (!admin) {
    return (
      <div className="space-y-4 py-20 text-center">
        <p className="text-sm text-gray-500">You do not have access to this page.</p>
      </div>
    )
  }

  return <>{children}</>
}
