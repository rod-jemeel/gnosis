/**
 * Documents API
 *
 * API methods for document operations.
 */

import { get, post, del, getWorkspaceId } from './client'
import { Document, DocumentListResponse, UploadDocumentResponse } from '../types'

interface UploadUrlResponse {
  documentId: string
  uploadUrl: string
  expiresIn: number
}

/**
 * Upload a document using presigned URL (two-step upload)
 * 1. Get presigned URL from backend
 * 2. Upload directly to S3
 * 3. Confirm upload to start processing
 */
export async function uploadDocument(file: File): Promise<UploadDocumentResponse> {
  const workspaceId = getWorkspaceId()

  // Step 1: Get presigned upload URL
  const { documentId, uploadUrl } = await post<UploadUrlResponse>('/v1/documents/upload-url', {
    workspaceId,
    fileName: file.name,
    mimeType: file.type || 'application/pdf',
  })

  // Step 2: Upload directly to S3
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'application/pdf',
    },
  })

  if (!uploadResponse.ok) {
    throw new Error(`S3 upload failed: ${uploadResponse.status}`)
  }

  // Step 3: Confirm upload to create document record and start processing
  return post<UploadDocumentResponse>('/v1/documents/confirm-upload', {
    workspaceId,
    documentId,
    fileName: file.name,
  })
}

/**
 * Get a document by ID
 */
export async function getDocument(id: string): Promise<Document> {
  return get<Document>(`/v1/documents/${id}`)
}

/**
 * List documents with pagination
 */
export async function listDocuments(
  page = 1,
  pageSize = 20
): Promise<DocumentListResponse> {
  // Backend uses limit/offset and returns { data, total, limit, offset, hasMore }
  const offset = (page - 1) * pageSize
  const result = await get<{
    data: Document[]
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }>(`/v1/documents?limit=${pageSize}&offset=${offset}`)

  // Map to frontend expected format
  return {
    documents: result.data || [],
    total: result.total,
    page,
    pageSize,
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(id: string): Promise<void> {
  await del(`/v1/documents/${id}`)
}

/**
 * Poll document status until ready or failed
 */
export async function waitForDocumentReady(
  id: string,
  maxAttempts = 60,
  intervalMs = 2000
): Promise<Document> {
  for (let i = 0; i < maxAttempts; i++) {
    const doc = await getDocument(id)

    if (doc.status === 'ready') {
      return doc
    }

    if (doc.status === 'failed') {
      throw new Error(doc.statusMessage || 'Document processing failed')
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error('Timeout waiting for document to be ready')
}
