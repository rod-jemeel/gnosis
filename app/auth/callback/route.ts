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

  const supabase = await createClient()

  // Handle code exchange (OAuth, magic link with PKCE, etc.)
  if (code) {
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

  // Handle token hash (for email confirmations and magic links)
  if (token_hash) {
    // Map URL type to Supabase OTP type
    const otpTypeMap: Record<string, 'recovery' | 'email_change' | 'signup' | 'magiclink' | 'email'> = {
      'recovery': 'recovery',
      'email': 'email_change',
      'email_change': 'email_change',
      'signup': 'signup',
      'magiclink': 'magiclink',
    }

    const otpType = type ? otpTypeMap[type] : 'magiclink' // Default to magiclink if no type

    if (otpType) {
      const { error } = await supabase.auth.verifyOtp({
        token_hash,
        type: otpType,
      })

      if (!error) {
        if (otpType === 'recovery') {
          return NextResponse.redirect(`${origin}/reset-password`)
        }
        if (otpType === 'email_change') {
          return NextResponse.redirect(`${origin}/settings?message=Email updated successfully`)
        }
        return NextResponse.redirect(`${origin}${next}`)
      }

      // If magiclink failed, try as email (some Supabase versions use 'email' type)
      if (otpType === 'magiclink') {
        const { error: emailError } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'email',
        })
        if (!emailError) {
          return NextResponse.redirect(`${origin}${next}`)
        }
      }
    }
  }

  // Return to login with error
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`)
}
