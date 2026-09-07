import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUnreadNotificationCount } from '@/lib/db'
import { useAuth } from '@/lib/auth'

// Header bell (zero props) rendered by the app Layout. Counts durable unread
// notifications (migration 0010) and re-checks every 30s so a new booking,
// message or payout shows up while the tab stays open. Fails silent when signed
// out / no profile. Owned by sub-agent D — keep the exported name + zero props.
export function NotificationsBell() {
  const { profile } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!profile) {
      setCount(0)
      return
    }
    let active = true
    const refresh = async () => {
      try {
        const n = await getUnreadNotificationCount()
        if (active) setCount(n)
      } catch {
        if (active) setCount(0)
      }
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 30_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [profile])

  return (
    <Link
      to="/notifications"
      className="relative rounded-md px-2 py-1.5 text-gray-600 hover:bg-gray-100"
      aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
    >
      <span aria-hidden>🔔</span>
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-indigo-600 px-1 text-[10px] font-bold leading-none text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
