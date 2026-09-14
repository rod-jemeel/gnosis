'use client'

/**
 * Document upload flow (spec §11.1, DOC-01/DOC-02).
 *
 * Three durable steps: create an upload session, transfer bytes, then
 * confirm — which creates the immutable version and requests
 * ingestion. Progress is reported by actual stage, never an invented
 * percentage: byte transfer is shown separately from parsing/indexing.
 */

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { demoStore } from '@/lib/v2'
import type { BuildState } from '@/lib/v2'
import { useWorkspace } from '@/lib/workspace'

export interface UploadItem {
  id: string
  fileName: string
  phase: 'uploading' | 'ingesting' | 'done' | 'error'
  /** Current ingestion build stage, when known. */
  buildStage: BuildState | null
  buildId: string | null
  error: string | null
}

export function useDocumentUpload() {
  const { client, workspace } = useWorkspace()
  const [items, setItems] = useState<UploadItem[]>([])
  const demoVersion = useSyncExternalStore(
    demoStore.subscribe,
    () => demoStore.version,
    () => 0
  )
  const workspaceRef = useRef(workspace)
  workspaceRef.current = workspace

  // Track ingestion stages for in-flight demo builds.
  useEffect(() => {
    if (demoVersion === 0) return
    const ws = workspaceRef.current
    if (!ws) return
    setItems((prev) => {
      if (prev.length === 0) return prev
      let changed = false
      const state = demoStore.getState()
      const next = prev.map((item) => {
        if (item.phase !== 'ingesting' || !item.buildId) return item
        const doc = state.documents.find((d) =>
          d.builds.some((b) => b.id === item.buildId)
        )
        const build = doc?.builds.find((b) => b.id === item.buildId)
        if (!build) return item
        if (build.state === 'ready' || doc?.activeBuildId === build.id) {
          changed = true
          return { ...item, phase: 'done' as const, buildStage: build.state }
        }
        if (build.state === 'failed') {
          changed = true
          return {
            ...item,
            phase: 'error' as const,
            buildStage: build.state,
            error: build.error ?? 'The build failed.',
          }
        }
        if (build.state !== item.buildStage) {
          changed = true
          return { ...item, buildStage: build.state }
        }
        return item
      })
      return changed ? next : prev
    })
  }, [demoVersion])

  const uploadFiles = useCallback(
    async (files: File[] | FileList) => {
      const ws = workspaceRef.current
      if (!ws) return
      const list = Array.from(files).filter(
        (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
      )
      for (const file of list) {
        const itemId = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        setItems((prev) => [
          ...prev,
          { id: itemId, fileName: file.name, phase: 'uploading', buildStage: null, buildId: null, error: null },
        ])
        try {
          const session = await client.createUpload(ws.id, {
            fileName: file.name,
            sizeBytes: file.size,
            contentType: 'application/pdf',
          })
          await client.uploadFile(session, file)
          setItems((prev) =>
            prev.map((i) => (i.id === itemId ? { ...i, phase: 'ingesting' } : i))
          )
          const accepted = await client.confirmUpload(ws.id, session.id, {
            idempotencyKey: `${itemId}`,
          })
          setItems((prev) =>
            prev.map((i) =>
              i.id === itemId ? { ...i, buildId: accepted.buildId } : i
            )
          )
        } catch (err) {
          setItems((prev) =>
            prev.map((i) =>
              i.id === itemId
                ? {
                    ...i,
                    phase: 'error',
                    error: err instanceof Error ? err.message : 'Upload failed.',
                  }
                : i
            )
          )
        }
      }
    },
    [client]
  )

  const clearFinished = useCallback(() => {
    setItems((prev) => prev.filter((i) => i.phase === 'ingesting' || i.phase === 'uploading'))
  }, [])

  return { items, uploadFiles, clearFinished }
}

/** Human labels for ingestion stages shown during upload. */
export const STAGE_LABELS: Record<BuildState, string> = {
  queued: 'Queued',
  validating_source: 'Validating source',
  parsing: 'Extracting text',
  chunking: 'Chunking',
  embedding: 'Embedding',
  indexing: 'Indexing vectors',
  checking_readiness: 'Verifying index',
  ready: 'Ready',
  retry_wait: 'Waiting to retry',
  failed: 'Failed',
  cancelled: 'Cancelled',
  superseded: 'Superseded',
}
