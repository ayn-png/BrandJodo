import { useEffect, useId, useRef } from 'react'
import type {
  ButtonHTMLAttributes,
  ComponentPropsWithRef,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from 'react'
import type { BookingStatus } from '@/lib/types'

// Shared UI primitives (Tailwind, indigo-600 primary). Import from '@/components/ui'.
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-current border-t-transparent',
        className ?? 'h-5 w-5',
      )}
      role="status"
      aria-label="Loading"
    />
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500'
  const variants: Record<string, string> = {
    primary: 'bg-plum text-white shadow-sm hover:bg-indigo-700',
    secondary: 'bg-white text-gray-800 border border-lilac/70 hover:bg-lilac/30',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-mist hover:bg-lilac/40 hover:text-plum',
  }
  return (
    <button className={cn(base, variants[variant], className)} disabled={disabled || loading} {...rest}>
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  )
}

const fieldClasses =
  'w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldClasses, className)} {...props} />
}

// ComponentPropsWithRef so callers can hold a ref to the element (React 19 passes
// `ref` through as an ordinary prop) — the chat composer needs one to focus itself.
export function Textarea({ className, ...props }: ComponentPropsWithRef<'textarea'>) {
  return <textarea className={cn(fieldClasses, className)} {...props} />
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(fieldClasses, className)} {...props} />
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label?: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block space-y-1">
      {label && <span className="block text-sm font-medium text-gray-700">{label}</span>}
      {children}
      {hint && !error && <span className="block text-xs text-gray-500">{hint}</span>}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  )
}
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-lilac/60 bg-white p-5 shadow-sm', className)}>
      {children}
    </div>
  )
}

export function Alert({
  kind = 'error',
  children,
}: {
  kind?: 'error' | 'success' | 'info'
  children: ReactNode
}) {
  const map = {
    error: 'bg-red-50 text-red-700 border-red-200',
    success: 'bg-green-50 text-green-700 border-green-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  }
  return (
    <div className={cn('rounded-lg border px-3 py-2 text-sm', map[kind])} role="alert">
      {children}
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-lilac/70 p-10 text-center">
      <p className="font-medium text-gray-700">{title}</p>
      {children && <div className="mt-1 text-sm text-gray-500">{children}</div>}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

const STATUS_STYLES: Record<BookingStatus, string> = {
  REQUESTED: 'bg-amber-100 text-amber-800',
  COUNTERED: 'bg-lilac/70 text-plum',
  ACCEPTED: 'bg-indigo-100 text-indigo-800',
  DECLINED: 'bg-gray-200 text-gray-700',
  FUNDED: 'bg-forest text-white',
  DELIVERED: 'bg-forest-100 text-forest-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-200 text-gray-700',
  DISPUTED: 'bg-red-100 text-red-800',
  REFUND_OWED: 'bg-orange-100 text-orange-800',
}

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold',
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  )
}

export function Stars({ rating, count }: { rating: number; count?: number }) {
  const full = Math.round(rating)
  return (
    <span className="inline-flex items-center gap-1 text-sm" aria-label={`${rating.toFixed(1)} out of 5`}>
      <span className="text-amber-500">
        {'★'.repeat(full)}
        {'☆'.repeat(5 - full)}
      </span>
      <span className="text-gray-500">
        {rating > 0 ? rating.toFixed(1) : 'New'}
        {typeof count === 'number' ? ` (${count})` : ''}
      </span>
    </span>
  )
}

export function Avatar({
  name,
  url,
  size = 40,
}: {
  name: string
  url?: string | null
  size?: number
}) {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || '?'
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      className="inline-grid place-items-center rounded-full bg-lilac font-display font-semibold text-ink"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initial}
    </span>
  )
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Blocking dialog. There is deliberately no close affordance, no Escape handler
// and no backdrop click: the only use so far is a requirement the user has to
// satisfy, so whoever renders it decides when it goes away. Focus is moved into
// the panel on mount and trapped there, and the page behind it cannot scroll.
export function Modal({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
}) {
  const headingId = useId()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const panel = panelRef.current
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus()

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    // Tab must not reach the page underneath, or the dialog is only visually modal.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !panel) return
      const stops = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (stops.length === 0) return
      const first = stops[0]
      const last = stops[stops.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || !panel.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (active === last || !panel.contains(active))) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/50 p-4 sm:items-center">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        className="w-full max-w-lg rounded-2xl border border-lilac/60 bg-white p-5 shadow-xl"
      >
        <h2 id={headingId} className="font-display text-xl font-semibold text-ink">
          {title}
        </h2>
        {subtitle && <div className="mt-1 text-sm text-gray-500">{subtitle}</div>}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}
