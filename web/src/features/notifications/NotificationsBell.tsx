import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listMyBookings } from '@/lib/db'
import { useAuth } from '@/lib/auth'
import { isMyTurn } from '@/features/notifications/turns'

// Header bell (zero props) rendered by the app Layout. Counts bookings that need
// THIS user's action and links to /notifications. Fails silent when signed out /
// no profile. Owned by sub-agent D — keep the exported name + zero required props.
export function NotificationsBell() {
  const { profile } = useAuth()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!profile) {
      setCount(0)
      return
    }
    let active = true
    listMyBookings()
      .then((bookings) => {
        if (active) setCount(bookings.filter((b) => isMyTurn(b.status, profile.role)).length)
      })
      .catch(() => {
        if (active) setCount(0)
      })
    return () => {
      active = false
    }
  }, [profile])

  return (
    <Link
      to="/notifications"
      className="relative rounded-md px-2 py-1.5 text-gray-600 hover:bg-gray-100"
      aria-label={count > 0 ? `Notifications, ${count} need your attention` : 'Notifications'}
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
