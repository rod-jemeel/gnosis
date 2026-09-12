'use client'

/**
 * Workspace context.
 *
 * Resolves the client (live HTTP or demo) and the active workspace,
 * and exposes a version counter that increments whenever demo state
 * mutates so lists re-render while builds progress.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useSyncExternalStore } from 'react'
import { useAuth } from '@/lib/auth'
import { createGnosisClient, demoStore, isLiveApiConfigured } from '@/lib/v2'
import type { GnosisClient, Workspace } from '@/lib/v2'

interface WorkspaceContextType {
  client: GnosisClient
  workspace: Workspace | null
  loading: boolean
  isDemo: boolean
  error: string | null
  refresh: () => Promise<void>
}

const WorkspaceContext = createContext<WorkspaceContextType>({
  client: null as unknown as GnosisClient,
  workspace: null,
  loading: true,
  isDemo: true,
  error: null,
  refresh: async () => {},
})

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { accessToken, loading: authLoading } = useAuth()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Keep the token current without recreating the client on refresh.
  const tokenRef = useRef<string | null>(accessToken)
  tokenRef.current = accessToken
  const client = useMemo(() => createGnosisClient(() => tokenRef.current), [])

  // Live updates for demo-mode state changes (build stages, runs).
  const demoVersion = useSyncExternalStore(
    demoStore.subscribe,
    () => demoStore.version,
    () => 0
  )

  const load = useCallback(async () => {
    if (authLoading) return
    try {
      const workspaces = await client.listWorkspaces()
      if (workspaces.length === 0) {
        setError('No workspace is available for this account.')
        setWorkspace(null)
        return
      }
      const detail = await client.getWorkspace(workspaces[0].id)
      setError(null)
      setWorkspace(detail)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load workspace.')
    } finally {
      setLoading(false)
    }
  }, [client, authLoading])

  useEffect(() => {
    void load()
  }, [load])

  // Re-sync workspace stats when demo state changes.
  useEffect(() => {
    if (!isLiveApiConfigured() && !loading && workspace) {
      void load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoVersion])

  return (
    <WorkspaceContext.Provider
      value={{
        client,
        workspace,
        loading: authLoading || loading,
        isDemo: !isLiveApiConfigured(),
        error,
        refresh: load,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  return useContext(WorkspaceContext)
}
