'use client'

/**
 * Forgot Password Page
 *
 * Allows users to request a password reset email.
 */

import { useState } from 'react'
import Link from 'next/link'
import { Spinner, Cube, EnvelopeSimple, ArrowLeft, Check } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    if (!supabase) {
      setError('Authentication is not configured — this deployment runs in demo mode.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-subtle" />
        </div>

        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md group-hover:bg-primary/30 transition-colors" />
                <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                  <Cube size={24} weight="fill" className="text-white" />
                </div>
              </div>
              <span className="text-2xl font-bold">Gnosis</span>
            </Link>
          </div>

          <Card className="border-border/50 shadow-xl shadow-primary/5">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={28} className="text-emerald-500" weight="bold" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Check your email</h2>
              <p className="text-muted-foreground mb-6">
                We sent a password reset link to<br />
                <strong className="text-foreground">{email}</strong>
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Click the link in the email to reset your password. The link expires in 24 hours.
              </p>
              <Link
                href="/login"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                <ArrowLeft size={14} />
                Back to sign in
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-xl blur-md group-hover:bg-primary/30 transition-colors" />
              <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg">
                <Cube size={24} weight="fill" className="text-white" />
              </div>
            </div>
            <span className="text-2xl font-bold">Gnosis</span>
          </Link>
        </div>

        <Card className="border-border/50 shadow-xl shadow-primary/5">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">Forgot password?</CardTitle>
            <CardDescription className="text-base">
              Enter your email and we&apos;ll send you a reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email address
                </Label>
                <div className="relative">
                  <EnvelopeSimple
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10 h-11"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner className="animate-spin mr-2" size={18} />
                    Sending...
                  </>
                ) : (
                  'Send reset link'
                )}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  <ArrowLeft size={14} />
                  Back to sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
