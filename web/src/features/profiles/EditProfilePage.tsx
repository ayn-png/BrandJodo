import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '@/lib/auth'
import { addRateCardItem, deleteRateCardItem, listRateCard, updateMyProfile } from '@/lib/db'
import type { ProfileInput } from '@/lib/db'
import type { RateCardItem } from '@/lib/types'
import { BUSINESS_CATEGORIES, NICHES, PLATFORMS } from '@/lib/categories'
import { clientProfileSchema, influencerProfileSchema, rateCardItemSchema } from '@/lib/validation'
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
import { collectZodErrors } from './formErrors'

export function EditProfilePage() {
  const { profile, refreshProfile } = useAuth()

  const [name, setName] = useState(profile?.name ?? '')
  const [location, setLocation] = useState(profile?.location ?? '')
  const [businessCategory, setBusinessCategory] = useState(profile?.business_category ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [niches, setNiches] = useState<string[]>(profile?.niches ?? [])
  const [platforms, setPlatforms] = useState<string[]>(profile?.platforms ?? [])
  const [followerCount, setFollowerCount] = useState(
    profile?.follower_count != null ? String(profile.follower_count) : '',
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  // EDIT_PLACEHOLDER_1
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
      return
    }
    let active = true
    setRcLoading(true)
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
  // EDIT_PLACEHOLDER_2
}
