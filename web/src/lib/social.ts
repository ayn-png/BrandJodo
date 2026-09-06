import { PLATFORMS } from '@/lib/categories'
import type { Platform } from '@/lib/categories'

// URL handling for creator social links and business websites.
//
// Everything here ends up in an `href`. React escapes text but does NOT sanitise
// URLs, so `javascript:alert(1)` in an href executes on click — these functions
// are the only place a URL becomes trusted, and they reject every scheme except
// http and https. Pure and unit-tested; migration 0007 repeats the check in the
// database and safeExternalUrl() repeats it at the render site.

// Where a bare @handle gets expanded to, per platform.
export const PLATFORM_URL_BASE: Record<Platform, string> = {
  Instagram: 'https://instagram.com/',
  YouTube: 'https://youtube.com/@',
  TikTok: 'https://tiktok.com/@',
  Facebook: 'https://facebook.com/',
  'X (Twitter)': 'https://x.com/',
  LinkedIn: 'https://linkedin.com/in/',
  Snapchat: 'https://snapchat.com/add/',
  Pinterest: 'https://pinterest.com/',
}

const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i

// Parse a user-typed URL, adding https:// when no scheme was given. Returns null
// for anything that is not a well-formed http(s) URL with a dotted hostname.
function parseHttpUrl(input: string): URL | null {
  const raw = input.trim()
  if (!raw) return null
  const withScheme = SCHEME_RE.test(raw) ? raw : `https://${raw}`
  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return null
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
  // Rejects `https://mycafe/posts` and bare hostnames like localhost.
  if (!url.hostname.includes('.')) return null
  return url
}

// A creator's link for one platform. Accepts `@handle`, `handle`,
// `instagram.com/handle`, or a full URL; returns a canonical absolute URL, or
// null if the input cannot be trusted as one.
export function normalizeSocialUrl(platform: string, input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  // A handle, not a URL: no scheme, no path, no dot to suggest a hostname.
  const isHandle = raw.startsWith('@') || !/[./:]/.test(raw)
  if (isHandle) {
    const handle = raw.replace(/^@+/, '').trim()
    if (!handle || /[/\s?#]/.test(handle)) return null
    const base = PLATFORM_URL_BASE[platform as Platform] as string | undefined
    if (!base) return null
    return `${base}${encodeURIComponent(handle)}`
  }

  return parseHttpUrl(raw)?.toString() ?? null
}

// A business website. Same rules, minus the @handle shorthand.
export function normalizeWebsiteUrl(input: string): string | null {
  return parseHttpUrl(input)?.toString() ?? null
}

// Guard for a URL coming back out of the database on its way into an href.
// The columns are constrained and the write path normalises, so this only
// matters if either is ever loosened — which is exactly when it would matter.
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null
  const raw = value.trim()
  if (!SCHEME_RE.test(raw)) return null
  return parseHttpUrl(raw) ? raw : null
}

// Is this one of the platforms we know how to label?
export function isKnownPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value)
}
