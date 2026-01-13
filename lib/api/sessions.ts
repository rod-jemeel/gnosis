/**
 * Chat Sessions API
 *
 * API methods for chat session operations.
 */

import { get, post, del } from './client'
import {
  ChatSession,
  ChatSessionListResponse,
  CreateChatSessionRequest,
  UpdateChatSessionRequest,
  SessionMessagesResponse,
} from '../types'

/**
 * List chat sessions with pagination
 */
export async function listChatSessions(
  limit = 20,
  offset = 0
): Promise<ChatSessionListResponse> {
  return get<ChatSessionListResponse>(
    `/v1/chat-sessions?limit=${limit}&offset=${offset}`
  )
}

/**
 * Create a new chat session
 */
export async function createChatSession(
  data: CreateChatSessionRequest
): Promise<ChatSession> {
  return post<ChatSession>('/v1/chat-sessions', data)
}

/**
 * Update a chat session
 */
export async function updateChatSession(
  id: string,
  data: UpdateChatSessionRequest
): Promise<ChatSession> {
  // Using POST since we don't have a put helper, but this calls the PUT endpoint
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const { getWorkspaceId } = await import('./client')
  const workspaceId = getWorkspaceId()

  const response = await fetch(`${API_URL}/v1/chat-sessions/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'x-workspace-id': workspaceId,
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: 'UnknownError',
      message: `Request failed with status ${response.status}`,
    }))
    throw new Error(errorData.message || 'Failed to update session')
  }

  return response.json()
}

/**
 * Delete a chat session
 */
export async function deleteChatSession(id: string): Promise<void> {
  await del(`/v1/chat-sessions/${id}`)
}

/**
 * Get messages for a chat session
 */
export async function getSessionMessages(
  sessionId: string
): Promise<SessionMessagesResponse> {
  return get<SessionMessagesResponse>(`/v1/chat-sessions/${sessionId}/messages`)
}
