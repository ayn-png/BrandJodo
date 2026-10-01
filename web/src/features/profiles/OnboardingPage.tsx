import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { createMyProfile, replaceSocialLinks } from '@/lib/db'
import type { ProfileInput } from '@/lib/db'
import type { Role } from '@/lib/types'
import { BUSINESS_CATEGORIES, NICHES, PLATFORMS } from '@/lib/categories'
import { normalizeWebsiteUrl } from '@/lib/social'
import {
  clientProfileSchema,
  influencerProfileSchema,
  validateSocialLinkDrafts,
} from '@/lib/validation'
import type { SocialLinkDraft } from '@/lib/validation'
import { Alert, Button, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/ui'
import { MultiSelectChips } from './MultiSelectChips'
import { SocialLinksFields } from './SocialLinksFields'
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
  const { profile, refreshProfile } = useAuth()
  const navigate = useNavigate()

  const [role, setRole] = useState<Role | null>(null)
  // Shared
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [bio, setBio] = useState('')
  // Client
  const [businessCategory, setBusinessCategory] = useState('')
  const [phone, setPhone] = useState('')
  const [website, setWebsite] = useState('')
  // Influencer
  const [niches, setNiches] = useState<string[]>([])
  const [platforms, setPlatforms] = useState<string[]>([])
  const [followerCount, setFollowerCount] = useState('')
  const [socialDrafts, setSocialDrafts] = useState<SocialLinkDraft[]>([{ platform: '', url: '' }])
  const [socialErrors, setSocialErrors] = useState<Record<number, string>>({})

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Already onboarded — send them to the app.
  if (profile) return <Navigate to="/" replace />

  const save = async (input: ProfileInput, links?: SocialLinkDraft[]) => {
    setSubmitting(true)
    setFormError(null)
    try {
      await createMyProfile(input)
      // social_links references profiles(id), so the row has to exist first. If
      // this write fails the account is already usable and the form can't be
      // resubmitted (the profile now exists), so let them through — the
      // SocialLinksGate asks again on the next page rather than trapping them.
      if (links?.length) await replaceSocialLinks(links).catch(() => undefined)
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
      bio,
      phone,
      website,
    })
    if (!parsed.success) {
      setErrors(collectZodErrors(parsed.error.issues))
      return
    }
    setErrors({})
    await save({
      role: 'CLIENT',
      name: parsed.data.name,
      business_category: parsed.data.business_category,
      location: parsed.data.location || null,
      bio: parsed.data.bio || null,
      phone: parsed.data.phone || null,
      website: parsed.data.website ? normalizeWebsiteUrl(parsed.data.website) : null,
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
    // Both are validated before either is reported, so one submit surfaces
    // everything that is wrong.
    const socials = validateSocialLinkDrafts(socialDrafts)
    setErrors(parsed.success ? {} : collectZodErrors(parsed.error.issues))
    setSocialErrors(socials.errors)
    setFormError(socials.formError)
    if (!parsed.success || socials.formError) return
    await save(
      {
        role: 'INFLUENCER',
        name: parsed.data.name,
        bio: parsed.data.bio || null,
        location: parsed.data.location,
        niches: parsed.data.niches,
        platforms: parsed.data.platforms,
        follower_count: parsed.data.follower_count ?? null,
      },
      socials.links,
    )
  }
  // Step 1 — pick a role.
  if (!role) {
    return (
      <div className="mx-auto max-w-lg">
        <PageHeader
          title="Welcome to BrandJodo"
          subtitle="First, tell us how you'll use BrandJodo."
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
            <Field
              label="About"
              hint="Optional — creators read this before accepting a booking."
              error={errors.bio}
            >
              <Textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What your business does, and the kind of content you're after…"
              />
            </Field>
            <Field
              label="Phone"
              hint="Optional — only the creator you book can see this."
              error={errors.phone}
            >
              <Input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
              />
            </Field>
            <Field label="Website" hint="Optional." error={errors.website}>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="e.g. sunrisecafe.in"
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
            <SocialLinksFields
              value={socialDrafts}
              onChange={setSocialDrafts}
              errors={socialErrors}
              disabled={submitting}
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
