'use client'

/**
 * Document Upload Component
 *
 * Drag-and-drop file upload with progress indication.
 */

import { useState, useCallback } from 'react'
import { Upload, File, X, Check, Spinner } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
          'border-2 border-dashed transition-colors cursor-pointer',
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
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
            <Upload size={48} className="text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-1">
              Drop PDF files here or click to upload
            </p>
            <p className="text-sm text-muted-foreground">
              Supports multiple files. Max 50MB per file.
            </p>
          </label>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload, index) => (
            <Card key={index} className="p-3">
              <div className="flex items-center gap-3">
                <File size={24} className="text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {upload.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {upload.status === 'uploading' && 'Uploading...'}
                    {upload.status === 'processing' && 'Processing PDF...'}
                    {upload.status === 'ready' && 'Ready'}
                    {upload.status === 'failed' && (
                      <span className="text-destructive">{upload.error}</span>
                    )}
                  </p>
                </div>
                <div className="shrink-0">
                  {upload.status === 'uploading' && (
                    <Spinner size={20} className="animate-spin text-primary" />
                  )}
                  {upload.status === 'processing' && (
                    <Spinner size={20} className="animate-spin text-primary" />
                  )}
                  {upload.status === 'ready' && (
                    <Check size={20} className="text-green-500" />
                  )}
                  {upload.status === 'failed' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeUpload(index)}
                    >
                      <X size={16} />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
