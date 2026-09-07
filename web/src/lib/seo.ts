import { useEffect } from 'react'

// Per-page <title> for SEO/UX (SPA; the static index.html ships a default title).
// Also injects a meta description when provided. Workstream 5 SEO item.
export function usePageTitle(title: string, description?: string): void {
  useEffect(() => {
    document.title = title
    if (description) {
      const existing = document.querySelector('meta[name="description"]')
      if (existing) {
        existing.setAttribute('content', description)
      } else {
        const meta = document.createElement('meta')
        meta.name = 'description'
        meta.content = description
        document.head.appendChild(meta)
      }
    }
  }, [title, description])
}