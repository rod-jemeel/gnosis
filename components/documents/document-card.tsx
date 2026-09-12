'use client'

/**
 * Document card — workspace-visible logical document with its active
 * revision/build state and any pending replacement (spec §6.2).
 */

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FilePdf, Chat, Trash, Clock } from '@phosphor-icons/react'
import { BuildStateBadge } from '@/components/v2/state-badges'
import { TagBadge } from './tag-badge'
import { formatBytes, formatRelativeTime } from '@/lib/format'
import type { DocumentSummary } from '@/lib/v2'

interface DocumentCardProps {
  document: DocumentSummary
  onDelete?: (document: DocumentSummary) => void
  deleting?: boolean
}

export function DocumentCard({ document: doc, onDelete, deleting }: DocumentCardProps) {
  const router = useRouter()

  return (
    <div className="group border bg-card p-4 transition-colors hover:border-primary/40">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center bg-primary/10">
          <FilePdf size={18} weight="duotone" className="text-primary" />
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/documents/${doc.id}`}
              className="truncate text-sm font-medium hover:text-primary hover:underline"
            >
              {doc.title}
            </Link>
            <div className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
              <button
                type="button"
                title="Ask about this document"
                onClick={() => router.push(`/chat?documents=${doc.id}`)}
                className="flex size-7 items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Chat size={14} />
              </button>
              {onDelete && (
                <button
                  type="button"
                  title="Delete document"
                  disabled={deleting}
                  onClick={() => onDelete(doc)}
                  className="flex size-7 items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <Trash size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <BuildStateBadge state={doc.activeBuild?.state ?? 'queued'} />
            {doc.activeVersion && (
              <span className="border px-2 py-0.5 text-xs text-muted-foreground">
                rev {doc.activeVersion.revisionNumber}
              </span>
            )}
            {doc.pendingBuild && (
              <span
                className="flex items-center gap-1 border border-primary/40 bg-primary/5 px-2 py-0.5 text-xs text-primary"
                title={`Replacement revision ${doc.pendingBuild.revisionNumber} is processing; the previous revision stays searchable.`}
              >
                <Clock size={11} />
                replacement rev {doc.pendingBuild.revisionNumber} · {doc.pendingBuild.state.replace(/_/g, ' ')}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
            <span>{formatBytes(doc.activeVersion?.sizeBytes)}</span>
            <span>
              {doc.activeVersion?.pageCount ?? '—'}{' '}
              {doc.activeVersion?.pageCount === 1 ? 'page' : 'pages'}
            </span>
            {doc.activeBuild?.chunkCount != null && doc.activeBuild.state === 'ready' && (
              <span>{doc.activeBuild.chunkCount} chunks indexed</span>
            )}
            <span>updated {formatRelativeTime(doc.updatedAt)}</span>
          </div>

          {doc.activeBuild?.state === 'failed' && doc.activeBuild.error && (
            <p className="border border-destructive/30 bg-destructive/5 px-2 py-1 text-[11px] text-destructive">
              {doc.activeBuild.error}
            </p>
          )}

          {doc.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {doc.tags.map((tag) => (
                <TagBadge key={tag} name={tag} size="sm" />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
