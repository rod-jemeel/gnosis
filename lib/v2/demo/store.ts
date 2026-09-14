/**
 * Demo store.
 *
 * Client-side persistent state for demo mode: workspace, documents with
 * immutable versions and index builds, private chat sessions, and answer
 * runs with their event streams. State survives page refreshes (spec
 * §16.2: status and rendered answers must survive a refresh), and
 * in-flight ingestion resumes from its durable stage on reload.
 */

import {
  DEMO_CORPUS,
  DEMO_WORKSPACE_ID,
  demoMemberSeed,
} from './corpus'
import type {
  BuildStageEntry,
  BuildState,
  DocumentActivityEntry,
  SearchScope,
  FinalAnswerResult,
  RunEvent,
} from '../types'

/* ------------------------------------------------------------------ */
/* Stored shapes                                                       */
/* ------------------------------------------------------------------ */

export interface DemoStoredPage {
  page: number
  label: string | null
  paragraphs: string[]
}

export interface DemoStoredVersion {
  id: string
  documentId: string
  revisionNumber: number
  createdAt: string
  sizeBytes: number
  pageCount: number
  contentHash: string
  sourceLabel: string | null
  creatorEmail: string
  pages: DemoStoredPage[]
}

export interface DemoChunk {
  id: string
  ordinal: number
  page: number
  text: string
}

export interface DemoBuild {
  id: string
  documentId: string
  versionId: string
  revisionNumber: number
  state: BuildState
  stageHistory: BuildStageEntry[]
  chunks: DemoChunk[]
  warnings: string[]
  error: string | null
  retryable: boolean
  configHash: string
  createdAt: string
  completedAt: string | null
}

export interface DemoDocument {
  id: string
  workspaceId: string
  title: string
  tags: string[]
  createdAt: string
  updatedAt: string
  lifecycle: 'active' | 'deleted'
  deletedAt: string | null
  versions: DemoStoredVersion[]
  activeVersionId: string | null
  builds: DemoBuild[]
  activeBuildId: string | null
  activity: DocumentActivityEntry[]
  parser: string
  fileAvailable: boolean
  purgeTask: { id: string; state: 'pending' | 'complete' | 'failed'; detail: string | null; at: string } | null
}

export interface DemoTurn {
  sequence: number
  user: { id: string; text: string; at: string; scope: SearchScope }
  assistant: {
    id: string
    runId: string
    at: string
    status: FinalAnswerResult['status']
    result: FinalAnswerResult | null
    error: string | null
  } | null
}

export interface DemoSession {
  id: string
  workspaceId: string
  title: string
  createdAt: string
  updatedAt: string
  turns: DemoTurn[]
}

export interface DemoRun {
  runId: string
  sessionId: string
  question: string
  scope: SearchScope
  status: FinalAnswerResult['status']
  outcome: FinalAnswerResult['outcome'] | null
  result: FinalAnswerResult | null
  error: { code: string; message: string; retryable: boolean } | null
  events: RunEvent[]
  details: import('../types').RetrievalDetailsView | null
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  cancelled: boolean
}

export interface DemoState {
  version: number
  workspace: {
    id: string
    name: string
    createdAt: string
    corpusGeneration: number
  }
  members: ReturnType<typeof demoMemberSeed>
  documents: DemoDocument[]
  sessions: DemoSession[]
  runs: DemoRun[]
  usage: { runsThisMonth: number; monthKey: string }
}

/* ------------------------------------------------------------------ */
/* Utilities                                                           */
/* ------------------------------------------------------------------ */

export function uid(prefix = ''): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`
  return prefix ? `${prefix}-${random}` : random
}

/** Deterministic FNV-1a hash, hex encoded. */
export function fnv1a(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

/** Deterministic pseudo-random value in [0,1) from a string seed. */
export function seededRandom(seed: string): number {
  let h = fnv1a(seed)
  h = fnv1a(h + seed)
  return parseInt(h, 16) / 0x100000000
}

const STORAGE_KEY = 'gnosis.demo.v2.state'
const STATE_VERSION = 1
const MAX_RUNS = 40

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

function seedState(): DemoState {
  const now = Date.now()
  const state: DemoState = {
    version: STATE_VERSION,
    workspace: {
      id: DEMO_WORKSPACE_ID,
      name: 'Platform Docs',
      createdAt: new Date(now - 90 * 86400000).toISOString(),
      corpusGeneration: 3,
    },
    members: demoMemberSeed(),
    documents: [],
    sessions: [],
    runs: [],
    usage: { runsThisMonth: 0, monthKey: new Date().toISOString().slice(0, 7) },
  }

  for (const doc of DEMO_CORPUS) {
    const docId = doc.id
    const createdAt = new Date(now + doc.versions[0].createdAtOffsetDays * 86400000).toISOString()
    const document: DemoDocument = {
      id: docId,
      workspaceId: DEMO_WORKSPACE_ID,
      title: doc.title,
      tags: [...doc.tags],
      createdAt,
      updatedAt: createdAt,
      lifecycle: 'active',
      deletedAt: null,
      versions: [],
      activeVersionId: null,
      builds: [],
      activeBuildId: null,
      activity: [],
      parser: 'pdfjs-demo',
      fileAvailable: true,
      purgeTask: null,
    }

    doc.versions.forEach((version) => {
      const versionId = `${docId}-v${version.revisionNumber}`
      const pages: DemoStoredPage[] = version.pages.map((p) => ({
        page: p.page,
        label: p.label,
        paragraphs: [...p.paragraphs],
      }))
      const versionCreatedAt = new Date(
        now + version.createdAtOffsetDays * 86400000
      ).toISOString()
      const bodyText = pages.flatMap((p) => p.paragraphs).join('\n\n')
      document.versions.push({
        id: versionId,
        documentId: docId,
        revisionNumber: version.revisionNumber,
        createdAt: versionCreatedAt,
        sizeBytes: bodyText.length + 4200 + version.revisionNumber * 137,
        pageCount: pages.length,
        contentHash: fnv1a(`${docId}:${version.revisionNumber}:${bodyText}`),
        sourceLabel: version.sourceLabel,
        creatorEmail: 'demo@gnosis.local',
        pages,
      })

      const buildId = `${docId}-b${version.revisionNumber}`
      const chunks = chunkPages(pages, buildId)
      const isLatest = version.revisionNumber === doc.versions.length
      const buildCompletedAt = new Date(
        now + (version.createdAtOffsetDays + 1) * 86400000
      ).toISOString()

      document.builds.push({
        id: buildId,
        documentId: docId,
        versionId,
        revisionNumber: version.revisionNumber,
        state: isLatest ? 'ready' : 'superseded',
        stageHistory: buildSeedHistory(versionCreatedAt, buildCompletedAt),
        chunks,
        warnings: [],
        error: null,
        retryable: false,
        configHash: fnv1a(`chunk:target=400:overlap=60:embed=acme-embed-1024`),
        createdAt: versionCreatedAt,
        completedAt: buildCompletedAt,
      })

      document.activity.push({
        at: versionCreatedAt,
        kind: 'version_uploaded',
        detail: `Revision ${version.revisionNumber} uploaded`,
      })
      document.activity.push({
        at: buildCompletedAt,
        kind: isLatest ? 'build_ready' : 'activated',
        detail: isLatest
          ? `Build ${buildId} ready and activated (${chunks.length} chunks)`
          : `Build ${buildId} superseded by revision ${doc.versions.length}`,
      })

      if (isLatest) {
        document.activeVersionId = versionId
        document.activeBuildId = buildId
        document.updatedAt = buildCompletedAt
      }
    })

    state.documents.push(document)
  }

  return state
}

function buildSeedHistory(from: string, to: string): BuildStageEntry[] {
  const start = new Date(from).getTime()
  const end = Math.max(new Date(to).getTime(), start + 60_000)
  const stages: BuildState[] = [
    'queued',
    'validating_source',
    'parsing',
    'chunking',
    'embedding',
    'indexing',
    'checking_readiness',
    'ready',
  ]
  return stages.map((stage, i) => ({
    stage,
    detail: null,
    at: new Date(start + ((end - start) * i) / stages.length).toISOString(),
  }))
}

/** Split page paragraphs into retrieval chunks (demo chunking policy). */
export function chunkPages(pages: DemoStoredPage[], buildId: string): DemoChunk[] {
  const chunks: DemoChunk[] = []
  const hardCharCap = 800 * 4
  for (const page of pages) {
    for (const paragraph of page.paragraphs) {
      if (paragraph.length <= hardCharCap) {
        chunks.push({
          id: `${buildId}:c${chunks.length}`,
          ordinal: chunks.length,
          page: page.page,
          text: paragraph,
        })
      } else {
        // Split long paragraphs at word boundaries.
        let remaining = paragraph
        while (remaining.length > 0) {
          let cut = Math.min(hardCharCap, remaining.length)
          if (cut < remaining.length) {
            const lastSpace = remaining.lastIndexOf(' ', cut)
            if (lastSpace > hardCharCap / 2) cut = lastSpace
          }
          chunks.push({
            id: `${buildId}:c${chunks.length}`,
            ordinal: chunks.length,
            page: page.page,
            text: remaining.slice(0, cut).trim(),
          })
          remaining = remaining.slice(cut).trim()
        }
      }
    }
  }
  return chunks
}

/* ------------------------------------------------------------------ */
/* Singleton with subscription                                         */
/* ------------------------------------------------------------------ */

type Listener = () => void

class DemoStore {
  private state: DemoState | null = null
  private listeners = new Set<Listener>()
  private saveTimer: ReturnType<typeof setTimeout> | null = null
  /** Increments on every mutation; used as a useSyncExternalStore snapshot. */
  version = 0

  getState(): DemoState {
    if (this.state) return this.state
    if (typeof window === 'undefined') {
      // Server render: seed a readable snapshot without persistence.
      this.state = seedState()
      return this.state
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as DemoState
        if (parsed.version === STATE_VERSION) {
          this.state = parsed
          this.resetUsageMonth(parsed)
          return parsed
        }
      }
    } catch {
      // Corrupt state falls through to a fresh seed.
    }
    this.state = seedState()
    this.persist()
    return this.state
  }

  /** Mutate state and notify subscribers. */
  mutate(fn: (state: DemoState) => void): void {
    const state = this.getState()
    fn(state)
    this.version += 1
    this.persist()
    this.emit()
  }

  // Arrow property: subscribe is passed around detached (e.g. to
  // useSyncExternalStore) and must not depend on `this` binding.
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): DemoState => this.getState()

  reset(): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY)
    }
    this.state = seedState()
    this.version += 1
    this.persist()
    this.emit()
  }

  private resetUsageMonth(state: DemoState): void {
    const monthKey = new Date().toISOString().slice(0, 7)
    if (state.usage.monthKey !== monthKey) {
      state.usage = { runsThisMonth: 0, monthKey }
    }
  }

  private persist(): void {
    if (typeof window === 'undefined') return
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null
      try {
        // Cap retained runs to bound storage growth.
        const state = this.state
        if (state && state.runs.length > MAX_RUNS) {
          state.runs = state.runs.slice(state.runs.length - MAX_RUNS)
        }
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        // Storage full: demo keeps working in-memory.
      }
    }, 150)
  }

  private emit(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }
}

export const demoStore = new DemoStore()
