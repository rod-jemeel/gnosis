'use client'

/**
 * Document List Component
 *
 * Grid of document cards with loading state.
 */

import { useState, useEffect, useCallback } from 'react'
import { Spinner, FolderOpen } from '@phosphor-icons/react'
import { DocumentCard } from './document-card'
import { listDocuments, deleteDocument } from '@/lib/api'
import { Document } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface DocumentListProps {
  refreshTrigger?: number
  onChatDocument?: (documentId: string) => void
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
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size={32} className="animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={fetchDocuments}>Retry</Button>
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen size={48} className="mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No documents yet</p>
        <p className="text-sm text-muted-foreground">
          Upload your first PDF to get started
        </p>
      </div>
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
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
