'use client'

/**
 * App Sidebar
 *
 * Main navigation: menu (Chat, Documents, Diagnostics, Settings),
 * private chat sessions, document upload with stage-based progress,
 * and user controls.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Files,
  Chat,
  Gear,
  Cube,
  SignOut,
  CaretUpDown,
  House,
  CaretLineLeft,
  CaretLineRight,
  CloudArrowUp,
  Spinner,
  Check,
  Plus,
  Clock,
  Trash,
  Moon,
  Sun,
  Pulse,
  Warning,
} from '@phosphor-icons/react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/lib/auth'
import { useWorkspace } from '@/lib/workspace'
import { demoStore } from '@/lib/v2'
import type { ChatSessionSummary } from '@/lib/v2'
import { useDocumentUpload, STAGE_LABELS } from '@/components/documents/use-upload'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuAction,
  SidebarSeparator,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const navItems = [
  { href: '/', label: 'Home', icon: House },
  { href: '/chat', label: 'Chat', icon: Chat },
  { href: '/documents', label: 'Documents', icon: Files },
  { href: '/diagnostics', label: 'Diagnostics', icon: Pulse },
  { href: '/settings', label: 'Settings', icon: Gear },
]

// Sidebar Upload Dropzone: durable upload flow with stage-based state.
function SidebarUploadZone() {
  const router = useRouter()
  const { state } = useSidebar()
  const { workspace } = useWorkspace()
  const [dragActive, setDragActive] = useState(false)
  const { items, uploadFiles } = useDocumentUpload()
  const inputRef = useRef<HTMLInputElement>(null)

  const active = items[items.length - 1]
  const busy = active && (active.phase === 'uploading' || active.phase === 'ingesting')

  useEffect(() => {
    if (active?.phase === 'done') {
      const timer = setTimeout(() => router.push('/documents'), 800)
      return () => clearTimeout(timer)
    }
  }, [active?.phase, router])

  const handleFiles = useCallback(
    (files: FileList) => {
      if (!workspace) return
      void uploadFiles(files)
    },
    [uploadFiles, workspace]
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)
      if (e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const isCollapsed = state === 'collapsed'

  const statusText = () => {
    if (!active) return dragActive ? 'Drop PDF' : 'Upload PDF'
    if (active.phase === 'uploading') return 'Uploading bytes…'
    if (active.phase === 'ingesting') {
      return active.buildStage
        ? STAGE_LABELS[active.buildStage]
        : 'Starting ingestion…'
    }
    if (active.phase === 'done') return 'Indexed'
    return active.error ?? 'Failed'
  }

  return (
    <SidebarGroup className="px-2 py-0">
      <input
        type="file"
        accept="application/pdf"
        multiple
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files)
          e.target.value = ''
        }}
        className="hidden"
        id="sidebar-file-upload"
        ref={inputRef}
      />
      <label
        htmlFor="sidebar-file-upload"
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer border border-dashed transition-all',
          isCollapsed
            ? 'aspect-square items-center justify-center p-2'
            : 'flex-col items-center gap-1 px-3 py-2',
          dragActive
            ? 'border-primary bg-primary/10'
            : 'border-sidebar-border hover:border-primary/50 hover:bg-sidebar-accent/50',
          busy && 'pointer-events-none'
        )}
      >
        {active && active.phase !== 'done' ? (
          active.phase === 'error' ? (
            <Warning size={isCollapsed ? 16 : 18} weight="fill" className="text-destructive" />
          ) : (
            <Spinner size={isCollapsed ? 16 : 18} className="animate-spin text-primary" />
          )
        ) : active?.phase === 'done' ? (
          <Check size={isCollapsed ? 16 : 18} className="text-emerald-500" weight="bold" />
        ) : (
          <CloudArrowUp
            size={isCollapsed ? 16 : 18}
            weight="duotone"
            className={cn(
              'transition-colors',
              dragActive ? 'text-primary' : 'text-muted-foreground'
            )}
          />
        )}
        {!isCollapsed && (
          <span
            className={cn(
              'text-center text-[10px]',
              active?.phase === 'error' ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {statusText()}
          </span>
        )}
      </label>
    </SidebarGroup>
  )
}

// Chat History Section: the caller's private sessions.
function SidebarChatHistory() {
  const router = useRouter()
  const pathname = usePathname()
  const { state } = useSidebar()
  const { client, workspace, loading: wsLoading } = useWorkspace()
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const workspaceRef = useRef(workspace)
  workspaceRef.current = workspace

  const demoVersion = useSyncExternalStore(
    demoStore.subscribe,
    () => demoStore.version,
    () => 0
  )

  const fetchSessions = useCallback(async () => {
    const ws = workspaceRef.current
    if (!ws) {
      setLoading(false)
      return
    }
    try {
      const page = await client.listSessions(ws.id)
      setSessions(page.items.slice(0, 6))
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    if (!wsLoading) void fetchSessions()
  }, [wsLoading, fetchSessions, pathname])

  useEffect(() => {
    if (demoVersion > 0) void fetchSessions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoVersion])

  const handleNewChat = () => {
    router.push('/chat')
  }

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const ws = workspaceRef.current
    if (!ws) return
    try {
      await client.deleteSession(ws.id, id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
    } catch {
      // Session already gone.
    }
  }

  const isCollapsed = state === 'collapsed'

  if (isCollapsed) {
    return (
      <SidebarGroup className="py-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleNewChat} tooltip="New Chat">
              <Plus size={18} />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup className="py-0">
      <SidebarGroupLabel className="text-[10px]">Chats</SidebarGroupLabel>
      <SidebarGroupAction title="New Chat" onClick={handleNewChat}>
        <Plus size={14} />
      </SidebarGroupAction>
      <SidebarGroupContent>
        <SidebarMenu>
          {loading || wsLoading ? (
            <SidebarMenuItem>
              <SidebarMenuButton disabled>
                <Spinner size={14} className="animate-spin" />
                <span className="text-muted-foreground">Loading…</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : sessions.length === 0 ? (
            <SidebarMenuItem>
              <SidebarMenuButton onClick={handleNewChat}>
                <Chat size={16} />
                <span className="text-muted-foreground">Start a new chat</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            sessions.map((session) => {
              const sessionPath = `/chat/${session.id}`
              const isActive = pathname === sessionPath
              return (
                <SidebarMenuItem key={session.id}>
                  <SidebarMenuButton
                    render={<Link href={sessionPath} />}
                    isActive={isActive}
                    className="pr-8"
                  >
                    <Clock size={14} className="shrink-0 text-muted-foreground" />
                    <span className="truncate text-xs">{session.title}</span>
                  </SidebarMenuButton>
                  <SidebarMenuAction
                    onClick={(e) => void handleDeleteSession(session.id, e)}
                    showOnHover
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash size={12} />
                  </SidebarMenuAction>
                </SidebarMenuItem>
              )
            })
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

// Toggle Button Component
function SidebarToggle() {
  const { toggleSidebar, state } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <button
      type="button"
      onClick={toggleSidebar}
      className={cn(
        'flex h-6 w-6 items-center justify-center text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground',
        isCollapsed && 'mx-auto'
      )}
      title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {isCollapsed ? <CaretLineRight size={14} /> : <CaretLineLeft size={14} />}
    </button>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()
  const { state } = useSidebar()
  const { setTheme, resolvedTheme } = useTheme()

  const userInitials = user?.email ? user.email.substring(0, 2).toUpperCase() : 'U'
  const isCollapsed = state === 'collapsed'

  return (
    <Sidebar collapsible="icon">
      {/* Header - Logo & Toggle */}
      <SidebarHeader className={cn('flex-row items-center py-2', isCollapsed ? 'justify-center px-0' : 'justify-between')}>
        {isCollapsed ? (
          <Link href="/" className="flex items-center justify-center" title="Gnosis">
            <div className="flex aspect-square size-7 items-center justify-center bg-primary text-primary-foreground">
              <Cube size={16} weight="fill" />
            </div>
          </Link>
        ) : (
          <>
            <SidebarMenu className="flex-1">
              <SidebarMenuItem>
                <SidebarMenuButton size="default" render={<Link href="/" />} tooltip="Gnosis">
                  <div className="flex aspect-square size-6 shrink-0 items-center justify-center bg-primary text-primary-foreground">
                    <Cube size={14} weight="fill" />
                  </div>
                  <span className="text-xs font-semibold">Gnosis</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
            <SidebarToggle />
          </>
        )}
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent>
        <SidebarGroup className="py-0">
          <SidebarGroupLabel className="text-[10px]">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                      tooltip={item.label}
                    >
                      <Icon size={16} weight={isActive ? 'fill' : 'regular'} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-1" />

        {/* Chat History */}
        <SidebarChatHistory />
      </SidebarContent>

      {/* Footer - Upload Zone & User */}
      <SidebarFooter className="py-2">
        {isCollapsed && <SidebarToggle />}

        {/* Upload Zone */}
        <SidebarUploadZone />

        <SidebarSeparator className="my-1" />

        {!loading && user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="default"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    />
                  }
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate text-xs font-medium">
                    {user.email?.split('@')[0]}
                  </span>
                  <CaretUpDown size={12} className="ml-auto text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-44" side="top" align="start" sideOffset={4}>
                  <DropdownMenuItem render={<Link href="/settings" />}>
                    <Gear size={14} className="mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
                    {resolvedTheme === 'dark' ? (
                      <Sun size={14} className="mr-2" />
                    ) : (
                      <Moon size={14} className="mr-2" />
                    )}
                    {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      if (user.isDemo) {
                        routerReset()
                      } else {
                        void signOut()
                      }
                    }}
                  >
                    <SignOut size={14} className="mr-2" />
                    {user.isDemo ? 'Reset demo data' : 'Sign out'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        )}

        {!loading && !user && (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton render={<Link href="/login" />}>
                <SignOut size={16} />
                <span>Sign In</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

function routerReset() {
  demoStore.reset()
  window.location.href = window.location.origin + '/documents'
}
