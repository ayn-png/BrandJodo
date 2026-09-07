import { Link, NavLink, Outlet, ScrollRestoration, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui'
import { NotificationsBell } from '@/features/notifications/NotificationsBell'

function navCls(active: boolean) {
  return active
    ? 'rounded-full px-3 py-1.5 font-semibold text-plum bg-lilac/70'
    : 'rounded-full px-3 py-1.5 text-mist hover:bg-lilac/40 hover:text-plum'
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
      {/* SPA scroll restore: re-scroll on back/forward instead of jumping to top on every nav. */}
      <ScrollRestoration />
      <header className="sticky top-0 z-10 border-b border-lilac/40 bg-petal/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink font-display text-lg font-semibold text-white shadow-sm">
              A
            </span>
            <span className="font-display text-xl font-semibold tracking-tight text-ink">AInfluencer</span>
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
            {session && profile?.role === 'INFLUENCER' && (
              <NavLink to="/earnings" className={({ isActive }) => navCls(isActive)}>
                Earnings
              </NavLink>
            )}
            {session && profile?.role === 'INFLUENCER' && (
              <NavLink to="/analytics" className={({ isActive }) => navCls(isActive)}>
                Analytics
              </NavLink>
            )}
            {session && profile?.role === 'CLIENT' && (
              <NavLink to="/saved" className={({ isActive }) => navCls(isActive)}>
                Saved
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

      <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-mist">
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/privacy" className="hover:text-ink">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-ink">
            Terms
          </Link>
          <span className="ml-auto">Prices in ₹ · Simulated escrow (v1)</span>
        </div>
      </footer>
    </div>
  )
}
