/**
 * Chat API
 *
 * API methods for RAG Q&A operations with streaming support.
 */

import { post, getWorkspaceId } from './client'
import { ChatRequest, ChatResponse, Citation } from '../types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

/**
 * Streaming chunk types
 */
export interface ChatStreamChunk {
  type: 'text' | 'citations' | 'done' | 'error'
  content?: string
  citations?: Citation[]
  model?: string
  error?: string
}

/**
 * Streaming callbacks
 */
export interface StreamCallbacks {
  onText: (text: string) => void
  onCitations: (citations: Citation[]) => void
  onDone: (model: string) => void
  onError: (error: string) => void
}

/**
 * Send a chat question (non-streaming)
 */
export async function sendQuestion(request: ChatRequest): Promise<ChatResponse> {
  return post<ChatResponse>('/v1/chat', request)
}

/**
 * Send a chat question with streaming
 */
export async function sendQuestionStream(
  request: ChatRequest,
  callbacks: StreamCallbacks
): Promise<void> {
  const workspaceId = getWorkspaceId()

  const response = await fetch(`${API_URL}/v1/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-workspace-id': workspaceId,
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      message: `Request failed with status ${response.status}`,
    }))
    callbacks.onError(errorData.message || 'Stream request failed')
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    callbacks.onError('No response body')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || !trimmed.startsWith('data: ')) continue

      try {
        const chunk: ChatStreamChunk = JSON.parse(trimmed.slice(6))

        switch (chunk.type) {
          case 'text':
            if (chunk.content) callbacks.onText(chunk.content)
            break
          case 'citations':
            if (chunk.citations) callbacks.onCitations(chunk.citations)
            break
          case 'done':
            callbacks.onDone(chunk.model || '')
            break
          case 'error':
            callbacks.onError(chunk.error || 'Unknown error')
            break
        }
      } catch {
        // Skip invalid JSON
      }
    }
  }
}

/**
 * Ask a question about specific documents
 */
export async function askDocuments(
  question: string,
  documentIds: string[]
): Promise<ChatResponse> {
  return sendQuestion({ question, documentIds })
}

/**
 * Ask a question across all documents in workspace
 */
export async function askAll(question: string): Promise<ChatResponse> {
  return sendQuestion({ question })
}
