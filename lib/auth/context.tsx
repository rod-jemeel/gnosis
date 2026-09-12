'use client'

/**
 * Auth Context
 *
 * Provides authentication state throughout the app. When Supabase is
 * configured, real Supabase sessions are used. Otherwise the app runs
 * in demo mode with a local, clearly-labeled demo identity so the
 * evidence workflow can be exercised without any backend.
 */

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'

export interface AppUser {
  id: string
  email: string | null
  isDemo: boolean
}

interface AuthContextType {
  user: AppUser | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  /** Supabase access token for backend calls; null in demo mode. */
  accessToken: string | null
  isDemo: boolean
}

const DEMO_USER: AppUser = {
  id: '00000000-0000-4000-8000-0000000000d0',
  email: 'demo@gnosis.local',
  isDemo: true,
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  accessToken: null,
  isDemo: false,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), [])
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured())

  useEffect(() => {
    if (!supabase) {
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const user: AppUser | null = supabase
    ? session?.user
      ? {
          id: session.user.id,
          email: session.user.email ?? null,
          isDemo: false,
        }
      : null
    : DEMO_USER

  const signOut = async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signOut,
        accessToken: session?.access_token ?? null,
        isDemo: !isSupabaseConfigured(),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
