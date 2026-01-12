'use client'

/**
 * Document List Component
 *
 * Grid of document cards with loading state.
 */

import { useState, useEffect, useCallback } from 'react'
import { FolderOpen, Upload, ArrowClockwise, Warning } from '@phosphor-icons/react'
import { DocumentCard } from './document-card'
import { listDocuments, deleteDocument } from '@/lib/api'
import { Document } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'

interface DocumentListProps {
  refreshTrigger?: number
  onChatDocument?: (documentId: string) => void
}

function DocumentCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 rounded-md shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-20 rounded-full" />
            <div className="flex gap-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function DocumentListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <DocumentCardSkeleton key={i} />
      ))}
    </div>
  )
}

export function DocumentList({ refreshTrigger, onChatDocument }: DocumentListProps) {
  const { workspaceId, loading: authLoading } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    if (!workspaceId) return // Don't fetch without workspace ID
    try {
      setLoading(true)
      setError(null)
      const result = await listDocuments()
      setDocuments(result.documents)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  useEffect(() => {
    if (!authLoading && workspaceId) {
      fetchDocuments()
    }
  }, [fetchDocuments, refreshTrigger, authLoading, workspaceId])

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      await deleteDocument(deleteId)
      setDocuments((prev) => prev.filter((d) => d.id !== deleteId))
      setDeleteId(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete document')
    }
  }

  if (loading || authLoading) {
    return <DocumentListSkeleton />
  }

  if (error) {
    return (
      <Empty className="border border-dashed border-destructive/30 bg-destructive/5">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
            <Warning size={24} />
          </EmptyMedia>
          <EmptyTitle>Failed to Load Documents</EmptyTitle>
          <EmptyDescription>
            {error}
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={fetchDocuments} variant="outline" size="sm">
            <ArrowClockwise size={16} className="mr-2" />
            Try Again
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (documents.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FolderOpen size={24} />
          </EmptyMedia>
          <EmptyTitle>No Documents Yet</EmptyTitle>
          <EmptyDescription>
            Upload your first PDF to get started. You can drag and drop files or click the upload button above.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Upload size={16} />
            <span>Supports PDF files up to 50MB</span>
          </div>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {documents.map((doc) => (
          <DocumentCard
            key={doc.id}
            document={doc}
            onDelete={() => setDeleteId(doc.id)}
            onChat={onChatDocument}
          />
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this document? This will remove all
              associated pages, chunks, and embeddings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
