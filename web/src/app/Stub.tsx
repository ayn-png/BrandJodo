import { Card } from '@/components/ui'

// Placeholder rendered by feature route stubs until a sub-agent fills the page in.
export function Stub({ title }: { title: string }) {
  return (
    <Card>
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <p className="mt-1 text-sm text-gray-500">Coming soon.</p>
    </Card>
  )
}
