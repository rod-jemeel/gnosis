/**
 * Supabase Browser Client
 *
 * For use in client components. Supabase is optional: when the public
 * URL/key are not configured the app runs in demo mode with a local
 * identity and no calls are made to Supabase.
 */

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export function createClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
