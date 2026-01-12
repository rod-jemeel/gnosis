'use client'

/**
 * Header Component
 *
 * Main navigation header with authentication state.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Files, Chat, Gear, Cube, SignIn, SignOut, User } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'

const navItems = [
  { href: '/documents', label: 'Documents', icon: Files },
  { href: '/chat', label: 'Chat', icon: Chat },
  { href: '/settings', label: 'Settings', icon: Gear },
]

export function Header() {
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Cube size={24} weight="duotone" className="text-primary" />
            <span>AetherCore</span>
          </Link>

          <div className="flex items-center gap-4">
            {/* Navigation - only show when authenticated */}
            {user && (
              <nav className="flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname.startsWith(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            )}

            {/* Auth section */}
            {!loading && (
              <div className="flex items-center gap-2">
                {user ? (
                  <>
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                      <User size={18} />
                      <span className="max-w-[150px] truncate">{user.email}</span>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <SignOut size={18} />
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <SignIn size={18} />
                    <span>Sign In</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
