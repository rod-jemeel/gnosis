'use client'

/**
 * Unified chat view (spec §6.3, §6.4, §13, §16).
 *
 * One component backs both /chat and /chat/[sessionId]. It implements
 * the two-step durable run protocol (create the run, then subscribe to
 * its event stream), explicit search scoping, strict-mode status
 * display, idempotent question submission, cancellation, and the
 * Evidence Explorer with fully separate state variables for
 * searchScope, viewedDocumentVersionId, viewedPage, and
 * selectedEvidenceId.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Cube,
  Plus,
  Warning,
  ArrowCounterClockwise,
  ShieldCheck,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { useWorkspace } from '@/lib/workspace'
import { DEMO_SUGGESTIONS, V2ApiError, scopeLabel } from '@/lib/v2'
import type {
  DocumentSummary,
  EvidenceRecord,
  FinalAnswerResult,
  RetrievalDetailsView,
  RunEvent,
  RunEventType,
  SearchScope,
  SessionTurnView,
} from '@/lib/v2'
import { ChatInput } from './chat-input'
import { ScopeSelector } from './scope-selector'
import { RunStatus } from './run-status'
import { AnswerMessage } from './answer-message'
import { EvidenceExplorer } from '@/components/evidence/evidence-explorer'
import { PdfViewer, type PdfViewerRef } from '@/components/pdf'
import { cn } from '@/lib/utils'

interface ActiveRun {
  runId: string
  seen: RunEventType[]
  details: RetrievalDetailsView | null
}

interface ChatViewProps {
  sessionId?: string
}

export function ChatView({ sessionId: initialSessionId }: ChatViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isMobile = useIsMobile()
  const { client, workspace, isDemo, loading: wsLoading } = useWorkspace()

  const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId)
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [turns, setTurns] = useState<SessionTurnView[]>([])
  const [historyLoading, setHistoryLoading] = useState(Boolean(initialSessionId))

  // Explicit, sticky search scope.
  const [scope, setScope] = useState<SearchScope>(() => {
    const docParam = searchParams.get('documents')
    if (docParam) {
      const ids = docParam.split(',').filter(Boolean)
      if (ids.length > 0) return { type: 'selected_documents', documentIds: ids }
    }
    return { type: 'all_current' }
  })

  // Pending question (optimistic) and the active run.
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null)
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null)
  const [runError, setRunError] = useState<{ message: string; question: string } | null>(null)

  // Evidence Explorer state — deliberately separate variables (spec §6.4).
  const [selectedEvidenceId, setSelectedEvidenceId] = useState<string | null>(null)
  const [evidenceResult, setEvidenceResult] = useState<FinalAnswerResult | null>(null)
  const [viewedDocumentVersionId, setViewedDocumentVersionId] = useState<string | null>(null)
  const [viewedDocumentTitle, setViewedDocumentTitle] = useState<string | null>(null)
  const [viewedPage, setViewedPage] = useState(1)
  const [panelMode, setPanelMode] = useState<'evidence' | 'document'>('evidence')
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  const abortRef = useRef<AbortController | null>(null)
  const pdfRef = useRef<PdfViewerRef>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const turnCache = useRef<SessionTurnView[]>([])

  const running = activeRun !== null

  /* ---------------------------------------------------------------- */
  /* Data loading                                                      */
  /* ---------------------------------------------------------------- */

  const loadDocuments = useCallback(async () => {
    if (!workspace) return
    try {
      const page = await client.listDocuments(workspace.id)
      setDocuments(page.items)
    } catch {
      // Scope list refresh is best-effort.
    }
  }, [client, workspace])

  const loadTurns = useCallback(
    async (sid: string) => {
      if (!workspace) return
      try {
        const next = await client.getSessionTurns(workspace.id, sid)
        turnCache.current = next
        setTurns(next)
      } catch (err) {
        if (err instanceof V2ApiError && err.status === 404) {
          router.replace('/chat')
        }
      } finally {
        setHistoryLoading(false)
      }
    },
    [client, workspace, router]
  )

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  useEffect(() => {
    if (sessionId && workspace) {
      void loadTurns(sessionId)
    } else {
      setTurns([])
      setHistoryLoading(false)
    }
  }, [sessionId, workspace, loadTurns])

  // Refresh scope/document data after runs finish.
  useEffect(() => {
    if (!running) void loadDocuments()
  }, [running, loadDocuments])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns.length, activeRun?.seen.length, pendingQuestion])

  /* ---------------------------------------------------------------- */
  /* Asking                                                            */
  /* ---------------------------------------------------------------- */

  const ask = useCallback(
    async (question: string) => {
      if (!workspace || running) return
      setRunError(null)
      setPendingQuestion(question)

      try {
        let sid = sessionId
        if (!sid) {
          const created = await client.createSession(
            workspace.id,
            question.length > 48 ? `${question.slice(0, 48).trimEnd()}…` : question
          )
          sid = created.id
          setSessionId(sid)
        }

        const clientMessageId =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random()}`

        const created = await client.createRun(workspace.id, sid, {
          question,
          scope,
          mode: 'strict',
          clientMessageId,
        })

        const active: ActiveRun = { runId: created.runId, seen: ['run.queued'], details: null }
        setActiveRun(active)

        const controller = new AbortController()
        abortRef.current = controller

        await client.streamRunEvents(workspace.id, created.runId, 0, {
          signal: controller.signal,
          onEvent: (event: RunEvent) => {
            setActiveRun((prev) =>
              prev
                ? {
                    ...prev,
                    seen: [...prev.seen, event.type],
                    details:
                      event.type === 'retrieval.completed'
                        ? ((event.payload as { details?: RetrievalDetailsView })?.details ??
                          prev.details)
                        : prev.details,
                  }
                : prev
            )
          },
        })

        await loadTurns(sid)
        if (!sessionId) {
          router.replace(`/chat/${sid}`)
        }
      } catch (err) {
        if (err instanceof V2ApiError) {
          setRunError({ message: err.message, question })
        } else {
          setRunError({
            message: 'The run could not be completed. This was not a question failure — try asking again.',
            question,
          })
        }
      } finally {
        setActiveRun(null)
        setPendingQuestion(null)
        abortRef.current = null
      }
    },
    [workspace, client, sessionId, scope, running, loadTurns, router]
  )

  const cancel = useCallback(async () => {
    if (!workspace || !activeRun) return
    abortRef.current?.abort()
    try {
      await client.cancelRun(workspace.id, activeRun.runId)
    } catch {
      // The stream abort still terminates the local view.
    }
    if (sessionId) await loadTurns(sessionId)
  }, [workspace, client, activeRun, sessionId, loadTurns])

  /* ---------------------------------------------------------------- */
  /* Evidence panel                                                    */
  /* ---------------------------------------------------------------- */

  const selectedEvidence = useMemo<EvidenceRecord | null>(() => {
    if (!selectedEvidenceId || !evidenceResult) return null
    return evidenceResult.evidence.find((e) => e.evidenceId === selectedEvidenceId) ?? null
  }, [selectedEvidenceId, evidenceResult])

  const openEvidence = useCallback((evidence: EvidenceRecord, result: FinalAnswerResult) => {
    // Viewing evidence never touches the search scope (EVD-02).
    setSelectedEvidenceId(evidence.evidenceId)
    setEvidenceResult(result)
    setPanelMode('evidence')
    if (isMobile) setMobileSheetOpen(true)
  }, [isMobile])

  const showInDocument = useCallback(
    async (evidence: EvidenceRecord) => {
      if (!workspace) return
      setViewedDocumentVersionId(evidence.versionId)
      setViewedDocumentTitle(evidence.documentName)
      setViewedPage(evidence.physicalPage)
      setPanelMode('document')
      setFileUrl(null)
      setFileError(null)
      try {
        const blob = await client.getFile(
          workspace.id,
          evidence.documentId,
          evidence.versionId
        )
        const url = URL.createObjectURL(blob)
        setFileUrl(url)
      } catch (err) {
        setFileError(
          err instanceof V2ApiError ? err.message : 'The original file could not be loaded.'
        )
      }
    },
    [client, workspace]
  )

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl)
    }
  }, [fileUrl])

  const evidencePanel = selectedEvidence ? (
    <EvidenceExplorer
      evidence={selectedEvidence}
      onBack={panelMode === 'document' ? () => setPanelMode('evidence') : undefined}
      onShowInDocument={showInDocument}
      retrievalDetails={null}
      className="bg-background"
    />
  ) : null

  const documentPanel = (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span className="truncate text-sm font-medium">
          {viewedDocumentTitle ?? 'Document'}
        </span>
        {viewedDocumentVersionId && (
          <Badge variant="outline" className="ml-auto shrink-0">
            page {viewedPage}
          </Badge>
        )}
        {panelMode === 'document' && selectedEvidence && (
          <span
            className="shrink-0 text-[10px] text-muted-foreground"
            title="The highlighted lines are matched against the rendered page text at view time."
          >
            highlighted: cited passage
          </span>
        )}
      </div>
      <div className="min-h-0 flex-1">
        <PdfViewer
          ref={pdfRef}
          fileUrl={fileUrl}
          error={fileError}
          initialPage={viewedPage}
          highlightText={panelMode === 'document' ? selectedEvidence?.quote ?? null : null}
          onReady={() => pdfRef.current?.goToPage(viewedPage)}
        />
      </div>
    </div>
  )

  /* ---------------------------------------------------------------- */
  /* Rendering                                                         */
  /* ---------------------------------------------------------------- */

  const docNames = useMemo(
    () => new Map(documents.map((d) => [d.id, d.title])),
    [documents]
  )

  // While the optimistic pending block represents the in-flight turn,
  // hide its persisted (non-terminal) duplicate that reloads may add.
  const visibleTurns = useMemo(() => {
    if (!pendingQuestion) return turns
    return turns.filter(
      (t) =>
        !(
          t.user.text === pendingQuestion &&
          (!t.assistant ||
            t.assistant.status === 'queued' ||
            t.assistant.status === 'running')
        )
    )
  }, [turns, pendingQuestion])

  if (wsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Cube size={32} className="animate-pulse text-primary" />
      </div>
    )
  }

  const showPanel = Boolean(selectedEvidence) && !isMobile

  return (
    <div className="flex h-full min-h-0">
      {/* Conversation column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header: scope + strict mode */}
        <div className="flex items-center gap-2 border-b bg-background px-4 py-2">
          <ScopeSelector
            scope={scope}
            documents={documents}
            onChange={setScope}
            disabled={running}
          />
          <span
            className="hidden items-center gap-1 text-[10px] text-muted-foreground sm:inline-flex"
            title="Strict evidence mode: answers are validated against retrieved passages before display"
          >
            <ShieldCheck size={12} className="text-primary" />
            Strict evidence mode
          </span>
          {isDemo && (
            <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">
              Demo corpus
            </Badge>
          )}
          {sessionId && (
            <Button
              variant="ghost"
              size="icon-xs"
              className={cn(isDemo ? '' : 'ml-auto')}
              onClick={() => router.push('/chat')}
              title="New chat"
            >
              <Plus size={14} />
            </Button>
          )}
        </div>

        {/* Messages */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
            {turns.length === 0 && !pendingQuestion && !historyLoading && (
              <EmptyState isDemo={isDemo} onSuggest={ask} documentCount={documents.length} />
            )}

            {historyLoading && (
              <p className="py-8 text-center text-xs text-muted-foreground">
                Loading conversation…
              </p>
            )}

            {visibleTurns.map((turn) => (
              <TurnView
                key={turn.sequence}
                turn={turn}
                docNames={docNames}
                onCitationClick={openEvidence}
              />
            ))}

            {/* Optimistic pending question + live run status */}
            {pendingQuestion && (
              <>
                <UserBubble
                  text={pendingQuestion}
                  scopeLabel={scopeLabel(scope, docNames)}
                />
                <div className="border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center bg-primary/15">
                      <Cube size={13} weight="fill" className="text-primary" />
                    </div>
                    <span className="text-xs font-medium">Gnosis</span>
                  </div>
                  {activeRun ? (
                    <RunStatus seenEvents={activeRun.seen} />
                  ) : runError ? (
                    <div className="space-y-2 text-sm text-destructive">
                      <div className="flex items-start gap-2">
                        <Warning size={16} className="mt-0.5 shrink-0" weight="fill" />
                        <span>{runError.message}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const q = runError.question
                          setRunError(null)
                          void ask(q)
                        }}
                      >
                        <ArrowCounterClockwise size={14} className="mr-1.5" />
                        Try again
                      </Button>
                    </div>
                  ) : null}
                </div>
              </>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Composer */}
        <div className="border-t bg-background px-4 py-3">
          <div className="mx-auto max-w-3xl space-y-2">
            {runError && !pendingQuestion && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <Warning size={12} weight="fill" />
                {runError.message}
              </p>
            )}
            <ChatInput
              onSend={(q) => void ask(q)}
              onCancel={() => void cancel()}
              running={running}
              disabled={wsLoading}
            />
            <p className="text-center text-[10px] text-muted-foreground">
              Questions search{' '}
              {scope.type === 'all_current' ? 'all current documents' : 'the selected documents only'}{' '}
              · {scopeLabel(scope, docNames)}
            </p>
          </div>
        </div>
      </div>

      {/* Evidence panel (desktop) */}
      {showPanel && (
        <aside className="hidden w-[42%] min-w-[340px] border-l lg:block">
          {panelMode === 'document' ? documentPanel : evidencePanel}
        </aside>
      )}

      {/* Evidence sheet (mobile) */}
      {isMobile && (
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetContent side="right" className="w-[90vw] p-0 sm:max-w-md">
            <SheetHeader className="sr-only">
              <SheetTitle>Evidence</SheetTitle>
              <SheetDescription>
                The source passage behind the selected citation.
              </SheetDescription>
            </SheetHeader>
            {panelMode === 'document' ? documentPanel : evidencePanel}
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function UserBubble({ text, scopeLabel }: { text: string; scopeLabel: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] space-y-1">
        <div className="bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground">
          {text}
        </div>
        <p className="text-right text-[10px] text-muted-foreground">Scope: {scopeLabel}</p>
      </div>
    </div>
  )
}

function TurnView({
  turn,
  docNames,
  onCitationClick,
}: {
  turn: SessionTurnView
  docNames: Map<string, string>
  onCitationClick: (evidence: EvidenceRecord, result: FinalAnswerResult) => void
}) {
  return (
    <div className="space-y-4">
      <UserBubble text={turn.user.text} scopeLabel={scopeLabel(turn.user.scope, docNames)} />

      <div className="border bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex size-6 items-center justify-center bg-primary/15">
            <Cube size={13} weight="fill" className="text-primary" />
          </div>
          <span className="text-xs font-medium">Gnosis</span>
        </div>

        {turn.assistant?.result ? (
          <AnswerMessage
            result={turn.assistant.result}
            onCitationClick={(evidence) =>
              onCitationClick(evidence, turn.assistant!.result!)
            }
          />
        ) : turn.assistant?.status === 'cancelled' ? (
          <p className="text-sm text-muted-foreground">
            Run cancelled. Ask again to start a new run.
          </p>
        ) : turn.assistant?.status === 'failed' || turn.assistant?.error ? (
          <div className="flex items-start gap-2 text-sm text-destructive">
            <Warning size={16} className="mt-0.5 shrink-0" weight="fill" />
            <span>{turn.assistant?.error ?? 'This run failed.'}</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">This question has no answer yet.</p>
        )}
      </div>
    </div>
  )
}

function EmptyState({
  isDemo,
  onSuggest,
  documentCount,
}: {
  isDemo: boolean
  onSuggest: (question: string) => void
  documentCount: number
}) {
  return (
    <div className="space-y-6 py-8">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex size-10 items-center justify-center bg-primary/15">
          <Cube size={20} weight="fill" className="text-primary" />
        </div>
        <h2 className="text-lg font-semibold">Ask the corpus</h2>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
          Every claim in an answer cites the exact passage, document revision, and physical
          page it came from. {documentCount > 0 ? `Searches cover ${documentCount} current ${documentCount === 1 ? 'document' : 'documents'}.` : 'Upload a document to begin.'}
        </p>
      </div>

      {isDemo && (
        <div className="space-y-2">
          <p className="text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Try the curated demo questions
          </p>
          <div className="mx-auto grid max-w-xl gap-2 sm:grid-cols-2">
            {DEMO_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion.question}
                type="button"
                onClick={() => onSuggest(suggestion.question)}
                className="border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <p className="text-xs font-medium leading-snug">{suggestion.question}</p>
                <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
                  {suggestion.hint}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
