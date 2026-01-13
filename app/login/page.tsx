'use client'

/**
 * Login Page
 */

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Spinner, Cube, EnvelopeSimple, Lock, ArrowRight, MagicWand, Check } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

type LoginMethod = 'password' | 'magic-link'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/documents'

  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)

  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${redirect}`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setMagicLinkSent(true)
    setLoading(false)
  }

  // Magic link sent success state
  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-subtle" />
        </div>

        <div className="w-full max-w-md">
          <div className="flex justify-center mb-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-primary flex items-center justify-center">
                <Cube size={20} weight="fill" className="text-primary-foreground" />
              </div>
              <span className="text-2xl font-semibold">Gnosis</span>
            </Link>
          </div>

          <Card className="border-border/50 shadow-xl shadow-primary/5">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-14 h-14 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={28} className="text-emerald-500" weight="bold" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Check your email</h2>
              <p className="text-muted-foreground mb-6">
                We sent a sign-in link to<br />
                <strong className="text-foreground">{email}</strong>
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Click the link in the email to sign in. The link expires in 10 minutes.
              </p>
              <button
                onClick={() => {
                  setMagicLinkSent(false)
                  setEmail('')
                }}
                className="text-sm text-primary hover:underline"
              >
                Use a different email
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse-subtle" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse-subtle" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-primary flex items-center justify-center">
              <Cube size={20} weight="fill" className="text-primary-foreground" />
            </div>
            <span className="text-2xl font-semibold">Gnosis</span>
          </Link>
        </div>

        <Card className="border-border/50 shadow-xl shadow-primary/5">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription className="text-base">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Login Method Toggle */}
            <div className="flex mb-6 border border-border rounded-lg p-1 bg-muted/30">
              <button
                type="button"
                onClick={() => setLoginMethod('password')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium transition-all ${
                  loginMethod === 'password'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Lock size={16} />
                Password
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('magic-link')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium transition-all ${
                  loginMethod === 'magic-link'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MagicWand size={16} />
                Magic Link
              </button>
            </div>

            {loginMethod === 'password' ? (
              <form onSubmit={handleLogin} className="space-y-5">
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

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight size={18} className="ml-2" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleMagicLink} className="space-y-5">
                {error && (
                  <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="magic-email" className="text-sm font-medium">
                    Email address
                  </Label>
                  <div className="relative">
                    <EnvelopeSimple
                      size={18}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="magic-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                      className="pl-10 h-11"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We'll send you a sign-in link. No password needed.
                  </p>
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 text-base font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Spinner className="animate-spin mr-2" size={18} />
                      Sending link...
                    </>
                  ) : (
                    <>
                      <MagicWand size={18} className="mr-2" />
                      Send magic link
                    </>
                  )}
                </Button>
              </form>
            )}

            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card px-3 text-muted-foreground">
                  New to Gnosis?
                </span>
              </div>
            </div>

            <Link
              href="/signup"
              className="w-full h-11 mt-5 border border-border bg-background hover:bg-muted hover:text-foreground rounded-none text-xs font-medium inline-flex items-center justify-center transition-all"
            >
              Create an account
            </Link>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in, you agree to our{' '}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}
