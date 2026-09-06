import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { listSocialLinks, replaceSocialLinks } from '@/lib/db'
import { validateSocialLinkDrafts } from '@/lib/validation'
import type { SocialLinkDraft } from '@/lib/validation'
import { Alert, Button, Modal } from '@/components/ui'
import { SocialLinksFields } from './SocialLinksFields'

// Catch-up path for the "creators must publish at least one social link" rule.
// New creators fill this in during onboarding and never see it; this is for
// accounts that already existed, and for anyone whose links failed to save.
// Rendered by ProtectedRoute, so it covers every signed-in page.
export function SocialLinksGate() {
  const { profile, signOut } = useAuth()
  const isCreator = profile?.role === 'INFLUENCER'
  const profileId = profile?.id

  const [needsLinks, setNeedsLinks] = useState(false)
  const [drafts, setDrafts] = useState<SocialLinkDraft[]>([{ platform: '', url: '' }])
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isCreator || !profileId) {
      setNeedsLinks(false)
      return
    }
    let active = true
    listSocialLinks(profileId)
      .then((links) => {
        if (active) setNeedsLinks(links.length === 0)
      })
      // A failed check must never lock someone out of the app.
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [isCreator, profileId])

  if (!needsLinks) return null

  const onSave = async () => {
    const parsed = validateSocialLinkDrafts(drafts)
    setErrors(parsed.errors)
    setFormError(parsed.formError)
    if (parsed.formError) return
    setSaving(true)
    try {
      await replaceSocialLinks(parsed.links)
      setNeedsLinks(false)
    } catch {
      setFormError('Could not save your links. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Add your social profile"
      subtitle="Businesses check your feed before they book you, so at least one link is required. It shows on your public profile."
    >
      <div className="space-y-4">
        {formError && <Alert kind="error">{formError}</Alert>}
        <SocialLinksFields value={drafts} onChange={setDrafts} errors={errors} disabled={saving} />
        <div className="flex items-center justify-between gap-3">
          <Button onClick={onSave} loading={saving}>
            Save and continue
          </Button>
          <Button variant="ghost" onClick={() => void signOut()} disabled={saving}>
            Sign out
          </Button>
        </div>
      </div>
    </Modal>
  )
}
