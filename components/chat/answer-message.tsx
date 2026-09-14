'use client'

/**
 * Structured answer renderer (spec §14, §6.3).
 *
 * Renders the validated final result: outcome banner, material claims
 * with clickable citation chips mapped from stable evidence identity
 * (display numbers are presentation labels only), limitations,
 * conflicts, and provenance. Never fabricates a quote, page, or
 * confidence percentage.
 */

import { useState } from 'react'
import { Cube, Info, Warning, ArrowsClockwise } from '@phosphor-icons/react'
import { OutcomeBadge } from '@/components/v2/state-badges'
import { formatDuration } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { EvidenceRecord, FinalAnswerResult } from '@/lib/v2'

interface AnswerMessageProps {
  result: FinalAnswerResult
  onCitationClick: (evidence: EvidenceRecord) => void
  onRetry?: () => void
}

export function AnswerMessage({ result, onCitationClick, onRetry }: AnswerMessageProps) {
  const evidenceByDisplay = result.evidence
  const evidenceNumberOf = (evidenceId: string) =>
    evidenceByDisplay.findIndex((e) => e.evidenceId === evidenceId) + 1

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <OutcomeBadge outcome={result.outcome} />
        {result.resolvedQuestion && (
          <span
            className="border bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground"
            title="Conversational reference resolved; previous answers were not used as evidence"
          >
            resolved: “{result.resolvedQuestion}”
          </span>
        )}
      </div>

      {/* Outcome-specific lead-in */}
      {result.outcome === 'insufficient_evidence' && (
        <p className="text-sm text-muted-foreground">
          No checked answer is available. The retrieved passages did not contain evidence for
          this question.
        </p>
      )}
      {result.outcome === 'clarification_required' && (
        <p className="text-sm text-muted-foreground">
          This question refers to something not established in the conversation yet.
        </p>
      )}

      {/* Claims */}
      {result.claims.length > 0 && (
        <div className="space-y-2.5">
          {result.claims.map((claim) => (
            <div key={claim.ordinal} className="flex gap-2 text-sm leading-relaxed">
              <span
                className={cn(
                  'mt-1.5 h-1.5 w-1.5 shrink-0',
                  claim.checkStatus === 'supported' ? 'bg-emerald-500' : 'bg-amber-500'
                )}
                title={claim.checkStatus}
              />
              <p>
                {claim.text}{' '}
                {claim.evidenceIds.map((evidenceId) => {
                  const evidence = result.evidence.find((e) => e.evidenceId === evidenceId)
                  if (!evidence) return null
                  return (
                    <button
                      key={evidenceId}
                      type="button"
                      onClick={() => onCitationClick(evidence)}
                      className={cn(
                        'ml-0.5 inline-flex h-4 min-w-4 items-center justify-center border border-foreground px-1 align-[1px] text-[10px] font-semibold',
                        'bg-secondary text-secondary-foreground shadow-[1.5px_1.5px_0_0_var(--foreground)]',
                        'transition-[transform,box-shadow] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
                        'hover:-translate-y-px hover:shadow-[2.5px_2.5px_0_0_var(--foreground)] active:translate-x-[1.5px] active:translate-y-[1.5px] active:shadow-none'
                      )}
                      title={`${evidence.documentName} — rev ${evidence.revisionNumber}, page ${evidence.physicalPage}`}
                    >
                      {evidenceNumberOf(evidenceId)}
                    </button>
                  )
                })}
                {claim.checkNote && (
                  <span className="ml-1 text-[10px] text-muted-foreground" title={claim.checkNote}>
                    <Info size={10} className="inline" />
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Limitations */}
      {result.limitations.length > 0 && (
        <div className="border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
          <div className="mb-1 flex items-center gap-1.5 font-medium">
            <Warning size={12} weight="fill" />
            {result.outcome === 'partial' ? 'What is missing' : 'Limitations'}
          </div>
          <ul className="list-inside list-disc space-y-1">
            {result.limitations.map((limitation, i) => (
              <li key={i}>{limitation}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Conflicts */}
      {result.conflicts.length > 0 && (
        <div className="border border-rose-500/30 bg-rose-500/5 p-3 text-xs leading-relaxed text-rose-700 dark:text-rose-400">
          <div className="mb-1 flex items-center gap-1.5 font-medium">
            <ArrowsClockwise size={12} weight="bold" />
            Conflicting statements
          </div>
          {result.conflicts.map((conflict, i) => (
            <p key={i}>{conflict.description}</p>
          ))}
        </div>
      )}

      {/* Provenance footer */}
      <AnswerMeta result={result} onRetry={onRetry} />
    </div>
  )
}

function AnswerMeta({ result, onRetry }: { result: FinalAnswerResult; onRetry?: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const snapshot = result.sourceSnapshot

  return (
    <div className="border-t pt-2 text-[10px] leading-relaxed text-muted-foreground">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>
          Corpus generation {snapshot.corpusGeneration} · {snapshot.documents.length}{' '}
          {snapshot.documents.length === 1 ? 'document' : 'documents'} in scope
        </span>
        <span>
          {snapshot.documents
            .slice(0, 3)
            .map((d) => `${d.name} (rev ${d.revisionNumber})`)
            .join(', ')}
          {snapshot.documents.length > 3 && ` +${snapshot.documents.length - 3} more`}
        </span>
        <span>{formatDuration(result.timings.totalMs)}</span>
        <span>
          ~{result.usage.totalTokens.toLocaleString()} tokens ({result.usage.status})
        </span>
        {onRetry && (
          <button type="button" onClick={onRetry} className="text-primary hover:underline">
            Ask again
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mt-1 flex items-center gap-1 hover:text-foreground"
      >
        <Cube size={10} />
        {expanded ? 'Hide pipeline details' : 'Pipeline details'}
      </button>
      {expanded && (
        <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5">
          <span>Retrieval: {result.pipeline.retrieval}</span>
          <span>Reranker: {result.pipeline.reranker ?? 'none'}</span>
          <span>Embedding: {result.pipeline.embeddingModel}</span>
          <span>Generator: {result.pipeline.generatorModel}</span>
          <span>
            Timings: queue {formatDuration(result.timings.queueMs)}, retrieval{' '}
            {formatDuration(result.timings.retrievalMs)}, checking{' '}
            {formatDuration(result.timings.checkingMs)}
          </span>
          <span>
            Claims checked: {result.checks.claimsChecked} ({result.checks.supported} supported)
          </span>
        </div>
      )}
    </div>
  )
}
