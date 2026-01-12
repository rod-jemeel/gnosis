/**
 * API Client
 *
 * HTTP client with workspace isolation for backend API calls.
 * Workspace ID comes from authenticated user.
 */

import { ApiError } from '../types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

// Store workspace ID (set by useApiClient hook)
let currentWorkspaceId: string | null = null

/**
 * Set the current workspace ID (called from auth context)
 */
export function setWorkspaceId(id: string | null) {
  currentWorkspaceId = id
}

/**
 * Get workspace ID
 */
export function getWorkspaceId(): string {
  if (!currentWorkspaceId) {
    throw new Error('Workspace ID not set. User must be authenticated.')
  }
  return currentWorkspaceId
}

/**
 * API client error
 */
export class ApiClientError extends Error {
  status: number
  data: ApiError

  constructor(status: number, data: ApiError) {
    super(data.message || 'API Error')
    this.name = 'ApiClientError'
    this.status = status
    this.data = data
  }
}

/**
 * Make API request with workspace header
 */
async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const workspaceId = getWorkspaceId()

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'x-workspace-id': workspaceId,
      ...options.headers,
    },
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({
      error: 'UnknownError',
      message: `Request failed with status ${response.status}`,
    }))
    throw new ApiClientError(response.status, errorData)
  }

  // Handle empty responses
  const text = await response.text()
  if (!text) {
    return {} as T
  }

  return JSON.parse(text)
}

/**
 * GET request
 */
export function get<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' })
}

/**
 * POST request with JSON body
 */
export function post<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

/**
 * POST request with FormData (for file uploads)
 */
export function postForm<T>(path: string, formData: FormData): Promise<T> {
  const workspaceId = getWorkspaceId()

  return fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'x-workspace-id': workspaceId,
    },
    body: formData,
  }).then(async (response) => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: 'UnknownError',
        message: `Upload failed with status ${response.status}`,
      }))
      throw new ApiClientError(response.status, errorData)
    }
    return response.json()
  })
}

/**
 * DELETE request
 */
export function del<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' })
}

/**
 * Get file URL with workspace header
 */
export function getFileUrl(documentId: string): string {
  return `${API_URL}/v1/documents/${documentId}/file`
}

/**
 * Get auth headers for direct fetch calls
 */
export function getAuthHeaders(): Record<string, string> {
  return {
    'x-workspace-id': getWorkspaceId(),
  }
}
