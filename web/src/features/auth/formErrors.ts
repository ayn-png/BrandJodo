// Map Zod issues to the first message per top-level field, for inline display.
// Structural param type keeps this decoupled from Zod's exported type names.
type FieldIssue = { path: PropertyKey[]; message: string }

export function collectZodErrors(issues: readonly FieldIssue[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of issues) {
    const key = issue.path[0]
    if (typeof key === 'string' && !(key in out)) out[key] = issue.message
  }
  return out
}
