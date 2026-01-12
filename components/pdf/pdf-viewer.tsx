'use client'

/**
 * PDF Viewer Component
 *
 * Wrapper for Nutrient Web SDK with page navigation support.
 *
 * Important:
 * - Page numbers in DB/API are 1-based
 * - Viewer navigation uses 0-based page indexes
 */

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import { Spinner, Warning } from '@phosphor-icons/react'
import { getFileUrl, getAuthHeaders } from '@/lib/api'

// Type declarations for Nutrient Web SDK
declare global {
  interface Window {
    NutrientViewer: {
      load: (config: {
        container: HTMLElement
        document: string
        useCDN?: boolean
        licenseKey?: string
        baseUrl?: string
      }) => Promise<NutrientInstance>
      unload: (container: HTMLElement) => void
    }
  }
}

interface NutrientInstance {
  setViewState: (fn: (viewState: ViewState) => ViewState) => void
  addEventListener: (event: string, handler: (...args: unknown[]) => void) => void
  removeEventListener: (event: string, handler: (...args: unknown[]) => void) => void
  totalPageCount: number
}

interface ViewState {
  set: (key: string, value: number) => ViewState
  get: (key: string) => number
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
    const containerRef = useRef<HTMLDivElement>(null)
    const instanceRef = useRef<NutrientInstance | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [currentPage, setCurrentPage] = useState(initialPage)

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      goToPage: (pageNumber: number) => {
        if (instanceRef.current) {
          // Convert 1-based page number to 0-based index
          const pageIndex = pageNumber - 1
          instanceRef.current.setViewState((v) => v.set('currentPageIndex', pageIndex))
          setCurrentPage(pageNumber)
        }
      },
      getCurrentPage: () => currentPage,
    }))

    // Load viewer
    useEffect(() => {
      const container = containerRef.current
      if (!container || !documentId) return

      let mounted = true

      const loadViewer = async () => {
        try {
          setLoading(true)
          setError(null)

          // Check if NutrientViewer is available
          if (!window.NutrientViewer) {
            throw new Error('Nutrient SDK not loaded')
          }

          // Get file URL with auth
          const fileUrl = getFileUrl(documentId)
          const headers = getAuthHeaders()

          // Load the viewer
          const instance = await window.NutrientViewer.load({
            container,
            document: fileUrl,
            useCDN: true,
            // Add auth header via fetch interceptor or proxy
          })

          if (!mounted) {
            window.NutrientViewer.unload(container)
            return
          }

          instanceRef.current = instance

          // Go to initial page if specified
          if (initialPage > 1) {
            instance.setViewState((v) => v.set('currentPageIndex', initialPage - 1))
          }

          setLoading(false)
        } catch (err) {
          if (mounted) {
            setError(err instanceof Error ? err.message : 'Failed to load PDF')
            setLoading(false)
          }
        }
      }

      loadViewer()

      return () => {
        mounted = false
        if (container && window.NutrientViewer) {
          window.NutrientViewer.unload(container)
        }
        instanceRef.current = null
      }
    }, [documentId, initialPage])

    // Navigate to page when documentId changes
    const goToPage = useCallback((pageNumber: number) => {
      if (instanceRef.current) {
        instanceRef.current.setViewState((v) => v.set('currentPageIndex', pageNumber - 1))
        setCurrentPage(pageNumber)
      }
    }, [])

    if (error) {
      return (
        <div className={`flex flex-col items-center justify-center h-full bg-muted/30 ${className}`}>
          <Warning size={48} className="text-destructive mb-4" />
          <p className="text-destructive font-medium mb-2">Failed to load PDF</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      )
    }

    return (
      <div className={`relative h-full ${className}`}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <Spinner size={32} className="animate-spin text-primary" />
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    )
  }
)
