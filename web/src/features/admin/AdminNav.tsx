import { NavLink } from 'react-router-dom'
import { cn } from '@/components/ui'

// Small tab bar shared by the two admin pages (/admin/disputes, /admin/reports).
export function AdminNav() {
  const cls = (active: boolean) =>
    cn(
      'rounded-full px-3 py-1.5 text-sm font-semibold transition',
      active ? 'bg-plum text-white' : 'bg-white text-gray-700 border border-lilac/70 hover:bg-lilac/30',
    )
  return (
    <nav className="flex flex-wrap items-center gap-2">
      <NavLink to="/admin/disputes" className={({ isActive }) => cls(isActive)}>
        Disputes
      </NavLink>
      <NavLink to="/admin/reports" className={({ isActive }) => cls(isActive)}>
        Reports
      </NavLink>
    </nav>
  )
}