import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui'
import { NotificationsBell } from '@/features/notifications/NotificationsBell'

function navCls(active: boolean) {
  return active
    ? 'rounded-md px-3 py-1.5 font-semibold text-indigo-700 bg-indigo-50'
    : 'rounded-md px-3 py-1.5 text-gray-600 hover:bg-gray-100'
}

export function Layout() {
  const { session, profile, signOut } = useAuth()
  const navigate = useNavigate()

  const onSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-extrabold text-gray-900">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white">A</span>
            <span>AInfluencer</span>
          </Link>
          <nav className="ml-auto flex items-center gap-1 text-sm">
            <NavLink to="/" end className={({ isActive }) => navCls(isActive)}>
              Discover
            </NavLink>
            {session && (
              <NavLink to="/bookings" className={({ isActive }) => navCls(isActive)}>
                Bookings
              </NavLink>
            )}
            {session && <NotificationsBell />}
            {session ? (
              <>
                <NavLink to="/profile/edit" className={({ isActive }) => navCls(isActive)}>
                  {profile?.name ?? 'Profile'}
                </NavLink>
                <Button variant="ghost" onClick={onSignOut}>
                  Sign out
                </Button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={({ isActive }) => navCls(isActive)}>
                  Log in
                </NavLink>
                <Link to="/signup">
                  <Button>Sign up</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-gray-400">
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/privacy" className="hover:text-gray-600">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-gray-600">
            Terms
          </Link>
          <span className="ml-auto">Prices in ₹ · Simulated escrow (v1)</span>
        </div>
      </footer>
    </div>
  )
}
