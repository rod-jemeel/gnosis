'use client'

/**
 * Document detail (spec §6.2).
 *
 * Four separated views: Original file (authorized PDF proxy),
 * Extracted text (canonical page blocks with coverage warnings),
 * Index build (stage timeline, config identity, retry), and Activity
 * (revision history and lifecycle events).
 */

import { use, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowClockwise,
  Check,
  FilePdf,
  Plus,
  Spinner,
  Trash,
  Warning,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { BuildStateBadge } from '@/components/v2/state-badges'
import { PdfViewer, type PdfViewerRef } from '@/components/pdf'
import { TagBadge } from '@/components/documents/tag-badge'
import { useWorkspace } from '@/lib/workspace'
import { demoStore, BUILD_PIPELINE_STAGES, V2ApiError } from '@/lib/v2'
import type { DocumentDetail } from '@/lib/v2'
import { formatBytes, formatDateTime, shortHash } from '@/lib/format'
import { cn } from '@/lib/utils'

type Tab = 'file' | 'text' | 'build' | 'activity'

export default function DocumentDetailPage({
  params,
}: {
  params: Promise<{ documentId: string }>
}) {
  const { documentId } = use(params)
  const router = useRouter()
  const { client, workspace, loading: wsLoading } = useWorkspace()

  const [detail, setDetail] = useState<DocumentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('file')
  const [versionId, setVersionId] = useState<string | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [reindexing, setReindexing] = useState(false)
  const [newTag, setNewTag] = useState('')
  const pdfRef = useRef<PdfViewerRef>(null)

  const demoVersion = useSyncExternalStore(
    demoStore.subscribe,
    () => demoStore.version,
    () => 0
  )

  const load = useCallback(async () => {
    if (!workspace) return
    try {
      const next = await client.getDocument(workspace.id, documentId)
      setDetail(next)
      setVersionId((prev) => prev ?? next.activeVersion?.id ?? null)
      setError(null)
    } catch (err) {
      if (err instanceof V2ApiError && err.status === 404) {
        setError('This document does not exist or is not accessible.')
      } else {
        setError(err instanceof Error ? err.message : 'Could not load the document.')
      }
    } finally {
      setLoading(false)
    }
  }, [client, workspace, documentId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (demoVersion > 0) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoVersion])

  // Load file bytes when the file tab is active for a chosen version.
  useEffect(() => {
    if (!workspace || !detail || tab !== 'file' || !versionId) return
    if (!detail.fileAvailable) {
      setFileError(
        'Original file bytes are not retained for this document in demo mode. The extracted text below is authoritative.'
      )
      return
    }
    let revoked = false
    setFileUrl(null)
    setFileError(null)
    client
      .getFile(workspace.id, detail.id, versionId)
      .then((blob) => {
        if (revoked) return
        setFileUrl(URL.createObjectURL(blob))
      })
      .catch((err) => {
        if (!revoked) {
          setFileError(err instanceof Error ? err.message : 'The file could not be loaded.')
        }
      })
    return () => {
      revoked = true
    }
  }, [client, workspace, detail, tab, versionId])

  const handleDelete = async () => {
    if (!workspace || !detail) return
    setDeleting(true)
    try {
      await client.deleteDocument(workspace.id, detail.id)
      router.push('/documents')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
      setDeleting(false)
    }
  }

  const handleReindex = async () => {
    if (!workspace || !detail) return
    setReindexing(true)
    try {
      await client.reindexDocument(workspace.id, detail.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reindex failed.')
    } finally {
      setReindexing(false)
    }
  }

  const handleRetryBuild = async (buildId: string) => {
    if (!workspace) return
    try {
      await client.retryBuild(workspace.id, buildId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed.')
    }
  }

  const addTag = async () => {
    const tag = newTag.trim().toLowerCase()
    if (!tag || !workspace || !detail || detail.tags.includes(tag)) return
    setNewTag('')
    try {
      await client.updateDocument(workspace.id, detail.id, { tags: [...detail.tags, tag] })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update tags.')
    }
  }

  const removeTag = async (tag: string) => {
    if (!workspace || !detail) return
    try {
      await client.updateDocument(workspace.id, detail.id, {
        tags: detail.tags.filter((t) => t !== tag),
      })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update tags.')
    }
  }

  if (wsLoading || loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error && !detail) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <Warning size={40} className="mx-auto mb-4 text-destructive" />
        <p className="mb-4 text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" nativeButton={false} render={<Link href="/documents" />}>
          <ArrowLeft size={14} className="mr-1.5" />
          Back to documents
        </Button>
      </div>
    )
  }

  if (!detail) return null

  const tabs: { id: Tab; label: string }[] = [
    { id: 'file', label: 'Original file' },
    { id: 'text', label: 'Extracted text' },
    { id: 'build', label: 'Index build' },
    { id: 'activity', label: 'Activity' },
  ]

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b bg-background">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon-xs" nativeButton={false} render={<Link href="/documents" />} title="Back">
            <ArrowLeft size={14} />
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-semibold">{detail.title}</h1>
              <BuildStateBadge state={detail.activeBuild?.state ?? 'queued'} />
              {detail.activeVersion && (
                <Badge variant="outline">rev {detail.activeVersion.revisionNumber}</Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {formatBytes(detail.activeVersion?.sizeBytes)} ·{' '}
              {detail.activeVersion?.pageCount ?? '—'} pages · uploaded{' '}
              {formatDateTime(detail.activeVersion?.createdAt ?? detail.createdAt)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleReindex()}
              disabled={reindexing || !detail.activeVersion}
              title="Create a new build of the active revision under the current configuration"
            >
              {reindexing ? (
                <Spinner size={14} className="mr-1.5 animate-spin" />
              ) : (
                <ArrowClockwise size={14} className="mr-1.5" />
              )}
              Reindex
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteOpen(true)}
              disabled={detail.lifecycle === 'deleted'}
            >
              <Trash size={14} className="mr-1.5" />
              Delete
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto flex max-w-5xl gap-1 px-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                '-mb-px border-b-2 px-3 py-2 text-xs font-medium transition-colors',
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-4 py-6">
          {/* Tags (metadata on the logical document) */}
          {tab !== 'file' && (
            <div className="mb-6 flex flex-wrap items-center gap-1.5">
              {detail.tags.map((tag) => (
                <TagBadge key={tag} name={tag} size="sm" onRemove={() => void removeTag(tag)} />
              ))}
              <span className="inline-flex items-center gap-1">
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void addTag()}
                  placeholder="add tag"
                  className="w-20 border bg-background px-1.5 py-0.5 text-[10px] outline-none focus:border-ring"
                />
                <button
                  type="button"
                  onClick={() => void addTag()}
                  className="text-muted-foreground hover:text-foreground"
                  title="Add tag"
                >
                  <Plus size={12} />
                </button>
              </span>
            </div>
          )}

          {tab === 'file' && (
            <div className="flex h-[calc(100svh-12rem)] flex-col border">
              {detail.versions.length > 1 && (
                <div className="flex items-center gap-2 border-b px-4 py-2 text-xs">
                  <span className="text-muted-foreground">Revision:</span>
                  {detail.versions.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVersionId(v.id)}
                      className={cn(
                        'border px-2 py-0.5',
                        v.id === versionId
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      rev {v.revisionNumber}
                    </button>
                  ))}
                </div>
              )}
              <div className="min-h-0 flex-1">
                <PdfViewer
                  ref={pdfRef}
                  fileUrl={fileUrl}
                  error={fileError}
                />
              </div>
            </div>
          )}

          {tab === 'text' && <ExtractedTextTab detail={detail} />}

          {tab === 'build' && (
            <div className="space-y-4">
              {detail.builds.map((build) => (
                <div key={build.id} className="border bg-card p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <BuildStateBadge state={build.state} />
                    <Badge variant="outline">rev {build.revisionNumber}</Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {build.id}
                    </span>
                    <span className="ml-auto text-[11px] text-muted-foreground">
                      {formatDateTime(build.createdAt)}
                    </span>
                  </div>

                  {/* Stage timeline */}
                  <ol className="mb-3 space-y-1">
                    {build.stageHistory.map((entry, i) => (
                      <li key={i} className="flex items-baseline gap-2 text-xs">
                        <span
                          className={cn(
                            'font-mono text-[10px]',
                            entry.stage === 'failed'
                              ? 'text-destructive'
                              : entry.stage === 'ready'
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-muted-foreground'
                          )}
                        >
                          {formatDateTime(entry.at)}
                        </span>
                        <span className="font-medium">{entry.stage.replace(/_/g, ' ')}</span>
                        {entry.detail && (
                          <span className="text-muted-foreground">— {entry.detail}</span>
                        )}
                      </li>
                    ))}
                  </ol>

                  <div className="grid gap-x-6 gap-y-1 border-t pt-3 text-[11px] text-muted-foreground sm:grid-cols-2">
                    <span>Chunks: {build.chunkCount ?? '—'}</span>
                    <span>Vectors: {build.vectorCount ?? '—'}</span>
                    <span>Embedding: {build.embeddingProfile.model} ({build.embeddingProfile.dimensions}d)</span>
                    <span className="font-mono">config {shortHash(build.configHash, 12)}</span>
                  </div>

                  {build.warnings.length > 0 && (
                    <div className="mt-3 border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-400">
                      {build.warnings.map((w, i) => (
                        <p key={i} className="flex items-start gap-1.5">
                          <Warning size={11} className="mt-0.5 shrink-0" weight="fill" />
                          {w}
                        </p>
                      ))}
                    </div>
                  )}

                  {build.error && (
                    <div className="mt-3 flex items-center justify-between gap-3 border border-destructive/30 bg-destructive/5 p-2 text-[11px] text-destructive">
                      <span>{build.error}</span>
                      {(build.state === 'failed' || build.state === 'retry_wait') && (
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => void handleRetryBuild(build.id)}
                        >
                          Retry build
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {detail.builds.length === 0 && (
                <p className="text-sm text-muted-foreground">No builds yet.</p>
              )}
              <PipelineLegend />
            </div>
          )}

          {tab === 'activity' && (
            <div className="space-y-6">
              {detail.purgeTask && (
                <div
                  className={cn(
                    'border p-3 text-xs',
                    detail.purgeTask.state === 'complete'
                      ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                      : 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400'
                  )}
                >
                  Purge task {detail.purgeTask.id.slice(0, 12)} —{' '}
                  {detail.purgeTask.state === 'complete' ? 'complete' : 'pending'}
                  {detail.purgeTask.detail ? `: ${detail.purgeTask.detail}` : ''}
                </div>
              )}

              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Revisions
                </h2>
                <div className="space-y-2">
                  {detail.versions.map((v) => (
                    <div
                      key={v.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 border bg-card px-3 py-2 text-xs"
                    >
                      <span className="font-medium">rev {v.revisionNumber}</span>
                      {v.id === detail.activeVersion?.id && (
                        <Badge variant="secondary">
                          <Check size={10} />
                          active
                        </Badge>
                      )}
                      {v.sourceLabel && (
                        <Badge variant="outline">{v.sourceLabel}</Badge>
                      )}
                      <span className="text-muted-foreground">{formatBytes(v.sizeBytes)}</span>
                      <span className="text-muted-foreground">{v.pageCount} pages</span>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        {shortHash(v.contentHash, 12)}
                      </span>
                      <span className="ml-auto text-muted-foreground">
                        {formatDateTime(v.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Events
                </h2>
                <div className="space-y-1">
                  {detail.activity.map((entry, i) => (
                    <div key={i} className="flex items-baseline gap-3 border-b py-1.5 text-xs">
                      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                        {formatDateTime(entry.at)}
                      </span>
                      <span className="font-medium">{entry.kind.replace(/_/g, ' ')}</span>
                      <span className="text-muted-foreground">{entry.detail}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {/* Delete dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{detail.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The document becomes immediately invisible and unsearchable; a durable purge
              removes files, text, vectors, and dependent answers. This cannot be undone.
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

function ExtractedTextTab({ detail }: { detail: DocumentDetail }) {
  if (!detail.extraction) {
    return (
      <p className="text-sm text-muted-foreground">
        No extraction is available yet — the index build may still be processing.
      </p>
    )
  }
  const { extraction } = detail
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>Parser: {extraction.parser}</span>
        <span>{extraction.pageCount} pages</span>
        {extraction.pagesWithNoText.length > 0 && (
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <Warning size={11} weight="fill" />
            No extractable text on pages {extraction.pagesWithNoText.join(', ')} — those pages
            are not indexed
          </span>
        )}
      </div>
      <div className="space-y-4">
        {extraction.pages.map((page) => (
          <div key={page.page} className="border bg-card">
            <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-1.5">
              <FilePdf size={12} className="text-primary" />
              <span className="text-xs font-medium">Page {page.page}</span>
              {extraction.pagesWithNoText.includes(page.page) && (
                <Badge variant="destructive" className="ml-auto">
                  no text
                </Badge>
              )}
            </div>
            <div className="space-y-2 px-4 py-3 text-sm leading-relaxed">
              {page.text ? (
                page.text.split(/\n\n+/).map((paragraph, i) => <p key={i}>{paragraph}</p>)
              ) : (
                <p className="text-xs italic text-muted-foreground">
                  This page contained no extractable text.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PipelineLegend() {
  return (
    <div className="border border-dashed p-3 text-[10px] leading-relaxed text-muted-foreground">
      Build pipeline: {BUILD_PIPELINE_STAGES.map((s) => s.replace(/_/g, ' ')).join(' → ')}. A
      ready build activates only after its checks pass; the previous build stays searchable
      until then.
    </div>
  )
}
