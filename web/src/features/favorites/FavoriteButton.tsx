import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { isFavorite, toggleFavorite } from '@/lib/db'
import { useAuth } from '@/lib/auth'
import { Spinner } from '@/components/ui'

// Heart toggle for shortlisting a creator (Workstream 5). Signed-out visitors are
// sent to login; influencers never see it (they book creators, not the reverse).
// The RPC is SECURITY DEFINER, so this is purely a UX convenience.
export function FavoriteButton({
  creatorId,
  className,
}: {
  creatorId: string
  className?: string
}) {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [fav, setFav] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    if (!session || !profile || profile.role === 'INFLUENCER') return
    isFavorite(creatorId)
      .then((v) => active && setFav(v))
      .catch(() => active && setFav(false))
    return () => {
      active = false
    }
  }, [creatorId, session, profile])

  const onClick = async () => {
    if (!session) {
      navigate('/login', { state: { from: location.pathname } })
      return
    }
    if (profile?.role === 'INFLUENCER') return
    setBusy(true)
    try {
      setFav(await toggleFavorite(creatorId))
    } catch {
      // Keep the previous state; the RPC uncovers real auth errors.
    } finally {
      setBusy(false)
    }
  }

  if (session && profile?.role === 'INFLUENCER') return null

  const active = fav === true
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || fav === null}
      aria-pressed={active}
      aria-label={active ? `Remove ${'creator'} from saved` : 'Save this creator'}
      title={active ? 'Saved — click to remove' : 'Save to shortlist'}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
        active
          ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
          : 'border-lilac/70 bg-white text-gray-700 hover:bg-lilac/30'
      } ${className ?? ''}`}
    >
      {busy ? (
        <Spinner className="h-3.5 w-3.5" />
      ) : (
        <span aria-hidden className="text-base leading-none">
          {active ? '♥' : '♡'}
        </span>
      )}
      {active ? 'Saved' : 'Save'}
    </button>
  )
}