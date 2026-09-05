import type { ReactNode } from 'react'

// Small presentational helper shared by the Privacy and Terms pages so headings
// and body copy stay consistent. Static content only — no user input.
export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-gray-900">{heading}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-gray-600">{children}</div>
    </section>
  )
}
