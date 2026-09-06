import { PLATFORMS } from '@/lib/categories'
import type { SocialLinkDraft } from '@/lib/validation'
import { Button, Input, Select } from '@/components/ui'

// Editor for a creator's social profile links, shared by onboarding, the
// catch-up gate and edit-profile so the "at least one" rule and the input
// handling live in one place. Purely controlled: the parent owns the drafts and
// decides when to persist them (validateSocialLinkDrafts in @/lib/validation).
export function SocialLinksFields({
  value,
  onChange,
  errors = {},
  disabled = false,
}: {
  value: SocialLinkDraft[]
  onChange: (next: SocialLinkDraft[]) => void
  errors?: Record<number, string>
  disabled?: boolean
}) {
  const rows = value.length > 0 ? value : [{ platform: '', url: '' }]

  const update = (i: number, patch: Partial<SocialLinkDraft>) =>
    onChange(rows.map((row, j) => (j === i ? { ...row, ...patch } : row)))

  const remove = (i: number) => onChange(rows.filter((_, j) => j !== i))

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-gray-700">Social profile links</span>
      <div className="space-y-2">
        {rows.map((row, i) => {
          // Each platform can only be listed once, so hide the ones already taken.
          const taken = rows.filter((_, j) => j !== i).map((r) => r.platform)
          return (
            <div key={i} className="space-y-1">
              <div className="flex items-start gap-2">
                <Select
                  aria-label={`Platform for link ${i + 1}`}
                  className="w-32 shrink-0 sm:w-40"
                  value={row.platform}
                  disabled={disabled}
                  onChange={(e) => update(i, { platform: e.target.value })}
                >
                  <option value="">Platform…</option>
                  {PLATFORMS.filter((p) => !taken.includes(p)).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
                <Input
                  aria-label={`Link ${i + 1}`}
                  value={row.url}
                  disabled={disabled}
                  onChange={(e) => update(i, { url: e.target.value })}
                  placeholder="@yourhandle"
                />
                {rows.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={disabled}
                    onClick={() => remove(i)}
                    aria-label={`Remove link ${i + 1}`}
                  >
                    ✕
                  </Button>
                )}
              </div>
              {errors[i] && <span className="block text-xs text-red-600">{errors[i]}</span>}
            </div>
          )
        })}
      </div>
      {rows.length < PLATFORMS.length && (
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={() => onChange([...rows, { platform: '', url: '' }])}
          className="px-0 text-indigo-600 hover:bg-transparent hover:underline"
        >
          + Add another
        </Button>
      )}
      <span className="block text-xs text-gray-500">
        Paste a link or just your handle — businesses check your feed before they book.
      </span>
    </div>
  )
}
