import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { credentialsSchema } from '@/lib/validation'
import { Alert, Button, Card, Field, Input } from '@/components/ui'
import { collectZodErrors } from './formErrors'

export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const parsed = credentialsSchema.safeParse({ email, password })
    if (!parsed.success) {
      setErrors(collectZodErrors(parsed.error.issues))
      return
    }
    setErrors({})
    setSubmitting(true)
    try {
      await signIn(parsed.data.email, parsed.data.password)
      navigate(from, { replace: true })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not log in. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="font-display text-3xl font-semibold text-ink">Log in</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome back to BrandJodo.</p>
        <form className="mt-5 space-y-4" onSubmit={onSubmit} noValidate>
          {formError && <Alert kind="error">{formError}</Alert>}
          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          <Field label="Password" error={errors.password}>
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
          <Button type="submit" className="w-full" loading={submitting}>
            Log in
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          New to BrandJodo?{' '}
          <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700">
            Create an account
          </Link>
        </p>
      </Card>
    </div>
  )
}
