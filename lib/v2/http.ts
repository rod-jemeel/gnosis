/**
 * HTTP client for the Gnosis /v2 backend contract.
 *
 * Used when NEXT_PUBLIC_GNOSIS_API is configured. All protected
 * requests carry the Supabase access token as a Bearer token — a
 * workspace path is scope, never authentication. Run creation sends an
 * Idempotency-Key, lists use opaque cursor pagination, and errors are
 * normalized to the v2 error shape.
 */

import {
  V2ApiError,
  V2_SCHEMA_VERSION,
  type ChatSessionSummary,
  type CreateUploadRequest,
  type CursorPage,
  type DocumentDetail,
  type DocumentSummary,
  type FinalAnswerResult,
  type GnosisClient,
  type IngestionAccepted,
  type RetrievalDetailsView,
  type RunCreated,
  type RunEvent,
  type RunRequest,
  type RunSummary,
  type SessionTurnView,
  type StreamHandlers,
  type UploadSession,
  type Workspace,
  type WorkspaceMember,
  type WorkspaceSummary,
} from './types'

const DEFAULT_PAGE_SIZE = 25

export interface HttpGnosisClientOptions {
  baseUrl: string
  getAccessToken: () => string | null
}

export class HttpGnosisClient implements GnosisClient {
  readonly demo = false
  private baseUrl: string
  private getAccessToken: () => string | null

  constructor(options: HttpGnosisClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '')
    this.getAccessToken = options.getAccessToken
  }

  private async request<T>(
    path: string,
    init: RequestInit = {},
    idempotencyKey?: string
  ): Promise<T> {
    const token = this.getAccessToken()
    const headers = new Headers(init.headers)
    if (init.body && typeof init.body === 'string') {
      headers.set('Content-Type', 'application/json')
    }
    if (token) headers.set('Authorization', `Bearer ${token}`)
    if (idempotencyKey) headers.set('Idempotency-Key', idempotencyKey)

    const response = await fetch(`${this.baseUrl}${path}`, { ...init, headers })

    if (!response.ok) {
      let code = 'UNKNOWN'
      let message = `Request failed with status ${response.status}`
      let retryable = response.status >= 500
      let requestId = 'unknown'
      try {
        const body = (await response.json()) as {
          error?: { code?: string; message?: string; retryable?: boolean; requestId?: string }
        }
        if (body.error) {
          code = body.error.code ?? code
          message = body.error.message ?? message
          retryable = body.error.retryable ?? retryable
          requestId = body.error.requestId ?? requestId
        }
      } catch {
        // Non-JSON error body; keep defaults.
      }
      throw new V2ApiError(response.status, code, message, { retryable, requestId })
    }

    if (response.status === 204) return {} as T
    const text = await response.text()
    if (!text) return {} as T
    return JSON.parse(text) as T
  }

  private wsPath(workspaceId: string, suffix = ''): string {
    return `/v2/workspaces/${workspaceId}${suffix}`
  }

  /* Workspaces */

  async listWorkspaces(): Promise<WorkspaceSummary[]> {
    return this.request<WorkspaceSummary[]>('/v2/workspaces')
  }

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    return this.request<Workspace>(this.wsPath(workspaceId))
  }

  async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const page = await this.request<CursorPage<WorkspaceMember>>(
      this.wsPath(workspaceId, '/members'),
    )
    return page.items
  }

  /* Documents */

  async listDocuments(workspaceId: string, cursor?: string): Promise<CursorPage<DocumentSummary>> {
    const params = new URLSearchParams({ limit: String(DEFAULT_PAGE_SIZE) })
    if (cursor) params.set('cursor', cursor)
    return this.request<CursorPage<DocumentSummary>>(
      this.wsPath(workspaceId, `/documents?${params}`)
    )
  }

  async getDocument(workspaceId: string, documentId: string): Promise<DocumentDetail> {
    return this.request<DocumentDetail>(
      this.wsPath(workspaceId, `/documents/${documentId}`)
    )
  }

  async updateDocument(
    workspaceId: string,
    documentId: string,
    patch: { title?: string; tags?: string[] }
  ): Promise<DocumentSummary> {
    return this.request<DocumentSummary>(
      this.wsPath(workspaceId, `/documents/${documentId}`),
      { method: 'PATCH', body: JSON.stringify(patch) }
    )
  }

  async deleteDocument(workspaceId: string, documentId: string): Promise<{ purgeTaskId: string }> {
    return this.request<{ purgeTaskId: string }>(
      this.wsPath(workspaceId, `/documents/${documentId}`),
      { method: 'DELETE' }
    )
  }

  async reindexDocument(workspaceId: string, documentId: string): Promise<{ buildId: string }> {
    return this.request<{ buildId: string }>(
      this.wsPath(workspaceId, `/documents/${documentId}/reindex`),
      { method: 'POST', body: JSON.stringify({}) }
    )
  }

  async retryBuild(workspaceId: string, buildId: string): Promise<void> {
    await this.request(this.wsPath(workspaceId, `/builds/${buildId}/retry`), {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }

  /* Uploads */

  async createUpload(workspaceId: string, request: CreateUploadRequest): Promise<UploadSession> {
    return this.request<UploadSession>(this.wsPath(workspaceId, '/uploads'), {
      method: 'POST',
      body: JSON.stringify(request),
    })
  }

  async uploadFile(session: UploadSession, file: File | Blob): Promise<void> {
    const response = await fetch(session.uploadUrl, {
      method: session.method,
      body: file,
      headers: { 'Content-Type': 'application/pdf' },
    })
    if (!response.ok) {
      throw new V2ApiError(
        response.status,
        'UPLOAD_FAILED',
        `Uploading file bytes failed with status ${response.status}.`
      )
    }
  }

  async confirmUpload(
    workspaceId: string,
    uploadId: string,
    request: { idempotencyKey: string }
  ): Promise<IngestionAccepted> {
    return this.request<IngestionAccepted>(
      this.wsPath(workspaceId, `/uploads/${uploadId}/confirm`),
      { method: 'POST', body: JSON.stringify(request) },
      request.idempotencyKey
    )
  }

  /* Sessions */

  async listSessions(workspaceId: string, cursor?: string): Promise<CursorPage<ChatSessionSummary>> {
    const params = new URLSearchParams({ limit: '50' })
    if (cursor) params.set('cursor', cursor)
    return this.request<CursorPage<ChatSessionSummary>>(
      this.wsPath(workspaceId, `/sessions?${params}`)
    )
  }

  async createSession(workspaceId: string, title: string): Promise<ChatSessionSummary> {
    return this.request<ChatSessionSummary>(this.wsPath(workspaceId, '/sessions'), {
      method: 'POST',
      body: JSON.stringify({ title }),
    })
  }

  async renameSession(workspaceId: string, sessionId: string, title: string): Promise<void> {
    await this.request(this.wsPath(workspaceId, `/sessions/${sessionId}`), {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    })
  }

  async deleteSession(workspaceId: string, sessionId: string): Promise<void> {
    await this.request(this.wsPath(workspaceId, `/sessions/${sessionId}`), {
      method: 'DELETE',
    })
  }

  async getSessionTurns(workspaceId: string, sessionId: string): Promise<SessionTurnView[]> {
    return this.request<SessionTurnView[]>(
      this.wsPath(workspaceId, `/sessions/${sessionId}/messages`)
    )
  }

  /* Runs */

  async createRun(
    workspaceId: string,
    sessionId: string,
    request: RunRequest
  ): Promise<RunCreated> {
    return this.request<RunCreated>(
      this.wsPath(workspaceId, `/sessions/${sessionId}/runs`),
      {
        method: 'POST',
        body: JSON.stringify({ ...request, schemaVersion: V2_SCHEMA_VERSION }),
      },
      request.clientMessageId
    )
  }

  async getRun(
    workspaceId: string,
    runId: string
  ): Promise<{
    status: FinalAnswerResult['status']
    result: FinalAnswerResult | null
    error: { code: string; message: string; retryable: boolean } | null
  }> {
    return this.request(this.wsPath(workspaceId, `/runs/${runId}`))
  }

  async cancelRun(workspaceId: string, runId: string): Promise<void> {
    await this.request(this.wsPath(workspaceId, `/runs/${runId}/cancel`), {
      method: 'POST',
      body: JSON.stringify({}),
    })
  }

  async streamRunEvents(
    workspaceId: string,
    runId: string,
    after: number,
    handlers: StreamHandlers
  ): Promise<void> {
    // Two-step protocol: the durable event stream is a GET with a
    // sequence cursor, authenticated with the bearer token (never a
    // token in the URL).
    const token = this.getAccessToken()
    const path = this.wsPath(workspaceId, `/runs/${runId}/events?after=${after}`)
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' } : { Accept: 'text/event-stream' },
      signal: handlers.signal,
    })
    if (!response.ok || !response.body) {
      throw new V2ApiError(
        response.status,
        'STREAM_FAILED',
        `Event stream failed with status ${response.status}.`
      )
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let lastSequence = after

    const parseFrame = (frame: string) => {
      const lines = frame.split('\n')
      const dataLines = lines.filter((l) => l.startsWith('data:'))
      if (dataLines.length === 0) return
      try {
        const event = JSON.parse(dataLines.map((l) => l.slice(5).trim()).join('\n')) as RunEvent
        if (event.sequence > lastSequence) {
          lastSequence = event.sequence
          handlers.onEvent(event)
        }
      } catch {
        // Ignore malformed frames; the sequence cursor keeps us aligned.
      }
    }

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      // SSE frames are separated by a blank line; tolerate split frames.
      let boundary: number
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        parseFrame(frame)
      }
    }
    if (buffer.trim()) parseFrame(buffer)
  }

  async getRunDiagnostics(workspaceId: string, runId: string): Promise<RetrievalDetailsView | null> {
    return this.request<RetrievalDetailsView | null>(
      this.wsPath(workspaceId, `/runs/${runId}/diagnostics`)
    )
  }

  async listRuns(workspaceId: string, limit = 25): Promise<RunSummary[]> {
    return this.request<RunSummary[]>(
      this.wsPath(workspaceId, `/runs?limit=${limit}`)
    )
  }

  /* Files */

  async getFile(workspaceId: string, documentId: string, versionId: string): Promise<Blob> {
    const token = this.getAccessToken()
    const response = await fetch(
      `${this.baseUrl}${this.wsPath(workspaceId, `/documents/${documentId}/versions/${versionId}/file`)}`,
      token ? { headers: { Authorization: `Bearer ${token}` } } : undefined
    )
    if (!response.ok) {
      throw new V2ApiError(
        response.status,
        'FILE_FETCH_FAILED',
        `Could not load the document file (status ${response.status}).`
      )
    }
    return response.blob()
  }
}
