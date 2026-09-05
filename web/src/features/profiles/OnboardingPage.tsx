import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { createMyProfile } from '@/lib/db'
import type { ProfileInput } from '@/lib/db'
import type { Role } from '@/lib/types'
import { BUSINESS_CATEGORIES, NICHES, PLATFORMS } from '@/lib/categories'
import { clientProfileSchema, influencerProfileSchema } from '@/lib/validation'
import { Alert, Button, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/ui'
import { MultiSelectChips } from './MultiSelectChips'
import { collectZodErrors } from './formErrors'

function StepActions({ submitting, onBack }: { submitting: boolean; onBack: () => void }) {
  return (
    <div className="flex gap-3 pt-2">
      <Button type="button" variant="secondary" onClick={onBack} disabled={submitting}>
        Back
      </Button>
      <Button type="submit" className="flex-1" loading={submitting}>
        Create profile
      </Button>
    </div>
  )
}

export function OnboardingPage() {
  const { profile, user, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState<Role | null>(null)
  // Shared
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  // Client
  const [businessCategory, setBusinessCategory] = useState('')
  // Influencer
  const [bio, setBio] = useState('')
  const [niches, setNiches] = useState<string[]>([])
  const [platforms, setPlatforms] = useState<string[]>([])
  const [followerCount, setFollowerCount] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Already onboarded — send them to the app.
  if (profile) return <Navigate to="/" replace />

  const save = async (input: ProfileInput) => {
    setSubmitting(true)
    setFormError(null)
    try {
      await createMyProfile(input)
      await refreshProfile()
      navigate('/', { replace: true })
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Could not save your profile. Please try again.',
      )
      setSubmitting(false)
    }
  }

  const submitClient = async (e: FormEvent) => {
    e.preventDefault()
    const parsed = clientProfileSchema.safeParse({
      name,
      business_category: businessCategory,
      location,
    })
    if (!parsed.success) {
      setErrors(collectZodErrors(parsed.error.issues))
      return
    }
    setErrors({})
    await save({
      role: 'CLIENT',
      name: parsed.data.name,
      email: user?.email ?? null,
      business_category: parsed.data.business_category,
      location: parsed.data.location || null,
    })
  }

  const submitInfluencer = async (e: FormEvent) => {
    e.preventDefault()
    const parsed = influencerProfileSchema.safeParse({
      name,
      bio,
      location,
      niches,
      platforms,
      follower_count: followerCount === '' ? undefined : followerCount,
    })
    if (!parsed.success) {
      setErrors(collectZodErrors(parsed.error.issues))
      return
    }
    setErrors({})
    await save({
      role: 'INFLUENCER',
      name: parsed.data.name,
      email: user?.email ?? null,
      bio: parsed.data.bio || null,
      location: parsed.data.location,
      niches: parsed.data.niches,
      platforms: parsed.data.platforms,
      follower_count: parsed.data.follower_count ?? null,
    })
  }
  // Step 1 — pick a role.
  if (!role) {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader
          title="Welcome to AInfluencer"
          subtitle="First, tell us how you'll use AInfluencer."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setRole('CLIENT')}
            className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-400 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <span className="text-base font-semibold text-gray-900">I'm a business</span>
            <span className="mt-1 block text-sm text-gray-500">
              Find and book local creators at fixed prices.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setRole('INFLUENCER')}
            className="rounded-xl border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-400 hover:shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <span className="text-base font-semibold text-gray-900">I'm a creator</span>
            <span className="mt-1 block text-sm text-gray-500">
              Set your rate card and get paid, local bookings.
            </span>
          </button>
        </div>
      </div>
    )
  }
  // Step 2 — role-specific form.
  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title={role === 'CLIENT' ? 'Set up your business' : 'Set up your creator profile'}
        subtitle="You can change any of this later."
      />
      <Card>
        {formError && (
          <div className="mb-4">
            <Alert kind="error">{formError}</Alert>
          </div>
        )}
        {role === 'CLIENT' ? (
          <form className="space-y-4" onSubmit={submitClient} noValidate>
            <Field label="Business name" error={errors.name}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sunrise Cafe"
              />
            </Field>
            <Field label="Business category" error={errors.business_category}>
              <Select value={businessCategory} onChange={(e) => setBusinessCategory(e.target.value)}>
                <option value="">Select a category…</option>
                {BUSINESS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Location"
              hint="Optional — helps you find nearby creators."
              error={errors.location}
            >
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bengaluru"
              />
            </Field>
            <StepActions submitting={submitting} onBack={() => setRole(null)} />
          </form>
        ) : (
          <form className="space-y-4" onSubmit={submitInfluencer} noValidate>
            <Field label="Name" error={errors.name}>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name or handle"
              />
            </Field>
            <Field
              label="Location"
              hint="Where you're based — local clients search by city."
              error={errors.location}
            >
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bengaluru"
              />
            </Field>
            <Field label="Bio" hint="Optional — a short intro for clients." error={errors.bio}>
              <Textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What you create and who you work with…"
              />
            </Field>
            <MultiSelectChips
              label="Niches"
              options={NICHES}
              value={niches}
              onChange={setNiches}
              error={errors.niches}
              hint="Pick 1–6."
            />
            <MultiSelectChips
              label="Platforms"
              options={PLATFORMS}
              value={platforms}
              onChange={setPlatforms}
              error={errors.platforms}
              hint="Pick at least one."
            />
            <Field label="Follower count" hint="Optional." error={errors.follower_count}>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={followerCount}
                onChange={(e) => setFollowerCount(e.target.value)}
                placeholder="e.g. 5000"
              />
            </Field>
            <StepActions submitting={submitting} onBack={() => setRole(null)} />
          </form>
        )}
      </Card>
    </div>
  )
}
