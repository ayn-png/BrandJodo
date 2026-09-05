import { cn } from '@/components/ui'

// Controlled-vocabulary multi-select rendered as toggle chips (mobile-friendly,
// no free text). Selection state is owned by the parent.
export function MultiSelectChips({
  label,
  options,
  value,
  onChange,
  error,
  hint,
}: {
  label: string
  options: readonly string[]
  value: string[]
  onChange: (next: string[]) => void
  error?: string
  hint?: string
}) {
  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt])
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-gray-700">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const active = value.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(opt)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1',
                active
                  ? 'border-indigo-600 bg-indigo-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
              )}
            >
              {opt}
            </button>
          )
        })}
      </div>
      {hint && !error && <span className="block text-xs text-gray-500">{hint}</span>}
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </div>
  )
}
