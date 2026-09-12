'use client'

/**
 * PDF viewer (react-pdf / PDF.js).
 *
 * Renders original file bytes fetched through the authorized client.
 * Page numbers are 1-based physical pages, matching the evidence
 * contract. Evidence passages are highlighted by matching the quote
 * against the page's rendered text layer at view time — the highlight
 * is derived from the actual on-page text, never from invented
 * coordinates.
 */

import { useState, useImperativeHandle, forwardRef, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { Spinner, Warning, CaretLeft, CaretRight } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

// Dynamically import react-pdf components (client-only)
const Document = dynamic(
  () => import('react-pdf').then((mod) => mod.Document),
  { ssr: false }
)
const Page = dynamic(
  () => import('react-pdf').then((mod) => mod.Page),
  { ssr: false }
)

// Import react-pdf styles (v9+ paths)
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'

// Configure PDF.js worker (client-only). The worker and standard fonts
// are vendored under public/pdfjs to avoid any CDN dependency.
if (typeof window !== 'undefined') {
  import('react-pdf').then((mod) => {
    mod.pdfjs.GlobalWorkerOptions.workerSrc = `/pdfjs/${mod.pdfjs.version}/pdf.worker.min.mjs`
  })
}

// Static options must stay referentially stable to avoid PDF reloads.
const DOCUMENT_OPTIONS = { standardFontDataUrl: '/pdfjs/standard_fonts/' }

export interface PdfViewerRef {
  goToPage: (pageNumber: number) => void
  getCurrentPage: () => number
}

interface PdfViewerProps {
  /** Object URL of the fetched file bytes, or null while loading. */
  fileUrl: string | null
  error?: string | null
  initialPage?: number
  /** Passage text to highlight on the displayed page (text-layer match). */
  highlightText?: string | null
  onReady?: (numPages: number) => void
  className?: string
}

const HIT_CLASS = 'gnosis-evidence-hit'

/**
 * Match a quote against the page's text-layer spans. Normalization
 * removes all non-alphanumerics, so differences in whitespace,
 * punctuation, ligatures, and mid-word span splits cannot break the
 * match.
 */
function highlightQuote(
  container: HTMLElement,
  quote: string
): boolean {
  const spans = Array.from(
    container.querySelectorAll<HTMLElement>('.react-pdf__Page__textContent span')
  ).filter((span) => span.textContent && span.textContent.trim().length > 0)
  if (spans.length === 0) return false

  const squeeze = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')

  // Squeezed haystack with each span's char range mapped back to its index.
  let full = ''
  const pieces: { start: number; end: number; index: number }[] = []
  spans.forEach((span, index) => {
    const piece = squeeze(span.textContent ?? '')
    if (!piece) return
    pieces.push({ start: full.length, end: full.length + piece.length, index })
    full += piece
  })

  const attempts = [squeeze(quote), squeeze(quote).slice(0, 60), squeeze(quote).slice(0, 30)]
    .filter((needle) => needle.length >= 12)

  let matchStart = -1
  let matchEnd = -1
  for (const needle of attempts) {
    const at = full.indexOf(needle)
    if (at >= 0) {
      matchStart = at
      matchEnd = at + needle.length
      break
    }
  }
  if (matchStart < 0) return false

  let firstHit: HTMLElement | null = null
  for (const piece of pieces) {
    if (piece.end <= matchStart || piece.start >= matchEnd) continue
    const span = spans[piece.index]
    if (span) {
      span.classList.add(HIT_CLASS)
      if (!firstHit) firstHit = span
    }
  }
  firstHit?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  return true
}

export const PdfViewer = forwardRef<PdfViewerRef, PdfViewerProps>(
  function PdfViewer({ fileUrl, error, initialPage = 1, highlightText, onReady, className }, ref) {
    const [numPages, setNumPages] = useState(0)
    const [currentPage, setCurrentPage] = useState(initialPage)
    const [loadError, setLoadError] = useState<string | null>(null)
    // Page count as a ref so goToPage never reads a stale closure value
    // when called from onReady in the same tick as load success.
    const numPagesRef = useRef(0)
    const containerRef = useRef<HTMLDivElement | null>(null)

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      goToPage: (pageNumber: number) => {
        const pages = numPagesRef.current || Number.MAX_SAFE_INTEGER
        setCurrentPage(Math.max(1, Math.min(pageNumber, pages)))
      },
      getCurrentPage: () => currentPage,
    }))

    const onDocumentLoadSuccess = useCallback(
      ({ numPages }: { numPages: number }) => {
        numPagesRef.current = numPages
        setNumPages(numPages)
        setLoadError(null)
        if (initialPage > 1 && initialPage <= numPages) {
          setCurrentPage(initialPage)
        }
        onReady?.(numPages)
      },
      [initialPage, onReady]
    )

    const onDocumentLoadError = useCallback(() => {
      setLoadError('Failed to render this PDF.')
    }, [])

    // Reset page state when the document changes (derive during render
    // rather than in an effect so the reset applies before painting).
    const [prevKey, setPrevKey] = useState(`${fileUrl}:${initialPage}`)
    const currentKey = `${fileUrl}:${initialPage}`
    if (prevKey !== currentKey) {
      setPrevKey(currentKey)
      setNumPages(0)
      setLoadError(null)
      setCurrentPage(initialPage)
    }

    // Highlight the cited passage once the text layer of the current
    // page has painted. The text layer renders asynchronously (and
    // slowly on first render), so watch for it instead of polling on a
    // short timer.
    useEffect(() => {
      const container = containerRef.current
      if (!container || !highlightText) return
      let disposed = false
      let succeeded = false
      const clear = () => {
        container.querySelectorAll(`.${HIT_CLASS}`).forEach((el) => el.classList.remove(HIT_CLASS))
      }
      const attempt = () => {
        if (disposed || succeeded) return
        if (highlightQuote(container, highlightText)) succeeded = true
      }
      attempt()
      const observer = new MutationObserver(() => attempt())
      observer.observe(container, { childList: true, subtree: true })
      const stop = setTimeout(() => observer.disconnect(), 15_000)
      return () => {
        disposed = true
        observer.disconnect()
        clearTimeout(stop)
        clear()
      }
    }, [highlightText, currentPage, fileUrl])

    const shownError = error ?? loadError

    if (shownError) {
      return (
        <div className={`flex h-full flex-col items-center justify-center bg-muted/30 ${className}`}>
          <Warning size={48} className="mb-4 text-destructive" />
          <p className="mb-2 font-medium text-destructive">Cannot show the original file</p>
          <p className="max-w-sm px-4 text-center text-sm text-muted-foreground">{shownError}</p>
        </div>
      )
    }

    return (
      <div className={`flex h-full flex-col ${className}`}>
        {/* Page Navigation */}
        <div className="flex items-center justify-center gap-2 border-b bg-background py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage <= 1}
            className="h-8 w-8 p-0"
            aria-label="Previous page"
          >
            <CaretLeft size={16} />
          </Button>
          <span className="min-w-[100px] text-center text-sm text-muted-foreground">
            Page {currentPage} of {numPages || '…'}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(numPages, prev + 1))}
            disabled={!numPages || currentPage >= numPages}
            className="h-8 w-8 p-0"
            aria-label="Next page"
          >
            <CaretRight size={16} />
          </Button>
        </div>

        {/* PDF Content */}
        <div ref={containerRef} className="flex flex-1 justify-center overflow-auto bg-muted/30 p-4">
          {!fileUrl && (
            <div className="flex flex-col items-center justify-center">
              <Spinner size={32} className="mb-2 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading PDF…</p>
            </div>
          )}

          {fileUrl && (
            <Document
              file={fileUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              options={DOCUMENT_OPTIONS}
              loading={
                <div className="flex flex-col items-center justify-center">
                  <Spinner size={32} className="mb-2 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Loading PDF…</p>
                </div>
              }
            >
              <Page
                key={currentPage}
                pageNumber={currentPage}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-lg"
                loading={
                  <div className="flex h-[800px] w-[600px] items-center justify-center bg-white">
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
