import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { credentialsSchema } from '@/lib/validation'
import { Alert, Button, Card, Field, Input } from '@/components/ui'
import { collectZodErrors } from './formErrors'

export function SignupPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState(false)

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
      await signUp(parsed.data.email, parsed.data.password)
      // signUp() resolves after the auth client has stored any new session.
      // If a session exists, sign-in is immediate — go finish the profile.
      // Otherwise email confirmation is required, so prompt the user to verify.
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        navigate('/onboarding', { replace: true })
      } else {
        setConfirmEmail(true)
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not sign up. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h1 className="font-display text-3xl font-semibold text-ink">Create your account</h1>
        <p className="mt-1 text-sm text-gray-500">
          Book local creators or start earning — set up in minutes.
        </p>

        {confirmEmail ? (
          <div className="mt-5 space-y-4">
            <Alert kind="success">
              Almost there! We sent a confirmation link to {email}. Verify your email, then log in
              to finish setting up your profile.
            </Alert>
            <Link to="/login">
              <Button variant="secondary" className="w-full">
                Go to log in
              </Button>
            </Link>
          </div>
        ) : (
          <>
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
              <Field
                label="Password"
                error={errors.password}
                hint="At least 8 characters."
              >
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
              <Button type="submit" className="w-full" loading={submitting}>
                Sign up
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Log in
              </Link>
            </p>
          </>
        )}
      </Card>
    </div>
  )
}
