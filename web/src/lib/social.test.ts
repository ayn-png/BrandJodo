import { normalizeSocialUrl, normalizeWebsiteUrl, safeExternalUrl } from '@/lib/social'

describe('normalizeSocialUrl', () => {
  it('expands a bare handle using the platform base', () => {
    expect(normalizeSocialUrl('Instagram', 'sunrisecafe')).toBe('https://instagram.com/sunrisecafe')
    expect(normalizeSocialUrl('Instagram', '@sunrisecafe')).toBe('https://instagram.com/sunrisecafe')
    expect(normalizeSocialUrl('YouTube', '@meera')).toBe('https://youtube.com/@meera')
    expect(normalizeSocialUrl('LinkedIn', 'meera-s')).toBe('https://linkedin.com/in/meera-s')
  })

  it('accepts a bare domain and adds https', () => {
    expect(normalizeSocialUrl('Instagram', 'instagram.com/sunrisecafe')).toBe(
      'https://instagram.com/sunrisecafe',
    )
  })

  it('keeps a full http(s) URL', () => {
    expect(normalizeSocialUrl('Instagram', 'https://www.instagram.com/sunrisecafe/')).toBe(
      'https://www.instagram.com/sunrisecafe/',
    )
    expect(normalizeSocialUrl('Facebook', 'http://facebook.com/cafe')).toBe(
      'http://facebook.com/cafe',
    )
  })

  // The value is rendered as an href and React does not sanitise URLs.
  it('rejects every scheme except http and https', () => {
    expect(normalizeSocialUrl('Instagram', 'javascript:alert(1)')).toBeNull()
    expect(normalizeSocialUrl('Instagram', 'JavaScript:alert(1)')).toBeNull()
    expect(normalizeSocialUrl('Instagram', 'data:text/html;base64,PHNjcmlwdD4=')).toBeNull()
    expect(normalizeSocialUrl('Instagram', 'vbscript:msgbox(1)')).toBeNull()
    expect(normalizeSocialUrl('Instagram', 'file:///etc/passwd')).toBeNull()
  })

  it('rejects empty, malformed, and hostless input', () => {
    expect(normalizeSocialUrl('Instagram', '')).toBeNull()
    expect(normalizeSocialUrl('Instagram', '   ')).toBeNull()
    expect(normalizeSocialUrl('Instagram', 'https://')).toBeNull()
    // No dot in the hostname — not a real site.
    expect(normalizeSocialUrl('Instagram', 'mycafe/posts')).toBeNull()
  })

  it('rejects a handle on a platform it has no base for', () => {
    expect(normalizeSocialUrl('Myspace', 'sunrisecafe')).toBeNull()
  })

  it('rejects a handle that is really a path', () => {
    expect(normalizeSocialUrl('Instagram', '@cafe/../admin')).toBeNull()
  })
})

describe('normalizeWebsiteUrl', () => {
  it('adds https to a bare domain', () => {
    expect(normalizeWebsiteUrl('sunrisecafe.in')).toBe('https://sunrisecafe.in/')
    expect(normalizeWebsiteUrl('  www.sunrisecafe.in/menu  ')).toBe(
      'https://www.sunrisecafe.in/menu',
    )
  })

  it('has no @handle shorthand', () => {
    expect(normalizeWebsiteUrl('sunrisecafe')).toBeNull()
    expect(normalizeWebsiteUrl('@sunrisecafe')).toBeNull()
  })

  it('rejects non-http schemes', () => {
    expect(normalizeWebsiteUrl('javascript:alert(1)')).toBeNull()
  })
})

describe('safeExternalUrl', () => {
  it('passes through a stored http(s) URL unchanged', () => {
    expect(safeExternalUrl('https://instagram.com/sunrisecafe')).toBe(
      'https://instagram.com/sunrisecafe',
    )
  })

  it('returns null for anything not safe to put in an href', () => {
    expect(safeExternalUrl(null)).toBeNull()
    expect(safeExternalUrl(undefined)).toBeNull()
    expect(safeExternalUrl('')).toBeNull()
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull()
    // Never upgrades a schemeless value — we only ever store absolute URLs.
    expect(safeExternalUrl('instagram.com/sunrisecafe')).toBeNull()
  })
})
