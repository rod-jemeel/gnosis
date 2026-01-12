'use client'

/**
 * App Sidebar
 *
 * Main navigation sidebar with document upload, chat history, and user controls.
 */

import { useState, useCallback, useEffect } from 'react'
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
} from '@phosphor-icons/react'
import { useTheme } from 'next-themes'
import { useAuth } from '@/lib/auth'
import {
  uploadDocument,
  waitForDocumentReady,
  listChatSessions,
  createChatSession,
  deleteChatSession,
} from '@/lib/api'
import { ChatSession } from '@/lib/types'
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
  { href: '/documents', label: 'Documents', icon: Files },
  { href: '/settings', label: 'Settings', icon: Gear },
]

// Sidebar Upload Dropzone
function SidebarUploadZone() {
  const router = useRouter()
  const { state } = useSidebar()
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'done'>('idle')

  const handleFiles = useCallback(
    async (files: FileList) => {
      const pdfFiles = Array.from(files).filter((f) => f.type === 'application/pdf')
      if (pdfFiles.length === 0) return

      setUploading(true)
      setUploadStatus('uploading')

      try {
        for (const file of pdfFiles) {
          const result = await uploadDocument(file)
          setUploadStatus('processing')
          await waitForDocumentReady(result.documentId)
        }
        setUploadStatus('done')
        setTimeout(() => {
          setUploadStatus('idle')
          setUploading(false)
          router.push('/documents')
          router.refresh()
        }, 1000)
      } catch (error) {
        console.error('Upload failed:', error)
        setUploadStatus('idle')
        setUploading(false)
      }
    },
    [router]
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

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files)
      }
    },
    [handleFiles]
  )

  const isCollapsed = state === 'collapsed'

  return (
    <SidebarGroup className="px-2 py-0">
      <input
        type="file"
        accept="application/pdf"
        multiple
        onChange={handleInputChange}
        className="hidden"
        id="sidebar-file-upload"
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
            : 'flex-col items-center gap-1 py-2 px-3',
          dragActive
            ? 'border-primary bg-primary/10'
            : 'border-sidebar-border hover:border-primary/50 hover:bg-sidebar-accent/50',
          uploading && 'pointer-events-none'
        )}
      >
        {uploading ? (
          <>
            {uploadStatus === 'done' ? (
              <Check size={isCollapsed ? 16 : 18} className="text-emerald-500" weight="bold" />
            ) : (
              <Spinner size={isCollapsed ? 16 : 18} className="animate-spin text-primary" />
            )}
            {!isCollapsed && (
              <span className="text-[10px] text-muted-foreground">
                {uploadStatus === 'uploading' && 'Uploading...'}
                {uploadStatus === 'processing' && 'Processing...'}
                {uploadStatus === 'done' && 'Done!'}
              </span>
            )}
          </>
        ) : (
          <>
            <CloudArrowUp
              size={isCollapsed ? 16 : 18}
              weight="duotone"
              className={cn(
                'transition-colors',
                dragActive ? 'text-primary' : 'text-muted-foreground'
              )}
            />
            {!isCollapsed && (
              <span className="text-[10px] text-muted-foreground text-center">
                {dragActive ? 'Drop PDF' : 'Upload PDF'}
              </span>
            )}
          </>
        )}
      </label>
    </SidebarGroup>
  )
}

// Chat History Section
function SidebarChatHistory() {
  const router = useRouter()
  const pathname = usePathname()
  const { state } = useSidebar()
  const { workspaceId, loading: authLoading } = useAuth()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch sessions from database
  const fetchSessions = useCallback(async () => {
    if (!workspaceId) {
      setLoading(false)
      return
    }
    try {
      const result = await listChatSessions(5, 0)
      setSessions(result.data)
    } catch (error) {
      // Silently fail - API might not be available yet
      console.error('Failed to load chat sessions:', error)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    if (!authLoading) {
      if (workspaceId) {
        fetchSessions()
      } else {
        setLoading(false)
      }
    }
  }, [authLoading, workspaceId, fetchSessions, pathname])

  const handleNewChat = async () => {
    if (!workspaceId) {
      router.push('/chat')
      return
    }
    try {
      await createChatSession({ title: 'New Chat' })
      await fetchSessions()
      router.push('/chat')
    } catch (error) {
      console.error('Failed to create chat session:', error)
      router.push('/chat')
    }
  }

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    try {
      await deleteChatSession(id)
      setSessions((prev) => prev.filter((s) => s.id !== id))
    } catch (error) {
      console.error('Failed to delete chat session:', error)
    }
  }

  const isCollapsed = state === 'collapsed'

  if (isCollapsed) {
    return (
      <SidebarGroup className="py-0">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="New Chat"
              onClick={handleNewChat}
            >
              <Plus size={18} />
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={<Link href="/chat" />}
              isActive={pathname === '/chat'}
              tooltip="Chat"
            >
              <Chat size={18} weight={pathname === '/chat' ? 'fill' : 'regular'} />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup className="py-0">
      <SidebarGroupLabel className="text-[10px]">
        Chat History
      </SidebarGroupLabel>
      <SidebarGroupAction title="New Chat" onClick={handleNewChat}>
        <Plus size={14} />
      </SidebarGroupAction>
      <SidebarGroupContent>
        <SidebarMenu>
          {loading || authLoading ? (
            <SidebarMenuItem>
              <SidebarMenuButton disabled>
                <Spinner size={14} className="animate-spin" />
                <span className="text-muted-foreground">Loading...</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : sessions.length === 0 ? (
            <SidebarMenuItem>
              <SidebarMenuButton
                render={<Link href="/chat" />}
                isActive={pathname === '/chat'}
              >
                <Chat size={16} />
                <span className="text-muted-foreground">Start a new chat</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            sessions.map((session) => (
              <SidebarMenuItem key={session.id}>
                <SidebarMenuButton
                  render={<Link href="/chat" />}
                  isActive={pathname === '/chat'}
                  className="pr-8"
                >
                  <Clock size={14} className="shrink-0 text-muted-foreground" />
                  <span className="truncate text-xs">{session.title}</span>
                </SidebarMenuButton>
                <SidebarMenuAction
                  onClick={(e) => handleDeleteSession(session.id, e)}
                  showOnHover
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash size={12} />
                </SidebarMenuAction>
              </SidebarMenuItem>
            ))
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
      onClick={toggleSidebar}
      className={cn(
        'flex items-center justify-center h-6 w-6 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors',
        isCollapsed && 'mx-auto'
      )}
      title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      {isCollapsed ? (
        <CaretLineRight size={14} />
      ) : (
        <CaretLineLeft size={14} />
      )}
    </button>
  )
}

export function AppSidebar() {
  const pathname = usePathname()
  const { user, loading, signOut } = useAuth()
  const { state } = useSidebar()
  const { setTheme, resolvedTheme } = useTheme()

  const handleSignOut = async () => {
    await signOut()
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'U'

  const isCollapsed = state === 'collapsed'

  return (
    <Sidebar collapsible="icon">
      {/* Header - Logo & Toggle */}
      <SidebarHeader className="flex-row items-center justify-between py-2">
        <SidebarMenu className="flex-1">
          <SidebarMenuItem>
            <SidebarMenuButton size="default" render={<Link href="/" />}>
              <div className="flex aspect-square size-6 items-center justify-center bg-primary text-primary-foreground">
                <Cube size={14} weight="fill" />
              </div>
              <span className="font-semibold text-xs">AetherCore</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!isCollapsed && <SidebarToggle />}
      </SidebarHeader>

      {/* Main Navigation */}
      <SidebarContent>
        <SidebarGroup className="py-0">
          <SidebarGroupLabel className="text-[10px]">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href)

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
                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate font-medium text-xs">
                    {user.email?.split('@')[0]}
                  </span>
                  <CaretUpDown size={12} className="ml-auto text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="min-w-44"
                  side="top"
                  align="start"
                  sideOffset={4}
                >
                  <DropdownMenuItem render={<Link href="/settings" />}>
                    <Gear size={14} className="mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={toggleTheme}>
                    {resolvedTheme === 'dark' ? (
                      <Sun size={14} className="mr-2" />
                    ) : (
                      <Moon size={14} className="mr-2" />
                    )}
                    {resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <SignOut size={14} className="mr-2" />
                    Sign out
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
