'use client'

/**
 * Documents page (spec §6.2).
 *
 * Lists logical documents with their active revision and build state,
 * pending replacements, upload with real stage-based progress, and
 * lifecycle actions. Failed replacements never make the working
 * revision look failed.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  ArrowClockwise,
  CloudArrowUp,
  Files,
  Spinner,
  Warning,
  Check,
} from '@phosphor-icons/react'
import { DocumentCard, useDocumentUpload, STAGE_LABELS } from '@/components/documents'
import { TagBadge } from '@/components/documents/tag-badge'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useWorkspace } from '@/lib/workspace'
import { demoStore } from '@/lib/v2'
import type { DocumentSummary } from '@/lib/v2'
import { cn } from '@/lib/utils'

export default function DocumentsPage() {
  const { client, workspace, loading: wsLoading } = useWorkspace()
  const { items: uploads, uploadFiles, clearFinished } = useDocumentUpload()

  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DocumentSummary | null>(null)
  const [deleting, setDeleting] = useState(false)
  const uploadInputRef = useRef<HTMLInputElement>(null)

  // Live updates when demo builds progress or documents change.
  const demoVersion = useSyncExternalStore(
    demoStore.subscribe,
    () => demoStore.version,
    () => 0
  )

  const load = useCallback(async () => {
    if (!workspace) return
    try {
      const page = await client.listDocuments(workspace.id)
      setDocuments(page.items)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load documents.')
    } finally {
      setLoading(false)
    }
  }, [client, workspace])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (demoVersion > 0) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoVersion])

  // Refresh list after uploads finish.
  const hasActiveUploads = uploads.some((u) => u.phase !== 'done' && u.phase !== 'error')
  useEffect(() => {
    if (!hasActiveUploads) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveUploads])

  const tags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const doc of documents) {
      for (const tag of doc.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [documents])

  const filtered = useMemo(
    () => (selectedTag ? documents.filter((d) => d.tags.includes(selectedTag)) : documents),
    [documents, selectedTag]
  )

  const handleDelete = async () => {
    if (!workspace || !deleteTarget) return
    setDeleting(true)
    try {
      await client.deleteDocument(workspace.id, deleteTarget.id)
      setDeleteTarget(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Documents</h1>
            <p className="text-sm text-muted-foreground">
              Workspace documents with revision and index-build state.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => void load()} title="Refresh">
              <ArrowClockwise size={16} />
            </Button>
            <input
              ref={uploadInputRef}
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) void uploadFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <Button variant="default" onClick={() => uploadInputRef.current?.click()}>
              <CloudArrowUp size={16} className="mr-1.5" />
              Upload PDF
            </Button>
          </div>
        </div>

        {/* Upload progress: actual stages, no invented percentages */}
        {uploads.length > 0 && (
          <div className="space-y-2">
            {uploads.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-3 border bg-card px-4 py-3 text-xs',
                  item.phase === 'error' && 'border-destructive/40'
                )}
              >
                {item.phase === 'done' ? (
                  <Check size={16} weight="bold" className="shrink-0 text-emerald-500" />
                ) : item.phase === 'error' ? (
                  <Warning size={16} weight="fill" className="shrink-0 text-destructive" />
                ) : (
                  <Spinner size={16} className="shrink-0 animate-spin text-primary" />
                )}
                <span className="min-w-0 flex-1 truncate font-medium">{item.fileName}</span>
                <span className="shrink-0 text-muted-foreground">
                  {item.phase === 'uploading' && 'Uploading bytes…'}
                  {item.phase === 'ingesting' &&
                    (item.buildStage
                      ? `Index build: ${STAGE_LABELS[item.buildStage]}`
                      : 'Starting ingestion…')}
                  {item.phase === 'done' && 'Indexed and searchable'}
                  {item.phase === 'error' && (item.error ?? 'Failed')}
                </span>
                {(item.phase === 'done' || item.phase === 'error') && (
                  <button
                    type="button"
                    onClick={clearFinished}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tag filter */}
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedTag(null)}
              className={cn(
                'border-2 border-foreground px-2 py-0.5 text-xs transition-[box-shadow,transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
                !selectedTag
                  ? 'bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--foreground)]'
                  : 'bg-background text-foreground hover:-translate-y-px hover:shadow-[2px_2px_0_0_var(--foreground)]'
              )}
            >
              All
            </button>
            {tags.map(([tag, count]) => (
              <TagBadge
                key={tag}
                name={`${tag} (${count})`}
                size="sm"
                selected={selectedTag === tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              />
            ))}
          </div>
        )}

        {/* List */}
        {wsLoading || loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-4 border bg-card p-4">
                <div className="size-9 animate-pulse bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 animate-pulse bg-muted" />
                  <div className="h-3 w-1/4 animate-pulse bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
            <Warning size={16} className="mt-0.5 shrink-0" weight="fill" />
            <div>
              <p>{error}</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => void load()}>
                Try again
              </Button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Files size={24} />
              </EmptyMedia>
              <EmptyTitle>
                {selectedTag ? 'No documents with this tag' : 'No documents yet'}
              </EmptyTitle>
              <EmptyDescription>
                {selectedTag
                  ? 'Clear the tag filter to see all workspace documents.'
                  : 'Upload a text-bearing PDF to build the searchable corpus. Parsing, chunking, and indexing run as durable stages you can inspect.'}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-3">
            {filtered.map((doc, index) => (
              <div key={doc.id} className="stagger-in" style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}>
                <DocumentCard
                  document={doc}
                  onDelete={setDeleteTarget}
                  deleting={deleting}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation: tombstone + durable purge (DOC-06) */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleteTarget?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The document becomes immediately invisible and unsearchable. Stored files,
              extracted text, vectors, and answers that cited it are purged by a durable
              cleanup task — any failure stays visible in diagnostics until it succeeds.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting…' : 'Delete document'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
