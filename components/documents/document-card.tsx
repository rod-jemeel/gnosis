'use client'

/**
 * Document Card Component
 *
 * Display a document with status and actions.
 */

import { File, Trash, Chat, Spinner, Warning, Check } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Document } from '@/lib/types'

interface DocumentCardProps {
  document: Document
  onDelete?: (id: string) => void
  onChat?: (id: string) => void
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
        <Badge variant="secondary" className="gap-1">
          <Spinner size={12} className="animate-spin" />
          Queued
        </Badge>
      )
    case 'processing':
      return (
        <Badge variant="secondary" className="gap-1">
          <Spinner size={12} className="animate-spin" />
          Processing
        </Badge>
      )
    case 'ready':
      return (
        <Badge variant="default" className="gap-1 bg-green-500">
          <Check size={12} />
          Ready
        </Badge>
      )
    case 'failed':
      return (
        <Badge variant="destructive" className="gap-1">
          <Warning size={12} />
          Failed
        </Badge>
      )
    default:
      return null
  }
}

export function DocumentCard({ document, onDelete, onChat }: DocumentCardProps) {
  const isReady = document.status === 'ready'

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <File size={32} className="text-primary shrink-0 mt-1" weight="duotone" />
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate mb-1" title={document.name}>
              {document.name}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span>{formatBytes(document.sizeBytes)}</span>
              {document.pageCount && (
                <>
                  <span>-</span>
                  <span>{document.pageCount} pages</span>
                </>
              )}
              <span>-</span>
              <span>{formatDate(document.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <StatusBadge status={document.status} />
              <div className="flex gap-1">
                {isReady && onChat && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onChat(document.id)}
                    title="Ask questions"
                  >
                    <Chat size={16} />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(document.id)}
                    title="Delete"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash size={16} />
                  </Button>
                )}
              </div>
            </div>
            {document.status === 'failed' && document.statusMessage && (
              <p className="text-xs text-destructive mt-2">
                {document.statusMessage}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
