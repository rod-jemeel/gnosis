'use client'

/**
 * Document Card Component
 *
 * Display a document with status and actions.
 */

import { FilePdf, Trash, Chat, Spinner, Warning, Check, Clock, Tag as TagIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Document, Tag } from '@/lib/types'
import { cn } from '@/lib/utils'
import { TagBadge } from './tag-badge'
import { TagPopover } from './tag-popover'

interface DocumentCardProps {
  document: Document
  tags?: Tag[]
  onDelete?: (id: string) => void
  onChat?: (id: string) => void
  onTagClick?: (tagId: string) => void
  onTagsChange?: () => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function StatusBadge({ status }: { status: Document['status'] }) {
  switch (status) {
    case 'uploaded':
      return (
        <Badge variant="secondary" className="gap-1.5 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          <Clock size={12} />
          Queued
        </Badge>
      )
    case 'processing':
      return (
        <Badge variant="secondary" className="gap-1.5 bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
          <Spinner size={12} className="animate-spin" />
          Processing
        </Badge>
      )
    case 'ready':
      return (
        <Badge className="gap-1.5 bg-emerald-500 hover:bg-emerald-500">
          <Check size={12} weight="bold" />
          Ready
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="destructive" className="gap-1.5">
          <Warning size={12} />
          Failed
        </Badge>
      )
    default:
      return null
  }
}

export function DocumentCard({ document, tags, onDelete, onChat, onTagClick, onTagsChange }: DocumentCardProps) {
  const isReady = document.status === 'ready'
  const isProcessing = document.status === 'processing' || document.status === 'uploaded'

  return (
    <Card className={cn(
      'group relative overflow-hidden transition-all duration-300',
      'hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5',
      'border-border/50 hover:border-primary/20'
    )}>
      {/* Subtle gradient accent on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] to-purple-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Processing progress bar */}
      {isProcessing && (
        <div className="absolute top-0 left-0 right-0">
          <Progress value={document.status === 'processing' ? 66 : 33} className="h-1 rounded-none" />
        </div>
      )}

      <CardContent className={cn('relative p-4', isProcessing && 'pt-5')}>
        <div className="flex items-start gap-3">
          {/* Document Icon */}
          <div className={cn(
            'shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300',
            isReady
              ? 'bg-primary/10 text-primary group-hover:bg-primary/15 group-hover:scale-105'
              : isProcessing
              ? 'bg-blue-50 text-blue-500 dark:bg-blue-950'
              : 'bg-muted text-muted-foreground'
          )}>
            <FilePdf size={24} weight="duotone" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold truncate mb-1 group-hover:text-primary transition-colors"
              title={document.name}
            >
              {document.name}
            </h3>

            {/* Metadata */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
              <span className="font-medium">{formatBytes(document.sizeBytes)}</span>
              {document.pageCount && (
                <>
                  <span className="text-border">•</span>
                  <span>{document.pageCount} pages</span>
                </>
              )}
              <span className="text-border">•</span>
              <span>{formatDate(document.createdAt)}</span>
            </div>

            {/* Tags */}
            {tags && tags.length > 0 && (
              <div className="flex items-center gap-1 mb-2 flex-wrap">
                {tags.map((tag) => (
                  <TagBadge
                    key={tag.id}
                    tag={tag}
                    size="sm"
                    onClick={onTagClick ? () => onTagClick(tag.id) : undefined}
                  />
                ))}
              </div>
            )}

            {/* Footer: Status + Actions */}
            <div className="flex items-center justify-between">
              <StatusBadge status={document.status} />

              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isReady && (
                  <TagPopover
                    documentId={document.id}
                    onTagsChange={onTagsChange}
                    trigger={
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Manage tags"
                        className="h-8 px-2 hover:bg-primary/10 hover:text-primary"
                      >
                        <TagIcon size={16} className="mr-1" />
                        <span className="text-xs">Tags</span>
                      </Button>
                    }
                  />
                )}
                {isReady && onChat && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChat(document.id)}
                    title="Ask questions"
                    className="h-8 px-2 hover:bg-primary/10 hover:text-primary"
                  >
                    <Chat size={16} className="mr-1" />
                    <span className="text-xs">Chat</span>
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(document.id)}
                    title="Delete"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash size={16} />
                  </Button>
                )}
              </div>
            </div>

            {/* Error message */}
            {document.status === 'failed' && document.statusMessage && (
              <div className="mt-3 p-2 rounded-md bg-destructive/10 border border-destructive/20">
                <p className="text-xs text-destructive">
                  {document.statusMessage}
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
