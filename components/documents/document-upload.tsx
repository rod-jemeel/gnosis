'use client'

/**
 * Document Upload Component
 *
 * Drag-and-drop file upload with progress indication.
 */

import { useState, useCallback } from 'react'
import { CloudArrowUp, FilePdf, X, Check, Spinner, Warning, ArrowClockwise } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { uploadDocument, waitForDocumentReady } from '@/lib/api'
import { cn } from '@/lib/utils'

interface UploadState {
  file: File
  status: 'uploading' | 'processing' | 'ready' | 'failed'
  documentId?: string
  error?: string
}

interface DocumentUploadProps {
  onUploadComplete?: (documentId: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploads, setUploads] = useState<UploadState[]>([])

  const handleFiles = useCallback(
    async (files: FileList) => {
      const pdfFiles = Array.from(files).filter(
        (f) => f.type === 'application/pdf'
      )

      if (pdfFiles.length === 0) {
        return
      }

      // Add files to upload queue
      const newUploads: UploadState[] = pdfFiles.map((file) => ({
        file,
        status: 'uploading',
      }))

      setUploads((prev) => [...prev, ...newUploads])

      // Process each file
      for (let i = 0; i < pdfFiles.length; i++) {
        const file = pdfFiles[i]
        const uploadIndex = uploads.length + i

        try {
          // Upload file
          const result = await uploadDocument(file)

          setUploads((prev) =>
            prev.map((u, idx) =>
              idx === uploadIndex
                ? { ...u, status: 'processing', documentId: result.documentId }
                : u
            )
          )

          // Wait for processing
          await waitForDocumentReady(result.documentId)

          setUploads((prev) =>
            prev.map((u, idx) =>
              idx === uploadIndex ? { ...u, status: 'ready' } : u
            )
          )

          onUploadComplete?.(result.documentId)
        } catch (error) {
          setUploads((prev) =>
            prev.map((u, idx) =>
              idx === uploadIndex
                ? {
                    ...u,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Upload failed',
                  }
                : u
            )
          )
        }
      }
    },
    [uploads.length, onUploadComplete]
  )

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)

      if (e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files)
      }
    },
    [handleFiles]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files)
      }
    },
    [handleFiles]
  )

  const removeUpload = useCallback((index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index))
  }, [])

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card
        className={cn(
          'relative overflow-hidden border-2 border-dashed transition-all duration-300 cursor-pointer group',
          dragActive
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border hover:border-primary/50 hover:bg-muted/30'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {/* Background gradient on drag */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 transition-opacity duration-300',
            dragActive ? 'opacity-100' : 'opacity-0'
          )}
        />

        <CardContent className="relative flex flex-col items-center justify-center py-12 md:py-16">
          <input
            type="file"
            accept="application/pdf"
            multiple
            onChange={handleInputChange}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className="flex flex-col items-center cursor-pointer"
          >
            <div
              className={cn(
                'w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300',
                dragActive
                  ? 'bg-primary text-primary-foreground scale-110'
                  : 'bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-105'
              )}
            >
              <CloudArrowUp size={32} weight="duotone" />
            </div>
            <p className="text-lg font-semibold mb-2 text-center">
              {dragActive ? 'Drop your files here' : 'Drop PDF files here or click to upload'}
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Supports multiple files up to 50MB each
            </p>
          </label>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Uploads ({uploads.filter(u => u.status === 'ready').length}/{uploads.length})
            </h3>
            {uploads.every(u => u.status === 'ready' || u.status === 'failed') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUploads([])}
                className="text-xs h-7"
              >
                Clear all
              </Button>
            )}
          </div>

          {uploads.map((upload, index) => (
            <Card
              key={index}
              className={cn(
                'relative overflow-hidden transition-all duration-300',
                upload.status === 'ready' && 'border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20',
                upload.status === 'failed' && 'border-destructive/30 bg-destructive/5'
              )}
            >
              {/* Progress bar for uploading/processing */}
              {(upload.status === 'uploading' || upload.status === 'processing') && (
                <div className="absolute top-0 left-0 right-0">
                  <Progress
                    value={upload.status === 'processing' ? 66 : 33}
                    className="h-1 rounded-none"
                  />
                </div>
              )}

              <div className={cn('p-4', (upload.status === 'uploading' || upload.status === 'processing') && 'pt-5')}>
                <div className="flex items-center gap-3">
                  {/* File icon */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                      upload.status === 'ready'
                        ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : upload.status === 'failed'
                        ? 'bg-destructive/10 text-destructive'
                        : 'bg-primary/10 text-primary'
                    )}
                  >
                    <FilePdf size={20} weight="duotone" />
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {upload.file.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatBytes(upload.file.size)}</span>
                      <span>•</span>
                      {upload.status === 'uploading' && (
                        <span className="text-primary">Uploading...</span>
                      )}
                      {upload.status === 'processing' && (
                        <span className="text-primary">Processing PDF...</span>
                      )}
                      {upload.status === 'ready' && (
                        <span className="text-emerald-600 dark:text-emerald-400">Ready</span>
                      )}
                      {upload.status === 'failed' && (
                        <span className="text-destructive">{upload.error}</span>
                      )}
                    </div>
                  </div>

                  {/* Status icon/action */}
                  <div className="shrink-0">
                    {(upload.status === 'uploading' || upload.status === 'processing') && (
                      <Spinner size={20} className="animate-spin text-primary" />
                    )}
                    {upload.status === 'ready' && (
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                        <Check size={18} weight="bold" className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                    )}
                    {upload.status === 'failed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUpload(index)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X size={18} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
