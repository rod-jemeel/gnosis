/**
 * Demo client.
 *
 * Implements the full GnosisClient contract locally: the curated corpus
 * plus real client-side PDF text extraction for uploads, simulated
 * embedding/model providers, staged ingestion builds, and the durable
 * two-step run protocol. Nothing leaves the browser.
 */

import { generatePdf } from './pdf'
import {
  chunkPages,
  demoStore,
  fnv1a,
  uid,
  type DemoBuild,
  type DemoDocument,
  type DemoRun,
  type DemoState,
  type DemoStoredPage,
} from './store'
import {
  estimateTokens,
  resolveQuestion,
  resolveScopedChunks,
  retrieve,
  synthesizeAnswer,
} from './engine'
import {
  BUILD_PIPELINE_STAGES,
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
  type RunEventType,
  type RunRequest,
  type RunSummary,
  type SessionTurnView,
  type StreamHandlers,
  type UploadSession,
  type Workspace,
  type WorkspaceMember,
  type WorkspaceSummary,
} from '../types'

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
const MAX_PAGES = 200
const MAX_DOCUMENTS = 100

/** Stage durations for simulated ingestion (ms). */
const STAGE_DURATIONS: Record<string, number> = {
  validating_source: 600,
  parsing: 1400,
  chunking: 900,
  embedding: 2000,
  indexing: 1300,
  checking_readiness: 800,
}

export class DemoGnosisClient implements GnosisClient {
  readonly demo = true
  private files = new Map<string, File>()
  private confirmations = new Map<string, IngestionAccepted>()
  private runningTimers = new Set<ReturnType<typeof setTimeout>>()

  constructor() {
    if (typeof window !== 'undefined') {
      this.resumeBuilds()
    }
  }

  /* ---------------------------------------------------------------- */
  /* Workspaces                                                        */
  /* ---------------------------------------------------------------- */

  async listWorkspaces(): Promise<WorkspaceSummary[]> {
    const state = demoStore.getState()
    return [
      {
        id: state.workspace.id,
        name: state.workspace.name,
        role: 'owner',
        documentCount: state.documents.filter((d) => d.lifecycle === 'active').length,
        createdAt: state.workspace.createdAt,
      },
    ]
  }

  async getWorkspace(workspaceId: string): Promise<Workspace> {
    const state = demoStore.getState()
    this.requireWorkspace(state, workspaceId)
    const activeDocs = state.documents.filter((d) => d.lifecycle === 'active')
    const activeChunks = activeDocs.reduce((sum, d) => {
      const build = d.builds.find((b) => b.id === d.activeBuildId)
      return sum + (build?.chunks.length ?? 0)
    }, 0)
    const sourceBytes = activeDocs.reduce(
      (sum, d) => sum + d.versions.reduce((s, v) => s + v.sizeBytes, 0),
      0
    )
    return {
      id: state.workspace.id,
      name: state.workspace.name,
      role: 'owner',
      createdAt: state.workspace.createdAt,
      corpusGeneration: state.workspace.corpusGeneration,
      quota: {
        maxDocuments: MAX_DOCUMENTS,
        maxUploadBytes: MAX_UPLOAD_BYTES,
        maxSourceBytes: 1024 * 1024 * 1024,
        maxChunks: 20_000,
        maxSelectedDocuments: 50,
      },
      usage: {
        documentCount: activeDocs.length,
        sourceBytes,
        activeChunks,
        runsThisMonth: state.usage.runsThisMonth,
      },
    }
  }

  async listMembers(workspaceId: string): Promise<WorkspaceMember[]> {
    const state = demoStore.getState()
    this.requireWorkspace(state, workspaceId)
    return state.members.map((m) => ({ ...m }))
  }

  /* ---------------------------------------------------------------- */
  /* Documents                                                         */
  /* ---------------------------------------------------------------- */

  async listDocuments(workspaceId: string): Promise<CursorPage<DocumentSummary>> {
    const state = demoStore.getState()
    this.requireWorkspace(state, workspaceId)
    const active = state.documents
      .filter((d) => d.lifecycle === 'active')
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return { items: active.map((d) => this.toDocumentSummary(d)), nextCursor: null }
  }

  async getDocument(workspaceId: string, documentId: string): Promise<DocumentDetail> {
    const state = demoStore.getState()
    const doc = this.requireDocument(state, workspaceId, documentId)
    const activeVersion = doc.versions.find((v) => v.id === doc.activeVersionId) ?? null
    return {
      ...this.toDocumentSummary(doc),
      versions: doc.versions.map((v) => ({
        id: v.id,
        documentId: v.documentId,
        revisionNumber: v.revisionNumber,
        createdAt: v.createdAt,
        sizeBytes: v.sizeBytes,
        pageCount: v.pageCount,
        contentHash: v.contentHash,
        sourceLabel: v.sourceLabel,
        creatorEmail: v.creatorEmail,
      })),
      builds: doc.builds.map((b) => this.toBuildView(b)),
      activity: [...doc.activity].reverse(),
      extraction: activeVersion
        ? {
            parser: doc.parser,
            pageCount: activeVersion.pageCount,
            pagesWithNoText: activeVersion.pages
              .filter((p) => p.paragraphs.join('').trim().length === 0)
              .map((p) => p.page),
            pages: activeVersion.pages.map((p) => ({
              page: p.page,
              text: p.paragraphs.join('\n\n'),
            })),
          }
        : null,
      fileAvailable: doc.fileAvailable,
      purgeTask: doc.purgeTask
        ? { id: doc.purgeTask.id, state: doc.purgeTask.state, detail: doc.purgeTask.detail }
        : null,
    }
  }

  async updateDocument(
    workspaceId: string,
    documentId: string,
    patch: { title?: string; tags?: string[] }
  ): Promise<DocumentSummary> {
    const state = demoStore.getState()
    const doc = this.requireDocument(state, workspaceId, documentId)
    demoStore.mutate((s) => {
      const target = s.documents.find((d) => d.id === documentId)
      if (!target) return
      if (patch.title != null && patch.title.trim()) target.title = patch.title.trim()
      if (patch.tags != null) target.tags = [...patch.tags]
      target.updatedAt = new Date().toISOString()
    })
    return this.toDocumentSummary(doc)
  }

  async deleteDocument(workspaceId: string, documentId: string): Promise<{ purgeTaskId: string }> {
    const state = demoStore.getState()
    const doc = this.requireDocument(state, workspaceId, documentId)
    if (doc.lifecycle === 'deleted') {
      throw new V2ApiError(409, 'ALREADY_DELETED', 'Document is already deleted.')
    }
    const purgeTaskId = uid('purge')
    const now = new Date().toISOString()
    demoStore.mutate((s) => {
      const target = s.documents.find((d) => d.id === documentId)
      if (!target) return
      // Immediate logical revocation (tombstone).
      target.lifecycle = 'deleted'
      target.deletedAt = now
      target.activeVersionId = null
      target.activeBuildId = null
      target.updatedAt = now
      target.purgeTask = { id: purgeTaskId, state: 'pending', detail: null, at: now }
      target.activity.push({
        at: now,
        kind: 'deleted',
        detail: 'Document deleted; reads denied pending physical purge.',
      })
      s.workspace.corpusGeneration += 1
    })
    // Durable purge completes shortly after; failures would stay visible.
    this.timer(4000, () => {
      demoStore.mutate((s) => {
        const target = s.documents.find((d) => d.id === documentId)
        if (!target || !target.purgeTask) return
        target.purgeTask = { ...target.purgeTask, state: 'complete' }
        target.activity.push({
          at: new Date().toISOString(),
          kind: 'purge_completed',
          detail: 'Source files, extraction artifacts, chunks, and vectors purged.',
        })
      })
    })
    return { purgeTaskId }
  }

  async reindexDocument(workspaceId: string, documentId: string): Promise<{ buildId: string }> {
    const state = demoStore.getState()
    const doc = this.requireDocument(state, workspaceId, documentId)
    const versionId = doc.activeVersionId
    if (!versionId) {
      throw new V2ApiError(409, 'NOT_INDEXABLE', 'Document has no active version to reindex.')
    }
    const version = doc.versions.find((v) => v.id === versionId)!
    const buildId = uid('build')
    const now = new Date().toISOString()
    demoStore.mutate((s) => {
      const target = s.documents.find((d) => d.id === documentId)
      if (!target) return
      target.builds.push({
        id: buildId,
        documentId,
        versionId,
        revisionNumber: version.revisionNumber,
        state: 'queued',
        stageHistory: [{ stage: 'queued', detail: null, at: now }],
        chunks: [],
        warnings: [],
        error: null,
        retryable: false,
        configHash: fnv1a(`chunk:target=400:overlap=60:embed=acme-embed-1024`),
        createdAt: now,
        completedAt: null,
      })
    })
    this.advanceBuild(buildId)
    return { buildId }
  }

  async retryBuild(workspaceId: string, buildId: string): Promise<void> {
    const state = demoStore.getState()
    this.requireWorkspace(state, workspaceId)
    const doc = state.documents.find((d) => d.builds.some((b) => b.id === buildId))
    if (!doc) throw new V2ApiError(404, 'NOT_FOUND', 'Build not found.')
    const build = doc.builds.find((b) => b.id === buildId)!
    if (build.state !== 'failed' && build.state !== 'retry_wait') {
      throw new V2ApiError(409, 'NOT_RETRYABLE', 'Build is not in a retryable state.')
    }
    demoStore.mutate((s) => {
      const target = s.documents
        .find((d) => d.builds.some((b) => b.id === buildId))
        ?.builds.find((b) => b.id === buildId)
      if (target) {
        target.state = 'queued'
        target.error = null
        target.stageHistory.push({ stage: 'queued', detail: 'Retry requested', at: new Date().toISOString() })
      }
    })
    this.advanceBuild(buildId)
  }

  /* ---------------------------------------------------------------- */
  /* Uploads                                                           */
  /* ---------------------------------------------------------------- */

  async createUpload(workspaceId: string, request: CreateUploadRequest): Promise<UploadSession> {
    const state = demoStore.getState()
    this.requireWorkspace(state, workspaceId)
    if (request.contentType !== 'application/pdf') {
      throw new V2ApiError(422, 'UNSUPPORTED_MEDIA_TYPE', 'Only PDF uploads are supported.')
    }
    if (request.sizeBytes > MAX_UPLOAD_BYTES) {
      throw new V2ApiError(
        413,
        'UPLOAD_TOO_LARGE',
        `File exceeds the ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MiB upload limit.`
      )
    }
    const activeCount = state.documents.filter((d) => d.lifecycle === 'active').length
    if (!request.newRevisionOfDocumentId && activeCount >= MAX_DOCUMENTS) {
      throw new V2ApiError(409, 'DOCUMENT_QUOTA_EXCEEDED', 'Workspace document quota reached.')
    }
    const id = uid('up')
    return {
      id,
      uploadUrl: `demo://uploads/${id}`,
      method: 'PUT',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      maxBytes: MAX_UPLOAD_BYTES,
    }
  }

  async uploadFile(session: UploadSession, file: File | Blob): Promise<void> {
    if (file.size > session.maxBytes) {
      throw new V2ApiError(413, 'UPLOAD_TOO_LARGE', 'File exceeds the upload limit.')
    }
    this.files.set(session.id, file as File)
  }

  async confirmUpload(
    workspaceId: string,
    uploadId: string,
    request: { idempotencyKey: string }
  ): Promise<IngestionAccepted> {
    const state = demoStore.getState()
    this.requireWorkspace(state, workspaceId)
    // Idempotent confirmation: the same key returns the original result.
    const existing = this.confirmations.get(request.idempotencyKey)
    if (existing) return existing
    const file = this.files.get(uploadId)
    if (!file) {
      throw new V2ApiError(410, 'UPLOAD_SESSION_EXPIRED', 'Upload session is missing or expired.')
    }
    this.files.delete(uploadId)

    const fileName = file.name || 'upload.pdf'
    const title = fileName.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim() || 'Untitled document'
    const now = new Date().toISOString()

    const documentId = uid('doc')
    const versionId = uid('ver')
    const buildId = uid('build')

    // Deterministic failure injection for fixture filenames.
    const lowerName = fileName.toLowerCase()
    if (lowerName.includes('encrypted') || lowerName.includes('corrupt')) {
      const doc: DemoDocument = {
        id: documentId,
        workspaceId,
        title,
        tags: [],
        createdAt: now,
        updatedAt: now,
        lifecycle: 'active',
        deletedAt: null,
        versions: [
          {
            id: versionId,
            documentId,
            revisionNumber: 1,
            createdAt: now,
            sizeBytes: file.size,
            pageCount: 0,
            contentHash: fnv1a(`${documentId}:rejected`),
            sourceLabel: null,
            creatorEmail: 'demo@gnosis.local',
            pages: [],
          },
        ],
        activeVersionId: null,
        builds: [
          {
            id: buildId,
            documentId,
            versionId,
            revisionNumber: 1,
            state: 'failed',
            stageHistory: [
              { stage: 'queued', detail: null, at: now },
              {
                stage: 'failed',
                detail: 'The PDF could not be parsed.',
                at: new Date(Date.now() + 600).toISOString(),
              },
            ],
            chunks: [],
            warnings: [],
            error:
              lowerName.includes('encrypted')
                ? 'The PDF is encrypted or password-protected. Remove the password and upload again.'
                : 'The PDF appears to be malformed and could not be parsed.',
        retryable: false,
            configHash: fnv1a('chunk:target=400:overlap=60:embed=acme-embed-1024'),
            createdAt: now,
            completedAt: new Date(Date.now() + 600).toISOString(),
          },
        ],
        activeBuildId: null,
        activity: [
          { at: now, kind: 'created', detail: `Uploaded ${fileName}` },
          { at: now, kind: 'build_failed', detail: 'Parsing failed; no retry will help this file.' },
        ],
        parser: 'pdfjs-demo',
        fileAvailable: false,
        purgeTask: null,
      }
      demoStore.mutate((s) => {
        s.documents.push(doc)
      })
      const accepted: IngestionAccepted = { documentId, versionId, buildId, revisionNumber: 1 }
      this.confirmations.set(request.idempotencyKey, accepted)
      return accepted
    }

    // Real client-side extraction with PDF.js.
    const extraction = await extractPdfPages(file)
    if (extraction.pages.length > MAX_PAGES) {
      throw new V2ApiError(422, 'TOO_MANY_PAGES', `PDFs are limited to ${MAX_PAGES} pages.`)
    }
    const pages: DemoStoredPage[] = extraction.pages
    const bodyText = pages.flatMap((p) => p.paragraphs).join('\n\n')
    const warnings: string[] = []
    const emptyPages = pages.filter((p) => p.paragraphs.join('').trim().length === 0)
    if (emptyPages.length > 0) {
      warnings.push(
        `${emptyPages.length} of ${pages.length} pages contain no extractable text — those pages are not indexed.`
      )
    }
    if (extraction.encounteredBinaryNoise) {
      warnings.push('Some page text required cleanup; verify extraction quality.')
    }

    demoStore.mutate((s) => {
      s.documents.push({
        id: documentId,
        workspaceId,
        title,
        tags: [],
        createdAt: now,
        updatedAt: now,
        lifecycle: 'active',
        deletedAt: null,
        versions: [
          {
            id: versionId,
            documentId,
            revisionNumber: 1,
            createdAt: now,
            sizeBytes: file.size,
            pageCount: pages.length,
            contentHash: fnv1a(`${documentId}:1:${bodyText}`),
            sourceLabel: null,
            creatorEmail: 'demo@gnosis.local',
            pages,
          },
        ],
        activeVersionId: null,
        builds: [
          {
            id: buildId,
            documentId,
            versionId,
            revisionNumber: 1,
            state: 'queued',
            stageHistory: [{ stage: 'queued', detail: null, at: now }],
            chunks: [],
            warnings,
            error: null,
            retryable: false,
            configHash: fnv1a('chunk:target=400:overlap=60:embed=acme-embed-1024'),
            createdAt: now,
            completedAt: null,
          },
        ],
        activeBuildId: null,
        activity: [{ at: now, kind: 'created', detail: `Uploaded ${fileName}` }],
        parser: 'pdfjs-demo',
        fileAvailable: false,
        purgeTask: null,
      })
    })

    // Attach extracted chunks once "parsing" completes.
    this.advanceBuild(buildId, () => {
      demoStore.mutate((s) => {
        const target = s.documents
          .find((d) => d.id === documentId)
          ?.builds.find((b) => b.id === buildId)
        if (target && target.chunks.length === 0) {
          target.chunks = chunkPages(pages, buildId)
        }
      })
    })
    const accepted: IngestionAccepted = { documentId, versionId, buildId, revisionNumber: 1 }
    this.confirmations.set(request.idempotencyKey, accepted)
    return accepted
  }

  /* ---------------------------------------------------------------- */
  /* Sessions                                                          */
  /* ---------------------------------------------------------------- */

  async listSessions(workspaceId: string): Promise<CursorPage<ChatSessionSummary>> {
    const state = demoStore.getState()
    this.requireWorkspace(state, workspaceId)
    const sessions = [...state.sessions]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((s) => this.toSessionSummary(s))
    return { items: sessions, nextCursor: null }
  }

  async createSession(workspaceId: string, title: string): Promise<ChatSessionSummary> {
    const state = demoStore.getState()
    this.requireWorkspace(state, workspaceId)
    const now = new Date().toISOString()
    const session = {
      id: uid('sess'),
      workspaceId,
      title: title || 'New chat',
      createdAt: now,
      updatedAt: now,
      turns: [],
    }
    demoStore.mutate((s) => {
      s.sessions.push(session)
    })
    return this.toSessionSummary(session)
  }

  async renameSession(workspaceId: string, sessionId: string, title: string): Promise<void> {
    const state = demoStore.getState()
    this.requireSession(state, workspaceId, sessionId)
    demoStore.mutate((s) => {
      const target = s.sessions.find((x) => x.id === sessionId)
      if (target) {
        target.title = title
        target.updatedAt = new Date().toISOString()
      }
    })
  }

  async deleteSession(workspaceId: string, sessionId: string): Promise<void> {
    const state = demoStore.getState()
    this.requireSession(state, workspaceId, sessionId)
    demoStore.mutate((s) => {
      s.sessions = s.sessions.filter((x) => x.id !== sessionId)
      s.runs = s.runs.filter((r) => r.sessionId !== sessionId)
    })
  }

  async getSessionTurns(workspaceId: string, sessionId: string): Promise<SessionTurnView[]> {
    const state = demoStore.getState()
    const session = this.requireSession(state, workspaceId, sessionId)
    return session.turns.map((turn) => ({
      sequence: turn.sequence,
      user: { ...turn.user },
      assistant: turn.assistant ? { ...turn.assistant } : null,
    }))
  }

  /* ---------------------------------------------------------------- */
  /* Runs                                                              */
  /* ---------------------------------------------------------------- */

  async createRun(
    workspaceId: string,
    sessionId: string,
    request: RunRequest
  ): Promise<RunCreated> {
    const state = demoStore.getState()
    const session = this.requireSession(state, workspaceId, sessionId)

    // Scope validation before any retrieval work (RET-01).
    if (request.scope.type === 'selected_documents') {
      if (request.scope.documentIds.length === 0) {
        throw new V2ApiError(
          422,
          'INVALID_SCOPE',
          'An empty document selection is not a valid scope; choose "All current documents" instead.'
        )
      }
      if (request.scope.documentIds.length > 50) {
        throw new V2ApiError(422, 'INVALID_SCOPE', 'At most 50 documents can be selected.')
      }
      const { missingDocumentIds } = resolveScopedChunks(state, request.scope)
      if (missingDocumentIds.length > 0) {
        throw new V2ApiError(
          400,
          'SCOPE_UNAVAILABLE',
          'One or more selected documents are unavailable. Update the search scope and try again.',
          { retryable: false }
        )
      }
    }

    // Idempotent creation: the same clientMessageId returns the same run.
    const existing = state.runs.find(
      (r) => r.sessionId === sessionId && r.question === request.question &&
        r.events.some((e) => (e.payload as { clientMessageId?: string } | undefined)?.clientMessageId === request.clientMessageId)
    )
    if (existing) {
      return {
        schemaVersion: V2_SCHEMA_VERSION,
        runId: existing.runId,
        status: existing.status,
        eventsPath: this.eventsPath(workspaceId, existing.runId),
      }
    }

    const runId = uid('run')
    const now = new Date().toISOString()
    const userMessageId = uid('msg')
    const assistantMessageId = uid('msg')
    const sequence = session.turns.length + 1

    const run: DemoRun = {
      runId,
      sessionId,
      question: request.question,
      scope: request.scope,
      status: 'queued',
      outcome: null,
      result: null,
      error: null,
      events: [
        {
          runId,
          sequence: 1,
          type: 'run.queued',
          schemaVersion: V2_SCHEMA_VERSION,
          at: now,
          payload: { clientMessageId: request.clientMessageId },
        },
      ],
      details: null,
      createdAt: now,
      startedAt: null,
      completedAt: null,
      cancelled: false,
    }

    demoStore.mutate((s) => {
      s.runs.push(run)
      s.usage.runsThisMonth += 1
      const target = s.sessions.find((x) => x.id === sessionId)
      if (target) {
        target.turns.push({
          sequence,
          user: {
            id: userMessageId,
            text: request.question,
            at: now,
            scope: request.scope,
          },
          assistant: {
            id: assistantMessageId,
            runId,
            at: now,
            status: 'queued',
            result: null,
            error: null,
          },
        })
        if (target.turns.length === 1) {
          target.title =
            request.question.length > 48
              ? `${request.question.slice(0, 48).trimEnd()}…`
              : request.question
        }
        target.updatedAt = now
      }
    })

    this.executeRun(runId, request)
    return {
      schemaVersion: V2_SCHEMA_VERSION,
      runId,
      status: 'queued',
      eventsPath: this.eventsPath(workspaceId, runId),
    }
  }

  async getRun(
    workspaceId: string,
    runId: string
  ): Promise<{
    status: FinalAnswerResult['status']
    result: FinalAnswerResult | null
    error: { code: string; message: string; retryable: boolean } | null
  }> {
    const state = demoStore.getState()
    const run = this.requireRun(state, workspaceId, runId)
    return { status: run.status, result: run.result, error: run.error }
  }

  async cancelRun(workspaceId: string, runId: string): Promise<void> {
    const state = demoStore.getState()
    const run = this.requireRun(state, workspaceId, runId)
    if (run.status === 'completed') {
      // Completion committed first: return existing state (spec §16.3).
      return
    }
    demoStore.mutate((s) => {
      const target = s.runs.find((r) => r.runId === runId)
      if (target && target.status !== 'completed') {
        target.cancelled = true
      }
    })
  }

  async streamRunEvents(
    workspaceId: string,
    runId: string,
    after: number,
    handlers: StreamHandlers
  ): Promise<void> {
    const state = demoStore.getState()
    this.requireRun(state, workspaceId, runId)

    const deliver = (events: RunEvent[]) => {
      for (const event of events) {
        if (event.sequence > after && !handlers.signal?.aborted) {
          after = event.sequence
          handlers.onEvent(event)
        }
      }
    }

    const poll = (resolve: () => void, reject: (err: Error) => void) => {
      if (handlers.signal?.aborted) {
        resolve()
        return
      }
      const run = demoStore.getState().runs.find((r) => r.runId === runId)
      if (!run) {
        reject(new V2ApiError(404, 'NOT_FOUND', 'Run not found.'))
        return
      }
      deliver(run.events)
      const last = run.events[run.events.length - 1]
      if (
        last &&
        (last.type === 'run.completed' ||
          last.type === 'run.failed' ||
          last.type === 'run.cancelled' ||
          last.type === 'run.interrupted')
      ) {
        resolve()
        return
      }
      this.timer(100, () => poll(resolve, reject))
    }

    return new Promise((resolve, reject) => poll(resolve, reject))
  }

  async getRunDiagnostics(workspaceId: string, runId: string): Promise<RetrievalDetailsView | null> {
    const state = demoStore.getState()
    const run = this.requireRun(state, workspaceId, runId)
    return run.details
  }

  async listRuns(workspaceId: string, limit = 25): Promise<RunSummary[]> {
    const state = demoStore.getState()
    this.requireWorkspace(state, workspaceId)
    return [...state.runs]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((run) => {
        const session = state.sessions.find((s) => s.id === run.sessionId)
        return {
          runId: run.runId,
          sessionId: run.sessionId,
          sessionTitle: session?.title ?? 'Deleted session',
          question: run.question,
          scope: run.scope,
          status: run.status,
          outcome: run.outcome,
          startedAt: run.startedAt ?? run.createdAt,
          completedAt: run.completedAt,
          timings: run.result?.timings ?? null,
          documentsCited: run.result ? run.result.evidence.length : 0,
          error: run.error?.message ?? null,
        }
      })
  }

  /* ---------------------------------------------------------------- */
  /* Files                                                             */
  /* ---------------------------------------------------------------- */

  async getFile(workspaceId: string, documentId: string, versionId: string): Promise<Blob> {
    const state = demoStore.getState()
    const doc = this.requireDocument(state, workspaceId, documentId)
    const version = doc.versions.find((v) => v.id === versionId)
    if (!version) {
      throw new V2ApiError(404, 'NOT_FOUND', 'Document version not found.')
    }
    if (!doc.fileAvailable) {
      throw new V2ApiError(
        404,
        'FILE_NOT_RETAINED',
        'Original file bytes are not retained for demo uploads. The extracted text remains available.',
        { retryable: false }
      )
    }
    const bytes = generatePdf(doc.title, [
      ...version.pages.map((page) => ({
        header: `${doc.title} — rev ${version.revisionNumber}`,
        footer: page.label ?? String(page.page),
        paragraphs: page.paragraphs,
      })),
    ])
    return new Blob([bytes as BlobPart], { type: 'application/pdf' })
  }

  /* ---------------------------------------------------------------- */
  /* Internal: run pipeline simulation                                 */
  /* ---------------------------------------------------------------- */

  private executeRun(runId: string, request: RunRequest): void {
    const state = demoStore.getState()
    const stateSessionId = state.runs.find((r) => r.runId === runId)?.sessionId ?? ''
    const startedAt = Date.now()
    let queueDelay = 350

    const stage = (delay: number, fn: () => void) => {
      this.timer(delay, () => {
        const run = this.findRun(runId)
        if (!run || run.cancelled) {
          this.finalizeCancelled(runId)
          return
        }
        fn()
      })
    }

    // run.started
    stage(queueDelay, () => {
      demoStore.mutate((s) => this.withRun(s, runId, (run) => {
        run.status = 'running'
        run.startedAt = new Date().toISOString()
        this.appendEvent(run, 'run.started')
      }))
    })

    // retrieval.completed
    queueDelay += 500
    stage(queueDelay, () => {
      const state = demoStore.getState()
      const session = state.sessions.find((s) => s.id === stateSessionId)
      const run = state.runs.find((r) => r.runId === runId)
      if (!run || !session) return
      const priorQuestions = session.turns
        .filter((t) => t.assistant?.runId !== runId)
        .map((t) => t.user.text)
      const { resolved } = resolveQuestion(request.question, priorQuestions)
      const { details } = retrieve(state, request.scope, resolved ?? request.question, {
        reranker: true,
      })
      demoStore.mutate((s) => this.withRun(s, runId, (target) => {
        target.details = details
        this.appendEvent(target, 'retrieval.completed', { details })
      }))
    })

    // answer.checking
    queueDelay += 800
    stage(queueDelay, () => {
      demoStore.mutate((s) => this.withRun(s, runId, (run) => {
        this.appendEvent(run, 'answer.checking')
      }))
    })

    // answer.final + run.completed
    queueDelay += 900
    stage(queueDelay, () => {
      this.completeRun(runId, request, startedAt)
    })
  }

  private completeRun(runId: string, request: RunRequest, startedAtMs: number): void {
    const state = demoStore.getState()
    const run = state.runs.find((r) => r.runId === runId)
    if (!run || run.cancelled) {
      this.finalizeCancelled(runId)
      return
    }

    const session = state.sessions.find((s) => s.id === run.sessionId)
    const priorQuestions = (session?.turns ?? [])
      .filter((t) => t.assistant?.runId !== runId)
      .map((t) => t.user.text)

    const { resolved, needsClarification } = resolveQuestion(request.question, priorQuestions)
    const effectiveQuestion = resolved ?? request.question

    const { details, selected } = retrieve(state, request.scope, effectiveQuestion, {
      reranker: true,
    })

    const now = new Date().toISOString()
    const scopeSnapshotDocs = [...new Set(selected.map((c) => c.document.id))].map((docId) => {
      const doc = state.documents.find((d) => d.id === docId)!
      const version = doc.versions.find((v) => v.id === doc.activeVersionId)!
      return {
        id: doc.id,
        name: doc.title,
        revisionNumber: version.revisionNumber,
        buildId: doc.activeBuildId!,
      }
    })

    const assistantMessageId = session?.turns
      .find((t) => t.assistant?.runId === runId)?.assistant?.id ?? uid('msg')

    const plan = synthesizeAnswer(state, request.scope, request.question, effectiveQuestion, selected)

    const outcome = needsClarification ? 'clarification_required' : plan.outcome
    const claims = needsClarification ? [] : plan.claims
    const limitations = needsClarification
      ? [
          'This question refers to something that has not been named yet in this conversation. Please restate it, naming the document or topic you mean.',
        ]
      : plan.limitations
    const evidence = needsClarification ? [] : plan.evidence

    const promptTokens =
      estimateTokens(effectiveQuestion) +
      evidence.reduce((sum, e) => sum + estimateTokens(e.quote), 0) +
      120 /* instructions */
    const completionTokens = claims.reduce((sum, c) => sum + estimateTokens(c.text), 0) + 40

    const result: FinalAnswerResult = {
      schemaVersion: V2_SCHEMA_VERSION,
      runId,
      sessionId: run.sessionId,
      userMessageId: uid('msg'),
      assistantMessageId,
      status: 'completed',
      outcome,
      claims,
      limitations,
      conflicts: needsClarification ? [] : plan.conflicts,
      evidence,
      resolvedQuestion: resolved,
      sourceSnapshot: {
        corpusGeneration: state.workspace.corpusGeneration,
        capturedAt: run.createdAt,
        scope: request.scope,
        documents: scopeSnapshotDocs,
      },
      pipeline: {
        embeddingModel: 'acme-embed-1024 (simulated)',
        generatorModel: 'acme-answer-strict (simulated, extractive)',
        reranker: details.config.reranker,
        retrieval: 'dense+lexical-rrf',
        mode: 'strict',
      },
      warnings: [],
      checks: {
        claimsChecked: claims.length,
        supported: claims.filter((c) => c.checkStatus === 'supported').length,
        failed: claims.filter((c) => c.checkStatus !== 'supported').length,
      },
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        status: 'estimated',
      },
      timings: {
        queueMs: 350,
        retrievalMs:
          details.timings.lexicalMs + details.timings.denseMs + details.timings.fusionMs + details.timings.rerankMs,
        generationMs: 800,
        checkingMs: 900,
        totalMs: Date.now() - startedAtMs,
      },
    }

    demoStore.mutate((s) => {
      this.withRun(s, runId, (target) => {
        target.status = 'completed'
        target.outcome = outcome
        target.result = result
        target.completedAt = now
        target.details = details
        this.appendEvent(target, 'answer.final', { result })
        this.appendEvent(target, 'run.completed')
      })
      const sess = s.sessions.find((x) => x.id === run.sessionId)
      const turn = sess?.turns.find((t) => t.assistant?.runId === runId)
      if (turn?.assistant) {
        turn.assistant.status = 'completed'
        turn.assistant.result = result
        turn.assistant.at = now
      }
      if (sess) sess.updatedAt = now
    })
  }

  private finalizeCancelled(runId: string): void {
    const state = demoStore.getState()
    const run = state.runs.find((r) => r.runId === runId)
    if (!run) return
    const last = run.events[run.events.length - 1]
    if (
      last &&
      (last.type === 'run.cancelled' ||
        last.type === 'run.completed' ||
        last.type === 'run.failed' ||
        last.type === 'run.interrupted')
    ) {
      return
    }
    const now = new Date().toISOString()
    demoStore.mutate((s) => {
      this.withRun(s, runId, (target) => {
        target.status = 'cancelled'
        target.completedAt = now
        this.appendEvent(target, 'run.cancelled')
      })
      const sess = s.sessions.find((x) => x.id === run.sessionId)
      const turn = sess?.turns.find((t) => t.assistant?.runId === runId)
      if (turn?.assistant) {
        turn.assistant.status = 'cancelled'
        turn.assistant.error = 'Run cancelled.'
      }
    })
  }

  /* ---------------------------------------------------------------- */
  /* Internal: build pipeline simulation                               */
  /* ---------------------------------------------------------------- */

  private advanceBuild(buildId: string, onParsed?: () => void): void {
    const step = (stageIndex: number) => {
      if (stageIndex >= BUILD_PIPELINE_STAGES.length - 1) {
        this.activateBuild(buildId)
        return
      }
      const stage = BUILD_PIPELINE_STAGES[stageIndex + 1]
      const duration = STAGE_DURATIONS[stage] ?? 800
      this.timer(duration, () => {
        const state = demoStore.getState()
        const doc = state.documents.find((d) => d.builds.some((b) => b.id === buildId))
        const build = doc?.builds.find((b) => b.id === buildId)
        if (!build || build.state === 'cancelled' || build.state === 'failed') return
        if (doc?.lifecycle === 'deleted') {
          demoStore.mutate((s) => {
            const target = s.documents
              .find((d) => d.builds.some((b) => b.id === buildId))
              ?.builds.find((b) => b.id === buildId)
            if (target && target.state !== 'ready') {
              target.state = 'cancelled'
              target.stageHistory.push({ stage: 'cancelled', detail: 'Document deleted during ingestion.', at: new Date().toISOString() })
            }
          })
          return
        }
        if (stage === 'parsing' && onParsed) onParsed()
        demoStore.mutate((s) => {
          const target = s.documents
            .find((d) => d.builds.some((b) => b.id === buildId))
            ?.builds.find((b) => b.id === buildId)
          if (!target || target.state === 'ready' || target.state === 'superseded') return
          target.state = stage
          target.stageHistory.push({
            stage,
            detail: buildStageDetail(stage, target.chunks.length),
            at: new Date().toISOString(),
          })
        })
        step(stageIndex + 1)
      })
    }
    step(0)
  }

  private activateBuild(buildId: string): void {
    const now = new Date().toISOString()
    demoStore.mutate((s) => {
      const doc = s.documents.find((d) => d.builds.some((b) => b.id === buildId))
      if (!doc || doc.lifecycle === 'deleted') return
      const build = doc.builds.find((b) => b.id === buildId)
      if (!build || build.state === 'cancelled' || build.state === 'failed') return
      // Supersede any previous active build.
      const previousActive = doc.builds.find((b) => b.id === doc.activeBuildId && b.id !== buildId)
      if (previousActive) {
        previousActive.state = 'superseded'
        previousActive.stageHistory.push({ stage: 'superseded', detail: null, at: now })
      }
      build.state = 'ready'
      build.completedAt = now
      build.stageHistory.push({ stage: 'ready', detail: null, at: now })
      doc.activeVersionId = build.versionId
      doc.activeBuildId = buildId
      doc.updatedAt = now
      doc.activity.push({
        at: now,
        kind: 'build_ready',
        detail: `Build ${buildId.slice(0, 12)} ready and activated (${build.chunks.length} chunks)`,
      })
      s.workspace.corpusGeneration += 1
    })
  }

  private resumeBuilds(): void {
    const state = demoStore.getState()
    for (const doc of state.documents) {
      for (const build of doc.builds) {
        if (isNonTerminal(build.state)) {
          const stageIndex = BUILD_PIPELINE_STAGES.indexOf(build.state)
          if (stageIndex >= 0) {
            this.advanceBuild(build.id)
          }
        }
      }
    }
  }

  /* ---------------------------------------------------------------- */
  /* Internal helpers                                                  */
  /* ---------------------------------------------------------------- */

  private eventsPath(workspaceId: string, runId: string): string {
    return `/v2/workspaces/${workspaceId}/runs/${runId}/events`
  }

  private requireWorkspace(state: DemoState, workspaceId: string): void {
    if (state.workspace.id !== workspaceId) {
      throw new V2ApiError(404, 'NOT_FOUND', 'Workspace not found.', { retryable: false })
    }
  }

  private requireDocument(state: DemoState, workspaceId: string, documentId: string): DemoDocument {
    this.requireWorkspace(state, workspaceId)
    const doc = state.documents.find(
      (d) => d.id === documentId && d.workspaceId === workspaceId
    )
    if (!doc || doc.lifecycle === 'deleted') {
      throw new V2ApiError(404, 'NOT_FOUND', 'Document not found.', { retryable: false })
    }
    return doc
  }

  private requireSession(state: DemoState, workspaceId: string, sessionId: string) {
    this.requireWorkspace(state, workspaceId)
    const session = state.sessions.find((s) => s.id === sessionId)
    if (!session) {
      throw new V2ApiError(404, 'NOT_FOUND', 'Session not found.', { retryable: false })
    }
    return session
  }

  private requireRun(state: DemoState, workspaceId: string, runId: string): DemoRun {
    this.requireWorkspace(state, workspaceId)
    const run = state.runs.find((r) => r.runId === runId)
    if (!run) {
      throw new V2ApiError(404, 'NOT_FOUND', 'Run not found.', { retryable: false })
    }
    return run
  }

  private findRun(runId: string): DemoRun | undefined {
    return demoStore.getState().runs.find((r) => r.runId === runId)
  }

  private withRun(state: DemoState, runId: string, fn: (run: DemoRun) => void): void {
    const run = state.runs.find((r) => r.runId === runId)
    if (run) fn(run)
  }

  private appendEvent(run: DemoRun, type: RunEventType, payload?: Record<string, unknown>): void {
    run.events.push({
      runId: run.runId,
      sequence: run.events.length + 1,
      type,
      schemaVersion: V2_SCHEMA_VERSION,
      at: new Date().toISOString(),
      ...(payload ? { payload } : {}),
    })
  }

  private toDocumentSummary(doc: DemoDocument): DocumentSummary {
    const activeVersion = doc.versions.find((v) => v.id === doc.activeVersionId) ?? null
    const activeBuild = doc.builds.find((b) => b.id === doc.activeBuildId) ?? null
    const pendingBuild =
      doc.builds.find(
        (b) => b.id !== doc.activeBuildId && isNonTerminal(b.state) && b.state !== 'cancelled'
      ) ?? null
    return {
      id: doc.id,
      workspaceId: doc.workspaceId,
      title: doc.title,
      tags: [...doc.tags],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      lifecycle: doc.lifecycle,
      deletedAt: doc.deletedAt,
      activeVersion: activeVersion
        ? {
            id: activeVersion.id,
            revisionNumber: activeVersion.revisionNumber,
            createdAt: activeVersion.createdAt,
            pageCount: activeVersion.pageCount,
            sizeBytes: activeVersion.sizeBytes,
          }
        : null,
      activeBuild: activeBuild
        ? {
            id: activeBuild.id,
            state: activeBuild.state,
            chunkCount: activeBuild.chunks.length,
            readyAt: activeBuild.completedAt,
            error: activeBuild.error,
          }
        : null,
      pendingBuild: pendingBuild
        ? {
            id: pendingBuild.id,
            state: pendingBuild.state,
            revisionNumber: pendingBuild.revisionNumber,
            createdAt: pendingBuild.createdAt,
          }
        : null,
    }
  }

  private toBuildView(build: DemoBuild) {
    return {
      id: build.id,
      documentId: build.documentId,
      versionId: build.versionId,
      revisionNumber: build.revisionNumber,
      state: build.state,
      stageHistory: build.stageHistory,
      chunkCount: build.chunks.length,
      vectorCount: build.state === 'ready' ? build.chunks.length : null,
      embeddingProfile: { model: 'acme-embed-1024', dimensions: 1024 },
      configHash: build.configHash,
      warnings: [...build.warnings],
      error: build.error,
      retryable: build.retryable,
      createdAt: build.createdAt,
      completedAt: build.completedAt,
    }
  }

  private toSessionSummary(session: {
    id: string
    workspaceId: string
    title: string
    createdAt: string
    updatedAt: string
    turns: unknown[]
  }): ChatSessionSummary {
    return {
      id: session.id,
      workspaceId: session.workspaceId,
      title: session.title,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      messageCount: session.turns.length,
    }
  }

  private timer(delay: number, fn: () => void): void {
    const t = setTimeout(() => {
      this.runningTimers.delete(t)
      fn()
    }, delay)
    this.runningTimers.add(t)
  }
}

function isNonTerminal(state: string): boolean {
  return !['ready', 'failed', 'cancelled', 'superseded'].includes(state)
}

function buildStageDetail(stage: string, chunkCount: number): string | null {
  switch (stage) {
    case 'validating_source':
      return 'Checksum and limits verified'
    case 'parsing':
      return 'Canonical page text extracted'
    case 'chunking':
      return chunkCount > 0 ? `${chunkCount} chunks created` : 'Chunks created'
    case 'embedding':
      return 'Embeddings batched and indexed'
    case 'indexing':
      return 'Vectors upserted'
    case 'checking_readiness':
      return 'Manifest verified against index'
    default:
      return null
  }
}

/* ------------------------------------------------------------------ */
/* PDF.js text extraction                                              */
/* ------------------------------------------------------------------ */

async function extractPdfPages(file: File | Blob): Promise<{
  pages: DemoStoredPage[]
  encounteredBinaryNoise: boolean
}> {
  const { pdfjs } = await import('react-pdf')
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `/pdfjs/${pdfjs.version}/pdf.worker.min.mjs`
  }
  const buffer = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise

  const pages: DemoStoredPage[] = []
  let noise = false
  for (let pageNumber = 1; pageNumber <= Math.min(doc.numPages, MAX_PAGES); pageNumber++) {
    const page = await doc.getPage(pageNumber)
    const content = await page.getTextContent()
    const lines: string[] = []
    let current = ''
    for (const item of content.items) {
      if ('str' in item) {
        current += item.str
        if (item.hasEOL) {
          lines.push(current.trim())
          current = ''
        }
      }
    }
    if (current.trim()) lines.push(current.trim())

    // Group lines into paragraphs: sentence terminators close a block.
    const paragraphs: string[] = []
    let paragraph = ''
    for (const line of lines) {
      if (!line) continue
      paragraph = paragraph ? `${paragraph} ${line}` : line
      if (/[.!?:]$/.test(line) || line.length < 40) {
        paragraphs.push(paragraph)
        paragraph = ''
      }
    }
    if (paragraph) paragraphs.push(paragraph)

    if (paragraphs.join('').replace(/\s/g, '').length === 0 && lines.length > 0) {
      noise = true
    }
    pages.push({ page: pageNumber, label: null, paragraphs })
  }
  return { pages, encounteredBinaryNoise: noise }
}
