import { cookies } from 'next/headers'
import { AppSidebar } from '@/components/layout'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { WorkspaceProvider } from '@/lib/workspace'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get('sidebar_state')?.value === 'true'

  return (
    <WorkspaceProvider>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset>
          <main className="h-svh overflow-hidden">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </WorkspaceProvider>
  )
}
