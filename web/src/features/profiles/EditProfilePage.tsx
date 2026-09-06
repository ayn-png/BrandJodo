import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '@/lib/auth'
import {
  addRateCardItem,
  deleteRateCardItem,
  listRateCard,
  listSocialLinks,
  replaceSocialLinks,
  updateMyProfile,
} from '@/lib/db'
import type { ProfileInput } from '@/lib/db'
import type { RateCardItem } from '@/lib/types'
import { BUSINESS_CATEGORIES, NICHES, PLATFORMS } from '@/lib/categories'
import { normalizeWebsiteUrl } from '@/lib/social'
import {
  clientProfileSchema,
  influencerProfileSchema,
  rateCardItemSchema,
  validateSocialLinkDrafts,
} from '@/lib/validation'
import type { SocialLinkDraft } from '@/lib/validation'
import { formatINR, rupeesToPaise } from '@/lib/money'
import {
  Alert,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageHeader,
  Select,
  Spinner,
  Textarea,
} from '@/components/ui'
import { MultiSelectChips } from './MultiSelectChips'
import { SocialLinksFields } from './SocialLinksFields'
import { collectZodErrors } from './formErrors'

export function EditProfilePage() {
  const { profile, refreshProfile } = useAuth()

  const [name, setName] = useState(profile?.name ?? '')
  const [location, setLocation] = useState(profile?.location ?? '')
  const [businessCategory, setBusinessCategory] = useState(profile?.business_category ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [website, setWebsite] = useState(profile?.website ?? '')
  const [niches, setNiches] = useState<string[]>(profile?.niches ?? [])
  const [platforms, setPlatforms] = useState<string[]>(profile?.platforms ?? [])
  const [followerCount, setFollowerCount] = useState(
    profile?.follower_count != null ? String(profile.follower_count) : '',
  )
  const [socialDrafts, setSocialDrafts] = useState<SocialLinkDraft[]>([{ platform: '', url: '' }])
  const [socialErrors, setSocialErrors] = useState<Record<number, string>>({})
  const [socialLoading, setSocialLoading] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const [rateCard, setRateCard] = useState<RateCardItem[]>([])
  const [rcLoading, setRcLoading] = useState(true)
  const [deliverable, setDeliverable] = useState('')
  const [priceRupees, setPriceRupees] = useState('')
  const [rcErrors, setRcErrors] = useState<Record<string, string>>({})
  const [rcError, setRcError] = useState<string | null>(null)
  const [rcAdding, setRcAdding] = useState(false)
  const [rcBusyId, setRcBusyId] = useState<string | null>(null)

  const isInfluencer = profile?.role === 'INFLUENCER'
  const profileId = profile?.id

  useEffect(() => {
    if (!isInfluencer || !profileId) {
      setRcLoading(false)
      setSocialLoading(false)
      return
    }
    let active = true
    setRcLoading(true)
    setSocialLoading(true)
    listRateCard(profileId)
      .then((items) => {
        if (active) setRateCard(items)
      })
      .catch(() => {
        if (active) setRcError('Could not load your rate card.')
      })
      .finally(() => {
        if (active) setRcLoading(false)
      })
    // The fields stay hidden behind socialLoading until this settles, so the
    // seed can never land on top of something already typed.
    listSocialLinks(profileId)
      .then((links) => {
        if (!active || links.length === 0) return
        setSocialDrafts(links.map((l) => ({ platform: l.platform, url: l.url })))
      })
      .catch(() => {
        if (active) setFormError('Could not load your social links.')
      })
      .finally(() => {
        if (active) setSocialLoading(false)
      })
    return () => {
      active = false
    }
  }, [isInfluencer, profileId])

  if (!profile) {
    return (
      <div className="grid place-items-center py-20">
        <Spinner />
      </div>
    )
  }
  const onSave = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setSaved(false)

    // Validate against the schema for this profile's role, then send only the
    // fields that role owns so we never clobber the other role's columns.
    const parsed = isInfluencer
      ? influencerProfileSchema.safeParse({ name, location, bio, niches, platforms, follower_count: followerCount })
      : clientProfileSchema.safeParse({
          name,
          location,
          business_category: businessCategory,
          bio,
          phone,
          website,
        })
    // A creator's links are validated in the same pass, so one submit reports
    // everything that is wrong. The "at least one" rule lives in the validator.
    const socials = isInfluencer
      ? validateSocialLinkDrafts(socialDrafts)
      : { links: [], errors: {}, formError: null }
    setErrors(parsed.success ? {} : collectZodErrors(parsed.error.issues))
    setSocialErrors(socials.errors)
    setFormError(socials.formError)
    if (!parsed.success || socials.formError) return

    const patch: Partial<ProfileInput> = isInfluencer
      ? {
          name: name.trim(),
          location: location.trim() || null,
          bio: bio.trim() || null,
          niches,
          platforms,
          follower_count: followerCount === '' ? null : Number(followerCount),
        }
      : {
          name: name.trim(),
          location: location.trim() || null,
          business_category: businessCategory || null,
          bio: bio.trim() || null,
          phone: phone.trim() || null,
          website: website.trim() ? normalizeWebsiteUrl(website) : null,
        }

    setSaving(true)
    try {
      await updateMyProfile(patch)
      if (isInfluencer) {
        await replaceSocialLinks(socials.links)
        // Show the canonical URLs the normaliser produced, not what was typed.
        setSocialDrafts(socials.links.map((l) => ({ platform: l.platform, url: l.url })))
      }
      await refreshProfile()
      setSaved(true)
    } catch {
      setFormError('Could not save your profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }
  const onAddRateCard = async (e: FormEvent) => {
    e.preventDefault()
    setRcError(null)
    const parsed = rateCardItemSchema.safeParse({ deliverable, price_rupees: priceRupees })
    if (!parsed.success) {
      setRcErrors(collectZodErrors(parsed.error.issues))
      return
    }
    setRcErrors({})
    setRcAdding(true)
    try {
      const item = await addRateCardItem(
        parsed.data.deliverable,
        rupeesToPaise(parsed.data.price_rupees),
      )
      // Keep the list cheapest-first, matching listRateCard's ordering.
      setRateCard((prev) => [...prev, item].sort((a, b) => a.price_paise - b.price_paise))
      setDeliverable('')
      setPriceRupees('')
    } catch {
      setRcError('Could not add that item. Please try again.')
    } finally {
      setRcAdding(false)
    }
  }

  const onDeleteRateCard = async (id: string) => {
    setRcError(null)
    setRcBusyId(id)
    try {
      await deleteRateCardItem(id)
      setRateCard((prev) => prev.filter((i) => i.id !== id))
    } catch {
      setRcError('Could not remove that item. Please try again.')
    } finally {
      setRcBusyId(null)
    }
  }
  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit profile"
        subtitle={
          isInfluencer
            ? 'Keep your details and rate card current — clients sort by price.'
            : 'Tell creators who you are and where you’re based.'
        }
      />

      {formError && <Alert kind="error">{formError}</Alert>}
      {saved && <Alert kind="success">Profile saved.</Alert>}

      <Card>
        <form onSubmit={onSave} className="space-y-4" noValidate>
          <Field label="Name" error={errors.name}>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </Field>

          <Field label="Location" error={errors.location} hint="City you work in, e.g. Pune">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
          {/* Both roles get a description: creators sell with it, businesses are
              read with it before a creator accepts a booking. */}
          <Field
            label={isInfluencer ? 'Bio' : 'About'}
            error={errors.bio}
            hint={
              isInfluencer
                ? 'A couple of lines about your content'
                : 'What your business does, and the kind of content you’re after'
            }
          >
            <Textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
          </Field>
          {isInfluencer ? (
            <>
              <MultiSelectChips
                label="Niches"
                options={NICHES}
                value={niches}
                onChange={setNiches}
                error={errors.niches}
                hint="Pick at least one"
              />
              <MultiSelectChips
                label="Platforms"
                options={PLATFORMS}
                value={platforms}
                onChange={setPlatforms}
                error={errors.platforms}
                hint="Where you post"
              />
              {socialLoading ? (
                <div className="grid place-items-center py-4">
                  <Spinner />
                </div>
              ) : (
                <SocialLinksFields
                  value={socialDrafts}
                  onChange={setSocialDrafts}
                  errors={socialErrors}
                  disabled={saving}
                />
              )}
              <Field label="Follower count" error={errors.follower_count}>
                <Input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={followerCount}
                  onChange={(e) => setFollowerCount(e.target.value)}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Business category" error={errors.business_category}>
                <Select
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                >
                  <option value="">Select a category…</option>
                  {BUSINESS_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Phone"
                error={errors.phone}
                hint="Only the creator you book can see this"
              >
                <Input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </Field>
              <Field label="Website" error={errors.website} hint="Optional">
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="sunrisecafe.in"
                />
              </Field>
            </>
          )}
          <Button type="submit" loading={saving}>
            Save changes
          </Button>
        </form>
      </Card>
      {isInfluencer && (
        <Card>
          <h2 className="text-base font-semibold text-gray-900">Rate card</h2>
          <p className="mt-1 text-sm text-gray-500">
            Fixed prices per deliverable. The cheapest one is what clients see when they sort by
            price.
          </p>

          {rcError && (
            <div className="mt-3">
              <Alert kind="error">{rcError}</Alert>
            </div>
          )}

          {rcLoading ? (
            <div className="grid place-items-center py-8">
              <Spinner />
            </div>
          ) : rateCard.length === 0 ? (
            <div className="mt-4">
              <EmptyState title="No rate card items yet">
                Add your first deliverable below so clients can book you.
              </EmptyState>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-gray-100">
              {rateCard.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm text-gray-800">
                    {item.deliverable}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatINR(item.price_paise)}
                  </span>
                  <Button
                    variant="ghost"
                    onClick={() => onDeleteRateCard(item.id)}
                    loading={rcBusyId === item.id}
                    aria-label={`Remove ${item.deliverable}`}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={onAddRateCard} className="mt-4 border-t border-gray-100 pt-4" noValidate>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="flex-1">
                <Field label="Deliverable" error={rcErrors.deliverable}>
                  <Input
                    value={deliverable}
                    onChange={(e) => setDeliverable(e.target.value)}
                    placeholder="1 Reel"
                  />
                </Field>
              </div>
              <div className="sm:w-40">
                <Field label="Price (₹)" error={rcErrors.price_rupees}>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={priceRupees}
                    onChange={(e) => setPriceRupees(e.target.value)}
                    placeholder="1500"
                  />
                </Field>
              </div>
              <Button type="submit" variant="secondary" loading={rcAdding} className="sm:mt-6">
                Add
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  )
}
