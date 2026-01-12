/**
 * Shared Types
 *
 * Type definitions for frontend API interactions.
 */

// Document types
export interface Document {
  id: string
  name: string
  originalFilename?: string
  mimeType?: string
  sizeBytes: number
  status: 'uploaded' | 'processing' | 'ready' | 'failed'
  pageCount: number | null
  statusMessage?: string | null
  createdAt: string
  updatedAt?: string
  processedAt?: string | null
  workspaceId?: string
}

export interface DocumentListResponse {
  documents: Document[]
  total: number
  page: number
  pageSize: number
}

export interface UploadDocumentResponse {
  documentId: string
  name: string
  status: string
  message: string
}

// Citation types
export interface Citation {
  index: number
  documentId: string
  documentName: string
  pageNumber: number
  text: string
  score: number
}

// Chat types
export interface ChatRequest {
  question: string
  documentIds?: string[]
  topK?: number
}

export interface ChatResponse {
  answer: string
  citations: Citation[]
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  timestamp: Date
}

// API Error
export interface ApiError {
  error: string
  message: string
  details?: Record<string, string[]>
}
