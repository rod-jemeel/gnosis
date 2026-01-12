'use client'

/**
 * Documents Page
 *
 * Upload and manage PDF documents.
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { DocumentUpload, DocumentList } from '@/components/documents'

export default function DocumentsPage() {
  const router = useRouter()
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleUploadComplete = useCallback(() => {
    // Trigger document list refresh
    setRefreshTrigger((prev) => prev + 1)
  }, [])

  const handleChatDocument = useCallback(
    (documentId: string) => {
      router.push(`/chat?documentId=${documentId}`)
    },
    [router]
  )

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Documents</h1>
        <p className="text-muted-foreground">
          Upload PDF documents to ask questions about their content.
        </p>
      </div>

      <div className="space-y-8">
        <section>
          <h2 className="text-xl font-semibold mb-4">Upload</h2>
          <DocumentUpload onUploadComplete={handleUploadComplete} />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Your Documents</h2>
          <DocumentList
            refreshTrigger={refreshTrigger}
            onChatDocument={handleChatDocument}
          />
        </section>
      </div>
    </div>
  )
}
