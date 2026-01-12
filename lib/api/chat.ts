/**
 * Chat API
 *
 * API methods for RAG Q&A operations.
 */

import { post } from './client'
import { ChatRequest, ChatResponse } from '../types'

/**
 * Send a chat question
 */
export async function sendQuestion(request: ChatRequest): Promise<ChatResponse> {
  return post<ChatResponse>('/v1/chat', request)
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
