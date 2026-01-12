'use client'

/**
 * PDF Viewer Component
 *
 * Uses react-pdf (Mozilla PDF.js) for rendering PDFs.
 *
 * Important:
 * - Page numbers in DB/API are 1-based
 * - This component also uses 1-based page numbers
 */

import { useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Spinner, Warning, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { getFileUrl, getAuthHeaders } from '@/lib/api'

// Dynamically import react-pdf components (client-only)
const Document = dynamic(
  () => import('react-pdf').then((mod) => mod.Document),
  { ssr: false }
)
const Page = dynamic(
  () => import('react-pdf').then((mod) => mod.Page),
  { ssr: false }
)

// Import styles only on client
if (typeof window !== 'undefined') {
  import('react-pdf/dist/Page/AnnotationLayer.css')
  import('react-pdf/dist/Page/TextLayer.css')
}

// Configure PDF.js worker (client-only)
if (typeof window !== 'undefined') {
  import('react-pdf').then((pdfjs) => {
    pdfjs.pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.pdfjs.version}/build/pdf.worker.min.mjs`
  })
}

export interface PdfViewerRef {
  goToPage: (pageNumber: number) => void
  getCurrentPage: () => number
}

interface PdfViewerProps {
  documentId: string
  initialPage?: number
  className?: string
}

export const PdfViewer = forwardRef<PdfViewerRef, PdfViewerProps>(
  function PdfViewer({ documentId, initialPage = 1, className }, ref) {
    const [numPages, setNumPages] = useState<number>(0)
    const [currentPage, setCurrentPage] = useState(initialPage)
    const [pdfUrl, setPdfUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      goToPage: (pageNumber: number) => {
        const page = Math.max(1, Math.min(pageNumber, numPages))
        setCurrentPage(page)
      },
      getCurrentPage: () => currentPage,
    }))

    // Fetch signed URL on mount
    const fetchPdfUrl = useCallback(async () => {
      try {
        setLoading(true)
        setError(null)

        const fileUrl = getFileUrl(documentId)
        const headers = getAuthHeaders()

        const response = await fetch(fileUrl, { headers })

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error('Unauthorized: Please sign in to view this document')
          }
          if (response.status === 404) {
            throw new Error('Document not found')
          }
          throw new Error(`Failed to get PDF: ${response.status}`)
        }

        const { url } = await response.json()
        setPdfUrl(url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load PDF')
        setLoading(false)
      }
    }, [documentId])

    // Fetch URL when documentId changes
    useEffect(() => {
      fetchPdfUrl()
    }, [fetchPdfUrl])

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
      setNumPages(numPages)
      setLoading(false)
      // Go to initial page after load
      if (initialPage > 1 && initialPage <= numPages) {
        setCurrentPage(initialPage)
      }
    }

    const onDocumentLoadError = (err: Error) => {
      console.error('PDF load error:', err)
      setError('Failed to load PDF document')
      setLoading(false)
    }

    const goToPrevPage = () => {
      setCurrentPage((prev) => Math.max(1, prev - 1))
    }

    const goToNextPage = () => {
      setCurrentPage((prev) => Math.min(numPages, prev + 1))
    }

    if (error) {
      return (
        <div className={`flex flex-col items-center justify-center h-full bg-muted/30 ${className}`}>
          <Warning size={48} className="text-destructive mb-4" />
          <p className="text-destructive font-medium mb-2">Failed to load PDF</p>
          <p className="text-sm text-muted-foreground text-center px-4">{error}</p>
        </div>
      )
    }

    return (
      <div className={`flex flex-col h-full ${className}`}>
        {/* Page Navigation */}
        <div className="flex items-center justify-center gap-2 py-2 border-b bg-background">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPrevPage}
            disabled={currentPage <= 1}
            className="h-8 w-8 p-0"
          >
            <CaretLeft size={16} />
          </Button>
          <span className="text-sm text-muted-foreground min-w-[100px] text-center">
            Page {currentPage} of {numPages || '...'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextPage}
            disabled={currentPage >= numPages}
            className="h-8 w-8 p-0"
          >
            <CaretRight size={16} />
          </Button>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-auto flex justify-center bg-muted/30 p-4">
          {loading && !pdfUrl && (
            <div className="flex flex-col items-center justify-center">
              <Spinner size={32} className="animate-spin text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Loading PDF...</p>
            </div>
          )}

          {pdfUrl && (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex flex-col items-center justify-center">
                  <Spinner size={32} className="animate-spin text-primary mb-2" />
                  <p className="text-xs text-muted-foreground">Loading PDF...</p>
                </div>
              }
            >
              <Page
                pageNumber={currentPage}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-lg"
                loading={
                  <div className="flex items-center justify-center h-[800px] w-[600px] bg-white">
                    <Spinner size={24} className="animate-spin text-primary" />
                  </div>
                }
              />
            </Document>
          )}
        </div>
      </div>
    )
  }
)
