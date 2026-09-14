'use client'

/**
 * Diagnostics page (spec §6.1, OBS-01).
 *
 * Shows the caller's own runs with outcome, status, scope, timings,
 * and expandable sanitized retrieval details — no secrets, no other
 * users' sessions. Also surfaces lifecycle operations that need
 * attention: failed builds and pending purge tasks.
 */

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import {
  Pulse,
  ArrowClockwise,
  CaretDown,
  CaretUp,
  CheckCircle,
  Warning,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { OutcomeBadge, BuildStateBadge } from '@/components/v2/state-badges'
import { useWorkspace } from '@/lib/workspace'
import { demoStore, scopeLabel } from '@/lib/v2'
import type { DocumentDetail, RetrievalDetailsView, RunSummary } from '@/lib/v2'
import { formatDateTime, formatDuration, formatRelativeTime } from '@/lib/format'
import { cn } from '@/lib/utils'

export default function DiagnosticsPage() {
  const { client, workspace, isDemo, loading: wsLoading } = useWorkspace()
  const [runs, setRuns] = useState<RunSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRun, setExpandedRun] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, RetrievalDetailsView | null>>({})
  const [attention, setAttention] = useState<
    { document: DocumentDetail; kind: 'failed_build' | 'pending_purge' }[]
  >([])

  const demoVersion = useSyncExternalStore(
    demoStore.subscribe,
    () => demoStore.version,
    () => 0
  )

  const load = useCallback(async () => {
    if (!workspace) return
    try {
      const runList = await client.listRuns(workspace.id, 25)
      setRuns(runList)

      // Lifecycle items that need attention.
      const docs = await client.listDocuments(workspace.id)
      const flagged: typeof attention = []
      for (const summary of docs.items) {
        try {
          const detail = await client.getDocument(workspace.id, summary.id)
          if (detail.purgeTask && detail.purgeTask.state !== 'complete') {
            flagged.push({ document: detail, kind: 'pending_purge' })
          }
          if (detail.builds.some((b) => b.state === 'failed')) {
            flagged.push({ document: detail, kind: 'failed_build' })
          }
        } catch {
          // Deleted or inaccessible documents are skipped.
        }
      }
      setAttention(flagged)
    } finally {
      setLoading(false)
    }
  }, [client, workspace])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (demoVersion > 0) void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoVersion])

  const toggleDetails = useCallback(
    async (runId: string) => {
      if (expandedRun === runId) {
        setExpandedRun(null)
        return
      }
      setExpandedRun(runId)
      if (!(runId in details) && workspace) {
        const detail = await client.getRunDiagnostics(workspace.id, runId)
        setDetails((prev) => ({ ...prev, [runId]: detail }))
      }
    },
    [expandedRun, details, client, workspace]
  )

  const outcomeCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const run of runs) {
      if (run.outcome) counts.set(run.outcome, (counts.get(run.outcome) ?? 0) + 1)
    }
    return counts
  }, [runs])

  if (wsLoading || loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-8">
        <Skeleton className="h-8 w-48" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Diagnostics</h1>
            <p className="text-sm text-muted-foreground">
              Your own answer runs with observable execution detail.
              {isDemo && ' Demo mode: providers are simulated; timings are representative.'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => void load()} title="Refresh">
            <ArrowClockwise size={16} />
          </Button>
        </div>

        {/* Outcome distribution */}
        {outcomeCounts.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border bg-card px-4 py-3">
            <span className="text-xs font-medium text-muted-foreground">Recent outcomes:</span>
            {[...outcomeCounts.entries()].map(([outcome, count]) => (
              <span key={outcome} className="flex items-center gap-1.5">
                <OutcomeBadge outcome={outcome as RunSummary['outcome'] & string} />
                <span className="text-xs text-muted-foreground">×{count}</span>
              </span>
            ))}
          </div>
        )}

        {/* Lifecycle attention */}
        {attention.length > 0 && (
          <section className="space-y-2">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              <Warning size={13} weight="fill" />
              Needs attention
            </h2>
            {attention.map(({ document: doc, kind }) => (
              <div
                key={`${doc.id}:${kind}`}
                className="flex flex-wrap items-center gap-2 border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs"
              >
                <Link href={`/documents/${doc.id}`} className="font-medium hover:underline">
                  {doc.title}
                </Link>
                {kind === 'pending_purge' ? (
                  <span className="text-muted-foreground">
                    Purge {doc.purgeTask?.id.slice(0, 12)} is {doc.purgeTask?.state} — deletion is
                    committed, cleanup continues.
                  </span>
                ) : (
                  <>
                    <BuildStateBadge state="failed" />
                    <span className="text-muted-foreground">
                      A build failed. Retry it from the document&apos;s Index build view.
                    </span>
                  </>
                )}
              </div>
            ))}
          </section>
        )}

        {/* Runs */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Answer runs
          </h2>

          {runs.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Pulse size={24} />
                </EmptyMedia>
                <EmptyTitle>No runs yet</EmptyTitle>
                <EmptyDescription>
                  Ask a question in chat and it will appear here with its full execution
                  trace: stages, timings, retrieval candidates, and outcome.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            runs.map((run) => (
              <div key={run.runId} className="border bg-card">
                <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <StatusIcon status={run.status} />
                  <Link
                    href={`/chat/${run.sessionId}`}
                    className="min-w-0 flex-1 truncate text-sm hover:underline"
                    title={run.question}
                  >
                    {run.question}
                  </Link>
                  {run.outcome && <OutcomeBadge outcome={run.outcome} />}
                  <span className="text-[10px] text-muted-foreground">
                    {formatRelativeTime(run.startedAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void toggleDetails(run.runId)}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    {expandedRun === run.runId ? (
                      <CaretUp size={12} />
                    ) : (
                      <CaretDown size={12} />
                    )}
                    details
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t px-4 py-2 text-[11px] text-muted-foreground">
                  <span className="font-mono">{run.runId.slice(0, 18)}</span>
                  <span>Scope: {scopeLabel(run.scope)}</span>
                  <span>{run.documentsCited} evidence cited</span>
                  {run.timings && <span>Total {formatDuration(run.timings.totalMs)}</span>}
                  <span>{formatDateTime(run.startedAt)}</span>
                </div>

                {run.error && (
                  <p className="border-t border-destructive/30 bg-destructive/5 px-4 py-2 text-[11px] text-destructive">
                    {run.error}
                  </p>
                )}

                {expandedRun === run.runId && (
                  <div className="border-t px-4 py-3">
                    {details[run.runId] ? (
                      <DetailsView detail={details[run.runId]!} timings={run.timings} />
                    ) : (
                      <p className="text-xs text-muted-foreground">No retrieval details retained.</p>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: RunSummary['status'] }) {
  if (status === 'completed') {
    return <CheckCircle size={14} weight="fill" className="text-emerald-500" />
  }
  if (status === 'failed' || status === 'interrupted') {
    return <Warning size={14} weight="fill" className="text-destructive" />
  }
  return <Pulse size={14} className="text-muted-foreground" />
}

function DetailsView({
  detail,
  timings,
}: {
  detail: RetrievalDetailsView
  timings: RunSummary['timings']
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        Normalized query: “{detail.normalizedQuery}”
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-[11px]">
          <thead className="text-muted-foreground">
            <tr className="border-b">
              <th className="py-1 pr-3 font-medium">Chunk</th>
              <th className="py-1 pr-3 font-medium">Document</th>
              <th className="py-1 pr-3 font-medium">Dense</th>
              <th className="py-1 pr-3 font-medium">Lexical</th>
              <th className="py-1 pr-3 font-medium">Fusion</th>
              <th className="py-1 pr-3 font-medium">Rerank</th>
              <th className="py-1 font-medium">Selected</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {detail.candidates.slice(0, 15).map((c) => (
              <tr
                key={c.chunkId}
                className={cn('border-b border-border/50', c.selected && 'bg-primary/5')}
              >
                <td className="max-w-[120px] truncate py-1 pr-3">{c.chunkId.split(':').pop()}</td>
                <td className="max-w-[140px] truncate py-1 pr-3 font-sans">{c.documentName}</td>
                <td className="py-1 pr-3">{c.denseRank ?? '—'}</td>
                <td className="py-1 pr-3">{c.lexicalRank ?? '—'}</td>
                <td className="py-1 pr-3">{c.fusionScore.toFixed(5)}</td>
                <td className="py-1 pr-3">{c.rerankRank ?? '—'}</td>
                <td className="py-1">{c.selected ? 'yes' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground">
        dense top {detail.config.denseTopK} · lexical top {detail.config.lexicalTopK} · rrf k=
        {detail.config.rrfConstant} · reranker {detail.config.reranker ?? 'disabled'} · lexical{' '}
        {detail.timings.lexicalMs}ms · dense {detail.timings.denseMs}ms · rerank{' '}
        {detail.timings.rerankMs}ms
        {timings ? ` · queue ${timings.queueMs}ms · checking ${timings.checkingMs}ms` : ''}
      </p>
    </div>
  )
}
