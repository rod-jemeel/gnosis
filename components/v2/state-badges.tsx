'use client'

/**
 * Build and outcome state badges shared across documents, chat, and
 * diagnostics views.
 */

import { CheckCircle, Warning, Spinner, Prohibit, Clock, ArrowsCounterClockwise } from '@phosphor-icons/react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AnswerOutcome, BuildState } from '@/lib/v2'

const BUILD_LABELS: Record<BuildState, string> = {
  queued: 'Queued',
  validating_source: 'Validating',
  parsing: 'Parsing',
  chunking: 'Chunking',
  embedding: 'Embedding',
  indexing: 'Indexing',
  checking_readiness: 'Checking',
  ready: 'Ready',
  retry_wait: 'Retrying',
  failed: 'Failed',
  cancelled: 'Cancelled',
  superseded: 'Superseded',
}

const NONTERMINAL: BuildState[] = [
  'queued',
  'validating_source',
  'parsing',
  'chunking',
  'embedding',
  'indexing',
  'checking_readiness',
  'retry_wait',
]

export function BuildStateBadge({ state, className }: { state: BuildState; className?: string }) {
  const label = BUILD_LABELS[state]
  if (state === 'ready') {
    return (
      <Badge variant="secondary" className={cn('gap-1 text-emerald-700 dark:text-emerald-400', className)}>
        <CheckCircle size={12} weight="fill" />
        {label}
      </Badge>
    )
  }
  if (state === 'failed') {
    return (
      <Badge variant="destructive" className={cn('gap-1', className)}>
        <Warning size={12} weight="fill" />
        {label}
      </Badge>
    )
  }
  if (state === 'cancelled' || state === 'superseded') {
    return (
      <Badge variant="outline" className={cn('gap-1 text-muted-foreground', className)}>
        {state === 'cancelled' ? <Prohibit size={12} /> : <ArrowsCounterClockwise size={12} />}
        {label}
      </Badge>
    )
  }
  if (NONTERMINAL.includes(state)) {
    return (
      <Badge variant="secondary" className={cn('gap-1', className)}>
        <Spinner size={12} className="animate-spin" />
        {label}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}

const OUTCOME_CONFIG: Record<
  AnswerOutcome,
  { label: string; className: string }
> = {
  answered: {
    label: 'Answered',
    className: 'text-emerald-700 dark:text-emerald-400 border-emerald-500/40 bg-emerald-500/10',
  },
  partial: {
    label: 'Partially answered',
    className: 'text-amber-700 dark:text-amber-400 border-amber-500/40 bg-amber-500/10',
  },
  conflicting_sources: {
    label: 'Conflicting sources',
    className: 'text-rose-700 dark:text-rose-400 border-rose-500/40 bg-rose-500/10',
  },
  insufficient_evidence: {
    label: 'Insufficient evidence',
    className: 'text-slate-600 dark:text-slate-400 border-slate-500/40 bg-slate-500/10',
  },
  clarification_required: {
    label: 'Clarification needed',
    className: 'text-sky-700 dark:text-sky-400 border-sky-500/40 bg-sky-500/10',
  },
}

export function OutcomeBadge({ outcome, className }: { outcome: AnswerOutcome; className?: string }) {
  const config = OUTCOME_CONFIG[outcome]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {outcome === 'answered' ? (
        <CheckCircle size={12} weight="fill" />
      ) : outcome === 'conflicting_sources' ? (
        <Warning size={12} weight="fill" />
      ) : (
        <Clock size={12} />
      )}
      {config.label}
    </span>
  )
}
