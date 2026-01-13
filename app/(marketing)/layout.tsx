'use client'

import Link from 'next/link'
import { Cube, SignOut, Gear, Moon, Sun } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/lib/auth'
import { useTheme } from 'next-themes'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading, signOut } = useAuth()
  const { setTheme, resolvedTheme } = useTheme()

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'U'

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <nav className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-primary flex items-center justify-center">
              <Cube size={16} weight="fill" className="text-primary-foreground" />
            </div>
            <span className="font-semibold">AetherCore</span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Theme Toggle - Always visible */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center h-8 w-8 rounded-md border border-border/50 hover:bg-accent transition-colors"
              title={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {resolvedTheme === 'dark' ? (
                <Sun size={18} className="text-foreground" />
              ) : (
                <Moon size={18} className="text-foreground" />
              )}
            </button>

            {loading ? (
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            ) : user ? (
              <>
                <Link href="/documents">
                  <Button variant="ghost" size="sm">
                    Dashboard
                  </Button>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent transition-colors outline-none border border-border/50">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-medium">
                        {userInitials}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm hidden sm:inline font-medium">
                      {user.email?.split('@')[0]}
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <Gear size={14} className="mr-2" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => signOut()}>
                      <SignOut size={14} className="mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign in
                  </Button>
                </Link>
                <Link href="/documents">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Content */}
      <main className="flex-1">{children}</main>
    </div>
  )
}
