'use client'

/**
 * Documents Page
 *
 * List view of uploaded PDF documents with tag filtering.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Files, ArrowClockwise, Warning, FolderOpen, CloudArrowUp, X, Eye } from '@phosphor-icons/react'
import { DocumentCard } from '@/components/documents/document-card'
import { PdfViewer, PdfViewerRef } from '@/components/pdf'
import { TagFilter } from '@/components/documents/tag-filter'
import { listDocuments, deleteDocument, listTags, getDocumentTags } from '@/lib/api'
import { Document, Tag } from '@/lib/types'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from '@/components/ui/empty'
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

function DocumentRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b">
      <Skeleton className="h-10 w-10 shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-8 w-8" />
    </div>
  )
}

// Document with tags
interface DocumentWithTags extends Document {
  documentTags?: Tag[]
}

export default function DocumentsPage() {
  const router = useRouter()
  const { workspaceId, loading: authLoading } = useAuth()
  const [documents, setDocuments] = useState<DocumentWithTags[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tagsLoading, setTagsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [previewDocumentId, setPreviewDocumentId] = useState<string | null>(null)
  const pdfViewerRef = useRef<PdfViewerRef>(null)

  const fetchTags = useCallback(async () => {
    if (!workspaceId) return
    try {
      setTagsLoading(true)
      const result = await listTags()
      setTags(result.data)
    } catch (err) {
      // Silently fail - tags are not critical
      console.error('Failed to load tags:', err)
    } finally {
      setTagsLoading(false)
    }
  }, [workspaceId])

  const fetchDocuments = useCallback(async () => {
    if (!workspaceId) return
    try {
      setLoading(true)
      setError(null)
      const result = await listDocuments()

      // Fetch tags for each document
      const docsWithTags = await Promise.all(
        result.documents.map(async (doc) => {
          try {
            const tagsResult = await getDocumentTags(doc.id)
            return { ...doc, documentTags: tagsResult.data }
          } catch {
            return { ...doc, documentTags: [] }
          }
        })
      )

      setDocuments(docsWithTags)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents')
    } finally {
      setLoading(false)
    }
  }, [workspaceId])

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchDocuments(), fetchTags()])
  }, [fetchDocuments, fetchTags])

  useEffect(() => {
    if (!authLoading && workspaceId) {
      fetchAll()
    }
  }, [fetchAll, authLoading, workspaceId])

  // Filter documents by selected tag
  const filteredDocuments = useMemo(() => {
    if (!selectedTagId) return documents
    return documents.filter((doc) =>
      doc.documentTags?.some((tag) => tag.id === selectedTagId)
    )
  }, [documents, selectedTagId])

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

  const handleChatDocument = useCallback(
    (documentId: string) => {
      router.push(`/chat?documentId=${documentId}`)
    },
    [router]
  )

  const handleTagCreated = (tag: Tag) => {
    setTags((prev) => [...prev, tag])
  }

  const handlePreview = useCallback((documentId: string) => {
    setPreviewDocumentId(documentId)
  }, [])

  const previewDocument = useMemo(() => {
    return documents.find((d) => d.id === previewDocumentId)
  }, [documents, previewDocumentId])

  return (
    <div className="h-full flex overflow-hidden">
      {/* Documents List Panel */}
      <div className={`flex flex-col ${previewDocumentId ? 'w-1/2 border-r' : 'flex-1'} transition-all duration-300`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-background shrink-0">
          <div className="flex items-center gap-3">
            <Files size={20} weight="duotone" className="text-primary" />
            <div>
              <h1 className="text-sm font-semibold">Documents</h1>
              <p className="text-xs text-muted-foreground">
                {loading ? 'Loading...' : `${filteredDocuments.length} document${filteredDocuments.length !== 1 ? 's' : ''}`}
                {selectedTagId && ` (filtered)`}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={fetchAll} disabled={loading}>
            <ArrowClockwise size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>

        {/* Tag Filter Bar */}
        <div className="px-6 py-3 border-b bg-muted/30 shrink-0">
          <TagFilter
            tags={tags}
            selectedTagId={selectedTagId}
            onTagSelect={setSelectedTagId}
            onTagCreated={handleTagCreated}
            loading={tagsLoading}
          />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading || authLoading ? (
            <div className="divide-y">
              {Array.from({ length: 5 }).map((_, i) => (
                <DocumentRowSkeleton key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="p-6">
              <Empty className="border border-dashed border-destructive/30 bg-destructive/5">
                <EmptyHeader>
                  <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
                    <Warning size={20} />
                  </EmptyMedia>
                  <EmptyTitle className="text-sm">Failed to Load</EmptyTitle>
                  <EmptyDescription className="text-xs">{error}</EmptyDescription>
                </EmptyHeader>
                <Button onClick={fetchDocuments} variant="outline" size="sm" className="mt-4">
                  <ArrowClockwise size={14} className="mr-2" />
                  Retry
                </Button>
              </Empty>
            </div>
          ) : filteredDocuments.length === 0 && !selectedTagId ? (
            <div className="p-6 h-full flex items-center justify-center">
              <Empty className="border border-dashed max-w-sm">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FolderOpen size={20} />
                  </EmptyMedia>
                  <EmptyTitle className="text-sm">No Documents</EmptyTitle>
                  <EmptyDescription className="text-xs">
                    Drag and drop PDF files to the sidebar upload zone to get started.
                  </EmptyDescription>
                </EmptyHeader>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
                  <CloudArrowUp size={14} />
                  <span>PDF files up to 50MB</span>
                </div>
              </Empty>
            </div>
          ) : filteredDocuments.length === 0 && selectedTagId ? (
            <div className="p-6 h-full flex items-center justify-center">
              <Empty className="border border-dashed max-w-sm">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FolderOpen size={20} />
                  </EmptyMedia>
                  <EmptyTitle className="text-sm">No Tagged Documents</EmptyTitle>
                  <EmptyDescription className="text-xs">
                    No documents have been tagged with this filter.
                  </EmptyDescription>
                </EmptyHeader>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTagId(null)}
                  className="mt-4"
                >
                  Clear Filter
                </Button>
              </Empty>
            </div>
          ) : (
            <div className={`grid gap-4 p-6 ${previewDocumentId ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
              {filteredDocuments.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  tags={doc.documentTags}
                  onDelete={() => setDeleteId(doc.id)}
                  onChat={handleChatDocument}
                  onTagClick={setSelectedTagId}
                  onTagsChange={fetchAll}
                  onPreview={doc.status === 'ready' ? handlePreview : undefined}
                  isSelected={doc.id === previewDocumentId}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PDF Preview Panel */}
      {previewDocumentId && (
        <div className="w-1/2 flex flex-col bg-muted/5 animate-in slide-in-from-right duration-300">
          <div className="h-12 px-4 border-b flex items-center justify-between shrink-0 bg-background">
            <div className="flex items-center gap-2 min-w-0">
              <Eye size={16} className="text-primary shrink-0" weight="duotone" />
              <span className="text-xs font-medium truncate">
                {previewDocument?.name || 'PDF Preview'}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPreviewDocumentId(null)}
              className="h-7 w-7 p-0"
            >
              <X size={14} />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <PdfViewer
              ref={pdfViewerRef}
              documentId={previewDocumentId}
              className="h-full"
            />
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the document and all associated data. This cannot be undone.
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
    </div>
  )
}
