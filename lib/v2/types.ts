/**
 * Gnosis v2 API contract types.
 *
 * Mirrors the /v2 HTTP and event contracts from the product
 * specification: explicit search scopes, structured claims with stable
 * evidence identity, honest answer outcomes, version-aware documents
 * and builds, and a two-step durable run protocol (POST run, then
 * subscribe to its event stream).
 */

export const V2_SCHEMA_VERSION = '2.0'

/* ------------------------------------------------------------------ */
/* Errors (spec §15.5)                                                */
/* ------------------------------------------------------------------ */

export interface V2ErrorBody {
  error: {
    code: string
    message: string
    retryable: boolean
    requestId: string
  }
}

export class V2ApiError extends Error {
  status: number
  code: string
  retryable: boolean
  requestId: string

  constructor(
    status: number,
    code: string,
    message: string,
    opts: { retryable?: boolean; requestId?: string } = {}
  ) {
    super(message)
    this.name = 'V2ApiError'
    this.status = status
    this.code = code
    this.retryable = opts.retryable ?? status >= 500
    this.requestId = opts.requestId ?? 'unknown'
  }
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

export interface CursorPage<T> {
  items: T[]
  nextCursor: string | null
}

/* ------------------------------------------------------------------ */
/* Workspaces, membership, quotas                                      */
/* ------------------------------------------------------------------ */

export type WorkspaceRole = 'owner' | 'editor' | 'viewer'

export interface WorkspaceQuota {
  maxDocuments: number
  maxUploadBytes: number
  maxSourceBytes: number
  maxChunks: number
  maxSelectedDocuments: number
}

export interface WorkspaceUsage {
  documentCount: number
  sourceBytes: number
  activeChunks: number
  runsThisMonth: number
}

export interface WorkspaceSummary {
  id: string
  name: string
  role: WorkspaceRole
  documentCount: number
  createdAt: string
}

export interface Workspace {
  id: string
  name: string
  role: WorkspaceRole
  createdAt: string
  /** Monotonic counter incremented when the active corpus changes. */
  corpusGeneration: number
  quota: WorkspaceQuota
  usage: WorkspaceUsage
}

export interface WorkspaceMember {
  userId: string
  email: string
  role: WorkspaceRole
  status: 'active' | 'revoked'
  joinedAt: string
}

/* ------------------------------------------------------------------ */
/* Documents, versions, and index builds                               */
/* ------------------------------------------------------------------ */

export type BuildState =
  | 'queued'
  | 'validating_source'
  | 'parsing'
  | 'chunking'
  | 'embedding'
  | 'indexing'
  | 'checking_readiness'
  | 'ready'
  | 'retry_wait'
  | 'failed'
  | 'cancelled'
  | 'superseded'

export const BUILD_PIPELINE_STAGES: BuildState[] = [
  'queued',
  'validating_source',
  'parsing',
  'chunking',
  'embedding',
  'indexing',
  'checking_readiness',
  'ready',
]

export interface BuildStageEntry {
  stage: BuildState
  detail: string | null
  at: string
}

export interface IndexBuild {
  id: string
  documentId: string
  versionId: string
  revisionNumber: number
  state: BuildState
  stageHistory: BuildStageEntry[]
  chunkCount: number | null
  vectorCount: number | null
  embeddingProfile: { model: string; dimensions: number }
  configHash: string
  warnings: string[]
  error: string | null
  retryable: boolean
  createdAt: string
  completedAt: string | null
}

export interface DocumentVersion {
  id: string
  documentId: string
  revisionNumber: number
  createdAt: string
  sizeBytes: number
  pageCount: number
  contentHash: string
  sourceLabel: string | null
  creatorEmail: string
}

export interface DocumentSummary {
  id: string
  workspaceId: string
  title: string
  tags: string[]
  createdAt: string
  updatedAt: string
  lifecycle: 'active' | 'deleted'
  deletedAt: string | null
  activeVersion: {
    id: string
    revisionNumber: number
    createdAt: string
    pageCount: number
    sizeBytes: number
  } | null
  activeBuild: {
    id: string
    state: BuildState
    chunkCount: number | null
    readyAt: string | null
    error: string | null
  } | null
  /** A replacement revision that is being processed, if any. */
  pendingBuild: {
    id: string
    state: BuildState
    revisionNumber: number
    createdAt: string
  } | null
}

export interface DocumentActivityEntry {
  at: string
  kind: 'created' | 'version_uploaded' | 'build_ready' | 'build_failed' | 'activated' | 'deleted' | 'purge_completed'
  detail: string
}

export interface DocumentDetail extends DocumentSummary {
  versions: DocumentVersion[]
  builds: IndexBuild[]
  activity: DocumentActivityEntry[]
  /** Canonical extracted text per page, for the "Extracted text" view. */
  extraction: {
    parser: string
    pageCount: number
    pagesWithNoText: number[]
    pages: { page: number; text: string }[]
  } | null
  /** Whether original file bytes can be served (demo uploads skip them). */
  fileAvailable: boolean
  purgeTask: { id: string; state: 'pending' | 'complete' | 'failed'; detail: string | null } | null
}

/* ------------------------------------------------------------------ */
/* Uploads (spec §11.1)                                                */
/* ------------------------------------------------------------------ */

export interface CreateUploadRequest {
  fileName: string
  sizeBytes: number
  contentType: string
  /** When replacing an existing logical document with a new revision. */
  newRevisionOfDocumentId?: string
}

export interface UploadSession {
  id: string
  uploadUrl: string
  method: 'PUT'
  expiresAt: string
  maxBytes: number
}

export interface ConfirmUploadRequest {
  idempotencyKey: string
}

export interface IngestionAccepted {
  documentId: string
  versionId: string
  buildId: string
  revisionNumber: number
}

/* ------------------------------------------------------------------ */
/* Search scope (RET-01)                                               */
/* ------------------------------------------------------------------ */

export type SearchScope =
  | { type: 'all_current' }
  | { type: 'selected_documents'; documentIds: string[] }

export function scopeLabel(scope: SearchScope, docNames?: Map<string, string>): string {
  if (scope.type === 'all_current') return 'All current documents'
  const n = scope.documentIds.length
  if (n === 1 && docNames) {
    return docNames.get(scope.documentIds[0]) ?? '1 document'
  }
  return `${n} selected ${n === 1 ? 'document' : 'documents'}`
}

/* ------------------------------------------------------------------ */
/* Answer runs (spec §13, §15, §16)                                    */
/* ------------------------------------------------------------------ */

export type RunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'interrupted'

export type AnswerOutcome =
  | 'answered'
  | 'partial'
  | 'conflicting_sources'
  | 'insufficient_evidence'
  | 'clarification_required'

export type RunMode = 'strict'

export interface RunRequest {
  question: string
  scope: SearchScope
  mode: RunMode
  /** Client-generated idempotency identity for this question. */
  clientMessageId: string
}

export interface RunCreated {
  schemaVersion: string
  runId: string
  status: RunStatus
  eventsPath: string
}

/* ------------------------------------------------------------------ */
/* Evidence and structured answers                                     */
/* ------------------------------------------------------------------ */

export interface EvidenceRecord {
  /** Stable identity shared by chat, explorer, persistence, replay. */
  evidenceId: string
  documentId: string
  documentName: string
  versionId: string
  revisionNumber: number
  buildId: string
  chunkId: string
  /** Exact source-derived passage; never a generated paraphrase. */
  quote: string
  /** 1-based physical PDF page. */
  physicalPage: number
  pageLabel: string | null
  adjacentContext: { before: string | null; after: string | null } | null
  /** What location precision is actually available for this passage. */
  locationPrecision: 'page' | 'span'
}

export type ClaimCheckStatus = 'supported' | 'unsupported' | 'contradicted' | 'uncertain'

export interface AnswerClaim {
  ordinal: number
  text: string
  evidenceIds: string[]
  checkStatus: ClaimCheckStatus
  checkNote: string | null
}

export interface SourceConflict {
  description: string
  evidenceIds: string[]
}

export interface UsageSummary {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  status: 'known' | 'estimated' | 'unavailable'
}

export interface RunTimings {
  queueMs: number
  retrievalMs: number
  generationMs: number
  checkingMs: number
  totalMs: number
}

export interface SourceSnapshotDocument {
  id: string
  name: string
  revisionNumber: number
  buildId: string
}

export interface SourceSnapshot {
  corpusGeneration: number
  capturedAt: string
  scope: SearchScope
  documents: SourceSnapshotDocument[]
}

export interface PipelineProvenance {
  embeddingModel: string
  generatorModel: string
  reranker: string | null
  retrieval: 'dense+lexical-rrf' | 'dense'
  mode: RunMode
}

export interface FinalAnswerResult {
  schemaVersion: string
  runId: string
  sessionId: string
  userMessageId: string
  assistantMessageId: string
  status: RunStatus
  outcome: AnswerOutcome
  claims: AnswerClaim[]
  limitations: string[]
  conflicts: SourceConflict[]
  evidence: EvidenceRecord[]
  /** Resolved query when conversational references were rewritten. */
  resolvedQuestion: string | null
  sourceSnapshot: SourceSnapshot
  pipeline: PipelineProvenance
  warnings: string[]
  checks: { claimsChecked: number; supported: number; failed: number }
  usage: UsageSummary
  timings: RunTimings
}

/* ------------------------------------------------------------------ */
/* Run events (spec §16.1)                                             */
/* ------------------------------------------------------------------ */

export type RunEventType =
  | 'run.queued'
  | 'run.started'
  | 'retrieval.completed'
  | 'answer.checking'
  | 'answer.final'
  | 'run.completed'
  | 'run.failed'
  | 'run.cancelled'
  | 'run.interrupted'

export interface RunEvent {
  runId: string
  sequence: number
  type: RunEventType
  schemaVersion: string
  at: string
  payload?: Record<string, unknown>
}

/** Payload carried by the retrieval.completed event. */
export interface RetrievalCompletedPayload {
  details: RetrievalDetailsView
}

/** Payload carried by terminal events. */
export interface RunErrorPayload {
  code: string
  message: string
  retryable: boolean
}

/* ------------------------------------------------------------------ */
/* Retrieval diagnostics (scoped to the run owner)                     */
/* ------------------------------------------------------------------ */

export interface RetrievalCandidateView {
  chunkId: string
  documentId: string
  documentName: string
  denseRank: number | null
  lexicalRank: number | null
  fusionScore: number
  rerankRank: number | null
  selected: boolean
}

export interface RetrievalDetailsView {
  normalizedQuery: string
  candidates: RetrievalCandidateView[]
  timings: { lexicalMs: number; denseMs: number; fusionMs: number; rerankMs: number }
  config: {
    denseTopK: number
    lexicalTopK: number
    rrfConstant: number
    reranker: string | null
  }
}

/* ------------------------------------------------------------------ */
/* Sessions and message history                                        */
/* ------------------------------------------------------------------ */

export interface ChatSessionSummary {
  id: string
  workspaceId: string
  title: string
  createdAt: string
  updatedAt: string
  messageCount: number
}

export interface AssistantMessageView {
  id: string
  runId: string
  at: string
  status: RunStatus
  result: FinalAnswerResult | null
  error: string | null
}

export interface SessionTurnView {
  sequence: number
  user: {
    id: string
    text: string
    at: string
    scope: SearchScope
  }
  assistant: AssistantMessageView | null
}

/* ------------------------------------------------------------------ */
/* Diagnostics                                                         */
/* ------------------------------------------------------------------ */

export interface RunSummary {
  runId: string
  sessionId: string
  sessionTitle: string
  question: string
  scope: SearchScope
  status: RunStatus
  outcome: AnswerOutcome | null
  startedAt: string
  completedAt: string | null
  timings: RunTimings | null
  documentsCited: number
  error: string | null
}

/* ------------------------------------------------------------------ */
/* Client interface                                                    */
/* ------------------------------------------------------------------ */

export interface StreamHandlers {
  onEvent: (event: RunEvent) => void
  signal?: AbortSignal
}

export interface GnosisClient {
  /** True when this client runs entirely locally (curated corpus). */
  readonly demo: boolean

  listWorkspaces(): Promise<WorkspaceSummary[]>
  getWorkspace(workspaceId: string): Promise<Workspace>
  listMembers(workspaceId: string): Promise<WorkspaceMember[]>

  listDocuments(workspaceId: string, cursor?: string): Promise<CursorPage<DocumentSummary>>
  getDocument(workspaceId: string, documentId: string): Promise<DocumentDetail>
  updateDocument(
    workspaceId: string,
    documentId: string,
    patch: { title?: string; tags?: string[] }
  ): Promise<DocumentSummary>
  deleteDocument(workspaceId: string, documentId: string): Promise<{ purgeTaskId: string }>
  reindexDocument(workspaceId: string, documentId: string): Promise<{ buildId: string }>
  retryBuild(workspaceId: string, buildId: string): Promise<void>

  createUpload(workspaceId: string, request: CreateUploadRequest): Promise<UploadSession>
  /** Transfer bytes to the upload session's target (presigned URL or demo staging). */
  uploadFile(session: UploadSession, file: File | Blob): Promise<void>
  confirmUpload(
    workspaceId: string,
    uploadId: string,
    request: ConfirmUploadRequest
  ): Promise<IngestionAccepted>

  listSessions(workspaceId: string, cursor?: string): Promise<CursorPage<ChatSessionSummary>>
  createSession(workspaceId: string, title: string): Promise<ChatSessionSummary>
  renameSession(workspaceId: string, sessionId: string, title: string): Promise<void>
  deleteSession(workspaceId: string, sessionId: string): Promise<void>
  getSessionTurns(workspaceId: string, sessionId: string): Promise<SessionTurnView[]>

  createRun(
    workspaceId: string,
    sessionId: string,
    request: RunRequest
  ): Promise<RunCreated>
  getRun(workspaceId: string, runId: string): Promise<{ status: RunStatus; result: FinalAnswerResult | null; error: RunErrorPayload | null }>
  cancelRun(workspaceId: string, runId: string): Promise<void>
  streamRunEvents(
    workspaceId: string,
    runId: string,
    after: number,
    handlers: StreamHandlers
  ): Promise<void>
  getRunDiagnostics(workspaceId: string, runId: string): Promise<RetrievalDetailsView | null>

  listRuns(workspaceId: string, limit?: number): Promise<RunSummary[]>

  /** Authorized file bytes for a specific version (demo corpus PDFs are generated). */
  getFile(
    workspaceId: string,
    documentId: string,
    versionId: string
  ): Promise<Blob>
}
