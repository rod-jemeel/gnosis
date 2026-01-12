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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

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

  // Get user initials for avatar
  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'U'

  return (
    <header className="border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold group"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md group-hover:bg-primary/30 transition-colors" />
              <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-sm">
                <Cube size={20} weight="fill" className="text-white" />
              </div>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              AetherCore
            </span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Navigation - only show when authenticated */}
            {user && (
              <nav className="hidden sm:flex items-center bg-muted/50 rounded-full p-1 mr-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname.startsWith(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200',
                        isActive
                          ? 'bg-background text-primary shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                      )}
                    >
                      <Icon size={18} weight={isActive ? 'fill' : 'regular'} />
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            )}

            {/* Mobile nav */}
            {user && (
              <nav className="flex sm:hidden items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname.startsWith(item.href)

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'p-2 rounded-lg transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                      )}
                      title={item.label}
                    >
                      <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                    </Link>
                  )
                })}
              </nav>
            )}

            {/* Auth section */}
            {!loading && (
              <div className="flex items-center gap-2">
                {user ? (
                  <div className="flex items-center">
                    {/* User info */}
                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 mr-2">
                      <Avatar className="w-7 h-7 bg-primary/10 text-primary">
                        <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground max-w-[120px] truncate">
                        {user.email}
                      </span>
                    </div>

                    {/* Sign out button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSignOut}
                      className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                      <SignOut size={18} />
                      <span className="hidden sm:inline">Sign Out</span>
                    </Button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="gap-2 shadow-sm h-7 px-2.5 rounded-none bg-primary text-primary-foreground text-xs font-medium inline-flex items-center justify-center transition-all"
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
