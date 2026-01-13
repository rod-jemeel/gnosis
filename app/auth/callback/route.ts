/**
 * Auth Callback Route
 *
 * Handles auth redirects from Supabase:
 * - Email confirmation (signup)
 * - Password reset
 * - Magic link login
 * - Email change confirmation
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/documents'

  // Handle code exchange (OAuth, magic link, etc.)
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // For password recovery, redirect to reset page
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }
      // For email change, redirect to settings
      if (type === 'email_change') {
        return NextResponse.redirect(`${origin}/settings?message=Email updated successfully`)
      }
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Handle token hash (for email confirmations)
  if (token_hash) {
    const supabase = await createClient()

    if (type === 'recovery') {
      // Password recovery - verify and redirect to reset page
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'recovery',
      })
      if (!error) {
        return NextResponse.redirect(`${origin}/reset-password`)
      }
    } else if (type === 'email') {
      // Email change confirmation
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'email_change',
      })
      if (!error) {
        return NextResponse.redirect(`${origin}/settings?message=Email updated successfully`)
      }
    } else if (type === 'signup') {
      // Signup confirmation
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: 'signup',
      })
      if (!error) {
        return NextResponse.redirect(`${origin}${next}`)
      }
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`)
}
